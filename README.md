# CycleBoy - 競輪予想AIシステム

競輪（Keirin）のレース情報をスクレイピングし、AI（Gemini）を活用して予想を生成するシステムです。Next.js 16 + Supabase + Gemini API で構成されています。

## 主な機能

- **レース日程・プログラムのスクレイピング** — グレードレース（GP〜G3）の日程・開催情報を自動取得
- **出走表の取得** — 基本情報・直近成績・対戦表・並び予想を車番単位で取得
- **レース結果・払戻金の取得** — 着順・上りタイム・決め手と、7券種の払戻金を自動取得
- **AI予想の生成** — Gemini API を使用して展開予想・買い目を生成（7セクション構成）
- **データ自動クリーンアップ** — 31日以上経過したデータを FK 制約に従って順次削除
- **管理画面** — スクレイピング・予想の手動実行、ジョブ実行履歴の確認
- **レース一覧・エントリー詳細** — 開催単位のレース一覧と、7タブ構成のエントリー詳細ページ

## コマンド

```bash
npm run dev          # 開発サーバー起動 (localhost:3000)
npm run build        # プロダクションビルド
npm run lint         # ESLint (flat config, next/core-web-vitals + next/typescript)
npm run scrape       # スクレイピング実行 (tsx scripts/scrape.ts [step] [target_date])
npm run cleanup      # データクリーンアップ実行 (tsx scripts/cleanup.ts)
npm run check-env    # 環境変数の確認 (tsx scripts/check-env.ts)
```

## 前提条件

