# CycleBoy - 競輪予想AIシステム

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 概要

CycleBoyは、競輪のレース情報をスクレイピングし、AIを活用して予想を生成するシステムです。

### 主な機能

- レース日程・プログラムのスクレイピング
- 出走表（基本情報・直近成績・対戦表）の取得
- AIによるレース予想の生成
- 管理画面からの手動実行

## Getting Started

### 前提条件

- Node.js 18+ 
- Supabaseアカウント
- Gemini APIキー

### 環境変数の設定

`.env.local`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 管理画面APIキー
ADMIN_API_KEY=your_admin_api_key

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# GitHub（GitHub Actionsを使用する場合）
GITHUB_OWNER=your_github_owner
GITHUB_REPO=your_github_repo
GITHUB_TOKEN=your_github_token
```

### データベースのセットアップ

1. Supabaseのダッシュボードで新しいプロジェクトを作成
2. SQLエディタで以下のマイグレーションファイルを実行：
   - `docs/migrations/create_race_predictions_table.sql` - テーブル作成
   - `docs/migrations/setup_race_predictions_rls.sql` - RLSポリシー設定

#### RLSポリシーの設定手順

`race_predictions` テーブルにRow Level Security (RLS)を設定するには、以下の手順を実行してください：

1. Supabaseダッシュボードにログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を選択
4. 「New query」をクリック
5. `docs/migrations/setup_race_predictions_rls.sql` の内容をコピー＆ペースト
6. 「Run」ボタンをクリックしてSQLを実行

または、Supabase CLIを使用している場合は：

```bash
supabase db push
```

これにより、`race_predictions` テーブルに対して以下のRLSポリシーが設定されます：

- **SELECTポリシー**: 認証済みユーザーのみレコードを参照可能
- **INSERTポリシー**: 認証済みユーザーのみレコードを挿入可能
- **UPDATEポリシー**: 認証済みユーザーのみレコードを更新可能
- **DELETEポリシー**: 認証済みユーザーのみレコードを削除可能

これにより、匿名ユーザーはデータにアクセスできず、認証済みユーザーのみがAI予想情報の読み書きが可能になります。

### 開発サーバーの起動

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## AI予想機能の使用方法

### 自動実行

スクレイピング完了後に自動的にAI予想が実行されます。`step='all'`でスクレイピングを実行すると、出走表のスクレイピング後にAI予想も実行されます。

### 手動実行

#### API経由

```bash
curl -X POST http://localhost:3000/api/admin/prediction \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: your_admin_api_key" \
  -d '{"target_date": "2026-03-05"}'
```

#### 管理画面から

管理画面の「AI予想実行」ボタンから手動で実行できます。

### 予想プロンプトのカスタマイズ

`docs/prediction-prompt.txt`ファイルを編集することで、AI予想のプロンプトをカスタマイズできます。

### ヘルスチェック

デプロイ後に環境変数が正しく設定されているかを確認するために、ヘルスチェックエンドポイントを使用できます：

```bash
curl https://your-app.vercel.app/api/health
```

ローカル開発環境で環境変数を確認するには、以下のコマンドを使用できます：

```bash
npm run check-env
```

正常な場合のレスポンス例：

```json
{
  "status": "ok",
  "timestamp": "2026-03-05T11:00:00.000Z",
  "environment": {
    "node_env": "production",
    "supabase_url": true,
    "supabase_service_role_key": true,
    "admin_api_key": true,
    "gemini_api_key": true,
    "gemini_model": "gemini-2.0-flash-exp",
    "github_owner": true,
    "github_repo": true,
    "github_token": true
  }
}
```

環境変数が不足している場合のレスポンス例：

```json
{
  "status": "error",
  "timestamp": "2026-03-05T11:00:00.000Z",
  "environment": {
    "supabase_url": true,
    "supabase_service_role_key": false,
    "admin_api_key": true,
    "gemini_api_key": false,
    "gemini_model": null,
    "github_owner": true,
    "github_repo": true,
    "github_token": true
  },
  "error": "Missing required environment variables",
  "missing": ["SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY"]
}
```

## プロジェクト構造

```
src/
├── app/                    # Next.jsアプリケーション
│   ├── api/               # APIルート
│   │   └── admin/        # 管理画面API
│   │       ├── prediction/ # AI予想API
│   │       └── trigger/   # ジョブトリガーAPI
│   └── race/             # レース関連ページ
├── lib/
│   ├── repositories/      # データベースリポジトリ
│   ├── scrapers/         # スクレイパー
│   ├── services/         # サービス層
│   │   ├── scrapeService.ts      # スクレイピングサービス
│   │   └── predictionService.ts # AI予想サービス
│   └── utils/            # ユーティリティ
└── types/                # TypeScript型定義
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## トラブルシューティング

### 本番環境で「Unexpected token 'A', "An error o"... is not valid JSON」エラーが発生する場合

このエラーは、AI API（Gemini API）からのレスポンスがJSONではなくエラーメッセージを返していることが原因です。

#### 原因の特定

1. **環境変数の確認**
   - Vercelダッシュボードの「Settings」→「Environment Variables」で以下の環境変数が正しく設定されているか確認してください：
     - `GEMINI_API_KEY`: Gemini APIキー
     - `GEMINI_MODEL`: 使用するモデル名（デフォルト: `gemini-2.0-flash-exp`）
     - `SUPABASE_URL`: SupabaseプロジェクトのURL
     - `SUPABASE_SERVICE_ROLE_KEY`: Supabase Service Roleキー

2. **APIキーの有効性確認**
   - `GEMINI_API_KEY`が有効であることを確認してください
   - APIキーが期限切れになっていないか確認してください
   - APIキーの権限が正しく設定されているか確認してください

3. **モデル名の確認**
   - `GEMINI_MODEL`で指定したモデルが存在することを確認してください
   - 利用可能なモデル: `gemini-1.5-pro`, `gemini-1.5-flash`, `gemini-2.0-flash-exp` など

#### 対処方法

1. **環境変数の確認**
   ```bash
   # ローカル開発環境で環境変数を確認
   npm run check-env
   
   # 本番環境でヘルスチェック
   curl https://your-app.vercel.app/api/health
   ```

2. **環境変数の再設定**
   ```bash
   # Vercel CLIを使用して環境変数を設定
   vercel env add GEMINI_API_KEY production
   vercel env add GEMINI_MODEL production
   vercel env add SUPABASE_URL production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```

3. **デプロイの再実行**
   ```bash
   vercel --prod
   ```

4. **ログの確認**
   - Vercelダッシュボードの「Logs」タブで詳細なエラーログを確認してください
   - エラーメッセージに含まれる詳細情報から原因を特定できます

#### エラーメッセージの例

- `GEMINI_API_KEY is not set`: 環境変数が設定されていません
- `Invalid API key`: APIキーが無効です
- `Model 'xxx' not found`: 指定したモデルが存在しません
- `Rate limit exceeded`: APIレート制限を超えました

### その他のエラー

#### Supabase接続エラー

- `SUPABASE_URL`と`SUPABASE_SERVICE_ROLE_KEY`が正しく設定されているか確認してください
- Supabaseプロジェクトがアクティブであることを確認してください

#### GitHub Actionsエラー

- `GITHUB_TOKEN`に`workflow`スコープが含まれているか確認してください
- Fine-grained tokenを使用している場合は、リポジトリへのアクセス権限を確認してください
