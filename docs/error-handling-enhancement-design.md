# エラーハンドリング強化設計書

> 作成日: 2026-03-06
> 対象: CycleBoy - 競輪予想AIシステム v0.1.0

---

## 1. 概要

### 1.1 目的
スクレイピング機能・AI予想機能のエラーハンドリングを強化し、トラブルシューティングや運用監視を容易にする。

### 1.2 背景
- エラー詳細情報が不足しており、問題の特定が困難
- HTTPステータスコード・レスポンス本文が記録されていない
- スタックトレースが記録されていない
- リトライ回数が記録されていない

---

## 2. 現状の課題

### 2.1 エラー詳細情報の不足

| 項目 | 現状 | 影響 |
|------|------|------|
| エラー詳細 | 多くの場合 `detail: null` | 問題の特定が困難 |
| HTTP情報 | ステータスコード・本文未記録 | 外部要因の調査が困難 |
| スタックトレース | 未記録 | デバッグが困難 |
| リトライ回数 | 未記録 | 再試行回数が不明 |

### 2.2 具体的な課題

**scrapeService.ts**:
```typescript
await jobRunRepo.recordJobError({
    job_run_id: jobRunId,
    step: 'schedule',
    error_type: 'http',
    message: msg,
    detail: null,  // ❌ 詳要情報がない
    // ❌ stack_trace がない
    // ❌ retry_count がない
    // ❌ context がない
});
```

**predictionService.ts**:
```typescript
await jobRunRepo.recordJobError({
    job_run_id: jobRunId,
    step: 'prediction',
    error_type: 'prediction',
    message: error,
    detail: null,  // ❌ 詳要情報がない
    // ❌ stack_trace がない
    // ❌ retry_count がない
    // ❌ context がない
});
```

---

## 3. 強化内容

### 3.1 型定義の拡張

#### 3.1.1 jobError.ts の拡張

**追加フィールド**:

| フィールド名 | 型 | 説明 |
|-----------|---|------|
| `stack_trace` | `string \| null` | スタックトレース（本番環境ではマスク化） |
| `retry_count` | `number \| null` | リトライ回数 |
| `context` | `Record<string, unknown> \| null` | 影響範囲（例: race_id, jyo_cd, sha_no） |

**変更後の型定義**:
```typescript
/** エラー種別 */
export type ErrorType = 'http' | 'parse' | 'db' | 'timeout' | 'prediction';

/** job_errors テーブルの型定義 */
export interface JobError {
    id: string;
    job_run_id: string;
    /** 失敗したステップ（例: "entry:202603034412"） */
    step: string;
    error_type: ErrorType;
    message: string;
    /** レスポンスコードや対象URL等の詳細 JSONB */
    detail: Record<string, unknown> | null;
    /** スタックトレース（本番環境ではマスク化） */
    stack_trace: string | null;
    /** リトライ回数 */
    retry_count: number | null;
    /** 影響範囲（例: race_id, jyo_cd, sha_no） */
    context: Record<string, unknown> | null;
    occurred_at: string;
}

/** job_errors INSERT 用の型 */
export type JobErrorInput = Omit<JobError, 'id' | 'occurred_at'>;
```

### 3.2 fetchUtils.ts の拡張

#### 3.2.1 FetchError インターフェースの追加

**追加機能**:
- HTTPエラーの詳細情報を含んだエラーオブジェクトを返す新しい関数を追加

**新しい型定義**:
```typescript
/** fetchPage のエラー情報 */
export interface FetchError extends Error {
    type: 'timeout' | 'http';
    url: string;
    statusCode?: number;
    statusText?: string;
    responseBody?: string;
    attempt: number;
}
```

