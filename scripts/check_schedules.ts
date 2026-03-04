import { supabase } from '../src/lib/supabase/client';

async function checkSchedules() {
  const { data, error } = await supabase
    .from('race_schedules')
    .select('*')
    .order('start_date', { ascending: true });

  if (error) {
    console.error('Error:', error.message);
    return;
  }
  console.log('race_schedules count:', data?.length);
  console.log(JSON.stringify(data, null, 2));
}

checkSchedules().catch(console.error);
