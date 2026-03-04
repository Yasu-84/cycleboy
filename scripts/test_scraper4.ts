import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    console.log('--- Checking / HTML ---');
    let $ = await fetchPage('/');
    let links = $('a[href*="jyo_cd="], a[href*="kaisai_date="], a[href*="/race/race_list"]');
    console.log('links found:', links.length);

    if (links.length > 0) {
        links.each((i, el) => {
            if (i < 20) console.log($(el).attr('href'), $(el).text().trim());
        });
    }
}

testFetch().catch(console.error);
