# CycleBoy 残タスクリスト

## 完了済み（2026-04-10）

- [x] **#1** 管理者APIキーのクライアント露出 → Server Actions移行
- [x] **#2-3** ジョブロック修正（TOCTOU競合 + 孤立ジョブ30分タイムアウト）
- [x] **#6** スクレイパー11箇所の空catchにログ追加

---

## 完了済み（2026-04-11）

### High 優先度

- [x] **#7** GitHub Actionsにリトライなし → `nick-fields/retry@v3` で max_attempts: 3 を追加
- [x] **#8** PR向けCIパイプラインなし → `lint` + `build` を実行する `.github/workflows/ci.yml` を新規作成
- [x] **#5** `parseKaisaiDate` の日付解析バグ → 3桁月日の曖昧さを日付バリデーションで解消
- [x] **#4** `predictionService` の日付計算がUTC基準 → `getJstToday()` に修正
- [x] **#10** `raceEntryScraper` のoff-by-oneバグ → `tds.length < 22` に修正

### Medium 優先度

- [x] **#9** `cleanupService` にジョブロック追加 → **完了済み**（#2-3で対応）
- [x] **#11** タイミング攻撃に対するAPIキー比較 → `crypto.timingSafeEqual` に変更
- [x] **#12** 未定義CSS変数 `--color-brand` → `globals.css` に定義
- [x] **#13** ヘルスエンドポイントが認証なしで設定情報を漏洩 → `CRON_SECRET` 認証追加、booleanのみ返す
- [x] **#14** Repositoryのupsertにバッチサイズ制限がない → 500件チャンク送信に変更
- [x] **#15** 大量のコード重複 → `deduplicateByKey` を `arrayUtils.ts` に共通化
- [x] **#16** スケジュール競合: cleanup → JST 07:00 に変更
- [x] **#17** Gemini API呼び出しにタイムアウトなし → `AbortController` 30秒タイムアウト設定
- [x] **#18** `as any` 型キャストの多用 → `as unknown as T` に変更

### Low 優先度

- [x] **#19** GitHub ActionsがSHA固定ではない → コミットSHA + タグコメントに変更（Dependabotで自動更新）
- [x] **#20** Dependabot設定なし → `.github/dependabot.yml` 新規作成（GitHub Actions + npm、週次更新）
- [x] **#21** 失敗時の通知なし → 全ワークフローに `NOTIFY_WEBHOOK_URL` 条件付き通知ステップ追加
- [x] **#22** デッドコード削除: `parseTimes`, `extractJyoCdFromParam`, `formatJobType` → **既に削除済み**
- [x] **#23** no-op正規表現: `replace(/\//g, '/')` → `replace(/\//g, '-')` に修正（`raceRecentResultScraper.ts`）
- [x] **#24** `SCRAPE_DELAY_MS` のNaN検証なし → `Number.isNaN()` でフォールバック（`fetchUtils.ts`）
- [x] **#25** `loading.tsx` / `error.tsx` が存在しない → 全4ルートセグメントに追加
- [x] **#26** タブコンポーネントのARIA不完全 → `role="tabpanel"`, `aria-controls`, `aria-labelledby`, キーボードナビゲーション対応
- [x] **#27** インラインスタイルの混在 → 全11箇所をCSS Modulesに移行（6コンポーネント）
- [x] **#28** `select('*')` の多用 → 全リポジトリの14クエリを明示的列指定に変更
- [x] **#29** 管理者画面の3秒ポーリングがバックグラウンドでも継続 → `visibilitychange` 対応

---

## 環境変数の変更が必要（本番デプロイ時）

- `NEXT_PUBLIC_ADMIN_API_KEY` → `ADMIN_API_KEY` にリネーム
  - `.env.local.example` は既に `ADMIN_API_KEY` なので変更不要
  - Vercel / GitHub Secrets の環境変数名を更新すること

## 新規シークレット（通知機能用・任意）

- `NOTIFY_WEBHOOK_URL`: ワークフロー失敗時の通知用Webhook URL（Slack/Discord等）。設定しない場合通知はスキップされる。

---

**全タスク完了（2026-04-11）**
