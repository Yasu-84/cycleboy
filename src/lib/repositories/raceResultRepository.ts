import { supabase } from '@/lib/supabase/client';
import type { RaceResult, RaceResultInput } from '@/types/raceResult';

const TABLE = 'race_results';

export async function upsertRaceResults(records: RaceResultInput[]): Promise<void> {
    if (records.length === 0) return;

    const { error } = await supabase
        .from(TABLE)
        .upsert(records, { onConflict: 'netkeiba_race_id,sha_no', ignoreDuplicates: false });

    if (error) throw new Error(`[raceResultRepository.upsert] ${error.message}`);
}

export async function getByRaceId(netkeiba_race_id: string): Promise<RaceResult[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('netkeiba_race_id', netkeiba_race_id)
        .order('rank');

    if (error) throw new Error(`[raceResultRepository.getByRaceId] ${error.message}`);
    return data ?? [];
}

export async function deleteOlderThan(threshold: string): Promise<number> {
    const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .lt('created_at', threshold)
        .select('id');

    if (error) throw new Error(`[raceResultRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
