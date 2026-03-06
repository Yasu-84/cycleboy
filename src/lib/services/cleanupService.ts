/**
 * データ削除サービス
 *
 * 実行タイミング: 毎日 JST AM05:00
 * 閾値: 実行時 JST 日付 - 31 日
 *
 * 削除順序（RESTRICT FK に従い子→親の順）:
 *   1. race_match_results
 *   2. race_recent_results
 *   3. race_entries
 *   4. races
 *   5. programs
 *   6. race_schedules
 */
import { getJstDateMinusDays } from '@/lib/utils/dateUtils';
import * as raceMatchResultRepo from '@/lib/repositories/raceMatchResultRepository';
import * as raceRecentResultRepo from '@/lib/repositories/raceRecentResultRepository';
import * as raceEntryRepo from '@/lib/repositories/raceEntryRepository';
import * as raceRepo from '@/lib/repositories/raceRepository';
import * as programRepo from '@/lib/repositories/programRepository';
import * as raceScheduleRepo from '@/lib/repositories/raceScheduleRepository';
import * as jobRunRepo from '@/lib/repositories/jobRunRepository';
import type { TriggerSource } from '@/types/jobRun';

const RETAIN_DAYS = 31;

export interface CleanupOptions {
    triggerSource?: TriggerSource;
    triggerBy?: string;
}

export interface CleanupResult {
    success: boolean;
    jobRunId: string;
    deleted: Record<string, number>;
}

export async function run(options: CleanupOptions = {}): Promise<CleanupResult> {
    // 閾値 = JST 今日 - 7 日（以前のものを削除）
    const threshold = getJstDateMinusDays(RETAIN_DAYS);
    // TIMESTAMPTZ 比較のために ISO 文字列に変換（当日 00:00:00 JST → UTC に変換）
    const thresholdUtc = new Date(`${threshold}T00:00:00+09:00`).toISOString();

    console.log(`[cleanupService] start  threshold=${thresholdUtc} (${RETAIN_DAYS} days ago JST)`);

    const jobRunId = await jobRunRepo.startJobRun({
        job_type: 'cron_cleanup',
        step: 'cleanup',
        trigger_source: options.triggerSource ?? 'cron',
        trigger_by: options.triggerBy,
    });

    const deleted: Record<string, number> = {};

    try {
        // 子→親の順で削除（RESTRICT FK 制約を遵守）
        deleted.race_match_results = await raceMatchResultRepo.deleteOlderThan(thresholdUtc);
        deleted.race_recent_results = await raceRecentResultRepo.deleteOlderThan(thresholdUtc);
        deleted.race_entries = await raceEntryRepo.deleteOlderThan(thresholdUtc);
        deleted.races = await raceRepo.deleteOlderThan(thresholdUtc);
        deleted.programs = await programRepo.deleteOlderThan(thresholdUtc);
        deleted.race_schedules = await raceScheduleRepo.deleteOlderThan(thresholdUtc);

        console.log('[cleanupService] done', deleted);

        await jobRunRepo.finishJobRun(jobRunId, 'success', { deleted });
        return { success: true, jobRunId, deleted };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[cleanupService] error: ${message}`);

        await jobRunRepo.recordJobError({
            job_run_id: jobRunId,
            step: 'cleanup',
            error_type: 'db',
            message,
            detail: null,
            stack_trace: err instanceof Error ? (err.stack ?? null) : null,
            retry_count: null,
            context: null,
        });
        await jobRunRepo.finishJobRun(jobRunId, 'failed', { deleted, error: message });
        return { success: false, jobRunId, deleted };
    }
}
