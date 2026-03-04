/**
 * レースプログラムスクレイパー
 *
 * STEP 3-A: 開催情報・レース一覧取得
 *   URL: /race/course/?jyo_cd={JYO_CD}
 *   Selector: .Tab_RaceDaySelect li a[data-kaisai_date], .RaceList li
 *
 * STEP 3-B: 開催区分取得
 *   URL: /race/course/calendar.html?kaisai_year=...&kaisai_month=...&jyo_cd=...&kaisai_type=1
 *   ※ .MidNight のみ確認済み。.Morning/.Night/.Girls は推測 → aria-label フォールバックあり
 */
import { parseKaisaiDate } from '@/lib/utils/dateUtils';
import { parseGradeFromClass } from '@/lib/utils/gradeUtils';
import { fetchPage, scrapeDelay } from './fetchUtils';
import type { ProgramInput } from '@/types/program';
import type { RaceInput } from '@/types/race';

export interface ProgramScrapeResult {
    programs: ProgramInput[];
    races: RaceInput[];
}

// ----------------------------------------------------------------
// STEP 3-A: 開催情報・レース一覧取得
// ----------------------------------------------------------------

/**
 * 特定競輪場のプログラムとレース一覧を取得する
 * @param jyo_cd - 競輪場コード
 * @param schedule - 紐付けるレース日程オブジェクト
 * @param targetDate - 取得対象日（YYYY-MM-DD）
 * @param kaisaiTypeMap - 開催区分マップ（日付 → 区分配列）
 */
export async function scrapeProgramByJyo(
    jyo_cd: string,
    schedule: { id: string; start_date: string; grade: string },
    targetDate: string,
    kaisaiTypeMap: Map<string, string[]>
): Promise<ProgramScrapeResult> {
    const kaisai_group_id = schedule.start_date.replace(/-/g, '') + jyo_cd;
    const path = `/db/race_program/?kaisai_group_id=${kaisai_group_id}`;
    const $ = await fetchPage(path);
    await scrapeDelay();

    const programs: ProgramInput[] = [];
    const races: RaceInput[] = [];

    // 開催日タブから kaisai_date を収集
    // セレクタ: .Tab_RaceDaySelect li a[data-kaisai_date]
    const kaisaiDates: string[] = [];
    $('.Tab_RaceDaySelect li a[data-kaisai_date]').each((_, el) => {
        const raw = $(el).attr('data-kaisai_date') ?? '';
        try {
            kaisaiDates.push(parseKaisaiDate(raw));
        } catch {
            // 不正な形式はスキップ
        }
    });

    // targetDate のみを対象とする
    const targetDates = kaisaiDates.includes(targetDate) ? [targetDate] : [];
    if (targetDates.length === 0) return { programs, races };

    for (const kaisai_date of targetDates) {
        const gradeIconEl = $('.Tab_RaceDaySelect li a[data-kaisai_date]')
            .filter((_, el) => {
                try {
                    return parseKaisaiDate($(el).attr('data-kaisai_date') ?? '') === kaisai_date;
                } catch {
                    return false;
                }
            })
            .first();

        const grade = schedule.grade || 'F1';

        // プログラム種別: 初日/2日目/最終日 等（タブのテキストから）
        const program_type = gradeIconEl.find('.schedule').text().trim() || '開催';

        // 開催区分
        const kaisai_type = kaisaiTypeMap.get(kaisai_date) ?? null;

        programs.push({
            race_schedule_id: schedule.id,
            kaisai_date,
            grade,
            kaisai_type,
            program_type,
        });

        const targetNetkeibaDate = kaisai_date.replace(/-/g, '');
        // レース一覧: .RaceList_Main_Box から取得
        $('.RaceList_Main_Box').each((_, box) => {
            try {
                // race_id は href から抽出
                const href = $(box).find('a').attr('href') ?? '';
                const netkeiba_race_id = extractRaceId(href);
                if (!netkeiba_race_id) return;

                // 対象日付プレフィックスチェック
                if (!netkeiba_race_id.startsWith(targetNetkeibaDate)) return;

                const raceNoText = $(box).find('.Race_Num span').text().trim();
                const race_no = parseInt(raceNoText.replace(/[^\d]/g, ''), 10);
                if (isNaN(race_no)) return;

                // race_title
                const race_title = $(box).find('.Race_Name').text().trim() || `第${race_no}レース`;

                // 車立数, 発走・締切時刻
                let raceDataText = $(box).find('.Race_Data').text().trim();
                // 全角数字・コロンを半角に変換
                raceDataText = raceDataText.replace(/[０-９：]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0));

                const car_count_m = raceDataText.match(/(\d+)車/);
                const car_count = car_count_m ? parseInt(car_count_m[1], 10) : 9;

                const timeMatches = raceDataText.match(/(\d{1,2}:\d{2})/g);
                const departure_time = timeMatches && timeMatches[0] ? timeMatches[0] : '00:00';
                const deadline_time = timeMatches && timeMatches[1] ? timeMatches[1] : departure_time;

                races.push({
                    // program_id は呼び出し元でセットする（UPSERT後に program.id を取得）
                    program_id: '', // caller で上書き
                    netkeiba_race_id,
                    race_no,
                    race_title,
                    car_count,
                    departure_time,
                    deadline_time,
                });
            } catch {
                // スキップ
            }
        });
    }

    return { programs, races };
}

