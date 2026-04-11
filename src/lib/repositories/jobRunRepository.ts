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
        .select('id,job_run_id,step,error_type,message,detail,stack_trace,retry_count,context,occurred_at')
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
        .select('id,job_type,step,status,started_at,finished_at,trigger_source,trigger_by,summary,created_at')
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

const STALE_THRESHOLD_MINUTES = 30;

/**
 * 指定分数以上 running のままのジョブを failed に更新する。
 * プロセスクラッシュ等で finishJobRun が呼ばれなかった場合の救済。
 */
export async function releaseStaleLocks(
    staleMinutes: number = STALE_THRESHOLD_MINUTES
): Promise<number> {
    const threshold = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from(RUNS_TABLE)
        .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            summary: { staleCleanup: true, staleMinutes },
        })
        .eq('status', 'running')
        .lt('started_at', threshold)
        .select('id');

    if (error) {
        console.error(`[jobRunRepository.releaseStaleLocks] ${error.message}`);
        return 0;
    }

    const count = data?.length ?? 0;
    if (count > 0) {
        console.log(`[jobRunRepository.releaseStaleLocks] released ${count} stale job(s)`);
    }
    return count;
}

/**
 * 指定 job_type で現在 running 中のジョブがあるか確認する。
 * 古い running レコード（30分超）は自動で failed に更新する。
 */
export async function checkAlreadyRunning(jobType: JobType): Promise<boolean> {
    await releaseStaleLocks();

    const { data, error } = await supabase
        .from(RUNS_TABLE)
        .select('id')
        .eq('status', 'running')
        .eq('job_type', jobType)
        .limit(1);

    if (error) {
        console.error(`[jobRunRepository.checkAlreadyRunning] ${error.message}`);
        return false;
    }
    return (data?.length ?? 0) > 0;
}
