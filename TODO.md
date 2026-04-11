# CycleBoy 残タスクリスト

## 完了済み（2026-04-10）

- [x] **#1** 管理者APIキーのクライアント露出 → Server Actions移行
- [x] **#2-3** ジョブロック修正（TOCTOU競合 + 孤立ジョブ30分タイムアウト）
- [x] **#6** スクレイパー11箇所の空catchにログ追加

---

## 未対応タスク

### High 優先度

- [x] **#7** GitHub Actionsにリトライなし → `nick-fields/retry@v3` で max_attempts: 3 を追加
  - 対象: `.github/workflows/scrape.yml`, `cleanup.yml`, `prediction.yml`, `result.yml`
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
