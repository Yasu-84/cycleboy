import { NextRequest, NextResponse } from 'next/server';
import { run as runScrape } from '@/lib/services/scrapeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        console.log('[api/cron/result] Starting result scrape...');
        const result = await runScrape({ step: 'result', triggerSource: 'cron' });
        return NextResponse.json(result);
    } catch (error) {
        console.error('[api/cron/result] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
