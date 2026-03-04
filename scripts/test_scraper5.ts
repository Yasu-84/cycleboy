import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    console.log('--- Checking /race/race_list/?kaisai_date=20240303 ---');
    let $ = await fetchPage('/race/race_list/?kaisai_date=20240303');
    let links = $('a[href*="jyo_cd="]');
    console.log('links found:', links.length);
    if (links.length > 0) {
        links.each((i, el) => {
            if (i < 5) console.log($(el).attr('href'), $(el).text().trim());
        });
    }
}

testFetch().catch(console.error);