**新しい関数**:
```typescript
/**
 * エラー情報付きでページを取得する（詳細エラーハンドリング用）
 * @param path - "/race/schedule/?..." 形式またはフル URL
 */
export async function fetchPageWithErrorDetails(path: string): Promise<{ 
    $: CheerioAPI; 
    error?: FetchError 
}> {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await axios.get<ArrayBuffer>(url, {
                timeout: DEFAULT_TIMEOUT_MS,
                headers: HEADERS,
                responseType: 'arraybuffer',
            });

            const html = Buffer.from(res.data).toString('utf-8');
            return { $: load(html) };
        } catch (err) {
            const isTimeout =
                axios.isAxiosError(err) &&
                (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED');

            if (isTimeout) {
                const timeoutError: FetchError = Object.assign(new Error(`Timeout fetching ${url}`), {
                    type: 'timeout',
                    url,
                    attempt,
                });
                return { error: timeoutError };
            }

            if (axios.isAxiosError(err)) {
                const axiosError = err;
                const httpError: FetchError = Object.assign(new Error(`HTTP ${axiosError.response?.status} fetching ${url}`), {
                    type: 'http',
                    url,
                    statusCode: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    responseBody: typeof axiosError.response?.data === 'string'
                        ? axiosError.response.data.substring(0, 500)
                        : undefined,
                    attempt,
                });

                if (attempt === MAX_RETRIES) {
                    return { error: httpError };
                }

                const delay = RETRY_DELAYS_MS[attempt] ?? 4_000;
                console.warn(
                    `[fetchPage] attempt ${attempt + 1} failed for ${url}, retrying in ${delay}ms...`
                );
                await sleep(delay);
                continue;
            }

            const otherError: FetchError = Object.assign(new Error(`Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`), {
                type: 'http',
                url,
                attempt,
            });
            return { error: otherError };
        }
    }

    throw new Error('unreachable');
}
```

### 3.3 scrapeService.ts の強化

#### 3.3.1 エラー記録の詳細化

**変更前**:
```typescript
await jobRunRepo.recordJobError({
    job_run_id: jobRunId,
    step: 'schedule',
    error_type: 'http',
    message: msg,
    detail: null,  // ❌ 詳要情報がない
});
```

**変更後**:
```typescript
const errorDetail: Record<string, unknown> = {
    year,
    month,
    targetDate,
};

// FetchError の場合、詳細情報を追加
if (err instanceof Error && 'type' in err) {
    const fetchError = err as FetchError;
    errorDetail.errorType = fetchError.type;
    errorDetail.url = fetchError.url;
    errorDetail.statusCode = fetchError.statusCode;
    errorDetail.attempt = fetchError.attempt;
    if (fetchError.responseBody) {
        errorDetail.responseBody = fetchError.responseBody.substring(0, 500);
    }
}

await jobRunRepo.recordJobError({
    job_run_id: jobRunId,
    step: 'schedule',
    error_type: 'http',
    message: msg,
    detail: errorDetail,  // ✅ 詳要情報を追加
    stack_trace: err instanceof Error ? err.stack || null : null, // ✅ スタックトレースを追加
    retry_count: null, // ✅ リトライ回数（まだ実装していない）
    context: { year, month, targetDate }, // ✅ 影響範囲を追加
});
```

#### 3.3.2 STEP 3（レースプログラム）のエラー記録の詳細化

**追加情報**:
- `jyo_cd`: 競輪場コード
- `year`, `month`: 年月
- `targetDate`: 対象日付
- `errorType`: エラー種別（timeout, http）

#### 3.3.3 STEP 5（出走表）のエラー記録の詳細化

**追加情報**:
- `raceId`: レースID
- `jyo_cd`: 競輪場コード（raceIdから推定）
- `targetDate`: 対象日付
- `race_no`: レース番号
- `race_title`: レースタイトル

### 3.4 predictionService.ts の強化

#### 3.4.1 エラー記録の詳細化

**変更前**:
```typescript
await jobRunRepo.recordJobError({
    job_run_id: jobRunId,
    step: 'prediction',
    error_type: 'prediction',
    message: error,
    detail: null,  // ❌ 詳要情報がない
});
```

**変更後**:
```typescript
const errorDetail: Record<string, unknown> = {
    raceId,
    targetDate,
    race_no: race.race_no,
    race_title: race.race_title,
};

if (err instanceof Error) {
    errorDetail.errorMessage = err.message;
    errorDetail.errorType = err.name || 'Error';
    if (err.stack) {
        errorDetail.stackTrace = err.stack.substring(0, 1000);
    }
}

await jobRunRepo.recordJobError({
    job_run_id: jobRunId,
    step: 'prediction',
    error_type: 'prediction',
    message: error,
    detail: errorDetail, // ✅ 詳要情報を追加
    stack_trace: err instanceof Error ? err.stack || null : null, // ✅ スタックトレースを追加
    retry_count: null, // ✅ リトライ回数（まだ実装していない）
    context: { targetDate }, // ✅ 影響範囲を追加
});
```

---

