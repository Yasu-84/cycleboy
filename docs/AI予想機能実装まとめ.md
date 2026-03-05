# AI予想機能実装まとめ

## 概要

AI予想機能を、既存のスクレイピングシステムに統合して実装しました。出走表のスクレイピング完了後、AIを活用して予想情報を自動生成する機能を追加しました。

## 実装内容

### 1. 予想情報のタイプ定義

**ファイル**: [`src/types/racePrediction.ts`](../src/types/racePrediction.ts)

予想情報のデータ構造を定義しました。以下のフィールドを含みます：

- `netkeiba_race_id`: ネットケイリンのレースID
- `section1_confidence`: セクション1（自信度）の内容
- `section2_development`: セクション2（展開予想）の内容
- `section3_line_evaluation`: セクション3（ライン別評価）の内容
- `section4_favorite_scenario`: セクション4（本命シナリオ）の内容
- `section5_medium_hole_scenario`: セクション5（中穴シナリオ）の内容
- `section6_recommended_bets`: セクション6（推奨買い目）の内容
- `section7_aim_word`: セクション7（寅次郎の一言）の内容
- `created_at`: 登録日時

### 2. 予想情報のリポジトリ

**ファイル**: [`src/lib/repositories/racePredictionRepository.ts`](../src/lib/repositories/racePredictionRepository.ts)

予想情報のデータベース操作を行うリポジトリを作成しました。以下のメソッドを提供します：

- `upsertRacePrediction()`: 予想情報をUPSERTする
- `getByRaceId()`: 指定レースIDの予想情報を取得する
- `getByDate()`: 指定日付の全予想情報を取得する
- `deleteOlderThan()`: 古いレコードを削除する（cleanup処理）

### 3. AI予想サービス

**ファイル**: [`src/lib/services/predictionService.ts`](../src/lib/services/predictionService.ts)

AI予想の生成と管理を行うサービスを作成しました。主な機能：

- `run()`: 指定日付の全レースに対して予想を生成
- `generatePrediction()`: 指定レースIDの予想を生成
- `loadPrompt()`: 予想プロンプトを読み込み
- `callAI()`: Gemini APIを呼び出して予想を取得
- `formatRaceData()`: レースデータを整形してプロンプト用にする
- `parseAIResponse()`: AIのレスポンスをパースして予想情報を作成

#### 使用するLLM

- モデル: `gemini-3.1-pro-preview`
- APIキー: 環境変数 `GEMINI_API_KEY` から取得

#### 予想プロンプト

**ファイル**: [`docs/prediction-prompt.txt`](prediction-prompt.txt)

競輪予想の専門家としての役割を定義し、以下の内容を含む詳細なプロンプトを提供：

- レースIDの構造理解
- データ取得手順（基本情報、直近成績、選手コメント、対戦表）
- 分析フレームワーク（トレンド、複合判定、チェックリスト）
- グレード別予想ロジック（G1、G2/G3、F1/F2、ガールズケイリン、ミッドナイト競輪）
- 出力フォーマット（セクション1〜7）

### 4. スクレイピングサービスへの統合

**ファイル**: [`src/lib/services/scrapeService.ts`](../src/lib/services/scrapeService.ts)

既存のスクレイピングサービスにAI予想機能を統合しました：

- `ScrapeOptions` に `skipPrediction` オプションを追加
- `JobStep` に `'prediction'` を追加
- `runAll()` 関数にAI予想実行を追加
- `runPredictionStep()` 関数を新規追加

#### 実行フロー

1. STEP 1: レース日程スクレイピング
2. STEP 2: 当日開催競輪場の特定
3. STEP 3: レースプログラムスクレイピング
4. STEP 5: 出走表3種スクレイピング
5. **STEP 6: AI予想実行**（新規追加）
6. STEP 7: ジョブロック解放

### 5. 管理画面API

#### AI予想実行API

**ファイル**: [`src/app/api/admin/prediction/route.ts`](../src/app/api/admin/prediction/route.ts)

AI予想の手動実行を行うAPIを作成しました：

- エンドポイント: `POST /api/admin/prediction`
- 認証: `x-admin-api-key` ヘッダー
- リクエストボディ:
  - `target_date` (オプション): 対象日付（YYYY-MM-DD形式）
- レスポンス: 予想実行結果（サマリー、エラー）

#### トリガーAPIの更新

**ファイル**: [`src/app/api/admin/trigger/route.ts`](../src/app/api/admin/trigger/route.ts)

既存のトリガーAPIを更新して、AI予想をサポート：

- `Workflow` に `'prediction'` を追加
- `Step` に `'prediction'` を追加
- `prediction.yml` ワークフローのサポートを追加

