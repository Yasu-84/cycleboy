import { supabase } from '../src/lib/supabase/client';

async function checkStatus() {
    console.log('--- job_runs (최近) ---');
    const { data: runs } = await supabase.from('job_runs').select('*').order('created_at', { ascending: false }).limit(5);
    for (const r of runs || []) {
        console.log(`[${r.job_type}] step: ${r.step}, started_at: ${r.started_at}, status: ${r.status}`);
    }

    console.log('\n--- job_errors ---');
    const { data: errors } = await supabase
        .from('job_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (errors && errors.length > 0) {
        for (const e of errors) {
            console.log(`[${e.created_at}] RunID: ${e.job_run_id}, Stage: ${e.error_stage}`);
            console.log(`Message: ${e.error_message}`);
        }
    } else {
        console.log('エラー記録なし');
    }

    console.log('\n--- race_schedules (件数確認) ---');
    const { count: sCount } = await supabase.from('race_schedules').select('*', { count: 'exact', head: true });
    console.log(`race_schedules: ${sCount} 件`);
}

checkStatus().catch(console.error);
