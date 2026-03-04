import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function test() {
    const kaisai_group_id = '2026022844';
    const path = `/db/race_program/?kaisai_group_id=${kaisai_group_id}`;
    const $ = await fetchPage(path);

    const boxes = $('.RaceList_Main_Box').toArray();
    for (const box of boxes.slice(0, 5)) {
        const raceDataText = $(box).find('.Race_Data').text().trim();
        console.log('raceDataText:', raceDataText);
    }
}

test().catch(console.error);