### 6. タイプ定義の更新

#### JobStepの更新

**ファイル**: [`src/types/jobRun.ts`](../src/types/jobRun.ts)

```typescript
export type JobStep = 'all' | 'schedule' | 'program' | 'entry' | 'prediction' | 'cleanup';
```

#### ErrorTypeの更新

**ファイル**: [`src/types/jobError.ts`](../src/types/jobError.ts)

```typescript
export type ErrorType = 'http' | 'parse' | 'db' | 'timeout' | 'prediction';
```

### 7. データベースマイグレーション

**ファイル**: [`docs/migrations/create_race_predictions_table.sql`](create_race_predictions_table.sql)

`race_predictions` テーブルを作成するSQLファイルを作成しました：

- テーブル構造: UUID主キー、netkeiba_race_id（UNIQUE制約）、セクション1〜7、created_at
- インデックス: netkeiba_race_id、created_at
- コメント: 各カラムに説明を追加

**ファイル**: [`docs/migrations/setup_race_predictions_rls.sql`](setup_race_predictions_rls.sql)

`race_predictions` テーブルにRow Level Security (RLS)を設定するSQLファイルを作成しました：

- RLSの有効化
- SELECT/INSERT/UPDATE/DELETEポリシーの設定
- 認証済みユーザーのみアクセス可能

#### RLSポリシーの設定手順

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

### 8. ドキュメントの更新

**ファイル**: [`README.md`](../README.md)

READMEを更新して、AI予想機能の使用方法を追加：

- 概要の更新
- 環境変数の設定（GEMINI_API_KEYの追加）
- データベースのセットアップ手順
- AI予想機能の使用方法（自動実行、手動実行）
- 予想プロンプトのカスタマイズ方法
- プロジェクト構造の更新

## 使用方法

### 自動実行

スクレイピング完了後に自動的にAI予想が実行されます：

```typescript
import { run } from '@/lib/services/scrapeService';

// 全ステップ実行（AI予想含む）
await run({ step: 'all' });

// AI予想をスキップして実行
await run({ step: 'all', skipPrediction: true });
```

### 手動実行

#### API経由

```bash
curl -X POST http://localhost:3000/api/admin/prediction \
  -H "Content-Type: application/json" \
  -H "x-admin-api-key: your_admin_api_key" \
  -d '{"target_date": "2026-03-05"}'
```

#### サービス経由

```typescript
import { run } from '@/lib/services/predictionService';

// 今日の予想を実行
const result = await run();

// 特定の日付の予想を実行
const result = await run({ targetDate: '2026-03-05' });
```

### 予想情報の取得

```typescript
import * as racePredictionRepo from '@/lib/repositories/racePredictionRepository';

// レースIDで取得
const prediction = await racePredictionRepo.getByRaceId('202603053112');

// 日付で取得
const predictions = await racePredictionRepo.getByDate('2026-03-05');
```

## 環境変数

以下の環境変数を `.env.local` に設定してください：

```env
# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# 既存の環境変数
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ADMIN_API_KEY=your_admin_api_key
```

## 注意点

1. **データベースのセットアップ**: 
   - `docs/migrations/create_race_predictions_table.sql` を実行して、`race_predictions` テーブルを作成してください。
   - `docs/migrations/setup_race_predictions_rls.sql` を実行して、RLSポリシーを設定してください。

2. **APIキーの設定**: `GEMINI_API_KEY` 環境変数を設定してください。

3. **プロンプトのカスタマイズ**: `docs/prediction-prompt.txt` を編集することで、予想のロジックや出力形式をカスタマイズできます。

4. **エラーハンドリング**: AI予想の実行中にエラーが発生しても、他のレースの予想は継続して実行されます。

5. **既存機能への影響**: AI予想機能は既存のスクレイピング機能に影響を与えません。`skipPrediction` オプションを使用して、AI予想をスキップすることも可能です。

6. **RLSポリシー**: `race_predictions` テーブルにRLSポリシーを設定することで、認証済みユーザーのみがデータにアクセスできるようになります。匿名ユーザーはデータにアクセスできません。

## 今後の拡張案

1. 予想精度の評価機能
2. 予想結果の履歴管理
3. 予想プロンプトのA/Bテスト
4. 複数のLLMモデルの比較
5. 予想結果の可視化UI
6. ユーザーへの予想通知機能

## まとめ

AI予想機能を既存のスクレイピングシステムに統合し、出走表のスクレイピング完了後に自動的に予想を生成する機能を実装しました。管理画面からの手動実行も可能で、既存機能への影響を最小限に抑えた実装となっています。
