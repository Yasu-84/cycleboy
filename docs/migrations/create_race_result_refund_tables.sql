-- レース結果テーブル
CREATE TABLE IF NOT EXISTS race_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    netkeiba_race_id TEXT NOT NULL REFERENCES races(netkeiba_race_id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    waku_no INTEGER NOT NULL,
    sha_no INTEGER NOT NULL,
    player_name TEXT NOT NULL,
    margin TEXT,
    last_lap NUMERIC(4,1),
    move_type TEXT,
    sb_flag TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (netkeiba_race_id, sha_no)
);

COMMENT ON TABLE race_results IS 'レース着順結果';
COMMENT ON COLUMN race_results.rank IS '着順（1〜9）';
COMMENT ON COLUMN race_results.waku_no IS '枠番';
COMMENT ON COLUMN race_results.sha_no IS '車番';
COMMENT ON COLUMN race_results.player_name IS '選手名';
COMMENT ON COLUMN race_results.margin IS '着差（例: 1車身1/2, 3/4車輪）';
COMMENT ON COLUMN race_results.last_lap IS '上りタイム';
COMMENT ON COLUMN race_results.move_type IS '決め手（差/捲/逃 等）';
COMMENT ON COLUMN race_results.sb_flag IS 'S/Bフラグ';

-- 払戻金テーブル
CREATE TABLE IF NOT EXISTS race_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    netkeiba_race_id TEXT NOT NULL REFERENCES races(netkeiba_race_id) ON DELETE CASCADE,
    bet_type TEXT NOT NULL,
    combination TEXT NOT NULL,
    payout INTEGER NOT NULL,
    popularity INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (netkeiba_race_id, bet_type, combination)
);

COMMENT ON TABLE race_refunds IS 'レース払戻金';
COMMENT ON COLUMN race_refunds.bet_type IS '券種（枠複/枠単/２車複/２車単/ワイド/３連複/３連単）';
COMMENT ON COLUMN race_refunds.combination IS '組番（例: 3-5, 5>3>9）';
COMMENT ON COLUMN race_refunds.payout IS '払戻金（円）';
COMMENT ON COLUMN race_refunds.popularity IS '人気';

-- インデックス
CREATE INDEX IF NOT EXISTS idx_race_results_race_id ON race_results(netkeiba_race_id);
CREATE INDEX IF NOT EXISTS idx_race_refunds_race_id ON race_refunds(netkeiba_race_id);

-- RLS有効化
ALTER TABLE race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_refunds ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（Service RoleKeyでアクセスするため、 anon には見せない想定だが
-- 既存テーブルに合わせて認証済みユーザーのみアクセス可能とする）
CREATE POLICY "Authenticated users can read race_results"
    ON race_results FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert race_results"
    ON race_results FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update race_results"
    ON race_results FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read race_refunds"
    ON race_refunds FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert race_refunds"
    ON race_refunds FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update race_refunds"
    ON race_refunds FOR UPDATE
    TO authenticated
    USING (true);
