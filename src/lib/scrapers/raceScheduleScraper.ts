/**
 * レース日程スクレイパー
 *
 * STEP 1-A: グレードレース日程（GP〜G3）
 *   URL: /race/schedule/?kaisai_year={YYYY}&kaisai_month={MM}
 *   Selector: .Race_Schedule_Table tr.schedule_list3
 *
 * STEP 1-B: 本日開催一覧（F1/F2 補完）
 *   URL: /race/race_list/
 *   Selector: .RaceList_DataList li a[href*="jyocd="]
 */
import { parseGradeFromClass } from '@/lib/utils/gradeUtils';
import { fetchPage, scrapeDelay } from './fetchUtils';
import type { RaceScheduleInput } from '@/types/raceSchedule';

// ----------------------------------------------------------------
// STEP 1-A: グレードレース日程（GP〜G3）
// ----------------------------------------------------------------

/**
 * /race/schedule/ ページからグレードレースの日程一覧を取得する
 */
export async function scrapeGradeSchedules(
    year: number,
    month: number
): Promise<RaceScheduleInput[]> {
    const path = `/race/schedule/?kaisai_year=${year}&kaisai_month=${month}`;
    const $ = await fetchPage(path);
    await scrapeDelay();

    const results: RaceScheduleInput[] = [];

    $('.Race_Schedule_Table tr.schedule_list3').each((_, row) => {
        try {
            const tds = $(row).find('td');

            // 日程セル: "3/1(日)〜3/3(火)" のような形式
            const periodText = tds.eq(0).text().trim();
            const { start_date, end_date } = parsePeriod(periodText, year, month);
            if (!start_date || !end_date) return;

            // グレードアイコン
            const gradeIconClass = tds.eq(1).find('[class*="Icon_GradeType"]').attr('class') ?? '';
            const grade = parseGradeFromClass(gradeIconClass);
            if (!grade) return;

            // 競輪場リンク: href に jyo_cd が含まれる
            const venueLink = tds.eq(2).find('a[href*="jyo_cd"]');
            const href = venueLink.attr('href') ?? '';
            const jyo_cd = extractJyoCd(href);
            if (!jyo_cd) return;
            const jyo_name = venueLink.text().trim();

            // 開催名
            const kaisai_name = tds.eq(3).text().trim() || `${jyo_name}${grade}`;

            results.push({ jyo_cd, jyo_name, grade, kaisai_name, start_date, end_date });
        } catch {
            // パースエラーは該当行をスキップ
        }
    });

    return results;
}

// ----------------------------------------------------------------
// STEP 1-B: 本日開催一覧（F1/F2 補完）
// ----------------------------------------------------------------

/** race_list ページから当日開催の競輪場情報を取得する */
export async function scrapeTodayRaceList(
    targetDate: string,
    alreadyKnownJyoCds: Set<string>
): Promise<RaceScheduleInput[]> {
    const $ = await fetchPage('/race/race_list/');
    await scrapeDelay();

    const results: RaceScheduleInput[] = [];

    // 競輪場リンク: href に jyocd= が含まれる
    $('a[href*="jyocd="]').each((_, el) => {
        try {
            const href = $(el).attr('href') ?? '';
            const jyo_cd = extractJyoCdFromParam(href, 'jyocd');
            if (!jyo_cd || alreadyKnownJyoCds.has(jyo_cd)) return;

            const jyo_name = $(el).text().trim();
            if (!jyo_name) return;

            // グレードアイコン（親要素から探す）
            const parent = $(el).closest('li, .RaceList_Item');
            const gradeIconClass = parent.find('[class*="Icon_GradeType"]').attr('class') ?? '';
            const grade = parseGradeFromClass(gradeIconClass) ?? 'F1'; // デフォルト F1

            // F1/F2 は開催名が取得できないため暫定値を設定（STEP 3 で補完）
            const kaisai_name = `${jyo_name}${grade}`;

            results.push({
                jyo_cd,
                jyo_name,
                grade,
                kaisai_name,
                start_date: targetDate,
                end_date: targetDate,
            });
        } catch {
            // スキップ
        }
    });

    // 重複除去（同じ jyo_cd が複数マッチした場合）
    const seen = new Set<string>();
    return results.filter(({ jyo_cd }) => {
        if (seen.has(jyo_cd)) return false;
        seen.add(jyo_cd);
        return true;
    });
}

// ----------------------------------------------------------------
// パースヘルパー
// ----------------------------------------------------------------

/**
 * "3/1(日)〜3/3(火)" 形式から start_date / end_date を算出する
 * 年をまたぐ場合は月が小さくなるため次年度として処理
 */
function parsePeriod(
    periodText: string,
    baseYear: number,
    baseMonth: number
): { start_date: string; end_date: string } {
    // 例: "3/1(日)〜3/3(火)" → ["3/1", "3/3"]
    const match = periodText.match(/(\d+)\/(\d+)[^〜]*[〜～\-].*?(\d+)\/(\d+)/);
    if (!match) {
        // 単日の場合: "3/1(日)"
        const single = periodText.match(/(\d+)\/(\d+)/);
        if (!single) return { start_date: '', end_date: '' };
        const date = buildDate(baseYear, parseInt(single[1]), parseInt(single[2]));
        return { start_date: date, end_date: date };
    }

    const startMonth = parseInt(match[1]);
    const startDay = parseInt(match[2]);
    const endMonth = parseInt(match[3]);
    const endDay = parseInt(match[4]);

    // 年をまたぐ判定（基準月より大幅に小さい場合は翌年）
    const startYear = startMonth < baseMonth - 6 ? baseYear + 1 : baseYear;
    const endYear = endMonth < startMonth ? startYear + 1 : startYear;

    return {
        start_date: buildDate(startYear, startMonth, startDay),
        end_date: buildDate(endYear, endMonth, endDay),
    };
}

function buildDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** href から jyo_cd を抽出する（例: "/race/schedule/?jyo_cd=35" → "35"）*/
function extractJyoCd(href: string): string | null {
    const m = href.match(/jyo_cd=(\d+)/i);
    return m ? m[1] : null;
}

/** href から任意のクエリパラメータ値を抽出する */
function extractJyoCdFromParam(href: string, param: string): string | null {
    const m = href.match(new RegExp(`[?&]${param}=([^&]+)`, 'i'));
    return m ? m[1] : null;
}