// ----------------------------------------------------------------
// STEP 3-B: 開催区分取得
// ----------------------------------------------------------------

/**
 * カレンダーページから開催区分マップ（日付 → 区分配列）を構築する
 * ⚠️ .Morning/.Night/.Girls は推測クラス名。動作確認後に修正が必要な場合あり
 */
export async function scrapeKaisaiTypeMap(
    jyo_cd: string,
    year: number,
    month: number
): Promise<Map<string, string[]>> {
    const path =
        `/race/course/calendar.html?kaisai_year=${year}&kaisai_month=${month}` +
        `&jyo_cd=${jyo_cd}&kaisai_type=1`;

    const $ = await fetchPage(path);
    await scrapeDelay();

    const map = new Map<string, string[]>();

    // 各日付セルを走査
    $('.Calendar_DayList li, .Calendar_Day').each((_, el) => {
        try {
            // 日付を取得（data-* 属性またはセルのテキスト）
            const dateAttr = $(el).attr('data-date') ?? $(el).attr('data-kaisai_date') ?? '';
            let dateStr = '';
            if (dateAttr) {
                try { dateStr = parseKaisaiDate(dateAttr); } catch { return; }
            }

            if (!dateStr) return;

            const types: string[] = [];
            const markEls = $(el).find('.Icon_RaceMark');

            markEls.each((_, mark) => {
                const cls = $(mark).attr('class') ?? '';
                const ariaLabel = $(mark).attr('aria-label') ?? '';
                const title = $(mark).find('title').text().trim();

                // クラス名判定（確認済み: MidNight, 推測: Morning/Night/Girls）
                if (cls.includes('MidNight')) types.push('ミッドナイト');
                else if (cls.includes('Morning')) types.push('モーニング');
                else if (cls.includes('Night')) types.push('ナイター');
                else if (cls.includes('Girls')) types.push('ガールズ');
                // フォールバック: aria-label や SVG title で判定
                else if (ariaLabel.includes('ミッドナイト') || title.includes('ミッドナイト'))
                    types.push('ミッドナイト');
                else if (ariaLabel.includes('モーニング') || title.includes('モーニング'))
                    types.push('モーニング');
                else if (ariaLabel.includes('ナイター') || title.includes('ナイター'))
                    types.push('ナイター');
                else if (ariaLabel.includes('ガールズ') || title.includes('ガールズ'))
                    types.push('ガールズ');
            });

            if (types.length > 0) {
                map.set(dateStr, types);
            }
        } catch {
            // スキップ
        }
    });

    return map;
}

// ----------------------------------------------------------------
// パースヘルパー
// ----------------------------------------------------------------

/** href から race_id を抽出する（例: "?race_id=202603034412"） */
function extractRaceId(href: string): string | null {
    const m = href.match(/race_id=([0-9A-Za-z]+)/i);
    return m ? m[1] : null;
}

/** "10:30 10:28" 形式から発走・締切時刻を抽出する */
function parseTimes(timesText: string): {
    departure_time: string;
    deadline_time: string;
} {
    const parts = timesText.split(/\s+/).filter(Boolean);
    const toTime = (s: string) =>
        s && /^\d{1,2}:\d{2}/.test(s) ? `${s}:00`.slice(0, 8) : '00:00:00';

    return {
        departure_time: toTime(parts[0] ?? ''),
        deadline_time: toTime(parts[1] ?? parts[0] ?? ''),
    };
}
