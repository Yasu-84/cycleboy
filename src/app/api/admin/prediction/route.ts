/**
 * /api/admin/prediction
 *
 * AI予想の手動実行API
 *
 * Method: POST
 * Headers:
 *   x-admin-api-key: {ADMIN_API_KEY}
 * Body (JSON):
 *   {
 *     "target_date"?: "YYYY-MM-DD"
 *   }
 *
 * Responses:
 *   200 OK        - AI予想実行完了
 *   400 Bad Request
 *   401 Unauthorized
 *   500 Internal Server Error
 */

import { NextRequest, NextResponse } from 'next/server';
import { isValidDateString, isNotFutureDate } from '@/lib/utils/dateUtils';
import { run as runPrediction } from '@/lib/services/predictionService';
import { startJobRun, finishJobRun } from '@/lib/repositories/jobRunRepository';

interface PredictionBody {
    target_date?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
    // 1. API キー認証
    const apiKey = req.headers.get('x-admin-api-key') ?? '';
    const expectedKey = process.env.ADMIN_API_KEY ?? '';
    if (!expectedKey || apiKey !== expectedKey) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    // 2. Body パース
    let body: PredictionBody;
    try {
        body = (await req.json()) as PredictionBody;
    } catch {
        return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
        );
    }

    // 3. バリデーション
    const { target_date } = body;

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

    // 4. AI予想実行
    let jobRunId: string | null = null;
    try {
        // ジョブ実行開始を記録
        jobRunId = await startJobRun({
            job_type: 'admin_prediction',
            step: 'prediction',
            trigger_source: 'admin',
        });

        const result = await runPrediction({ targetDate: target_date });

        // ジョブ実行成功を記録
        await finishJobRun(jobRunId, 'success', {
            target_date: target_date ?? 'today',
            summary: result.summary,
            error_count: result.errors?.length ?? 0,
        });

        return NextResponse.json({
            message: 'Prediction completed',
            summary: result.summary,
            errors: result.errors,
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        console.error(`[prediction API] error: ${message}`);
        if (stack) {
            console.error(`[prediction API] stack trace: ${stack}`);
        }

        // ジョブ実行失敗を記録
        if (jobRunId) {
            await finishJobRun(jobRunId, 'failed', {
                error: message,
            });
        }

        // エラーの種類に応じて適切なステータスコードを返す
        let statusCode = 500;
        let errorMessage = 'Failed to execute prediction';
        
        if (message.includes('GEMINI_API_KEY is not set')) {
            statusCode = 500;
            errorMessage = 'AI API configuration error: GEMINI_API_KEY is not set';
        } else if (message.includes('Invalid API key')) {
            statusCode = 500;
            errorMessage = 'AI API configuration error: Invalid GEMINI_API_KEY';
        } else if (message.includes('Rate limit exceeded')) {
            statusCode = 429;
            errorMessage = 'AI API rate limit exceeded. Please try again later.';
        } else if (message.includes('Model') && message.includes('not found')) {
            statusCode = 500;
            errorMessage = 'AI API configuration error: Model not found';
        } else if (message.includes('AI API returned')) {
            statusCode = 500;
            errorMessage = `AI API error: ${message}`;
        }

        return NextResponse.json(
            { error: errorMessage, details: message },
            { status: statusCode }
        );
    }
}
