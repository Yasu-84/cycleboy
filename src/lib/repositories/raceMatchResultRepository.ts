import { supabase } from '@/lib/supabase/client';
import type { RaceMatchResult, RaceMatchResultInput } from '@/types/raceMatchResult';

const TABLE = 'race_match_results';

/**
 * 対戦成績を UPSERT する
 * UPSERT キー: (netkeiba_race_id, sha_no)
 */
export async function upsertRaceMatchResults(records: RaceMatchResultInput[]): Promise<void> {
    if (records.length === 0) return;

    const { error } = await supabase
        .from(TABLE)
        .upsert(records, { onConflict: 'netkeiba_race_id,sha_no', ignoreDuplicates: false });

    if (error) throw new Error(`[raceMatchResultRepository.upsert] ${error.message}`);
}

/**
 * 指定レース ID の対戦成績を全件取得する
 */
export async function getByRaceId(netkeiba_race_id: string): Promise<RaceMatchResult[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('netkeiba_race_id', netkeiba_race_id)
        .order('sha_no');

    if (error) throw new Error(`[raceMatchResultRepository.getByRaceId] ${error.message}`);
    return data ?? [];
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

    if (error) throw new Error(`[raceMatchResultRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
