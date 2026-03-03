/** エラー種別 */
export type ErrorType = 'http' | 'parse' | 'db' | 'timeout';

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
    occurred_at: string;
}

/** job_errors INSERT 用の型 */
export type JobErrorInput = Omit<JobError, 'id' | 'occurred_at'>;
