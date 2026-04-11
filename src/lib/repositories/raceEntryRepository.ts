import { supabase } from '@/lib/supabase/client';
import type { RaceEntry, RaceEntryInput } from '@/types/raceEntry';
import { deduplicateByKey } from '@/lib/utils/arrayUtils';

const TABLE = 'race_entries';
const BATCH_SIZE = 500;

export async function upsertRaceEntries(records: RaceEntryInput[]): Promise<void> {
    if (records.length === 0) return;

    const deduped = deduplicateByKey(records, (r) => `${r.netkeiba_race_id}:${r.sha_no}`);

    for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
        const batch = deduped.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from(TABLE)
            .upsert(batch, { onConflict: 'netkeiba_race_id,sha_no', ignoreDuplicates: false });

        if (error) throw new Error(`[raceEntryRepository.upsert] ${error.message}`);
    }
}

export async function getByRaceId(netkeiba_race_id: string): Promise<RaceEntry[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('id,netkeiba_race_id,waku_no,sha_no,player_name,prefecture,age,kinen,class_rank,score,leg_type,sprint_count,back_count,nige,makuri,sashi,mark,rank1,rank2,rank3,out_of_rank,win_rate,second_rate,third_rate,gear_ratio,comment,formation_prediction,created_at')
        .eq('netkeiba_race_id', netkeiba_race_id)
        .order('sha_no');

    if (error) throw new Error(`[raceEntryRepository.getByRaceId] ${error.message}`);
    return data ?? [];
}

export async function deleteOlderThan(threshold: string): Promise<number> {
    const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .lt('created_at', threshold)
        .select('id');

    if (error) throw new Error(`[raceEntryRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
