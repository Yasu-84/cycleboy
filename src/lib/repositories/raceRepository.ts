import { supabase } from '@/lib/supabase/client';
import type { Race, RaceInput } from '@/types/race';

const TABLE = 'races';
const BATCH_SIZE = 500;

export async function upsertRaces(records: RaceInput[]): Promise<void> {
    if (records.length === 0) return;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from(TABLE)
            .upsert(batch, { onConflict: 'netkeiba_race_id', ignoreDuplicates: false });

        if (error) throw new Error(`[raceRepository.upsert] ${error.message}`);
    }
}

/**
 * 指定 Program ID のレースを全件取得する
 */
export async function getRacesByProgramId(program_id: string): Promise<Race[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('id,program_id,netkeiba_race_id,race_no,race_title,car_count,departure_time,deadline_time,created_at')
        .eq('program_id', program_id)
        .order('race_no');

    if (error) throw new Error(`[raceRepository.getByProgramId] ${error.message}`);
    return data ?? [];
}

/**
 * 指定日付の全レースを取得する（Program 経由で結合）
 * STEP 4: 当日 race_id リストの取得に使用
 */
export async function getRacesByDate(kaisai_date: string): Promise<Race[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('id,program_id,netkeiba_race_id,race_no,race_title,car_count,departure_time,deadline_time,created_at,programs!inner(kaisai_date)')
        .eq('programs.kaisai_date', kaisai_date)
        .order('race_no');

    if (error) throw new Error(`[raceRepository.getByDate] ${error.message}`);
    return (data ?? []) as Race[];
}

/**
 * 指定 Program ID のレースが存在するかチェック
 * /api/admin/scrape の前提条件バリデーションに使用
 */
export async function existsByProgramId(program_id: string): Promise<boolean> {
    const { count, error } = await supabase
        .from(TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('program_id', program_id);

    if (error) throw new Error(`[raceRepository.existsByProgramId] ${error.message}`);
    return (count ?? 0) > 0;
}

/**
 * races テーブルに1件以上データが存在するかチェック
 * step=entry 実行時の前提条件確認に使用
 */
export async function existsAny(): Promise<boolean> {
    const { count, error } = await supabase
        .from(TABLE)
        .select('id', { count: 'exact', head: true });

    if (error) throw new Error(`[raceRepository.existsAny] ${error.message}`);
    return (count ?? 0) > 0;
}

/**
 * created_at が閾値より古いレコードを削除する（cleanup 処理）
 * @returns 削除件数
 */
export async function deleteOlderThan(threshold: string): Promise<number> {
    const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .lt('created_at', threshold)
        .select('id');

    if (error) throw new Error(`[raceRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
