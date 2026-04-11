import { supabase } from '@/lib/supabase/client';
import type { RaceMatchResult, RaceMatchResultInput } from '@/types/raceMatchResult';
import { deduplicateByKey } from '@/lib/utils/arrayUtils';

const TABLE = 'race_match_results';
const BATCH_SIZE = 500;

export async function upsertRaceMatchResults(records: RaceMatchResultInput[]): Promise<void> {
    if (records.length === 0) return;

    const deduped = deduplicateByKey(records, (r) => `${r.netkeiba_race_id}:${r.sha_no}`);

    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
        const batch = deduped.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from(TABLE)
            .upsert(batch, { onConflict: 'netkeiba_race_id,sha_no', ignoreDuplicates: false });

        if (error) throw new Error(`[raceMatchResultRepository.upsert] ${error.message}`);
    }
}

export async function getByRaceId(netkeiba_race_id: string): Promise<RaceMatchResult[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('netkeiba_race_id', netkeiba_race_id)
        .order('sha_no');

    if (error) throw new Error(`[raceMatchResultRepository.getByRaceId] ${error.message}`);
    return data ?? [];
}

export async function deleteOlderThan(threshold: string): Promise<number> {
    const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .lt('created_at', threshold)
        .select('id');

    if (error) throw new Error(`[raceMatchResultRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
