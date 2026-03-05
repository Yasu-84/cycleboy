/**
 * /api/health
 *
 * ヘルスチェックエンドポイント
 * 環境変数が正しく設定されているかを確認するために使用
 *
 * Method: GET
 * Responses:
 *   200 OK - ヘルスチェック成功
 */
import { NextResponse } from 'next/server';

interface HealthCheckResult {
    status: 'ok' | 'error';
    timestamp: string;
    environment: {
        node_env: string;
        supabase_url: boolean;
        supabase_service_role_key: boolean;
        admin_api_key: boolean;
        gemini_api_key: boolean;
        gemini_model: string | null;
        github_owner: boolean;
        github_repo: boolean;
        github_token: boolean;
    };
}

export async function GET(): Promise<NextResponse> {
    const result: HealthCheckResult = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: {
            node_env: process.env.NODE_ENV ?? 'unknown',
            supabase_url: !!process.env.SUPABASE_URL,
            supabase_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            admin_api_key: !!process.env.ADMIN_API_KEY,
            gemini_api_key: !!process.env.GEMINI_API_KEY,
            gemini_model: process.env.GEMINI_MODEL ?? null,
            github_owner: !!process.env.GITHUB_OWNER,
            github_repo: !!process.env.GITHUB_REPO,
            github_token: !!process.env.GITHUB_TOKEN,
        },
    };

    // 必須の環境変数が設定されているかチェック
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
