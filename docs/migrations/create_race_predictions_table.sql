-- race_predictions テーブル作成
-- AI予想機能用のテーブル

CREATE TABLE IF NOT EXISTS race_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    netkeiba_race_id TEXT NOT NULL UNIQUE,
    section1_confidence TEXT NOT NULL,
    section2_development TEXT NOT NULL,
    section3_line_evaluation TEXT NOT NULL,
    section4_favorite_scenario TEXT NOT NULL,
    section5_medium_hole_scenario TEXT NOT NULL,
    section6_recommended_bets TEXT NOT NULL,
    section7_aim_word TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_race_predictions_netkeiba_race_id ON race_predictions(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_race_predictions_created_at ON race_predictions(created_at);

-- コメント追加
COMMENT ON TABLE race_predictions IS 'AI予想情報を格納するテーブル';
COMMENT ON COLUMN race_predictions.netkeiba_race_id IS 'ネットケイリンのレースID（UNIQUE制約）';
COMMENT ON COLUMN race_predictions.section1_confidence IS 'セクション1（自信度）の内容';
COMMENT ON COLUMN race_predictions.section2_development IS 'セクション2（展開予想）の内容';
COMMENT ON COLUMN race_predictions.section3_line_evaluation IS 'セクション3（ライン別評価）の内容';
COMMENT ON COLUMN race_predictions.section4_favorite_scenario IS 'セクション4（本命シナリオ）の内容';
COMMENT ON COLUMN race_predictions.section5_medium_hole_scenario IS 'セクション5（中穴シナリオ）の内容';
COMMENT ON COLUMN race_predictions.section6_recommended_bets IS 'セクション6（推奨買い目）の内容';
COMMENT ON COLUMN race_predictions.section7_aim_word IS 'セクション7（寅次郎の一言）の内容';
COMMENT ON COLUMN race_predictions.created_at IS '登録日時';
