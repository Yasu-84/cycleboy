import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    let $ = await fetchPage('/race/race_list/?kaisai_date=20240303');
    let links = $('a[href*="jyocd="]');
    console.log('links with jyocd=', links.length);
    if (links.length > 0) {
        links.each((i, el) => {
            if (i < 5) console.log($(el).attr('href'), $(el).text().trim());
        });
    }

    // Check how races are actually structured
    let wraps = $('.RaceList_DataList li');
    console.log('RaceList_DataList li count:', wraps.length);
    if (wraps.length > 0) {
        console.log('First li HTML:', $(wraps[0]).html()?.substring(0, 300));
    }
}

testFetch().catch(console.error);
