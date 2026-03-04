import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    console.log('--- scrapeGradeSchedules URL ---');
    let $ = await fetchPage('/race/schedule/?kaisai_year=2026&kaisai_month=3');
    let rows = $('.Race_Schedule_Table tr.schedule_list3');
    console.log('Grade Schedule rows found:', rows.length);
    if (rows.length > 0) {
        console.log('First row HTML:', $(rows[0]).html()?.trim().substring(0, 100));
    } else {
        // maybe standard selector helps
        console.log('Any table?', $('table').length);
    }

    console.log('\n--- scrapeTodayRaceList URL ---');
    $ = await fetchPage('/race/race_list/');
    let links = $('a[href*="jyocd="]');
    console.log('Today Race list links found:', links.length);
    if (links.length === 0) {
        console.log('Body snippet:', $('body').text().trim().replace(/\s+/g, ' ').substring(0, 200));
    }
}

testFetch().catch(console.error);