## 4. 実装内容

### 4.1 型定義の拡張

| ファイル | 変更内容 |
|--------|----------|
| `src/types/jobError.ts` | `stack_trace`, `retry_count`, `context` フィールドを追加 |

### 4.2 HTTPエラーの詳細化

| ファイル | 変更内容 |
|--------|----------|
| `src/lib/scrapers/fetchUtils.ts` | `FetchError` インターフェース追加<br>`fetchPageWithErrorDetails` 関数追加 |

### 4.3 スクレイピングエラーの詳細化

| ファイル | 変更内容 |
|--------|----------|
| `src/lib/services/scrapeService.ts` | `fetchPageWithErrorDetails` を使用<br>エラー詳細に HTTP情報を追加<br>`stack_trace`, `retry_count`, `context` を記録 |

### 4.4 AI予想エラーの詳細化

| ファイル | 変更内容 |
|--------|----------|
| `src/lib/services/predictionService.ts` | エラー詳細に `errorMessage`, `errorType`, `stackTrace` を追加<br>`context` に `race_no`, `race_title` を追加 |

---

## 5. データベースマイグレーション

### 5.1 job_errors テーブルの拡張

```sql
-- 既存のカラム
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS stack_trace TEXT;
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS retry_count INTEGER;
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS context JSONB;

-- コメント追加
COMMENT ON COLUMN job_errors.stack_trace IS 'スタックトレース（本番環境ではマスク化）';
COMMENT ON COLUMN job_errors.retry_count IS 'リトライ回数';
COMMENT ON COLUMN job_errors.context IS '影響範囲（例: race_id, jyo_cd, sha_no）';
```

**注**: 本番環境では `stack_trace` に本番環境ではセンシティブ情報が含まれないようにマスク化が必要です。

---

## 6. エラー種別の詳細化

### 6.1 HTTPエラー

| エラー種別 | ステータスコード | 対処方針 | �録する情報 |
|-----------|--------------|---------|-------------|
| `http_timeout` | - | タイムアウト | `type: 'timeout'`, `url`, `attempt` |
| `http_4xx` | 400, 401, 403, 404, etc. | クライアントエラー | `type: 'http'`, `url`, `statusCode`, `statusText`, `responseBody` |
| `http_429` | 429 | レート制限 | `type: 'http'`, `url`, `statusCode`, `statusText`, `responseBody` |
| `http_5xx` | 500, 502, 503, etc. | サーバーエラー | `type: 'http'`, `url`, `statusCode`, `statusText`, `responseBody` |

### 6.2 パースエラー

| エラー種別 | 対処方針 | �録する情報 |
|-----------|---------|-------------|
| `parse` | HTML解析エラー | `type: 'parse'`, `context: { selector, htmlFragment }` |

### 6.3 データベースエラー

| エラー種別 | 対処方針 | �録する情報 |
|-----------|---------|-------------|
| `db` | DB書き込みエラー | `type: 'db'`, `context: { table, operation, error: sqlMessage }` |

### 6.4 予想エラー

| エラー種別 | 対処方針 | �録する情報 |
|-----------|---------|-------------|
| `prediction` | AI予想エラー | `type: 'prediction'`, `context: { raceId, model, errorType: 'api_key'|'model_not_found'|'rate_limit'|'invalid_response'|'empty_response' }` |

---

## 7. 影響範囲（context）の設計

### 7.1 ステップ別の影響範囲

| ステップ | context に含める情報 |
|--------|---------------------|
| `schedule` | `year`, `month`, `targetDate`, `errorType` |
| `program:{jyo_cd}` | `jyo_cd`, `year`, `month`, `targetDate`, `errorType`, `url` |
| `entry:{race_id}` | `raceId`, `jyo_cd`（raceIdから推定）, `targetDate`, `race_no`, `race_title`, `errorType`, `url` |
| `prediction` | `raceId`, `targetDate`, `race_no`, `race_title`, `errorType` |

### 7.2 エラー種別の context フィールド

| エラー種別 | context に含めるフィールド |
|-----------|---------------------|
| `http` | `errorType`（timeout/http_4xx/http_5xx）, `url`, `statusCode`, `statusText`, `attempt` |
| `parse` | `selector`, `htmlFragment`（解析失敗したHTMLの断片） |
| `db` | `table`, `operation`, `sqlMessage` |
| `prediction` | `errorType`（`api_key`|`model_not_found`|`rate_limit`|`invalid_response`|`empty_response`） |

