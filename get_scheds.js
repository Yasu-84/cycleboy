const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function run() {
  const req2 = await fetch(`${url}/rest/v1/race_schedules?select=*`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const scheds = await req2.json();
  console.log('ALL SCHEDULES:', scheds.length);
  scheds.forEach(s => console.log(`${s.id} ${s.grade} ${s.jyo_name} ${s.start_date}~${s.end_date}`));
}
run();
