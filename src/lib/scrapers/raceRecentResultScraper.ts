/**
 * 出走表（直近成績）スクレイパー
 *
 * URL: /race/entry/results.html?race_id={race_id}
 * 選手行: tr.PlayerList
 *
 * パース仕様（設計書 §5.4）:
 * - 今節: .detail_table_tbodyItem.GroupLeft 以降のセル
 * - 直近1〜3: th.detail_table_tbodyInner.GroupLeft をマーカーとして開催情報と成績を取得
 * - レース名: .RaceName
 * - 順位: .result_no（数値変換）
 * - 今節データなし（開催初日等）: current_session = null
 */
import { toIntSafe } from '@/lib/utils/dateUtils';
import { fetchPage, scrapeDelay, type CheerioAPI } from './fetchUtils';
import type { RaceRecentResultInput, CurrentSession, RecentSession } from '@/types/raceRecentResult';

// cheerio の .each コールバックで受け取る Element の型
type CheerioElement = Parameters<Parameters<ReturnType<CheerioAPI>['each']>[0]>[1];

/**
 * 出走表（直近成績）を取得する
 */
export async function scrapeRecentResults(raceId: string): Promise<RaceRecentResultInput[]> {
    const path = `/race/entry/results.html?race_id=${raceId}`;
    const $ = await fetchPage(path);
    await scrapeDelay();

    const results: RaceRecentResultInput[] = [];

    $('tr.PlayerList').each((_, row) => {
        try {
            // 選手基本情報（出走表ページと同じ構造）
            const tds = $(row).find('td');
            const waku_no = toIntSafe(tds.eq(0).text().trim());
            const sha_no = toIntSafe(tds.eq(1).text().trim());
            if (sha_no === 0) return;

            const playerInfoTd = tds.eq(4);
            const playerNameClone = playerInfoTd.find('.PlayerName').clone();
            playerNameClone.children().remove();
            const player_name = playerNameClone.text().trim();
            const fromText = playerInfoTd.find('.PlayerFrom').text().trim();
            const fromMatch = fromText.match(/^([^/／\s\d]+)[/／\s]*(\d+)歳?/);
            const prefecture = fromMatch ? fromMatch[1].trim() : fromText.replace(/\d.*/, '').trim();
            const age = fromMatch ? toIntSafe(fromMatch[2]) : 0;
            const classText = playerInfoTd.find('.PlayerClass').text().trim();
            const halfClassText = classText.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
                String.fromCharCode(s.charCodeAt(0) - 0xfee0)
            );
            const classMatch = halfClassText.match(/(\d+)期[^S]*?(S[S12]|A[123]|L1)/i);
            const kinen = classMatch ? classMatch[1] : (halfClassText.match(/(\d+)期/)?.[1] ?? '');
            const class_rank = classMatch ? classMatch[2].toUpperCase() : '';

            // 今節・直近の成績セルは PlayerList 行内に直接含まれている
            const detailContainer = $(row);

            const { current_session, recent1, recent2, recent3 } =
                parseRecentSessions($, detailContainer, row);

            results.push({
                netkeiba_race_id: raceId,
                waku_no,
                sha_no,
                player_name,
                prefecture,
                age,
                kinen,
                class_rank,
                current_session,
                recent1,
                recent2,
                recent3,
            });
        } catch (err) {
            console.warn('[raceRecentResultScraper] parsePlayer row error:', err instanceof Error ? err.message : String(err), `raceId=${raceId}`);
        }
    });

    return results;
}

// ----------------------------------------------------------------
// 直近成績セッションパース
// ----------------------------------------------------------------

interface SessionParseResult {
    current_session: CurrentSession | null;
    recent1: RecentSession | null;
    recent2: RecentSession | null;
    recent3: RecentSession | null;
}

/**
 * 選手行に紐づく成績コンテナから今節・直近1〜3を抽出する
 */
