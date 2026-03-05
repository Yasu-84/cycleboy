/** race_predictions テーブルの型定義 */
export interface RacePrediction {
    id: string;
    /** ネットケイリンのレースID */
    netkeiba_race_id: string;
    /** セクション1（自信度）の内容 */
    section1_confidence: string;
    /** セクション2（展開予想）の内容 */
    section2_development: string;
    /** セクション3（ライン別評価）の内容 */
    section3_line_evaluation: string;
    /** セクション4（本命シナリオ）の内容 */
    section4_favorite_scenario: string;
    /** セクション5（中穴シナリオ）の内容 */
    section5_medium_hole_scenario: string;
    /** セクション6（推奨買い目）の内容 */
    section6_recommended_bets: string;
    /** セクション7（寅次郎の一言）の内容 */
    section7_aim_word: string;
    created_at: string;
}

/** race_predictions INSERT/UPSERT 用の型 */
export type RacePredictionInput = Omit<RacePrediction, 'id' | 'created_at'>;
