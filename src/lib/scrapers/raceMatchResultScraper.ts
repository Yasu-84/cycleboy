/**
 * 出走表（対戦表）スクレイパー
 *
 * URL: /race/match_list/?race_id={race_id}
 * 選手行: tr.PlayerList
 *
 * パース仕様（設計書 §5.5）:
 * - 1行目の .RaceCardCell01 テキスト = 総合対戦成績（例: "2-10"）
 * - 以降の .RaceCardCell01: インデックス順で車番1〜9に対応
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

            // 選手名
            const player_name = $(row).find('.PlayerName').text().trim();

            // .RaceCardCell01 クラスを持つセルを抽出
            const matchCells = $(row).find('.RaceCardCell01');

            // 最初の .RaceCardCell01 テキスト = 総合対戦成績
            const totalText = matchCells.eq(0).text().trim();
            const total = totalText || null;

            // 以降のセル: 車番1〜9の順に対戦成績
            const vs_records: VsRecords = {};
            for (let carNo = 1; carNo <= 9; carNo++) {
                // matchCells.eq(0) が総合なので、インデックスは carNo
                const cellText = matchCells.eq(carNo).text().trim();

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
