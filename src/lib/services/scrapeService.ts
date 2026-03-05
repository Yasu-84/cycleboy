/**
 * スクレイピングサービス（オーケストレーション）
 *
 * STEP 0: ジョブロック取得（job_runs テーブルで排他制御）
 * STEP 1: レース日程スクレイピング
 * STEP 2: 当日開催競輪場の特定
 * STEP 3: レースプログラムスクレイピング（jyo_cd 単位）
 * STEP 4: 当日レース ID リストの特定
 * STEP 5: 出走表3種スクレイピング（jyo_cd 単位）
 * STEP 6: AI予想実行
 * STEP 7: ジョブロック解放（finally）
 */
import { getJstToday } from '@/lib/utils/dateUtils';
import * as raceScheduleRepo from '@/lib/repositories/raceScheduleRepository';
import * as programRepo from '@/lib/repositories/programRepository';
import * as raceRepo from '@/lib/repositories/raceRepository';
import * as raceEntryRepo from '@/lib/repositories/raceEntryRepository';
import * as raceRecentResultRepo from '@/lib/repositories/raceRecentResultRepository';
import * as raceMatchResultRepo from '@/lib/repositories/raceMatchResultRepository';
import * as jobRunRepo from '@/lib/repositories/jobRunRepository';
import { scrapeGradeSchedules } from '@/lib/scrapers/raceScheduleScraper';
import { scrapeProgramByJyo, scrapeKaisaiTypeMap } from '@/lib/scrapers/raceProgramScraper';
import { scrapeEntry } from '@/lib/scrapers/raceEntryScraper';
import { scrapeRecentResults } from '@/lib/scrapers/raceRecentResultScraper';
import { scrapeMatchResults } from '@/lib/scrapers/raceMatchResultScraper';
import { run as runPrediction } from '@/lib/services/predictionService';
import type { JobStep, TriggerSource } from '@/types/jobRun';

export interface ScrapeOptions {
    step?: JobStep;
    targetDate?: string;
    triggerSource?: TriggerSource;
    triggerBy?: string;
    skipPrediction?: boolean; // AI予想をスキップするかどうか
}

export interface ScrapeResult {
    success: boolean;
    jobRunId: string;
    summary: Record<string, unknown>;
    errors: string[];
}

// ----------------------------------------------------------------
// public エントリポイント
// ----------------------------------------------------------------

export async function run(options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const step: JobStep = options.step ?? 'all';
    const targetDate = options.targetDate ?? getJstToday();
    const triggerSource = options.triggerSource ?? 'cron';

    console.log(`[scrapeService] start  step=${step}  target_date=${targetDate}`);

    // STEP 0: ジョブロック取得
    const isAlreadyRunning = await checkAlreadyRunning(step);
    if (isAlreadyRunning) {
        console.warn('[scrapeService] another job is running, skipping.');
        return {
            success: true,
            jobRunId: '',
            summary: { skipped: true },
            errors: [],
        };
    }

    const jobRunId = await jobRunRepo.startJobRun({
        job_type: step === 'cleanup' ? 'cron_cleanup' : 'cron_scrape',
        step,
        trigger_source: triggerSource,
        trigger_by: options.triggerBy,
    });

    const errors: string[] = [];
    const summary: Record<string, unknown> = { step, targetDate };

    try {
        // step 別に処理を分岐
        if (step === 'all') {
            await runAll(targetDate, jobRunId, errors, summary, options.skipPrediction);
        } else if (step === 'schedule') {
            await runScheduleStep(targetDate, jobRunId, errors, summary);
        } else if (step === 'program') {
            await runProgramStep(targetDate, jobRunId, errors, summary);
        } else if (step === 'entry') {
            await runEntryStep(targetDate, jobRunId, errors, summary);
        } else if (step === 'prediction') {
            await runPredictionStep(targetDate, jobRunId, errors, summary);
        } else if (step === 'cleanup') {
            // cleanup は cleanupService で処理
            throw new Error('Use cleanupService for cleanup step.');
        }

        await jobRunRepo.finishJobRun(
            jobRunId,
            errors.length === 0 ? 'success' : 'failed',
            summary
        );
        console.log(`[scrapeService] done  errors=${errors.length}`);
        return { success: errors.length === 0, jobRunId, summary, errors };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
        await jobRunRepo.finishJobRun(jobRunId, 'failed', { ...summary, fatalError: message });
        console.error(`[scrapeService] fatal error: ${message}`);
        return { success: false, jobRunId, summary, errors };
    }
}

// ----------------------------------------------------------------
// STEP 実装
// ----------------------------------------------------------------

