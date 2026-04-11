/**
 * AI予想サービス
 *
 * 出走表のスクレイピング完了後、AI予想を実行して予想情報を自動生成
 */
import * as raceRepo from '@/lib/repositories/raceRepository';
import * as raceEntryRepo from '@/lib/repositories/raceEntryRepository';
import * as raceRecentResultRepo from '@/lib/repositories/raceRecentResultRepository';
import * as raceMatchResultRepo from '@/lib/repositories/raceMatchResultRepository';
import * as racePredictionRepo from '@/lib/repositories/racePredictionRepository';
import type { RacePredictionInput } from '@/types/racePrediction';

// 型定義
interface RaceEntryData {
    waku_no: number;
    sha_no: number;
    player_name: string;
    prefecture: string;
    age: number;
    kinen: string;
    class_rank: string;
    score: number;
    leg_type: string;
    win_rate: number;
    second_rate: number;
    third_rate: number;
    gear_ratio: number;
}

interface RecentResultData {
    sha_no: number;
    player_name: string;
    current_session: {
        races: Array<{
            race_name: string;
            rank: number | string;
        }>;
    } | null;
    recent1: {
        kaisai_date: string;
        grade: string;
        jyo_name: string;
        races: Array<{
            race_name: string;
            rank: number | string;
        }>;
    } | null;
    recent2: {
        kaisai_date: string;
        grade: string;
        jyo_name: string;
        races: Array<{
            race_name: string;
            rank: number | string;
        }>;
    } | null;
    recent3: {
        kaisai_date: string;
        grade: string;
        jyo_name: string;
        races: Array<{
            race_name: string;
            rank: number | string;
        }>;
    } | null;
}

interface MatchResultData {
    sha_no: number;
    player_name: string;
    total: string | null;
    vs_records: Record<string, string | null>;
}

export interface PredictionOptions {
    targetDate?: string;
}

export interface PredictionResult {
    success: boolean;
    summary: Record<string, unknown>;
    errors: string[];
}

// ----------------------------------------------------------------
// public エントリポイント
// ----------------------------------------------------------------

