import { supabase } from '@/lib/supabase/client';
import type { Program, ProgramInput } from '@/types/program';

const TABLE = 'programs';
const BATCH_SIZE = 500;

export async function upsertPrograms(records: ProgramInput[]): Promise<void> {
    if (records.length === 0) return;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const { error } = await supabase
            .from(TABLE)
            .upsert(batch, { onConflict: 'race_schedule_id,kaisai_date', ignoreDuplicates: false });

        if (error) throw new Error(`[programRepository.upsert] ${error.message}`);
    }
}

/**
 * 指定日付・競輪場の Program を取得する（race_schedule_id + kaisai_date で検索）
 */
export async function findProgramByScheduleAndDate(
    race_schedule_id: string,
    kaisai_date: string
): Promise<Program | null> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('race_schedule_id', race_schedule_id)
        .eq('kaisai_date', kaisai_date)
        .maybeSingle();

    if (error) throw new Error(`[programRepository.findByScheduleAndDate] ${error.message}`);
    return data;
}

/**
 * 指定日付の全 Program を取得する
 * STEP 4: 当日レース一覧の特定に使用
 */
export async function getProgramsByDate(kaisai_date: string): Promise<Program[]> {
    const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('kaisai_date', kaisai_date);

    if (error) throw new Error(`[programRepository.getByDate] ${error.message}`);
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

    if (error) throw new Error(`[programRepository.deleteOlderThan] ${error.message}`);
    return data?.length ?? 0;
}
