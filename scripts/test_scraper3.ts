import { fetchPage } from '../src/lib/scrapers/fetchUtils';

async function testFetch() {
    console.log('--- Checking /race/sum_list.html ---');
    let $ = await fetchPage('/race/sum_list.html?kaisai_date=20240303');
    let links = $('a[href*="jyo_cd="]');
    console.log('sum_list.html links:', links.length);

    if (links.length > 0) {
        console.log('First link:', $(links[0]).attr('href'));
        console.log('HTML:', $(links[0]).parent().parent().html()?.trim().substring(0, 200));
    } else {
        console.log('sum_list body:', $('body').text().trim().substring(0, 100));
    }
}

testFetch().catch(console.error);
