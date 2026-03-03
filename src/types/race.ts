/** races テーブルの型定義 */
export interface Race {
    id: string;
    program_id: string;
    /** ネットケイリンのレースID（HTMLのhref属性から抽出。例: "202603034412"） */
    netkeiba_race_id: string;
    /** レース番号（1〜24） */
    race_no: number;
    /** レースタイトル（例: "Ｓ級 初日特別選抜"） */
    race_title: string;
    /** 車立数（4〜9） */
    car_count: number;
    /** 発走時刻（HH:MM:SS 形式） */
    departure_time: string;
    /** 締切時刻（HH:MM:SS 形式） */
    deadline_time: string;
    created_at: string;
}

/** races INSERT/UPSERT 用の型 */
export type RaceInput = Omit<Race, 'id' | 'created_at'>;
