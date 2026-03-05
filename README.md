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
