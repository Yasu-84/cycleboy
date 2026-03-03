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

/** 
 * 当日開催（F1/F2 補完）リストを取得する
 * トップページにアクセスし「本日の開催（rf=toptodayrace）」を抽出
 */
export async function scrapeTodayRaceList(
    targetDate: string,
    alreadyKnownJyoCds: Set<string>
): Promise<RaceScheduleInput[]> {
    const targetDateMashed = targetDate.replace(/-/g, '');
    const $ = await fetchPage(`/?kaisai_date=${targetDateMashed}`);
    await scrapeDelay();

    const results: RaceScheduleInput[] = [];

    // rf=toptodayrace はトップページの「本日の開催」一覧リンク
    $('a[href*="rf=toptodayrace"]').each((_, el) => {
        try {
            const href = $(el).attr('href') ?? '';
            const m = href.match(/jyo_cd=(\d+)/i);
            const jyo_cd = m ? m[1] : null;

            // 既にグレードレース側で拾っている場所はスキップ
            if (!jyo_cd || alreadyKnownJyoCds.has(jyo_cd)) return;

            // 例: "大垣GIII"、"久留米FI" などのテキストから場名とグレードを分離する
            const rawText = $(el).text().replace(/\s+/g, '');
            if (!rawText) return;

            let jyo_name = rawText;
            let grade = 'F1'; // デフォルト
            const gradeMatch = rawText.match(/(G[I1-3]{1,3}|F[I12]{1,2})$/i);
            if (gradeMatch) {
                const rawGrade = gradeMatch[1].toUpperCase();
                // GIII 等から G3 へ正規化
                if (rawGrade.includes('1') || rawGrade.includes('I')) grade = rawGrade.replace(/I/g, '1').replace('111', '3').replace('11', '2');
                if (rawGrade === 'F11') grade = 'F2'; // II を置換したもの
                if (rawGrade === 'G111') grade = 'G3';
                if (rawGrade === 'G11') grade = 'G2';

                jyo_name = rawText.replace(gradeMatch[1], ''); // "大垣" だけにする
            }

            // 特に追加の開催名がない場合は場名＋グレードにする
            const kaisai_name = `${jyo_name}${grade}`;

            results.push({
                jyo_cd,
                jyo_name,
                grade,
                kaisai_name,
                start_date: targetDate, // 当日開催なので開始終了日は一旦同じとする
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
