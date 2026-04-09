/**
 * レース結果・払戻金スクレイパー
 *
 * URL: /race/result/?race_id={race_id}
 * 着順テーブル: table#All_Result_Table tr.PlayerList
 * 払戻金テーブル: table.Payout_Detail_Table tr
 */
import { toFloatSafe, toIntSafe } from '@/lib/utils/dateUtils';
import { fetchPage, scrapeDelay } from './fetchUtils';
import type { RaceResultInput } from '@/types/raceResult';
import type { RaceRefundInput } from '@/types/raceRefund';

export interface ResultScrapeResult {
    results: RaceResultInput[];
    refunds: RaceRefundInput[];
}

const BET_TYPE_MAP: Record<string, string> = {
    '枠複': '枠複',
    '枠単': '枠単',
    '２車複': '２車複',
    '2車複': '２車複',
    '２車単': '２車単',
    '2車単': '２車単',
    'ワイド': 'ワイド',
    '３連複': '３連複',
    '3連複': '３連複',
    '３連単': '３連単',
    '3連単': '３連単',
};

export async function scrapeResult(raceId: string): Promise<ResultScrapeResult> {
    const path = `/race/result/?race_id=${raceId}`;
    const $ = await fetchPage(path);
    await scrapeDelay();

    const results = parseResults($, raceId);
    const refunds = parseRefunds($, raceId);

    return { results, refunds };
}

function parseResults(
    $: ReturnType<typeof import('cheerio').load>,
    raceId: string
): RaceResultInput[] {
    const results: RaceResultInput[] = [];

    $('table#All_Result_Table tr.PlayerList').each((_, row) => {
        try {
            const tds = $(row).find('td');
            if (tds.length < 8) return;

            const rankText = tds.eq(0).text().trim();
            const rank = parseRank(rankText);
            if (rank === 0) return;

            const waku_no = toIntSafe(tds.eq(1).text().trim());
            const sha_no = toIntSafe(tds.eq(2).text().trim());
            if (sha_no === 0) return;

            const player_name = tds.eq(3).find('dt.PlayerName').text().trim();

            const margin = tds.eq(4).text().trim() || null;
            const last_lap_val = toFloatSafe(tds.eq(5).text().trim());
            const last_lap = last_lap_val > 0 ? last_lap_val : null;
            const move_type = tds.eq(6).text().trim() || null;
            const sb_flag = tds.eq(7).text().trim() || null;

            results.push({
                netkeiba_race_id: raceId,
                rank,
                waku_no,
                sha_no,
                player_name,
                margin,
                last_lap,
                move_type,
                sb_flag,
            });
        } catch {
            // 該当行をスキップ
        }
    });

    return results;
}

function parseRefunds(
    $: ReturnType<typeof import('cheerio').load>,
    raceId: string
): RaceRefundInput[] {
    const refunds: RaceRefundInput[] = [];

    const validClasses = ['Wakuren', 'Wakutan', 'Umaren', 'Umatan', 'Wide', 'Fuku3', 'Tan3'];

    let currentBetType = '';

    $('table.Payout_Detail_Table tr').each((_, row) => {
        try {
            const tr = $(row);
            const classes = tr.attr('class') ?? '';
            const classList = classes.split(/\s+/);

            const isKnownType = classList.some((c) => validClasses.includes(c));
            if (!isKnownType) return;

            const th = tr.find('th');
            if (th.length > 0) {
                const thText = th.text().trim();
                currentBetType = BET_TYPE_MAP[thText] ?? thText;
            }

            if (!currentBetType) return;

            const combination = tr.find('td.Result').text().trim();
            if (!combination) return;

            const payoutText = tr.find('td.Payout span').text().trim();
            const payout = parsePayout(payoutText);
            if (payout === 0) return;

            const popularityText = tr.find('td.Ninki span').text().trim();
            const popularity = parsePopularity(popularityText);

            refunds.push({
                netkeiba_race_id: raceId,
                bet_type: currentBetType,
                combination,
                payout,
                popularity,
            });
        } catch {
            // 該当行をスキップ
        }
    });

    return refunds;
}

function parseRank(text: string): number {
    const m = text.match(/(\d+)着/);
    return m ? parseInt(m[1], 10) : 0;
}

function parsePayout(text: string): number {
    const cleaned = text.replace(/[円,,\s]/g, '');
    const n = parseInt(cleaned, 10);
    return isNaN(n) ? 0 : n;
}

function parsePopularity(text: string): number | null {
    const m = text.match(/(\d+)人気/);
    return m ? parseInt(m[1], 10) : null;
}
