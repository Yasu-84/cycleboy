/** race_results テーブルの型定義 */
export interface RaceResult {
    id: string;
    netkeiba_race_id: string;
    /** 着順（1〜9） */
    rank: number;
    /** 枠番（1〜7） */
    waku_no: number;
    /** 車番（1〜9） */
    sha_no: number;
    player_name: string;
    /** 着差（例: "1車身1/2", "3/4車輪"）。null の場合あり */
    margin: string | null;
    /** 上りタイム（例: 11.4） */
    last_lap: number | null;
    /** 決め手（"差"/"捲"/"逃" 等） */
    move_type: string | null;
    /** S/Bフラグ（"S", "B", null） */
    sb_flag: string | null;
    created_at: string;
}

/** race_results INSERT/UPSERT 用の型 */
export type RaceResultInput = Omit<RaceResult, 'id' | 'created_at'>;
