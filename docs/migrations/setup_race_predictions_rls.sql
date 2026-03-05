-- race_predictions テーブルのRLSポリシー設定
-- Row Level Security (RLS) を有効化し、適切なポリシーを設定

-- RLSを有効化
ALTER TABLE race_predictions ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "race_predictions_select_policy" ON race_predictions;
DROP POLICY IF EXISTS "race_predictions_insert_policy" ON race_predictions;
DROP POLICY IF EXISTS "race_predictions_update_policy" ON race_predictions;
DROP POLICY IF EXISTS "race_predictions_delete_policy" ON race_predictions;

-- 公開アクセス用のポリシー（認証済みユーザーのみアクセス可能）
CREATE POLICY "race_predictions_select_policy"
ON race_predictions
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "race_predictions_insert_policy"
ON race_predictions
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "race_predictions_update_policy"
ON race_predictions
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "race_predictions_delete_policy"
ON race_predictions
FOR DELETE
USING (auth.role() = 'authenticated');

-- コメント追加
COMMENT ON POLICY "race_predictions_select_policy" ON race_predictions IS '認証済みユーザーのみレコードを参照可能';
COMMENT ON POLICY "race_predictions_insert_policy" ON race_predictions IS '認証済みユーザーのみレコードを挿入可能';
COMMENT ON POLICY "race_predictions_update_policy" ON race_predictions IS '認証済みユーザーのみレコードを更新可能';
COMMENT ON POLICY "race_predictions_delete_policy" ON race_predictions IS '認証済みユーザーのみレコードを削除可能';
