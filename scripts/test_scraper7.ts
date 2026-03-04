import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    console.log('--- Fetching /?kaisai_date=20240303 ---');
    let $ = await fetchPage('/?kaisai_date=20240303');
    let links = $('a[href*="jyo_cd="], a[href*="jyocd="]');

    // Try to find the container for today's races
    // In NetKeirin, usually .RaceList_Wrap or .RaceList_Item
    let listItems = $('.RaceList_Item');
    console.log('.RaceList_Item count:', listItems.length);
    if (listItems.length > 0) {
        console.log('First Item Html:', $(listItems[0]).html()?.replace(/\s+/g, ' ').substring(0, 300));
    } else {
        console.log('Body HTML (partial):', $('body').text().replace(/\s+/g, ' ').substring(0, 300));
    }
}

testFetch().catch(console.error);
