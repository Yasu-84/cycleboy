/** race_schedules テーブルの型定義 */
export interface RaceSchedule {
    id: string;
    jyo_cd: string;
    jyo_name: string;
    /** グレード（GP/G1/G2/G3/F1/F2） */
    grade: string;
    kaisai_name: string;
    start_date: string; // YYYY-MM-DD
    end_date: string;   // YYYY-MM-DD
    created_at: string;
}

/** race_schedules INSERT/UPSERT 用の型 */
export type RaceScheduleInput = Omit<RaceSchedule, 'id' | 'created_at'>;
