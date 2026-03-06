import { NextRequest, NextResponse } from 'next/server';
import { run as runCleanup } from '@/lib/services/cleanupService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        console.log('[api/cron/cleanup] Starting cleanup...');
        const result = await runCleanup({ triggerSource: 'cron' });
        return NextResponse.json(result);
    } catch (error) {
        console.error('[api/cron/cleanup] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
