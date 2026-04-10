-- =====================================================================
-- CycleBoy RLS（Row Level Security）設定
-- Supabase (PostgreSQL) で実行してください
-- =====================================================================
--
-- 前提: アプリケーションは Service Role Key でアクセスするため
-- RLS を有効化しても Service Role は全テーブルにアクセス可能です。
-- 以下は anon / authenticated ロールに対する最小限の読み取り権限です。
-- =====================================================================

-- RLS を有効化
ALTER TABLE race_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE races               ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_recent_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_match_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_refunds        ENABLE ROW LEVEL SECURITY;
ALTER TABLE race_predictions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_errors          ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- 読み取りポリシー（anon + authenticated）
-- ------------------------------------------------------------------
-- レース関連テーブルは誰でも読み取り可能
-- 管理系テーブル（job_runs / job_errors）は認証済みのみ

CREATE POLICY "race_schedules_select"       ON race_schedules      FOR SELECT USING (true);
CREATE POLICY "programs_select"             ON programs            FOR SELECT USING (true);
CREATE POLICY "races_select"               ON races               FOR SELECT USING (true);
CREATE POLICY "race_entries_select"         ON race_entries        FOR SELECT USING (true);
CREATE POLICY "race_recent_results_select"  ON race_recent_results FOR SELECT USING (true);
CREATE POLICY "race_match_results_select"   ON race_match_results  FOR SELECT USING (true);
CREATE POLICY "race_results_select"         ON race_results        FOR SELECT USING (true);
CREATE POLICY "race_refunds_select"         ON race_refunds        FOR SELECT USING (true);
CREATE POLICY "race_predictions_select"     ON race_predictions    FOR SELECT USING (true);

CREATE POLICY "job_runs_select"             ON job_runs            FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "job_errors_select"           ON job_errors          FOR SELECT USING (auth.role() = 'authenticated');

-- ------------------------------------------------------------------
-- 書き込みポリシー（認証済みユーザーのみ）
-- ------------------------------------------------------------------

CREATE POLICY "job_runs_insert"      ON job_runs      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "job_runs_update"      ON job_runs      FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "job_errors_insert"    ON job_errors    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