export async function run(options: PredictionOptions = {}): Promise<PredictionResult> {
    const targetDate = options.targetDate ?? new Date().toISOString().split('T')[0];

    console.log(`[predictionService] start  target_date=${targetDate}`);

    const errors: string[] = [];
    const summary: Record<string, unknown> = { targetDate };

    try {
        // 当日のレースを取得
        const todayRaces = await raceRepo.getRacesByDate(targetDate);
        if (todayRaces.length === 0) {
            console.log('[predictionService] no races found for today, skipping.');
            return {
                success: true,
                summary: { skipped: true },
                errors: [],
            };
        }

        console.log(`[predictionService] found ${todayRaces.length} races for prediction`);

        let successCount = 0;
        let errorCount = 0;

        for (const race of todayRaces) {
            const raceId = race.netkeiba_race_id;

            try {
                // レース単位で予想を実行
                const prediction = await generatePrediction(raceId);

                // 予想情報を保存
                await racePredictionRepo.upsertRacePrediction(prediction);

                successCount++;
                console.log(`[predictionService] prediction generated for race_id=${raceId}`);
            } catch (err) {
                errorCount++;
                const msg = `[predictionService] race_id=${raceId} failed: ${err instanceof Error ? err.message : err}`;
                console.error(msg);
                errors.push(msg);

                // エラー詳細を記録
                const errorDetail: Record<string, unknown> = {
                    raceId,
                    targetDate,
                    race_no: race.race_no,
                    race_title: race.race_title,
                };

                if (err instanceof Error) {
                    errorDetail.errorMessage = err.message;
                    errorDetail.errorType = err.name || 'Error';
                    if (err.stack) {
                        errorDetail.stackTrace = err.stack.substring(0, 1000);
                    }
                }

                // 次のレースへ継続
            }

            // APIレート制限回避のため、各レース処理後にディレイを追加
            const remainingRaces = todayRaces.length - (successCount + errorCount);
            if (remainingRaces > 0) {
                const delay = 2000; // 2秒 (旧: 60 * 1000)
                console.log(`[predictionService] Waiting ${delay}ms before next race...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        summary.successCount = successCount;
        summary.errorCount = errorCount;
        console.log(`[predictionService] done  success=${successCount}  error=${errorCount}`);
        return { success: errors.length === 0, summary, errors };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(message);
        console.error(`[predictionService] fatal error: ${message}`);
        return { success: false, summary, errors };
    }
}

// ----------------------------------------------------------------
// 予想生成
// ----------------------------------------------------------------

/**
 * 指定レースIDの予想を生成する
 */
async function generatePrediction(raceId: string): Promise<RacePredictionInput> {
    // 出走表データを取得
    const entries = await raceEntryRepo.getByRaceId(raceId);
    const recentResults = await raceRecentResultRepo.getByRaceId(raceId);
    const matchResults = await raceMatchResultRepo.getByRaceId(raceId);

    if (entries.length === 0) {
        throw new Error(`No entries found for race_id=${raceId}`);
    }

    // プロンプトを読み込み
    const prompt = loadPrompt();

    // AIに予想を依頼
    const aiResponse = await callAI(raceId, entries, recentResults, matchResults, prompt);

    // レスポンスをパース
    const prediction = parseAIResponse(aiResponse, raceId);

    return prediction;
}

/**
 * 予想プロンプトを読み込む
 */
function loadPrompt(): string {
    const prompt = process.env.GEM_SYSTEM_PROMPT;
    if (!prompt) {
        console.warn('[predictionService] GEM_SYSTEM_PROMPT is not set. Using default minimal prompt.');
        return '競輪の予想を行ってください。出走表データと直近成績を元に、3連単の買い目と展開予想を日本語で簡潔に提供してください。';
    }
    return prompt;
}

/**
 * AIを呼び出して予想を取得する
 */
async function callAI(
    raceId: string,
    entries: RaceEntryData[],
    recentResults: RecentResultData[],
    matchResults: MatchResultData[],
    prompt: string
): Promise<string> {
    // LLMのモデル名
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash-exp';

    // APIキーを環境変数から取得
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        const errorMsg = 'GEMINI_API_KEY is not set. Please add it to your GitHub Repository Secrets (Settings > Secrets and variables > Actions).';
        console.error(`[predictionService] ${errorMsg}`);
        throw new Error(errorMsg);
    }

    console.log(`[predictionService] Using model: ${model}`);
    console.log(`[predictionService] API key length: ${apiKey.length}`);

    // レースデータを整形
    const raceData = formatRaceData(raceId, entries, recentResults, matchResults);

    // プロンプトを構築
    const fullPrompt = `${prompt}\n\n## 【対象レースデータ】\n\n${raceData}\n\n## 【出力要求】\n\n上記のデータに基づいて、指定された出力フォーマットに従って予想を出力してください。`;

    // レート制限回避のためのリトライロジック
    const maxRetries = 3;
    const baseDelay = 2000; // 2秒

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[predictionService] AI API call attempt ${attempt}/${maxRetries} for race_id=${raceId}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30_000);

            let response: Response;
            try {
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: fullPrompt
                                    }
                                ]
                            }
                        ],
                        generationConfig: {
                            temperature: 0.7,
                            topK: 40,
                            topP: 0.95,
                            maxOutputTokens: 8192,
                        }
                    }),
                    signal: controller.signal,
                });
            } catch (fetchErr) {
                clearTimeout(timeoutId);
                if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
                    throw new Error(`Gemini API call timed out after 30s for race_id=${raceId}`);
                }
                throw fetchErr;
            }
            clearTimeout(timeoutId);

            // APIキーの問題を検出（401 Unauthorized）
            if (response.status === 401) {
                const errorText = await response.text();
                console.error(`[predictionService] API key error (401): ${errorText}`);
                throw new Error(`Invalid API key. Please check GEMINI_API_KEY environment variable.`);
            }

            // レート制限エラー（429）を検出
            if (response.status === 429) {
                const errorText = await response.text();
                console.error(`[predictionService] Rate limit hit (429): ${errorText}`);
                if (attempt < maxRetries) {
                    const delay = baseDelay * attempt; // 指数バックオフ
                    console.log(`[predictionService] Retrying after ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                throw new Error(`Rate limit exceeded after ${maxRetries} attempts`);
            }

            // モデルが見つからない（404）
            if (response.status === 404) {
                const errorText = await response.text();
                console.error(`[predictionService] Model not found (404): ${errorText}`);
                throw new Error(`Model '${model}' not found. Please check GEMINI_MODEL environment variable.`);
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[predictionService] AI API error ${response.status}: ${errorText}`);
                throw new Error(`AI API error ${response.status}: ${errorText}`);
            }

            let data: unknown;
            let responseText = '';
            try {
                responseText = await response.text();
                console.log(`[predictionService] AI API response status: ${response.status}`);
                console.log(`[predictionService] AI API response text (first 500 chars): ${responseText.substring(0, 500)}`);
                data = JSON.parse(responseText);
            } catch (parseError) {
                const parseErrorMessage = parseError instanceof Error ? parseError.message : String(parseError);
                console.error(`[predictionService] JSON parse error: ${parseErrorMessage}`);
                console.error(`[predictionService] Response status: ${response.status}`);
                console.error(`[predictionService] Response text (first 1000 chars): ${responseText.substring(0, 1000)}`);
                console.error(`[predictionService] Response headers:`, Object.fromEntries(response.headers.entries()));

                // レスポンスがテキストでエラーメッセージを返している場合の処理
                if (responseText.includes('error') || responseText.includes('Error') || responseText.includes('An error')) {
                    throw new Error(`AI API returned error response (status ${response.status}): ${responseText.substring(0, 500)}`);
                }
                throw new Error(`AI API returned invalid JSON (status ${response.status}): ${responseText.substring(0, 200)}...`);
            }

            // 型安全にアクセス
            const candidates = (data as any)?.candidates;
            const aiText = candidates?.[0]?.content?.parts?.[0]?.text ?? '';

            if (!aiText) {
                console.error(`[predictionService] AI returned empty response. Data:`, JSON.stringify(data, null, 2));
                throw new Error('AI returned empty response');
            }

            return aiText;
        } catch (err) {
            if (attempt === maxRetries) {
                throw new Error(`Failed to call AI after ${maxRetries} attempts: ${err instanceof Error ? err.message : err}`);
            }
            // レート制限以外のエラーの場合は少し待ってリトライ
            console.log(`[predictionService] Attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, baseDelay * attempt));
        }
    }

    throw new Error('Failed to call AI: Maximum retries exceeded');
}

/**
 * レースデータを整形してプロンプト用にする
 */
function formatRaceData(
    raceId: string,
    entries: RaceEntryData[],
    recentResults: RecentResultData[],
    matchResults: MatchResultData[]
): string {
    let data = `レースID: ${raceId}\n\n`;

    // 出走表（基本情報）
    data += '### 出走表（基本情報）\n';
    data += '| 枠番 | 車番 | 選手名 | 都道府県 | 年齢 | 期別 | 級班 | 競走得点 | 脚質 | 勝率 | 2連対率 | 3連対率 | ギア倍率 |\n';
    data += '|------|------|--------|----------|------|------|------|----------|------|------|------|--------|--------|----------|\n';

    for (const entry of entries) {
        data += `| ${entry.waku_no} | ${entry.sha_no} | ${entry.player_name} | ${entry.prefecture} | ${entry.age} | ${entry.kinen} | ${entry.class_rank} | ${entry.score} | ${entry.leg_type} | ${entry.win_rate}% | ${entry.second_rate}% | ${entry.third_rate}% | ${entry.gear_ratio} |\n`;
    }

    // 直近成績
    if (recentResults.length > 0) {
        data += '\n### 直近成績\n';
        for (const result of recentResults) {
            data += `車番${result.sha_no} (${result.player_name}):\n`;

            // 今節成績
            if (result.current_session && result.current_session.races) {
                data += `  今節成績: ${result.current_session.races.map((r) => `${r.race_name}:${r.rank}`).join(', ')}\n`;
            }

            // 直近開催成績
            for (let i = 1; i <= 3; i++) {
                const recentKey = `recent${i}` as 'recent1' | 'recent2' | 'recent3';
                const recent = result[recentKey] as RecentResultData['recent1'] | RecentResultData['recent2'] | RecentResultData['recent3'];
                if (recent && recent.races) {
                    data += `  直近${i}開催 (${recent.kaisai_date} ${recent.grade} ${recent.jyo_name}): ${recent.races.map((r) => `${r.race_name}:${r.rank}`).join(', ')}\n`;
                }
            }
        }
    }

    // 対戦表
    if (matchResults.length > 0) {
        data += '\n### 対戦表\n';
        for (const match of matchResults) {
            data += `車番${match.sha_no} (${match.player_name}):\n`;
            data += `  総合成績: ${match.total ?? 'データなし'}\n`;

            // 個別対戦成績
            if (match.vs_records) {
                for (const [opponent, record] of Object.entries(match.vs_records)) {
                    if (record && record !== '-') {
                        data += `  vs 車番${opponent}: ${record}\n`;
                    }
                }
            }
        }
    }

    return data;
}

/**
 * AIのレスポンスをパースして予想情報を作成する
 */
function parseAIResponse(aiResponse: string, raceId: string): RacePredictionInput {
    // セクションごとにパース
    const sections = parseSections(aiResponse);

    return {
        netkeiba_race_id: raceId,
        section1_confidence: sections.section1 ?? '',
        section2_development: sections.section2 ?? '',
        section3_line_evaluation: sections.section3 ?? '',
        section4_favorite_scenario: sections.section4 ?? '',
        section5_medium_hole_scenario: sections.section5 ?? '',
        section6_recommended_bets: sections.section6 ?? '',
        section7_aim_word: sections.section7 ?? '',
    };
}

/**
 * AIのレスポンスからセクションを抽出する
 */
function parseSections(aiResponse: string): Record<string, string> {
    const sections: Record<string, string> = {
        section1: '',
        section2: '',
        section3: '',
        section4: '',
        section5: '',
        section6: '',
        section7: '',
    };

    // セクション1: 自信度
    const section1Match = aiResponse.match(/セクション1.*?自信度[\s\S]*?(?=セクション2|$)/i);
    if (section1Match) {
        sections.section1 = section1Match[0].trim();
    }

    // セクション2: 展開予想
    const section2Match = aiResponse.match(/セクション2.*?展開予想[\s\S]*?(?=セクション3|$)/i);
    if (section2Match) {
        sections.section2 = section2Match[0].trim();
    }

    // セクション3: ライン別評価
    const section3Match = aiResponse.match(/セクション3.*?ライン別評価[\s\S]*?(?=セクション4|$)/i);
    if (section3Match) {
        sections.section3 = section3Match[0].trim();
    }

    // セクション4: 本命シナリオ
    const section4Match = aiResponse.match(/セクション4[:：].*?本命シナリオ[\s\S]*?(?=セクション5|$)/i);
    if (section4Match) {
        sections.section4 = section4Match[0].trim();
    }

    // セクション5: 中穴シナリオ
    const section5Match = aiResponse.match(/セクション5[:：].*?中穴シナリオ[\s\S]*?(?=セクション6|$)/i);
    if (section5Match) {
        sections.section5 = section5Match[0].trim();
    }

    // セクション6: 推奨買い目
    const section6Match = aiResponse.match(/セクション6.*?推奨買い目[\s\S]*?(?=セクション7|$)/i);
    if (section6Match) {
        sections.section6 = section6Match[0].trim();
    }

    // セクション7: 狙い目の一言
    const section7Match = aiResponse.match(/セクション7[:：].*?狙い目の一言[\s\S]*?$/i);
    if (section7Match) {
        sections.section7 = section7Match[0].trim();
    }

    return sections;
}
