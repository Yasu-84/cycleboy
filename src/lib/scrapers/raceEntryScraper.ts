/**
 * 出走表（基本情報・並び予想）スクレイパー
 *
 * URL: /race/entry/?race_id={race_id}
 * 選手行: tr.PlayerList
 * 並び予想: .DeployYosoWrap .DeployBox.Grid3 .DeployInBox
 *
 * td インデックス対応（設計書 §5.3）:
 *   0: waku_no
 *   1: sha_no
 *   2: スキップ（チェックボックス）
 *   3: スキップ（印アイコン）
 *   4: player_name / prefecture / age / kinen / class_rank
 *   5: score
 *   6: leg_type
 *   7: sprint_count
 *   8: back_count
 *   9: nige
 *  10: makuri
 *  11: sashi
 *  12: mark
 *  13: rank1
 *  14: rank2
 *  15: rank3
 *  16: out_of_rank
 *  17: win_rate
 *  18: second_rate
 *  19: third_rate
 *  20: gear_ratio
 *  21: comment
 */
import { toIntSafe, toFloatSafe } from '@/lib/utils/dateUtils';
import { fetchPage, scrapeDelay } from './fetchUtils';
import type { RaceEntryInput, FormationPrediction } from '@/types/raceEntry';

export interface EntryScrapeResult {
    entries: RaceEntryInput[];
}

/**
 * 出走表（基本情報 + 並び予想）を取得する
 */
export async function scrapeEntry(raceId: string): Promise<EntryScrapeResult> {
    const path = `/race/entry/?race_id=${raceId}`;
    const $ = await fetchPage(path);
    await scrapeDelay();

    // ------ 並び予想をパース ------
    const formation_prediction = parseFormationPrediction($);

    // ------ 選手行をパース ------
    const entries: RaceEntryInput[] = [];

    $('tr.PlayerList').each((_, row) => {
        try {
            const tds = $(row).find('td');
            if (tds.length < 21) return; // 列数が足りない行はスキップ

            // td[0]: 枠番
            const waku_no = toIntSafe(tds.eq(0).text().trim());

            // td[1]: 車番
            const sha_no = toIntSafe(tds.eq(1).text().trim());
            if (sha_no === 0) return;

            // td[2]: スキップ（チェックボックス）
            // td[3]: スキップ（印アイコン）

            // td[4]: 選手情報（player_name, prefecture, age, kinen, class_rank）
            const playerInfoTd = tds.eq(4);
            const playerNameClone = playerInfoTd.find('.PlayerName').clone();
            playerNameClone.children().remove();
            const player_name = playerNameClone.text().trim();

            const fromText = playerInfoTd.find('.PlayerFrom').text().trim();
            // fromText 例: "東京/35歳" や "神奈 35歳"
            const fromMatch = fromText.match(/^([^/／\s\d]+)[/／\s]*(\d+)歳?/);
            const prefecture = fromMatch ? fromMatch[1].trim() : fromText.replace(/\d.*/, '').trim();
            const age = fromMatch ? toIntSafe(fromMatch[2]) : 0;

            const classText = playerInfoTd.find('.PlayerClass').text().trim();
            // 全角文字を半角に変換
            const halfClassText = classText.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
                String.fromCharCode(s.charCodeAt(0) - 0xfee0)
            );
            // classText 例: "99期 / S1" や "99期 ＳＳ"
            const classMatch = halfClassText.match(/(\d+)期[^S]*?(S[S12]|A[123]|L1)/i);
            const kinen = classMatch ? classMatch[1] : (halfClassText.match(/(\d+)期/)?.[1] ?? '');
            const class_rank = classMatch ? classMatch[2].toUpperCase() : '';

            // td[5]: 競走得点
            const score = toFloatSafe(tds.eq(5).text().trim());

            // td[6]: 脚質 (要素内の span 等を除外してテキスト取得)
            const legClone = tds.eq(6).clone();
            legClone.find('span, div').remove();
            const leg_type = legClone.text().trim();

            // td[7〜16]: 各種カウント・着回数
            const sprint_count = toIntSafe(tds.eq(7).text().trim());
            const back_count = toIntSafe(tds.eq(8).text().trim());
            const nige = toIntSafe(tds.eq(9).text().trim());
            const makuri = toIntSafe(tds.eq(10).text().trim());
            const sashi = toIntSafe(tds.eq(11).text().trim());
            const mark = toIntSafe(tds.eq(12).text().trim());
            const rank1 = toIntSafe(tds.eq(13).text().trim());
            const rank2 = toIntSafe(tds.eq(14).text().trim());
            const rank3 = toIntSafe(tds.eq(15).text().trim());
            const out_of_rank = toIntSafe(tds.eq(16).text().trim());

            // td[17〜19]: 勝率・連対率
            const win_rate = toFloatSafe(tds.eq(17).text().trim());
            const second_rate = toFloatSafe(tds.eq(18).text().trim());
            const third_rate = toFloatSafe(tds.eq(19).text().trim());

            // td[20]: ギヤ倍率
            const gear_ratio = toFloatSafe(tds.eq(20).text().trim());

            // td[21]: コメント（空なら null）
            const commentText = tds.eq(21).text().trim();
            const comment = commentText || null;

            entries.push({
                netkeiba_race_id: raceId,
                waku_no,
                sha_no,
                player_name,
                prefecture,
                age,
                kinen,
                class_rank,
                score,
                leg_type,
                sprint_count,
                back_count,
                nige,
                makuri,
                sashi,
                mark,
                rank1,
                rank2,
                rank3,
                out_of_rank,
                win_rate,
                second_rate,
                third_rate,
                gear_ratio,
                comment,
                formation_prediction,
            });
        } catch {
            // 当該選手行はスキップ
        }
    });

    return { entries };
}

// ----------------------------------------------------------------
// 並び予想パース
// ----------------------------------------------------------------

/**
 * 並び予想を FormationPrediction JSONB として返す
 * .DeployBox.Grid3 内の .DeployInBox を走査
 * .WakuSeparat を持つ要素 = ライン区切り
 * .Shaban_Num テキスト = 車番
 */
function parseFormationPrediction($: ReturnType<typeof import('cheerio').load>): FormationPrediction | null {
    const lines: Array<{ sha_nos: number[] }> = [];
    let currentLine: number[] = [];

    $('.DeployYosoWrap .DeployBox.Grid3 .DeployInBox').each((_, el) => {
        const hasSeparat = $(el).find('.WakuSeparat').length > 0;

        if (hasSeparat) {
            // ライン区切り: 現在のラインを確定
            if (currentLine.length > 0) {
                lines.push({ sha_nos: [...currentLine] });
                currentLine = [];
            }
        } else {
            const numText = $(el).find('.Shaban_Num').text().trim();
            const num = parseInt(numText, 10);
            if (!isNaN(num) && num >= 1 && num <= 9) {
                currentLine.push(num);
            }
        }
    });

    // 最後のラインを追加
    if (currentLine.length > 0) {
        lines.push({ sha_nos: [...currentLine] });
    }

    return lines.length > 0 ? { lines } : null;
}
