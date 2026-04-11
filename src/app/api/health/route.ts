/**
 * /api/health
 *
 * ヘルスチェックエンドポイント
 * 環境変数が正しく設定されているかを確認するために使用
 *
 * Method: GET
 * Query: ?secret={CRON_SECRET} または Authorization: Bearer {CRON_SECRET}
 * Responses:
 *   200 OK - ヘルスチェック成功
 *   401 Unauthorized
 */
import { NextRequest, NextResponse } from 'next/server';

interface HealthCheckResult {
    status: 'ok' | 'error';
    timestamp: string;
    environment: {
        supabase_url: boolean;
        supabase_service_role_key: boolean;
        admin_api_key: boolean;
        gemini_api_key: boolean;
        gemini_model: boolean;
    };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
        const authHeader = req.headers.get('authorization')?.replace('Bearer ', '') ?? '';
        const querySecret = req.nextUrl.searchParams.get('secret') ?? '';
        const provided = authHeader || querySecret;
        if (provided !== cronSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const result: HealthCheckResult = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: {
            supabase_url: !!process.env.SUPABASE_URL,
            supabase_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            admin_api_key: !!process.env.ADMIN_API_KEY,
            gemini_api_key: !!process.env.GEMINI_API_KEY,
            gemini_model: !!process.env.GEMINI_MODEL,
        },
    };

    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ADMIN_API_KEY',
        'GEMINI_API_KEY',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        result.status = 'error';
        console.error(`[health] Missing required environment variables: ${missingVars.join(', ')}`);
        return NextResponse.json(
            {
                ...result,
                error: 'Missing required environment variables',
                missing: missingVars,
            },
            { status: 500 }
        );
    }

    return NextResponse.json(result);
}
