/**
 * スクレイピング共通 HTTP ユーティリティ
 * - Axios + Cheerio でページを取得してパース済み $ を返す
 * - HTTP 4xx/5xx: 指数バックオフで最大3回リトライ
 * - タイムアウト（>10秒）: リトライなし、即時エラー
 */
import axios from 'axios';
import { load } from 'cheerio';
import { sleep } from '@/lib/utils/dateUtils';

export type CheerioAPI = ReturnType<typeof load>;

/** fetchPage のエラー情報 */
export interface FetchError extends Error {
    type: 'timeout' | 'http';
    url: string;
    statusCode?: number;
    statusText?: string;
    responseBody?: string;
    attempt: number;
}

const BASE_URL = 'https://keirin.netkeiba.com';
const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

const HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
};

/**
 * 指定パス（または絶対 URL）の HTML を取得し Cheerio オブジェクトを返す。
 * @param path - "/race/schedule/?..." 形式またはフル URL
 */
export async function fetchPage(path: string): Promise<CheerioAPI> {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await axios.get<ArrayBuffer>(url, {
                timeout: DEFAULT_TIMEOUT_MS,
                headers: HEADERS,
                responseType: 'arraybuffer',
            });

            // ネットケイリンは UTF-8 を使用（meta charset="UTF-8" を確認済み）
            const html = Buffer.from(res.data).toString('utf-8');
            return load(html);
        } catch (err) {
            const isTimeout =
                axios.isAxiosError(err) &&
                (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED');

            if (isTimeout) {
                throw Object.assign(new Error(`Timeout fetching ${url}`), {
                    type: 'timeout',
                    url,
                    attempt,
                });
            }

            if (attempt === MAX_RETRIES) throw err;

            const delay = RETRY_DELAYS_MS[attempt] ?? 4_000;
            console.warn(
                `[fetchPage] attempt ${attempt + 1} failed for ${url}, retrying in ${delay}ms...`
            );
            await sleep(delay);
        }
    }

    throw new Error('unreachable');
}

/**
 * エラー情報付きでページを取得する（詳細エラーハンドリング用）
 * @param path - "/race/schedule/?..." 形式またはフル URL
 */
export async function fetchPageWithErrorDetails(path: string): Promise<{ $: CheerioAPI; error?: FetchError }> {
    const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const res = await axios.get<ArrayBuffer>(url, {
                timeout: DEFAULT_TIMEOUT_MS,
                headers: HEADERS,
                responseType: 'arraybuffer',
            });

            const html = Buffer.from(res.data).toString('utf-8');
            return { $: load(html) };
        } catch (err) {
            const isTimeout =
                axios.isAxiosError(err) &&
                (err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED');

            if (isTimeout) {
                const timeoutError: FetchError = Object.assign(new Error(`Timeout fetching ${url}`), {
                    type: 'timeout',
                    url,
                    attempt,
                });
                return { error: timeoutError };
            }

            if (axios.isAxiosError(err)) {
                const axiosError = err;
                const httpError: FetchError = Object.assign(new Error(`HTTP ${axiosError.response?.status} fetching ${url}`), {
                    type: 'http',
                    url,
                    statusCode: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    responseBody: typeof axiosError.response?.data === 'string'
                        ? axiosError.response.data.substring(0, 500)
                        : undefined,
                    attempt,
                });

                if (attempt === MAX_RETRIES) {
                    return { error: httpError };
                }

                const delay = RETRY_DELAYS_MS[attempt] ?? 4_000;
                console.warn(
                    `[fetchPage] attempt ${attempt + 1} failed for ${url}, retrying in ${delay}ms...`
                );
                await sleep(delay);
                continue;
            }

            // Axios以外のエラー
            const otherError: FetchError = Object.assign(new Error(`Error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`), {
                type: 'http',
                url,
                attempt,
            });
            return { error: otherError };
        }
    }

    throw new Error('unreachable');
}

/**
 * スクレイピング遅延待機（レートリミット対策）
 * SCRAPE_DELAY_MS 環境変数で制御（デフォルト: 500ms）
 */
export async function scrapeDelay(): Promise<void> {
    const ms = parseInt(process.env.SCRAPE_DELAY_MS ?? '500', 10);
    await sleep(ms);
}
