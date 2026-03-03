/** programs テーブルの型定義 */
export interface Program {
    id: string;
    race_schedule_id: string;
    kaisai_date: string; // YYYY-MM-DD
    /** グレード（GP/G1/G2/G3/F1/F2） */
    grade: string;
    /** 開催区分（モーニング/ナイター/ミッドナイト/ガールズ）。通常開催は null */
    kaisai_type: string[] | null;
    /** プログラム種別（初日/2日目/最終日 等） */
    program_type: string;
    created_at: string;
}

/** programs INSERT/UPSERT 用の型 */
export type ProgramInput = Omit<Program, 'id' | 'created_at'>;
