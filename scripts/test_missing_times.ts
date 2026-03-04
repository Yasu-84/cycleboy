import { supabase } from '../src/lib/supabase/client';
import { run } from '../src/lib/services/scrapeService';

async function test() {
    console.log('--- Scraping for today: 2026-03-04 ---');
    await run({ step: 'program', targetDate: '2026-03-04' });

    const { data: p } = await supabase.from('programs').select('*').eq('kaisai_date', '2026-03-04');
    if (!p || p.length === 0) {
        console.log('No programs found for 2026-03-04');
        return;
    }

    console.log(`Found ${p.length} programs`);
    for (const prog of p) {
        const { data: r } = await supabase.from('races').select('*').eq('program_id', prog.id);
        const unassigned = r?.filter(race => !race.departure_time || race.departure_time === '00:00:00' || race.deadline_time === '00:00:00');
        console.log(`Program ${prog.id} has ${r?.length} races. Times not set: ${unassigned?.length}`);
        if (unassigned && unassigned.length > 0) {
            console.log('Examples of missing times:', unassigned.slice(0, 3));
        }
    }
}

test();