async function runAll(
    targetDate: string,
    jobRunId: string,
    errors: string[],
    summary: Record<string, unknown>,
    skipPrediction?: boolean
): Promise<void> {
    // STEP 1
    const ok = await runScheduleStep(targetDate, jobRunId, errors, summary);
    if (!ok) return; // STEP 1 失敗→以降スキップ

    // STEP 2: race_schedules から当日開催中のグレード競輪場を取得
    const activeJyoCds = await getActiveJyoCds(targetDate);
    if (activeJyoCds.length === 0) {
        console.log('[scrapeService] no active grade venues for today, stopping.');
        return;
    }
    summary.activeVenues = activeJyoCds;

    // STEP 3
    await runProgramStep(targetDate, jobRunId, errors, summary, activeJyoCds);

    // STEP 5
    await runEntryStep(targetDate, jobRunId, errors, summary);

    // STEP 6: AI予想（スキップオプションがあれば実行しない）
    if (!skipPrediction) {
        await runPredictionStep(targetDate, jobRunId, errors, summary);
    }
}

/** STEP 1: レース日程スクレイピング（グレードレースのみ保存） */
async function runScheduleStep(
    targetDate: string,
    jobRunId: string,
    errors: string[],
    summary: Record<string, unknown>
): Promise<boolean> {
    const [year, month] = targetDate.split('-').map(Number);

    try {
        // グレードレース（GP〜G3）のみ race_schedules に保存（F1/F2 は登録しない）
        const gradeSchedules = await scrapeGradeSchedules(year, month);
        await raceScheduleRepo.upsertRaceSchedules(gradeSchedules);

        summary.schedulesUpserted = gradeSchedules.length;
        console.log(`[STEP 1] upserted ${summary.schedulesUpserted} grade race_schedules`);
        return true;
    } catch (err) {
        const msg = `[STEP 1] failed: ${err instanceof Error ? err.message : err}`;
        console.error(msg);
        errors.push(msg);
        await jobRunRepo.recordJobError({
            job_run_id: jobRunId,
            step: 'schedule',
            error_type: 'http',
            message: msg,
            detail: null,
        });
        return false;
    }
}

/** STEP 2: 当日開催競輪場の特定 */
async function getActiveJyoCds(targetDate: string): Promise<string[]> {
    const active = await raceScheduleRepo.getActiveSchedulesByDate(targetDate);
    return active.map((s) => s.jyo_cd);
}

/** STEP 3: レースプログラムスクレイピング */
async function runProgramStep(
    targetDate: string,
    jobRunId: string,
    errors: string[],
    summary: Record<string, unknown>,
    jyoCds?: string[]
): Promise<void> {
    const activeJyoCds = jyoCds ?? (await getActiveJyoCds(targetDate));
    const [year, month] = targetDate.split('-').map(Number);

    let programCount = 0;
    let raceCount = 0;

    for (const jyo_cd of activeJyoCds) {
        try {
            // 開催区分マップを取得
            const kaisaiTypeMap = await scrapeKaisaiTypeMap(jyo_cd, year, month);

            // race_schedule_id を解決
            const schedule = await raceScheduleRepo.findScheduleByJyoAndDate(jyo_cd, targetDate);
            if (!schedule) {
                console.warn(`[STEP 3] race_schedule not found for jyo_cd=${jyo_cd}`);
                continue;
            }

            const { programs, races } = await scrapeProgramByJyo(
                jyo_cd,
                schedule,
                targetDate,
                kaisaiTypeMap
            );

            // programs を UPSERT してから program_id を races に設定
            await programRepo.upsertPrograms(programs);

            // UPSERT 後の program.id を取得して races に設定
            const savedPrograms = await Promise.all(
                programs.map((p) =>
                    programRepo.findProgramByScheduleAndDate(p.race_schedule_id, p.kaisai_date)
                )
            );

            // program_id をセットして races を UPSERT
            const racesWithProgramId = races.map((r, i) => ({
                ...r,
                program_id: savedPrograms[i]?.id ?? savedPrograms[0]?.id ?? '',
            }));

            await raceRepo.upsertRaces(racesWithProgramId.filter((r) => r.program_id));

            programCount += programs.length;
            raceCount += races.length;
            console.log(`[STEP 3] jyo_cd=${jyo_cd}: ${programs.length} programs, ${races.length} races`);
        } catch (err) {
            const msg = `[STEP 3] jyo_cd=${jyo_cd} failed: ${err instanceof Error ? err.message : err}`;
            console.error(msg);
            errors.push(msg);
            await jobRunRepo.recordJobError({
                job_run_id: jobRunId,
                step: `program:${jyo_cd}`,
                error_type: 'http',
                message: msg,
                detail: null,
            });
            // 1競輪場の失敗は他の競輪場の処理を継続
        }
    }

    summary.programsUpserted = programCount;
    summary.racesUpserted = raceCount;
}

