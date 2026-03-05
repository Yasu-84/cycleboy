import { supabase } from '@/lib/supabase/client';
import type { RacePrediction, RacePredictionInput } from '@/types/racePrediction';

const TABLE = 'race_predictions';

/**
 * 予想情報を UPSERT する
 * UPSERT キー: netkeiba_race_id（UNIQUE 制約）
 */
export async function upsertRacePrediction(record: RacePredictionInput): Promise<void> {
    const { error } = await supabase
        .from(TABLE)
        .upsert(record, { onConflict: 'netkeiba_race_id', ignoreDuplicates: false });

    if (error) throw new Error(`[racePredictionRepository.upsert] ${error.message}`);
}

/**
 * 指定レース ID の予想情報を取得する
 */
export async function getByRaceId(netkeiba_race_id: string): Promise<RacePrediction | null> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('netkeiba_race_id', netkeiba_race_id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // レコードが存在しない場合
            return null;
        }
        throw new Error(`[racePredictionRepository.getByRaceId] ${error.message}`);
    }
    return data;
}

/**
 * 指定日付の全予想情報を取得する
 */
export async function getByDate(kaisai_date: string): Promise<RacePrediction[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*, races!inner(*)')
        .eq('races.programs.kaisai_date', kaisai_date);

    if (error) throw new Error(`[racePredictionRepository.getByDate] ${error.message}`);
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

    if (error) throw new Error(`[racePredictionRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
