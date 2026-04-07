import { supabase } from '@/lib/supabase/client';
import type { RaceSchedule, RaceScheduleInput } from '@/types/raceSchedule';

const TABLE = 'race_schedules';

/**
 * レース日程を UPSERT する
 * UPSERT キー: (jyo_cd, start_date)
 */
export async function upsertRaceSchedules(records: RaceScheduleInput[]): Promise<void> {
    if (records.length === 0) return;

    const { error } = await supabase
        .from(TABLE)
        .upsert(records, { onConflict: 'jyo_cd,start_date', ignoreDuplicates: false });

    if (error) throw new Error(`[raceScheduleRepository.upsert] ${error.message}`);
}

/**
 * 指定月のレース日程を全件取得する
 * STEP 1 完了後の確認用
 */
export async function getRaceSchedulesByMonth(
    year: number,
    month: number
): Promise<RaceSchedule[]> {
    const startOfMonth = `${year}-${String(month).padStart(2, '0')}-01`;
    const endOfMonth = new Date(year, month, 0).toISOString().slice(0, 10);

    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .lte('start_date', endOfMonth)
        .gte('end_date', startOfMonth);

    if (error) throw new Error(`[raceScheduleRepository.getByMonth] ${error.message}`);
    return data ?? [];
}

/**
 * 指定日付が start_date〜end_date の範囲内にある開催を取得する
 * STEP 2: 当日開催競輪場の特定に使用
 */
export async function getActiveSchedulesByDate(targetDate: string): Promise<RaceSchedule[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .lte('start_date', targetDate)
        .gte('end_date', targetDate);

    if (error) throw new Error(`[raceScheduleRepository.getActive] ${error.message}`);
    return data ?? [];
}

/**
 * 指定競輪場コード・日付範囲でレース日程を1件取得する
 * STEP 3: programs の race_schedule_id 解決に使用
 */
export async function findScheduleByJyoAndDate(
    jyo_cd: string,
    targetDate: string
): Promise<RaceSchedule | null> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('jyo_cd', jyo_cd)
        .lte('start_date', targetDate)
        .gte('end_date', targetDate)
        .maybeSingle();

    if (error) throw new Error(`[raceScheduleRepository.findByJyoAndDate] ${error.message}`);
    return data;
}

/**
 * created_at が閾値より古いレコードを削除する（cleanup 処理）
 * @returns 削除件数
 */
export async function deleteOlderThan(threshold: string): Promise<number> {
    // まず削除候補の race_schedules を取得
    const { data: candidates, error: candidateError } = await supabase
        .from(TABLE)
        .select('id')
        .lt('created_at', threshold);

    if (candidateError) {
        throw new Error(`[raceScheduleRepository.deleteOlderThan] ${candidateError.message}`);
    }

    const candidateIds = (candidates ?? []).map((row) => row.id);
    if (candidateIds.length === 0) return 0;

    // programs に参照されている race_schedule_id は除外（FK違反回避）
    const { data: referencedRows, error: referencedError } = await supabase
        .from('programs')
        .select('race_schedule_id')
        .in('race_schedule_id', candidateIds);

    if (referencedError) {
        throw new Error(`[raceScheduleRepository.deleteOlderThan] ${referencedError.message}`);
    }

    const referencedIds = new Set((referencedRows ?? []).map((row) => row.race_schedule_id));
    const deletableIds = candidateIds.filter((id) => !referencedIds.has(id));
    if (deletableIds.length === 0) return 0;

    const { data: deletedRows, error: deleteError } = await supabase
        .from(TABLE)
        .delete()
        .in('id', deletableIds)
        .select('id');

    if (deleteError) throw new Error(`[raceScheduleRepository.deleteOlderThan] ${deleteError.message}`);
    return deletedRows?.length ?? 0;
}
