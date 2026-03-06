import { NextRequest, NextResponse } from 'next/server';
import { run as runScrape } from '@/lib/services/scrapeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        console.log('[api/cron/scrape] Starting scrape...');
        // Vercel Cron では全処理(step: all)を実行
        const result = await runScrape({ step: 'all', triggerSource: 'cron' });
        return NextResponse.json(result);
    } catch (error) {
        console.error('[api/cron/scrape] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
