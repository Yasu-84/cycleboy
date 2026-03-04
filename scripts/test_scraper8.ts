import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    console.log('--- Fetching /?kaisai_date=20260303 ---');
    let $ = await fetchPage('/?kaisai_date=20260303');
    // jyocd= ではなく jyo_cd= で検索
    let links = $('a[href*="jyo_cd="]');

    // 今日の開催（トップページの開催一覧）を抽出
    // Netkeirinのトップページには本日のレース場一覧（アイコン付き）が並んでいる
    const items: any[] = [];
    links.each((_, el) => {
        const href = $(el).attr('href') || '';
        const m = href.match(/jyo_cd=(\d+)/i);
        const jyo_cd = m ? m[1] : null;
        if (!jyo_cd) return;

        const jyo_name = $(el).text().trim() || $(el).attr('title') || '';

        // クラスからグレードを探る
        const parent = $(el).closest('li, div');
        const gradeIconClass = parent.find('[class*="Icon_GradeType"]').attr('class') ?? '';

        if (jyo_name && jyo_name.length <= 10 && !href.includes('race_list')) {
            items.push({ jyo_cd, jyo_name: jyo_name.replace(/\s+/g, ''), gradeIconClass, href });
        }
    });

    // 重複除去
    const uniqueItems = Array.from(new Map(items.map(item => [item.jyo_cd, item])).values());
    console.log(`Found ${uniqueItems.length} unique venues:`);
    console.log(uniqueItems);
}

testFetch().catch(console.error);
