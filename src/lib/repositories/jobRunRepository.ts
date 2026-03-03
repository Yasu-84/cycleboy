import { supabase } from '@/lib/supabase/client';
import type { JobRun, JobType, JobStep, JobStatus, TriggerSource } from '@/types/jobRun';
import type { JobError, JobErrorInput } from '@/types/jobError';

const RUNS_TABLE = 'job_runs';
const ERRORS_TABLE = 'job_errors';

/**
 * ジョブ実行を開始し、job_run_id を返す
 */
export async function startJobRun(params: {
    job_type: JobType;
    step: JobStep | null;
    trigger_source: TriggerSource;
    trigger_by?: string;
}): Promise<string> {
    const { data, error } = await supabase
        .from(RUNS_TABLE)
        .insert({
            job_type: params.job_type,
            step: params.step,
            status: 'running' as JobStatus,
            trigger_source: params.trigger_source,
            trigger_by: params.trigger_by ?? null,
        })
        .select('id')
        .single();

    if (error || !data) {
        throw new Error(`[jobRunRepository.start] ${error?.message ?? 'no data returned'}`);
    }
    return data.id as string;
}

/**
 * ジョブ実行を完了状態で更新する
 */
export async function finishJobRun(
    id: string,
    status: 'success' | 'failed' | 'skipped',
    summary?: Record<string, unknown>
): Promise<void> {
    const { error } = await supabase
        .from(RUNS_TABLE)
        .update({
            status,
            finished_at: new Date().toISOString(),
            summary: summary ?? null,
        })
        .eq('id', id);

    if (error) throw new Error(`[jobRunRepository.finish] ${error.message}`);
}

/**
 * エラーを job_errors に記録する
 */
export async function recordJobError(input: JobErrorInput): Promise<void> {
    const { error } = await supabase.from(ERRORS_TABLE).insert(input);

    if (error) {
        // エラー記録自体の失敗はスローせずコンソールに出力（メイン処理を止めない）
        console.error(`[jobRunRepository.recordError] failed to record error: ${error.message}`);
    }
}

/**
 * 指定 job_run_id のエラー一覧を取得する
 */
export async function getJobErrors(job_run_id: string): Promise<JobError[]> {
    const { data, error } = await supabase
        .from(ERRORS_TABLE)
        .select('*')
        .eq('job_run_id', job_run_id)
        .order('occurred_at');

    if (error) throw new Error(`[jobRunRepository.getErrors] ${error.message}`);
    return data ?? [];
}

/**
 * 最新のジョブ実行履歴を取得する（管理画面のポーリングに使用）
 */
export async function getRecentJobRuns(limit = 20): Promise<JobRun[]> {
    const { data, error } = await supabase
        .from(RUNS_TABLE)
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

    if (error) throw new Error(`[jobRunRepository.getRecent] ${error.message}`);
    return data ?? [];
}

/**
 * 直近 N 時間以内に failed ステータスのジョブが存在するか確認する
 * 管理画面の警告バナー表示に使用
 */
export async function hasRecentFailure(withinHours = 24): Promise<boolean> {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
        .from(RUNS_TABLE)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gte('started_at', since);

    if (error) throw new Error(`[jobRunRepository.hasRecentFailure] ${error.message}`);
    return (count ?? 0) > 0;
}
