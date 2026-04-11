/**
 * /api/admin/trigger
 *
 * GitHub Actions の workflow_dispatch を起動する軽量プロキシ。
 * GitHub API を呼ぶだけで即 202 を返すので Vercel Hobby の 10s 制限に抵触しない。
 *
 * Method: POST
 * Headers:
 *   x-admin-api-key: {ADMIN_API_KEY}
 * Body (JSON):
 *   {
 *     "workflow": "scrape" | "cleanup",
 *     "step"?: "all" | "schedule" | "program" | "entry",
 *     "target_date"?: "YYYY-MM-DD"
 *   }
 *
 * Responses:
 *   202 Accepted  - GitHub Actions に dispatch 送信済み
 *   400 Bad Request
 *   401 Unauthorized
 *   500 Internal Server Error
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidDateString, isNotFutureDate } from '@/lib/utils/dateUtils';
import { isApiKeyValid } from '@/lib/utils/authUtils';

type Workflow = 'scrape' | 'cleanup' | 'prediction';
type Step = 'all' | 'schedule' | 'program' | 'entry' | 'prediction' | 'result';

interface TriggerBody {
    workflow: Workflow;
    step?: Step;
    target_date?: string;
}

const VALID_WORKFLOWS: Workflow[] = ['scrape', 'cleanup', 'prediction'];
const VALID_STEPS: Step[] = ['all', 'schedule', 'program', 'entry', 'prediction', 'result'];

export async function POST(req: NextRequest): Promise<NextResponse> {
    // 1. API キー認証
    const apiKey = req.headers.get('x-admin-api-key') ?? '';
    if (!isApiKeyValid(apiKey)) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    // 2. Body パース
    let body: TriggerBody;
    try {
        body = (await req.json()) as TriggerBody;
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
        );
    }

    // 3. バリデーション
    const { workflow, step, target_date } = body;

    if (!VALID_WORKFLOWS.includes(workflow)) {
        return NextResponse.json(
            { error: `Invalid workflow. Must be one of: ${VALID_WORKFLOWS.join(', ')}` },
            { status: 400 }
        );
    }

    if (step !== undefined && !VALID_STEPS.includes(step)) {
        return NextResponse.json(
            { error: `Invalid step. Must be one of: ${VALID_STEPS.join(', ')}` },
            { status: 400 }
        );
    }

    if (target_date !== undefined) {
        if (!isValidDateString(target_date)) {
            return NextResponse.json(
                { error: 'Invalid target_date format. Must be YYYY-MM-DD.' },
                { status: 400 }
            );
        }
        if (!isNotFutureDate(target_date)) {
            return NextResponse.json(
                { error: 'target_date must not be a future date.' },
                { status: 400 }
            );
        }
    }

    // 4. 環境変数確認
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;

    if (!owner || !repo || !token) {
        console.error('[trigger] Missing GitHub env vars');
        return NextResponse.json(
            { error: 'Server configuration error' },
            { status: 500 }
        );
    }

    // 5. GitHub API workflow_dispatch 呼び出し
    const workflowFile = workflow === 'scrape' ? 'scrape.yml' : workflow === 'cleanup' ? 'cleanup.yml' : 'prediction.yml';
    const githubApiUrl =
        `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowFile}/dispatches`;

    const inputs: Record<string, string> = {};
    if (workflow === 'scrape') {
        inputs.step = step ?? 'all';
        if (target_date) inputs.target_date = target_date;
    } else if (workflow === 'cleanup') {
        // cleanup は inputs なし
    } else if (workflow === 'prediction') {
        if (target_date) inputs.target_date = target_date;
    }

    // result ステップは scrape.yml の choice に含まれていないため、
    // 入力値を text として渡す
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
            const contentType = githubRes.headers.get('content-type') ?? 'unknown';
            console.error(`[trigger] GitHub API error ${githubRes.status}`);
            console.error(`[trigger] Content-Type: ${contentType}`);
            console.error(`[trigger] Response text: ${errorText.substring(0, 500)}`);
            return NextResponse.json(
                { error: `GitHub API returned ${githubRes.status}`, details: errorText.substring(0, 200) },
                { status: 502 }
            );
        }

        // 6. 202 Accepted を返す（GitHub Actions の完了は待たない）
        return NextResponse.json(
            { message: 'Workflow dispatch sent', workflow, step, target_date },
            { status: 202 }
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[trigger] fetch error: ${message}`);
        return NextResponse.json(
            { error: 'Failed to contact GitHub API' },
            { status: 500 }
        );
    }
}
