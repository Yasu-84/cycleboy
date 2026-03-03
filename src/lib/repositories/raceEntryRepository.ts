import { supabase } from '@/lib/supabase/client';
import type { RaceEntry, RaceEntryInput } from '@/types/raceEntry';

const TABLE = 'race_entries';

/**
 * 出走表（基本情報）を UPSERT する
 * UPSERT キー: (netkeiba_race_id, sha_no)
 */
export async function upsertRaceEntries(records: RaceEntryInput[]): Promise<void> {
    if (records.length === 0) return;

    const { error } = await supabase
        .from(TABLE)
        .upsert(records, { onConflict: 'netkeiba_race_id,sha_no', ignoreDuplicates: false });

    if (error) throw new Error(`[raceEntryRepository.upsert] ${error.message}`);
}

/**
 * 指定レース ID の出走表を全件取得する
 */
export async function getByRaceId(netkeiba_race_id: string): Promise<RaceEntry[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('netkeiba_race_id', netkeiba_race_id)
        .order('sha_no');

    if (error) throw new Error(`[raceEntryRepository.getByRaceId] ${error.message}`);
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

    if (error) throw new Error(`[raceEntryRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