function parseRecentSessions(
    $: CheerioAPI,
    container: ReturnType<CheerioAPI>,
    _playerRow?: CheerioElement
): SessionParseResult {
    let current_session: CurrentSession | null = null;
    const currentRaces: Array<{ race_name: string; rank: number | string }> = [];

    const firstTh = container.find('th.detail_table_tbodyInner.GroupLeft').first();
    let currentCells;

    if (firstTh.length > 0) {
        currentCells = container.find('.detail_table_tbodyItem.GroupLeft').first().nextUntil('th.detail_table_tbodyInner.GroupLeft').addBack();
    } else {
        currentCells = container.find('.detail_table_tbodyItem.GroupLeft~td, .detail_table_tbodyItem.GroupLeft');
    }

    currentCells.each((_, cell) => {
        const aTag = $(cell).find('a');
        if (aTag.length > 0) {
            const clone = aTag.clone();
            clone.find('span').remove();
            const raceName = clone.text().trim();
            const rankText = $(cell).find('.result_no').text().trim();
            if (raceName) {
                const rankNum = parseInt(rankText, 10);
                const rank = isNaN(rankNum) ? rankText : rankNum;
                currentRaces.push({ race_name: raceName, rank });
            }
        }
    });

    if (currentRaces.length > 0) {
        current_session = { races: currentRaces };
    }

    // 直近1〜3: th.detail_table_tbodyInner.GroupLeft をマーカーとして取得
    const recentSessions: RecentSession[] = [];

    // コンテナ内の各直近開催ブロックを探索
    container.find('th.detail_table_tbodyInner.GroupLeft, .RecentBlock').each((_, block) => {
        try {
            // 開催情報ヘッダーから日付・グレード・競輪場を取得
            const headerText = $(block).text().trim();
            const headerMatch = headerText.match(/^(\d{1,2}\/\d{1,2})/);
            const kaisai_date = headerMatch ? headerMatch[1].replace(/\//g, '-') : '';

            const rawGrade = $(block).find('[class*="Icon_GradeType"]').first().text().trim() || 'F1';
            const grade = normalizeGrade(rawGrade);
            const jyo_name = extractJyoNameFromBlock($, block);

            const races: Array<{ race_name: string; rank: number | string }> = [];

            // ブロック以降の成績セルを取得
            let sibling = $(block).next();
            while (sibling.length && !sibling.is('th.detail_table_tbodyInner.GroupLeft')) {
                const raceName = sibling.find('.RaceName').text().trim();
                const rankText = sibling.find('.result_no').text().trim();
                if (raceName) {
                    const rankNum = parseInt(rankText, 10);
                    const rank = isNaN(rankNum) ? rankText : rankNum;
                    races.push({ race_name: raceName, rank });
                }
                sibling = sibling.next();
            }

            if (kaisai_date && races.length > 0) {
                recentSessions.push({ kaisai_date, grade, jyo_name, races });
            }
        } catch (err) {
            console.warn('[raceRecentResultScraper] parseRecentSessions block error:', err instanceof Error ? err.message : String(err));
        }
    });

    return {
        current_session,
        recent1: recentSessions[0] ?? null,
        recent2: recentSessions[1] ?? null,
        recent3: recentSessions[2] ?? null,
    };
}

function extractJyoNameFromBlock(
    $: CheerioAPI,
    block: CheerioElement
): string {
    // .JyoName スパンから競輪場名を直接取得
    const jyoName = $(block).find('.JyoName').text().trim();
    if (jyoName) return jyoName;
    // フォールバック: テキスト全体から日付・グレードを除去して抽出
    const text = $(block).text().trim();
    const cleaned = text.replace(/\d{1,2}\/\d{1,2}/, '').replace(/(GP|GI{1,3}|G\d|F\d)/g, '').trim();
    return cleaned.slice(0, 10);
}

/** HTML のグレード表記をシステム統一表記に変換 */
function normalizeGrade(raw: string): string {
    const map: Record<string, string> = {
        'GP': 'GP',
        'GIII': 'G3',
        'GII': 'G2',
        'GI': 'G1',
        'FII': 'F2',
        'FI': 'F1',
    };
    return map[raw] ?? raw;
}
