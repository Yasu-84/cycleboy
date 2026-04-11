/**
 * 日付変換ユーティリティ
 * - DB 保存値は UTC
 * - 業務日判定（当日・7日保持）は JST 基準
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000; // +09:00

/**
 * JST での「今日」を YYYY-MM-DD 形式で返す
 */
export function getJstToday(): string {
    const now = new Date();
    const jstDate = new Date(now.getTime() + JST_OFFSET_MS);
    return jstDate.toISOString().slice(0, 10);
}

/**
 * 「実行時 JST 日付 - N 日」を YYYY-MM-DD 形式で返す
 * cleanup 処理の閾値日計算に使用
 */
export function getJstDateMinusDays(days: number): string {
    const now = new Date();
    const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
    const result = new Date(jstNow.getTime() - days * 24 * 60 * 60 * 1000);
    return result.toISOString().slice(0, 10);
}

/**
 * ネットケイリンの data-kaisai_date 属性値を YYYY-MM-DD に正規化
 *
 * ページから取得される値は YYYYMD〜YYYYMMDD と桁数が可変。
 * 例: "2026228" → "2026-02-28"
 *     "20261001" → "2026-10-01"
 */
export function parseKaisaiDate(raw: string): string {
    const year = raw.slice(0, 4);
    const rest = raw.slice(4);

    let month: string;
    let day: string;

    if (rest.length === 4) {
        month = rest.slice(0, 2);
        day = rest.slice(2, 4);
    } else if (rest.length === 3) {
        const tryMonth1Day2 = () => {
            const m = rest.slice(0, 1).padStart(2, '0');
            const d = rest.slice(1, 3);
            return isValidMonthDay(year, m, d) ? { month: m, day: d } : null;
        };
        const tryMonth2Day1 = () => {
            const m = rest.slice(0, 2);
            const d = rest.slice(2, 3).padStart(2, '0');
            return isValidMonthDay(year, m, d) ? { month: m, day: d } : null;
        };
        const result = tryMonth1Day2() ?? tryMonth2Day1();
        if (!result) throw new Error(`parseKaisaiDate: ambiguous 3-digit date "${raw}"`);
        month = result.month;
        day = result.day;
    } else if (rest.length === 2) {
        month = rest.slice(0, 1).padStart(2, '0');
        day = rest.slice(1, 2).padStart(2, '0');
    } else {
        throw new Error(`parseKaisaiDate: unexpected format "${raw}"`);
    }

    return `${year}-${month}-${day}`;
}

function isValidMonthDay(year: string, month: string, day: string): boolean {
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const date = new Date(`${year}-${month}-${day}`);
    return !isNaN(date.getTime()) && date.getMonth() + 1 === m && date.getDate() === d;
}

/**
 * YYYY-MM-DD 形式のバリデーション
 * target_date パラメータの検証に使用
 */
export function isValidDateString(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value);
    return !isNaN(d.getTime());
}

/**
 * 日付文字列が未来日でないことをチェック（JST 基準）
 * target_date のバリデーションに使用
 */
export function isNotFutureDate(dateStr: string): boolean {
    const today = getJstToday();
    return dateStr <= today;
}

/**
 * HH:MM 形式の時刻文字列を Time 型（HH:MM:SS）に変換
 * スクレイピングで取得した発走時刻・締切時刻の変換に使用
 */
export function toTimeString(hhmm: string): string {
    return hhmm.includes(':') && hhmm.split(':').length === 2
        ? `${hhmm}:00`
        : hhmm;
}

/**
 * 数値・空文字を安全に integer に変換
 * スクレイピング値のパース補助
 */
export function toIntSafe(value: string | null | undefined, fallback = 0): number {
    if (value === null || value === undefined || value.trim() === '') return fallback;
    const n = parseInt(value.trim(), 10);
    return isNaN(n) ? fallback : n;
}

/**
 * 数値・空文字を安全に float に変換
 * スクレイピング値のパース補助
 */
export function toFloatSafe(value: string | null | undefined, fallback = 0): number {
    if (value === null || value === undefined || value.trim() === '') return fallback;
    const n = parseFloat(value.trim());
    return isNaN(n) ? fallback : n;
}

/**
 * 指定ミリ秒待機（スクレイピングレートリミット対策）
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
