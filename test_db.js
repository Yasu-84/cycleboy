import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('race_predictions').select('*');
  console.log('All predictions count:', data?.length);
  
  const { data: specific, error: err2 } = await supabase.from('race_predictions').select('*').eq('netkeiba_race_id', '202603067504');
  console.log('Specific:', specific, 'Error:', err2);
}
check();
