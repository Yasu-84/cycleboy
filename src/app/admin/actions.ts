'use server';

import { getRecentJobRuns, hasRecentFailure } from '@/lib/repositories/jobRunRepository';
import { isValidDateString, isNotFutureDate } from '@/lib/utils/dateUtils';

type Workflow = 'scrape' | 'cleanup' | 'prediction';
type Step = 'all' | 'schedule' | 'program' | 'entry' | 'prediction' | 'result';

const VALID_WORKFLOWS: Workflow[] = ['scrape', 'cleanup', 'prediction'];
const VALID_STEPS: Step[] = ['all', 'schedule', 'program', 'entry', 'prediction', 'result'];

export async function fetchJobRunsAction(limit = 20): Promise<{
    runs: import('@/types/jobRun').JobRun[];
    hasRecentFailure: boolean;
}> {
    const [runs, recentFailure] = await Promise.all([
        getRecentJobRuns(limit),
        hasRecentFailure(24),
    ]);
    return { runs, hasRecentFailure: recentFailure };
}

export async function triggerWorkflowAction(opts: {
    workflow: string;
    step?: string;
    targetDate?: string;
}): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
    const { workflow, step, targetDate } = opts;

    if (!VALID_WORKFLOWS.includes(workflow as Workflow)) {
        return { ok: false, error: `Invalid workflow. Must be one of: ${VALID_WORKFLOWS.join(', ')}` };
    }

    if (step !== undefined && !VALID_STEPS.includes(step as Step)) {
        return { ok: false, error: `Invalid step. Must be one of: ${VALID_STEPS.join(', ')}` };
    }

    if (targetDate !== undefined) {
        if (!isValidDateString(targetDate)) {
            return { ok: false, error: 'Invalid target_date format. Must be YYYY-MM-DD.' };
        }
        if (!isNotFutureDate(targetDate)) {
            return { ok: false, error: 'target_date must not be a future date.' };
        }
    }

    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !token) {
        console.error('[triggerWorkflowAction] Missing GitHub env vars');
        return { ok: false, error: 'Server configuration error' };
    }

    const workflowFile =
        workflow === 'scrape' ? 'scrape.yml'
        : workflow === 'cleanup' ? 'cleanup.yml'
        : 'prediction.yml';

    const githubApiUrl =
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;

    const inputs: Record<string, string> = {};
    if (workflow === 'scrape') {
        inputs.step = step ?? 'all';
        if (targetDate) inputs.target_date = targetDate;
    } else if (workflow === 'prediction') {
        if (targetDate) inputs.target_date = targetDate;
    }

    if (step === 'result') {
        inputs.step = 'result';
    }

    try {
        const githubRes = await fetch(githubApiUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ref: 'main', inputs }),
        });

        if (!githubRes.ok) {
            const errorText = await githubRes.text();
            console.error(`[triggerWorkflowAction] GitHub API error ${githubRes.status}: ${errorText.substring(0, 500)}`);
            return { ok: false, error: `GitHub API returned ${githubRes.status}` };
        }

        return { ok: true, message: 'GitHub Actions に起動リクエストを送信しました。数秒後にジョブ履歴に反映されます。' };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[triggerWorkflowAction] fetch error: ${message}`);
        return { ok: false, error: 'Failed to contact GitHub API' };
    }
}