---

## 8. リトライ回数の記録方法

### 8.1 スクレイピング

| どこで記録するか | 実装方法 |
|-------------------|----------|
| `fetchPageWithErrorDetails` | `FetchError.attempt` に自動的に設定される |
| `scrapeService.ts` | `fetchPageWithErrorDetails` の結果から `errorDetail.attempt` を記録 |

### 8.2 AI予想

| どこで記録するか | 実装方法 |
|-------------------|----------|
| `predictionService.ts` | まだ実装されていない<br>`callAI` 内のリトライ回数を記録する |

---

## 9. スタックトレースの記録方法

### 9.1 �録方法

| どこで記録するか | �録方法 |
|-------------------|----------|
| `scrapeService.ts` | `err instanceof Error ? err.stack || null` を記録<br>本番環境ではマスク化が必要（パスワード、APIキーなど） |
| `predictionService.ts` | `err instanceof Error ? err.stack?.substring(0, 1000) || null` を記録 |

### 9.2 マスク化ルール

| マスク対象 | マスク方法 |
|-----------|----------|
| APIキー | `sk-` で開始される部分をマスク |
| パスワード | `password`, `pwd` が含まれる部分をマスク |
| URL のクエリパラメータ | `key=`, `token=` などのクエリパラメータをマスク |

---

## 10. 今後の改善案

### 10.1 リトライ回数の記録

- `scrapeService.ts` でのリトライ回数を記録
- `predictionService.ts` でのリトライ回数を記録

### 10.2 エラー種別の詳細化

- HTTPエラーをより細分化（`http_4xx`, `http_5xx`, `http_timeout`, `http_rate_limit`）
- 予想エラーをより細分化（`prediction_api_key_error`, `prediction_model_not_found`, `prediction_rate_limit`, `prediction_invalid_response`, `prediction_empty_response`）

### 10.3 エラーア覧画面の実装

- `/admin/errors` エンドポイントの実装
- エラー一覧を表示する画面の実装
- フィルタリング（ステップ、エラー種別、日付範囲）機能の実装

### 10.4 エラーア要通知機能

- 重大なエラー（HTTP 5xx、DBエラーなど）の通知機能
- 通知先（メール、Slack、Webhook）を設定可能にする

---

## 11. マイグレーション実行スクリプト

### 11.1 マイグレーションファイル

**ファイル**: `docs/migrations/add_job_error_columns.sql`

```sql
-- job_errors テーブルに詳細情報用カラムを追加

-- スタックトレース（本番環境ではマスク化が必要）
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS stack_trace TEXT;
COMMENT ON COLUMN job_errors.stack_trace IS 'スタックトレース（本番環境ではマスク化）';

-- リトライ回数
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS retry_count INTEGER;
COMMENT ON COLUMN job_errors.retry_count IS 'リトライ回数';

-- 影響範囲
ALTER TABLE job_errors ADD COLUMN IF NOT EXISTS context JSONB;
COMMENT ON COLUMN job_errors.context IS '影響範囲（例: race_id, jyo_cd, sha_no）';

-- インデックスの追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_job_errors_job_run_id_step ON job_errors(job_run_id, step);
CREATE INDEX IF NOT EXISTS idx_job_errors_error_type ON job_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_job_errors_occurred_at ON job_errors(occurred_at DESC);
```

---

## 12. まとめ

### 12.1 実装内容

| 項目 | 実装状況 |
|------|----------|
| 型定義の拡張（jobError.ts） | ✅ 完了 |
| HTTPエラー詳細化（fetchUtils.ts） | ✅ 完了 |
| スクレイピングエラー詳細化（scrapeService.ts） | ✅ 完了 |
| AI予想エラー詳細化（predictionService.ts） | ✅ 完了 |
| マイグレーションファイル作成 | ✅ 完了 |

### 12.2 次のステップ

1. マイグレーションファイルを実行（Supabase SQL Editor）
2. テスト環境・本番環境で動作確認
3. エラーが発生した際に詳細情報が記録されているか確認
4. 必要に応じてエラー通知機能を実装

### 12.3 期待される効果

- エラーの原因特定が容易になる
- トラブルシューティング時間が短縮される
- 運去のエラー傾向の分析が可能になる
- システムの信頼性が向上する
