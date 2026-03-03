/** ジョブ種別 */
export type JobType = 'cron_scrape' | 'cron_cleanup' | 'admin_scrape';

/** ジョブ実行ステップ */
export type JobStep = 'all' | 'schedule' | 'program' | 'entry' | 'cleanup';

/** ジョブ実行状態 */
export type JobStatus = 'running' | 'success' | 'failed' | 'skipped';

/** 起動元 */
export type TriggerSource = 'cron' | 'admin';

/** job_runs テーブルの型定義 */
export interface JobRun {
    id: string;
    job_type: JobType;
    step: JobStep | null;
    status: JobStatus;
    started_at: string;
    finished_at: string | null;
    trigger_source: TriggerSource;
    /** 実行主体（admin 手動実行時のみ） */
    trigger_by: string | null;
    /** 件数サマリ JSONB */
    summary: Record<string, unknown> | null;
    created_at: string;
}

/** job_runs INSERT 用の型 */
export type JobRunInput = Omit<JobRun, 'id' | 'created_at' | 'started_at'>;
