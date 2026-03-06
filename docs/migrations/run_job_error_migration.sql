-- job_errors テーブルに詳細情報用カラムを追加
-- このマイグレーションは、job_errors テーブルにスタックトレース・リトライ回数・影響範囲（コンテキスト）を追加します
-- 注意: 本番環境では stack_trace にセンシティブ情報が含まれる可能性があるため、本番環境での使用には注意が必要です

-- スタックトレース（本番環境ではマスク化が必要）
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS stack_trace TEXT;
COMMENT ON COLUMN job_errors.stack_trace IS 'スタックトレース（本番環境ではマスク化が必要）';

-- リトライ回数
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS retry_count INTEGER;
COMMENT ON COLUMN job_errors.retry_count IS 'リトライ回数';

-- 影響範囲（例: race_id, jyo_cd, sha_no, target_date）
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS context JSONB;
COMMENT ON COLUMN job_errors.context IS '影響範囲（例: race_id, jyo_cd, sha_no, target_date）';

-- インデックスの追加（検索・並べ替え性能向上）
CREATE INDEX IF NOT EXISTS idx_job_errors_job_run_id_step ON job_errors(job_run_id, step);
CREATE INDEX IF NOT EXISTS idx_job_errors_error_type ON job_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_job_errors_occurred_at ON job_errors(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_errors_job_run_id_occurred_at ON job_errors(job_run_id, occurred_at DESC);
