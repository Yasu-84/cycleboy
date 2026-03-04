import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function test() {
    const kaisai_group_id = '2026022844';
    const path = `/db/race_program/?kaisai_group_id=${kaisai_group_id}`;
    const $ = await fetchPage(path);

    const box = $('.RaceList_Main_Box').last();
    const raceDataText = box.find('.Race_Data').text().trim();
    console.log('raceDataText:', JSON.stringify(raceDataText));

    // Test regex
    const car_count_m = raceDataText.match(/(\d+)車/);
    const car_count = car_count_m ? parseInt(car_count_m[1], 10) : 9;

    const dep_m = raceDataText.match(/発走\s*(\d{1,2}:\d{2})/);
    const departure_time = dep_m ? `${dep_m[1]}:00`.slice(0, 8) : '00:00:00';

    const dead_m = raceDataText.match(/締切\s*(\d{1,2}:\d{2})/);
    const deadline_time = dead_m ? `${dead_m[1]}:00`.slice(0, 8) : departure_time;

    console.log({ car_count, departure_time, deadline_time });

    // What about extracting from spans?
    box.find('.Race_Data span').each((_, span) => {
        console.log('span text:', $(span).text());
    });
}

test().catch(console.error);
