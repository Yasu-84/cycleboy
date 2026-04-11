# CycleBoy 残タスクリスト

## 完了済み（2026-04-10）

- [x] **#1** 管理者APIキーのクライアント露出 → Server Actions移行
- [x] **#2-3** ジョブロック修正（TOCTOU競合 + 孤立ジョブ30分タイムアウト）
- [x] **#6** スクレイパー11箇所の空catchにログ追加

---

## 未対応タスク

### High 優先度

- [ ] **#7** GitHub Actionsにリトライなし → `nick-fields/retry` 等で max_attempts: 3 を追加
  - 対象: `.github/workflows/scrape.yml`, `cleanup.yml`, `prediction.yml`, `result.yml`
- [ ] **#8** PR向けCIパイプラインなし → `lint` + `typecheck` + `build` を実行する `.github/workflows/ci.yml` を新規作成
- [ ] **#5** `parseKaisaiDate` の日付解析バグ
  - 対象: `src/lib/utils/dateUtils.ts:49-51`
  - 3桁月日文字列（例: `"2026101"` = 10月1日）の誤解析。MDD vs MMD の曖昧さを解消
- [ ] **#4** `predictionService` の日付計算がUTC基準
  - 対象: `src/lib/services/predictionService.ts:90`
  - `new Date().toISOString().split('T')[0]` → `getJstToday()` に修正
- [ ] **#10** `raceEntryScraper` のoff-by-oneバグ
  - 対象: `src/lib/scrapers/raceEntryScraper.ts:57`
  - `tds.length < 21` → `< 22` に修正（`tds.eq(21)` にアクセスするため）

### Medium 優先度

- [x] **#9** `cleanupService` にジョブロック追加 → **完了済み**（#2-3で対応）
- [ ] **#11** タイミング攻撃に対するAPIキー比較
  - 対象: `src/app/api/admin/trigger/route.ts:43`, `prediction/route.ts:34`
  - `!==` → `crypto.timingSafeEqual` に変更
- [ ] **#12** 未定義CSS変数 `--color-brand`
  - 対象: `src/app/schedule.module.css:93-94`
  - `globals.css` に `--color-brand` を定義
- [ ] **#13** ヘルスエンドポイントが認証なしで設定情報を漏洩
  - 対象: `src/app/api/health/route.ts`
  - `CRON_SECRET` 認証を追加、または環境変数の有無のみ返す（現在はモデル名等も返す）
- [ ] **#14** Repositoryのupsertにバッチサイズ制限がない
  - 対象: 全リポジトリの `upsert*` メソッド（8ファイル）
  - 500件単位のチャンク送信に変更
- [ ] **#15** 大量のコード重複
  - `deduplicateByKey`: 3ファイル → 共通ユーティリティ化
  - `deleteOlderThan`: 8ファイル → 共通ジェネリック化
  - 選手情報解析: `raceEntryScraper` + `raceRecentResultScraper` → 共通パーサー化
  - `getGradeBadgeClass` 等: 4コンポーネント → 共通モジュール化
  - `formatTime`: 3コンポーネント → 共通化
  - `getWakuClass`: 5コンポーネント → 共通化
- [ ] **#16** スケジュール競合: cleanup(05:00) → scrape(05:15) が15分間隔
  - 対象: `.github/workflows/cleanup.yml`, `scrape.yml`
  - cleanupをscrape完了後（例: JST 07:00）に変更
- [ ] **#17** Gemini API呼び出しにタイムアウトなし
  - 対象: `src/lib/services/predictionService.ts`
  - `AbortController` で30秒タイムアウトを設定
- [ ] **#18** `as any` 型キャストの多用
  - `src/app/race/entry/page.tsx:75`, `race_list/page.tsx:103`, `page.tsx:124`
  - `supabase gen types` でスキーマ型を生成し、クライアントに適用

### Low 優先度

- [ ] **#19** GitHub ActionsがSHA固定ではない（タグ参照）
- [ ] **#20** Dependabot設定なし → `.github/dependabot.yml` 新規作成
- [ ] **#21** 失敗時の通知なし（Slack等）→ 全ワークフローに通知ステップ追加
- [ ] **#22** デッドコード削除: `parseTimes`, `extractJyoCdFromParam`, `formatJobType`（admin）
- [ ] **#23** no-op正規表現: `replace(/\//g, '/')` → `raceRecentResultScraper.ts:143`
- [ ] **#24** `SCRAPE_DELAY_MS` のNaN検証なし → `fetchUtils.ts:156`
- [ ] **#25** `loading.tsx` / `error.tsx` が存在しない → 全ルートセグメントに追加
- [ ] **#26** タブコンポーネントのARIA不完全 → `EntryTabs.tsx`
- [ ] **#27** インラインスタイルの混在 → 6コンポーネント（CSS Modulesに移行）
- [ ] **#28** `select('*')` の多用 → 全リポジトリ（必要列のみ取得）
- [ ] **#29** 管理者画面の3秒ポーリングがバックグラウンドでも継続 → `visibilitychange` 対応

---

## 環境変数の変更が必要（本番デプロイ時）

- `NEXT_PUBLIC_ADMIN_API_KEY` → `ADMIN_API_KEY` にリネーム
  - `.env.local.example` は既に `ADMIN_API_KEY` なので変更不要
  - Vercel / GitHub Secrets の環境変数名を更新すること
