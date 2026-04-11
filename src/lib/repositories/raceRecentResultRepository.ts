import { supabase } from '@/lib/supabase/client';
import type { RaceRecentResult, RaceRecentResultInput } from '@/types/raceRecentResult';
import { deduplicateByKey } from '@/lib/utils/arrayUtils';

const TABLE = 'race_recent_results';
const BATCH_SIZE = 500;

export async function upsertRaceRecentResults(records: RaceRecentResultInput[]): Promise<void> {
    if (records.length === 0) return;

    const deduped = deduplicateByKey(records, (r) => `${r.netkeiba_race_id}:${r.sha_no}`);

    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
        const batch = deduped.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from(TABLE)
            .upsert(batch, { onConflict: 'netkeiba_race_id,sha_no', ignoreDuplicates: false });

        if (error) throw new Error(`[raceRecentResultRepository.upsert] ${error.message}`);
    }
}

export async function getByRaceId(netkeiba_race_id: string): Promise<RaceRecentResult[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('netkeiba_race_id', netkeiba_race_id)
        .order('sha_no');

    if (error) throw new Error(`[raceRecentResultRepository.getByRaceId] ${error.message}`);
    return data ?? [];
}

export async function deleteOlderThan(threshold: string): Promise<number> {
    const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .lt('created_at', threshold)
        .select('id');

    if (error) throw new Error(`[raceRecentResultRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
