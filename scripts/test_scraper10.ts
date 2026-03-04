import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    console.log('--- Fetching /?kaisai_date=20260303 ---');
    let $ = await fetchPage('/?kaisai_date=20260303');

    // rf=toptodayrace が含まれるリンクは「本日の開催」の証拠
    let links = $('a[href*="rf=toptodayrace"]');
    console.log(`Found ${links.length} venues for today.`);

    const items: any[] = [];
    links.each((_, el) => {
        const href = $(el).attr('href') || '';
        const m = href.match(/jyo_cd=(\d+)/i);
        const jyo_cd = m ? m[1] : null;
        if (!jyo_cd) return;

        // 場名は 開催地名
        const jyo_name = $(el).contents().filter(function () {
            return (this as any).type === 'text';
        }).text().trim() || $(el).text().trim().replace(/\n.*$/g, '');

        const parent = $(el).closest('li, div');
        const gradeIconClass = parent.find('.Icon_GradeType').attr('class') ?? '';

        items.push({ jyo_cd, jyo_name: jyo_name.replace(/\s+/g, ''), gradeIconClass, href });
    });

    console.log(items);
}

testFetch().catch(console.error);
