import { supabase } from '@/lib/supabase/client';
import type { RaceRefund, RaceRefundInput } from '@/types/raceRefund';

const TABLE = 'race_refunds';

export async function upsertRaceRefunds(records: RaceRefundInput[]): Promise<void> {
    if (records.length === 0) return;

    const { error } = await supabase
        .from(TABLE)
        .upsert(records, { onConflict: 'netkeiba_race_id,bet_type,combination', ignoreDuplicates: false });

    if (error) throw new Error(`[raceRefundRepository.upsert] ${error.message}`);
}

export async function getByRaceId(netkeiba_race_id: string): Promise<RaceRefund[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('netkeiba_race_id', netkeiba_race_id)
        .order('bet_type');

    if (error) throw new Error(`[raceRefundRepository.getByRaceId] ${error.message}`);
    return data ?? [];
}

export async function deleteOlderThan(threshold: string): Promise<number> {
    const { data, error } = await supabase
        .from(TABLE)
        .delete()
        .lt('created_at', threshold)
        .select('id');

    if (error) throw new Error(`[raceRefundRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
