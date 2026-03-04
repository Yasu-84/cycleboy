import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    let $ = await fetchPage('/race/schedule/?kaisai_year=2024&kaisai_month=3');
    let row = $('.Race_Schedule_Table tr.schedule_list3').first();
    console.log(row.html()?.trim());

    console.log('\n--- race_list HTML snippet ---');
    $ = await fetchPage('/race/race_list/?kaisai_date=20240303');
    let links = $('a[href*="jyocd="]');
    console.log('Today Race list links found:', links.length);
    if (links.length > 0) {
        console.log($(links[0]).parent().html());
    } else {
        let wrap = $('.RaceList_DataList').html();
        if (wrap) console.log(wrap.substring(0, 500));
        else console.log('No .RaceList_DataList found? HTML:', $('body').html()?.substring(0, 500));
    }
}

testFetch().catch(console.error);
