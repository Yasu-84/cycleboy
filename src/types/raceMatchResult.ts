/**
 * vs_records JSONB 構造
 * キー: 対戦相手の車番（文字列 "1"〜"9"）
 * 値:
 *   - "{勝ち}-{負け}" 形式（例: "1-4"）
 *   - null: 対戦履歴なし
 *   - "-": 自車番
 */
export type VsRecords = Record<string, string | null>;

/** race_match_results テーブルの型定義 */
export interface RaceMatchResult {
    id: string;
    netkeiba_race_id: string;
    waku_no: number;
    sha_no: number;
    player_name: string;
    /** 総合対戦成績（例: "2-10"）。null の場合あり */
    total: string | null;
    vs_records: VsRecords;
    created_at: string;
}

/** race_match_results INSERT/UPSERT 用の型 */
export type RaceMatchResultInput = Omit<RaceMatchResult, 'id' | 'created_at'>;
