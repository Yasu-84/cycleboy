import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    console.log('--- Fetching /race/race_list/?kaisai_date=20260303 ---');
    let $ = await fetchPage('/race/race_list/?kaisai_date=20260303');

    // 今日の開催一覧が並んでいるはずのコンテナ
    let raceItems = $('.RaceList_Item');
    console.log('RaceList_Item count:', raceItems.length);

    const items: any[] = [];
    raceItems.each((_, el) => {
        const link = $(el).find('a[href*="jyo_cd="]').first();
        const href = link.attr('href') || '';
        const m = href.match(/jyo_cd=(\d+)/i);
        const jyo_cd = m ? m[1] : null;
        if (!jyo_cd) return;

        const jyo_name = link.text().trim();
        const gradeIconClass = $(el).find('[class*="Icon_GradeType"]').attr('class') ?? '';

        items.push({ jyo_cd, jyo_name, gradeIconClass, href });
    });

    console.log(items);
}

testFetch().catch(console.error);
