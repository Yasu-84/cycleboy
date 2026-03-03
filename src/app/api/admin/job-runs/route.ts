/**
 * /api/admin/job-runs
 *
 * 管理画面のポーリング用。最新のジョブ実行履歴を返す。
 *
 * Method: GET
 * Headers:
 *   x-admin-api-key: {ADMIN_API_KEY}
 * Query:
 *   limit?: number (default: 20)
 *
 * Response:
 *   200 { runs: JobRun[], hasRecentFailure: boolean }
 *   401 Unauthorized
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRecentJobRuns, hasRecentFailure } from '@/lib/repositories/jobRunRepository';

export async function GET(req: NextRequest): Promise<NextResponse> {
    // API キー認証
    const apiKey = req.headers.get('x-admin-api-key') ?? '';
    const expectedKey = process.env.ADMIN_API_KEY ?? '';
    if (!expectedKey || apiKey !== expectedKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = Math.min(
        parseInt(req.nextUrl.searchParams.get('limit') ?? '20', 10),
        50
    );

    try {
        const [runs, recentFailure] = await Promise.all([
            getRecentJobRuns(limit),
            hasRecentFailure(24),
        ]);

        return NextResponse.json({ runs, hasRecentFailure: recentFailure });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[job-runs] error: ${message}`);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