/** STEP 5: 出走表3種スクレイピング */
async function runEntryStep(
    targetDate: string,
    jobRunId: string,
    errors: string[],
    summary: Record<string, unknown>
): Promise<void> {
    // 当日のレースを取得
    const todayRaces = await raceRepo.getRacesByDate(targetDate);
    if (todayRaces.length === 0) {
        console.log('[STEP 5] no races found for today.');
        return;
    }

    // jyo_cd 単位でグループ化
    const racesByJyo = groupByJyo(todayRaces);

    let entrySuccessCount = 0;
    let entryErrorCount = 0;

    for (const [jyo_cd, races] of racesByJyo) {
        console.log(`[STEP 5] jyo_cd=${jyo_cd}: ${races.length} races`);

        for (const race of races) {
            const raceId = race.netkeiba_race_id;

            // レース単位でトランザクション（失敗は当該レースのみスキップ）
            try {
                const [entryResult, recentResults, matchResults] = await Promise.all([
                    scrapeEntry(raceId),
                    scrapeRecentResults(raceId),
                    scrapeMatchResults(raceId),
                ]);

                await Promise.all([
                    raceEntryRepo.upsertRaceEntries(entryResult.entries),
                    raceRecentResultRepo.upsertRaceRecentResults(recentResults),
                    raceMatchResultRepo.upsertRaceMatchResults(matchResults),
                ]);

                entrySuccessCount++;
            } catch (err) {
                entryErrorCount++;
                const msg = `[STEP 5] race_id=${raceId} failed: ${err instanceof Error ? err.message : err}`;
                console.error(msg);
                errors.push(msg);
                await jobRunRepo.recordJobError({
                    job_run_id: jobRunId,
                    step: `entry:${raceId}`,
                    error_type: 'http',
                    message: msg,
                    detail: { raceId },
                });
                // 次のレースへ継続
            }
        }
    }

    summary.entrySuccess = entrySuccessCount;
    summary.entryError = entryErrorCount;
    console.log(`[STEP 5] done  success=${entrySuccessCount}  error=${entryErrorCount}`);
}

/** STEP 6: AI予想実行 */
async function runPredictionStep(
    targetDate: string,
    jobRunId: string,
    errors: string[],
    summary: Record<string, unknown>
): Promise<void> {
    try {
        const predictionResult = await runPrediction({ targetDate });
        
        if (predictionResult.summary.skipped) {
            console.log('[STEP 6] prediction skipped (no races found).');
            summary.predictionSkipped = true;
        } else {
            summary.predictionSuccess = predictionResult.summary.successCount;
            summary.predictionError = predictionResult.summary.errorCount;
            console.log(`[STEP 6] done  success=${predictionResult.summary.successCount}  error=${predictionResult.summary.errorCount}`);
        }

        // エラーを記録
        for (const error of predictionResult.errors) {
            errors.push(error);
            await jobRunRepo.recordJobError({
                job_run_id: jobRunId,
                step: 'prediction',
                error_type: 'prediction',
                message: error,
                detail: null,
            });
        }
    } catch (err) {
        const msg = `[STEP 6] failed: ${err instanceof Error ? err.message : err}`;
        console.error(msg);
        errors.push(msg);
        await jobRunRepo.recordJobError({
            job_run_id: jobRunId,
            step: 'prediction',
            error_type: 'prediction',
            message: msg,
            detail: null,
        });
    }
}

// ----------------------------------------------------------------
// ヘルパー
// ----------------------------------------------------------------

/** 実行中ジョブの存在チェック（job_runs テーブルベースの排他制御） */
async function checkAlreadyRunning(step: JobStep): Promise<boolean> {
    const { data, error } = await (await import('@/lib/supabase/client')).supabase
        .from('job_runs')
        .select('id')
        .eq('status', 'running')
        .eq('job_type', step === 'cleanup' ? 'cron_cleanup' : 'cron_scrape')
        .limit(1);

    if (error) {
        console.error('[scrapeService.checkLock] error:', error.message);
        return false; // エラー時はロック取得失敗とみなさず処理継続
    }
    return (data?.length ?? 0) > 0;
}

/** レース一覧を jyo_cd 単位でグループ化 */
function groupByJyo(
    races: import('@/types/race').Race[]
): Map<string, import('@/types/race').Race[]> {
    const map = new Map<string, import('@/types/race').Race[]>();
    for (const race of races) {
        // netkeiba_race_id からjyo_cdを推定（YYYYMMDD + JYO_CD(2桁) + RACE_NO(2桁)）
        const raceId = race.netkeiba_race_id;
        const jyo_cd = raceId.length >= 10 ? raceId.slice(8, 10).replace(/^0/, '') : '00';
        const existing = map.get(jyo_cd) ?? [];
        existing.push(race);
        map.set(jyo_cd, existing);
    }
    return map;
}
