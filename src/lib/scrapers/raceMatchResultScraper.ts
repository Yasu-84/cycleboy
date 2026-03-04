/**
 * 出走表（対戦表）スクレイパー
 *
 * URL: /race/match_list/?race_id={race_id}
 * 選手行: tr.PlayerList
 *
 * パース仕様（設計書 §5.5 / test-case5）:
 *   td[0]: waku_no（枠番）
 *   td[1]: sha_no（車番）
 *   td[2]: チェックボックス
 *   td[3]: player_name（選手名 — a タグのテキスト）
 *   td[4]: total（総合対戦成績 例: "36-22"）
 *   td[5]〜td[5+N-1]: vs_records（車番1〜N の対戦成績）
 * - 空文字 → null（対戦履歴なし）
 * - "-" → "-"（自車番）
 * - "{n}-{m}" 形式 → そのまま文字列として格納
 */
import { toIntSafe } from '@/lib/utils/dateUtils';
import { fetchPage, scrapeDelay } from './fetchUtils';
import type { RaceMatchResultInput, VsRecords } from '@/types/raceMatchResult';

/**
 * 出走表（対戦表）を取得する
 */
export async function scrapeMatchResults(raceId: string): Promise<RaceMatchResultInput[]> {
    const path = `/race/match_list/?race_id=${raceId}`;
    const $ = await fetchPage(path);
    await scrapeDelay();

    const results: RaceMatchResultInput[] = [];

    $('tr.PlayerList').each((_, row) => {
        try {
            const tds = $(row).find('td');

            // 枠番・車番（先頭2セル）
            const waku_no = toIntSafe(tds.eq(0).text().trim());
            const sha_no = toIntSafe(tds.eq(1).text().trim());
            if (sha_no === 0) return;

            // 選手名: td[3] (.Player_Info) 内の a タグから取得
            const player_name = tds.eq(3).find('a').text().trim();

            // td[4]: 総合対戦成績（例: "36-22"）
            const totalText = tds.eq(4).text().trim();
            const total = totalText || null;

            // td[5]〜: 車番1〜N の対戦成績（車立て数に応じて動的に取得）
            const vs_records: VsRecords = {};
            const carCount = tds.length - 5; // td[5] 以降が対戦成績
            for (let i = 0; i < carCount; i++) {
                const carNo = i + 1;
                const cellText = tds.eq(5 + i).text().trim();

                if (cellText === '' || cellText === undefined) {
                    vs_records[String(carNo)] = null;
                } else if (cellText === '-') {
                    vs_records[String(carNo)] = '-';
                } else {
                    vs_records[String(carNo)] = cellText;
                }
            }

            results.push({
                netkeiba_race_id: raceId,
                waku_no,
                sha_no,
                player_name,
                total,
                vs_records,
            });
        } catch {
            // 該当選手行をスキップ
        }
    });

    return results;
}
