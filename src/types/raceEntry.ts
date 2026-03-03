/** formation_prediction JSONB の構造 */
export interface FormationPrediction {
    lines: Array<{
        sha_nos: number[];
    }>;
}

/** race_entries テーブルの型定義 */
export interface RaceEntry {
    id: string;
    netkeiba_race_id: string;
    /** 枠番（1〜9） */
    waku_no: number;
    /** 車番（1〜9） */
    sha_no: number;
    player_name: string;
    prefecture: string;
    age: number;
    /** 期別（例: "99期"） */
    kinen: string;
    /** 級班（S1/S2/A1/A2/A3） */
    class_rank: string;
    /** 競走得点 */
    score: number;
    /** 脚質（自/両/追/マ） */
    leg_type: string;
    sprint_count: number;
    back_count: number;
    nige: number;
    makuri: number;
    sashi: number;
    mark: number;
    rank1: number;
    rank2: number;
    rank3: number;
    out_of_rank: number;
    /** 勝率（%） */
    win_rate: number;
    /** 2連対率（%） */
    second_rate: number;
    /** 3連対率（%） */
    third_rate: number;
    gear_ratio: number;
    comment: string | null;
    formation_prediction: FormationPrediction | null;
    created_at: string;
}

/** race_entries INSERT/UPSERT 用の型 */
export type RaceEntryInput = Omit<RaceEntry, 'id' | 'created_at'>;