- Node.js 22+
- [Supabase](https://supabase.com) アカウント（プロジェクト作成済みであること）
- [Gemini API キー](https://makersuite.google.com/app/apikey)（Google AI Studio で取得）
- [Vercel](https://vercel.com) アカウント（デプロイ先）

## セットアップ

### 1. Supabase プロジェクトの作成（外部操作）

Supabase ダッシュボードで新しいプロジェクトを作成し、SQL エディタで以下のマイグレーションファイルを順番に実行してください。

1. **`docs/migrations/001_create_tables.sql`** — 全テーブル・インデックス作成
2. **`docs/migrations/002_setup_rls.sql`** — RLS ポリシー設定

```bash
# Supabase CLI を使用する場合
supabase db push
```

アプリケーションは `SUPABASE_SERVICE_ROLE_KEY` でアクセスするため、RLS を有効化しても Service Role は全テーブルにアクセス可能です。

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、値を設定してください。

```env
# --- Supabase（必須）---
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# --- 管理エンドポイント認証（必須）---
ADMIN_API_KEY=your-strong-random-key

# --- Gemini API（必須）---
GEMINI_API_KEY=your-gemini-api-key

# --- Gemini 設定（任意）---
GEMINI_MODEL=gemini-2.0-flash-exp        # デフォルト: gemini-2.0-flash-exp
GEM_SYSTEM_PROMPT=...                     # AI予想のシステムプロンプト

# --- GitHub Actions 手動起動用（Vercel Cron使用時は不要）---
GITHUB_OWNER=your-github-username
GITHUB_REPO=cycleboy
GITHUB_TOKEN=github_pat_xxx

# --- Vercel Cron 認証（Vercel Cron使用時のみ）---
CRON_SECRET=your-cron-secret

# --- スクレイピング設定（任意）---
SCRAPE_DELAY_MS=500                       # リクエスト間隔（デフォルト: 500ms）
```

### 3. GitHub リポジトリ Secrets の設定（外部操作）

GitHub リポジトリの **Settings → Secrets and variables → Actions** に以下を設定してください。

| Secret 名 | 値 |
|-----------|---|
| `SUPABASE_URL` | Supabase プロジェクトの API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role キー |
| `GEMINI_API_KEY` | Gemini API キー |
| `GEMINI_MODEL` | 使用するモデル名（例: `gemini-1.5-flash`） |
| `GEM_SYSTEM_PROMPT` | AI予想のシステムプロンプト（未設定時は `predictionService.ts` 内のミニマルプロンプトが使用される） |
| `SCRAPE_DELAY_MS` | リクエスト間隔ミリ秒（例: `500`） |

> **注意**: GitHub Secrets は値を確認できない仕様です。更新が必要な場合は上書き設定してください。

### 4. Vercel へのデプロイ（外部操作）

```bash
vercel --prod
```

デプロイ後、Vercel ダッシュボードの **Settings → Environment Variables** に本番用の環境変数を設定してください。

| 環境変数 | 備考 |
|----------|------|
| `SUPABASE_URL` | |
| `SUPABASE_SERVICE_ROLE_KEY` | |
| `ADMIN_API_KEY` | |
| `GEMINI_API_KEY` | |
| `GEMINI_MODEL` | |
| `CRON_SECRET` | `/api/cron/*` の認証用（設定しない場合 cron エンドポイントは機能しない） |

> **注意**: 現在 `vercel.json` に Cron スケジュールの定義がありません。定期実行は GitHub Actions で行っています。Vercel Cron を使用する場合は `vercel.json` に `crons` 設定を追加し、`CRON_SECRET` を設定してください。

### 5. GitHub Personal Access Token の作成（外部操作）

管理画面から GitHub Actions を起動するには、`.env.local` に `GITHUB_TOKEN` が必要です。

- **種別**: Fine-grained Personal Access Token 推奨
- **スコープ**: `Contents`（読み取り）+ `Actions`（書き込み・workflow_dispatch）

## プロジェクト構造

```
src/
├── app/
│   ├── admin/                    # 管理画面（ジョブ実行・履歴表示）
│   ├── api/
│   │   ├── admin/                # 管理API（x-admin-api-key 認証）
│   │   │   ├── job-runs/         #   ジョブ実行履歴取得
│   │   │   ├── prediction/       #   AI予想実行
│   │   │   └── trigger/          #   GitHub Actions 起動プロキシ
│   │   ├── cron/                 # Vercel Cron（CRON_SECRET 認証）
│   │   │   ├── cleanup/          #   クリーンアップ
│   │   │   ├── result/           #   結果スクレイピング
│   │   │   └── scrape/           #   フルスクレイピング
│   │   └── health/               # ヘルスチェック
│   ├── components/               # 共通UIコンポーネント（Header）
│   ├── race/
│   │   └── entry/                # エントリー詳細（7タブ）
│   │       ├── BasicInfoTab      #   出走表
│   │       ├── RecentResultsTab  #   直近成績
│   │       ├── MatchResultsTab   #   対戦表
│   │       ├── FormationTab      #   並び予想
│   │       ├── AIPredictionTab   #   AI予想
│   │       ├── BettingTab        #   買い目
│   │       └── ResultTab         #   結果・払戻
│   ├── race_list/                # レース一覧
│   ├── globals.css               # グローバルCSS（昭和レトロデザイン）
│   ├── layout.tsx
│   └── page.tsx                  # トップページ（月間日程）
├── lib/
│   ├── repositories/             # Supabase データアクセス層
│   │   ├── jobRunRepository.ts
│   │   ├── programRepository.ts
│   │   ├── raceEntryRepository.ts
│   │   ├── raceMatchResultRepository.ts
│   │   ├── racePredictionRepository.ts
│   │   ├── raceRecentResultRepository.ts
│   │   ├── raceRefundRepository.ts
│   │   ├── raceRepository.ts
│   │   ├── raceResultRepository.ts
│   │   └── raceScheduleRepository.ts
│   ├── scrapers/                 # HTMLスクレイパー（axios + cheerio）
│   │   ├── fetchUtils.ts         #   HTTPユーティリティ（リトライ・レート制限）
│   │   ├── raceEntryScraper.ts
│   │   ├── raceMatchResultScraper.ts
│   │   ├── raceProgramScraper.ts
│   │   ├── raceRecentResultScraper.ts
│   │   ├── raceResultScraper.ts
│   │   └── raceScheduleScraper.ts
│   ├── services/                 # ビジネスロジック
│   │   ├── cleanupService.ts     #   データクリーンアップ（31日保持）
│   │   ├── predictionService.ts  #   AI予想（Gemini API・3回リトライ）
│   │   └── scrapeService.ts      #   スクレイピングオーケストレーター
│   ├── supabase/
│   │   └── client.ts             # サーバーサイドSupabaseクライアント
│   └── utils/
│       ├── arrayUtils.ts
│       ├── authUtils.ts
│       ├── dateUtils.ts
│       └── gradeUtils.ts
├── types/                        # TypeScript型定義
scripts/                          # tsx で実行するスタンドアロンスクリプト
docs/migrations/                  # Supabase SQL マイグレーション
```

## ページ構成

| パス | 内容 |
|------|------|
| `/` | 月間レース日程（グレードバッジ・開催区分バッジ付き） |
| `/race_list?date=YYYYMMDD&jyo_cd=XX` | 開催別レース一覧（発走時刻・締切時刻付き） |
| `/race/entry?race_id=XXX` | エントリー詳細（7タブ構成） |
| `/admin` | 管理画面（ジョブ実行ボタン・履歴テーブル・3秒ポーリング） |

## APIエンドポイント

### 管理API（`x-admin-api-key` ヘッダーで認証）

| メソッド | パス | 内容 |
|----------|------|------|
| POST | `/api/admin/trigger` | GitHub Actions の workflow_dispatch を起動（202 を即時返却） |
| POST | `/api/admin/prediction` | AI予想をインライン実行 |
| GET | `/api/admin/job-runs` | ジョブ実行履歴を取得 |

### Cron API（`CRON_SECRET` Bearer トークンで認証）

| メソッド | パス | 内容 |
|----------|------|------|
| GET | `/api/cron/scrape` | フルスクレイピングをインライン実行 |
| GET | `/api/cron/result` | 結果スクレイピングをインライン実行 |
| GET | `/api/cron/cleanup` | データクリーンアップをインライン実行 |

### その他

| メソッド | パス | 内容 |
|----------|------|------|
| GET | `/api/health` | 環境変数の設定状況を確認 |

## スクレイピングのステップ

`scripts/scrape.ts` が実行するステップ：

| ステップ | 内容 |
|----------|------|
| `schedule` | レース日程のスクレイピング |
| `program` | プログラム（開催日ごとのレース一覧）のスクレイピング |
| `entry` | 出走表3種（基本情報・直近成績・対戦表）+ 並び予想のスクレイピング |
| `result` | レース結果（着順）+ 払戻金のスクレイピング |
| `prediction` | AI予想の生成（Gemini API） |
| `all` | schedule → program → entry → prediction を順次実行 |

## GitHub Actions

5つのワークフローが定義されています。すべて `npx tsx scripts/xxx.ts` で実行します。

| ワークフロー | スケジュール | 手動実行 | タイムアウト |
|---|---|---|---|
| `scrape.yml` | 毎日 JST 05:15 | `step` (all/schedule/program/entry/result) + `target_date` | 30分 |
| `result.yml` | 毎日 JST 23:00 | `target_date` | 30分 |
| `cleanup.yml` | 毎日 JST 05:00 | — | 10分 |
| `prediction.yml` | — （手動のみ） | `target_date` | 60分 |
| `ci.yml` | PR / push to main | — | 10分 |

ジョブの同時実行防止は `job_runs` テーブルによるロックと、GitHub Actions の `concurrency` グループの二重構造で行っています。

## AI予想

### 仕組み

`predictionService` が出走表・直近成績・対戦表のデータをプロンプトに整形し、Gemini API を呼び出します。3回の指数バックオフリトライ付きです。

### 予想セクション（7セクション）

1. **自信度** — レースの読みやすさの評価
2. **展開予想** — 前々・捲り等の展開予想
3. **ライン別評価** — 各ラインの戦力分析
4. **本命シナリオ** — 本命側の買い目
5. **中穴シナリオ** — 中穴側の買い目
6. **推奨買い目** — 最終的な推奨買い目
7. **寅次郎の一言** — 締めの一言

### プロンプトのカスタマイズ

AI予想のシステムプロンプトは `GEM_SYSTEM_PROMPT` 環境変数で制御しています。

| 実行環境 | 設定場所 | 内容 |
|----------|----------|------|
| 本番（GitHub Actions） | リポジトリ Secrets の `GEM_SYSTEM_PROMPT` | 7セクション形式の出力を指示するカスタムプロンプト |
| ローカル開発（`.env.local`） | 未設定 | `predictionService.ts` 内のミニマルプロンプトがフォールバック |

> **注意**: ローカル開発で本番と同等の予想結果を得るには、`.env.local` に `GEM_SYSTEM_PROMPT` を設定してください。本番用のプロンプト内容は GitHub Secrets で管理されているため、リポジトリコード上には含まれていません。

## ヘルスチェック

```bash
# ローカル環境変数の確認
npm run check-env

# 本番環境のヘルスチェック
curl https://your-app.vercel.app/api/health
```

正常な場合のレスポンス例：

```json
{
  "status": "ok",
  "environment": {
    "supabase_url": true,
    "supabase_service_role_key": true,
    "admin_api_key": true,
    "gemini_api_key": true,
    "gemini_model": "gemini-2.0-flash-exp"
  }
}
```

## トラブルシューティング

### 本番環境でAI予想がエラーになる場合

1. **環境変数の確認** — `npm run check-env` または `/api/health` で `GEMINI_API_KEY` が `true` か確認
2. **APIキーの有効性** — キーが期限切れでないか確認
3. **モデル名の確認** — `GEMINI_MODEL` で指定したモデルが存在するか確認（利用可能: `gemini-1.5-flash`, `gemini-2.0-flash-exp` 等）

### Supabase接続エラー

- `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` が正しく設定されているか確認
- Supabase プロジェクトがアクティブであることを確認

### GitHub Actionsエラー

- `GITHUB_TOKEN` に `workflow` スコープが含まれているか確認
- Fine-grained token を使用している場合は、リポジトリへのアクセス権限を確認
