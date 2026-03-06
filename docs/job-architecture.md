# ジョブ実行アーキテクチャ設計書

このドキュメントでは、本システムにおけるバッチ処理（スクレイピング、AI予想、データクリーンアップ）の実行基盤と実装方式について解説します。

## 1. 背景と課題
Vercel（Hobbyプラン）のサーバーレス関数には、最大実行時間（10秒）の制限があります。
競輪データのスクレイピングやAI予想は、1回の実行に数分〜数十分を要するため、Vercel上での直接実行はタイムアウトにより不可能です。

## 2. 解決策：GitHub Actions を活用した非同期実行
重たい処理の実行基盤として **GitHub Actions** を採用しています。GitHub Actions は最大6時間の実行が可能であり、かつVercelの実行制限を受けません。

### 処理のフロー
1. **トリガー（Admin UI）**:
   - 管理者が管理画面のボタンをクリック。
2. **API プロキシ (`/api/admin/trigger`)**:
   - Vercel上のAPI Routeがリクエストを受信。
   - GitHub API を叩き、`workflow_dispatch` イベントを送信して即座に `202 Accepted` を返す（これによりVercelは10秒以内に完了する）。
3. **実行（GitHub Actions）**:
   - 指定された Workflow ファイル（`.github/workflows/*.yml`）が起動。
   - インスタンスが立ち上がり、`scripts/scrape.ts` を実行して実処理を開始。
4. **記録（Supabase）**:
   - スクリプトが処理開始時・終了時に `job_runs` テーブルを更新し、進捗を記録。
   - 失敗時は `job_errors` にエラー詳細を書き出す。

## 3. 主要コンポーネント

### API プロキシ
- **ファイル**: `src/app/api/admin/trigger/route.ts`
- **役割**: 管理画面からのリクエストを GitHub API に中継。
- **セキュリティ**: `ADMIN_API_KEY` による認証。

### ワークフロー定義
- **ファイル**: 
  - `.github/workflows/scrape.yml`: 定期実行・手動スクレイピング
  - `.github/workflows/prediction.yml`: AI予想実行専用
  - `.github/workflows/cleanup.yml`: 旧データ削除専用
- **環境変数**: GitHub の **Secrets** を使用してビルド時に注入。

### 実行スクリプト
- **ファイル**: `scripts/scrape.ts`
- **役割**: 各ステップ（schedule, program, entry, prediction）の状態管理と、該当するサービスの呼び出し。

## 4. 環境変数の管理
GitHub Actions で実行されるため、環境変数は **GitHub の Secrets** に設定する必要があります。
Vercel の管理画面で設定した変数は Actions からは見えないため、共通する変数は両方に登録してください。

| 環境変数名 | 用途 | 設定場所 |
| :--- | :--- | :--- |
| `SUPABASE_URL` | DB接続 | Vercel & GitHub |
| `SUPABASE_SERVICE_ROLE_KEY` | DB操作（管理者権限） | Vercel & GitHub |
| `GEMINI_API_KEY` | AI予想の実行 | GitHub |
| `GEM_SYSTEM_PROMPT` | AIへの指示内容 | GitHub (推奨) |
| `GITHUB_TOKEN` | Actions のトリガー用 | Vercel |

## 5. 監視とトラブルシューティング
- **実行履歴**: 管理画面の「ジョブ実行履歴」タブから `job_runs` テーブルの内容を確認可能。
- **デバッグログ**: 失敗した際は GitHub の Actions タブから、詳細なステップ毎のコンソール出力を確認してください。
