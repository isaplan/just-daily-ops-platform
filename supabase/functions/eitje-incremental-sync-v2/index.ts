import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const { data: cfg, error: cfgErr } = await supabase.from('eitje_sync_config').select('*').single();
    if (cfgErr) throw new Error(`load config: ${cfgErr.message}`);
    if (!cfg || cfg.mode !== 'incremental') {
      return new Response(JSON.stringify({ success: true, message: `Skipped - mode is ${cfg?.mode ?? 'unknown'}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const hr = new Date().getUTCHours();
    if (hr >= cfg.quiet_hours_start && hr < cfg.quiet_hours_end) {
      return new Response(JSON.stringify({ success: true, message: 'Skipped - quiet hours' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Window: yesterday .. today (inclusive)
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const startDate = yesterday.toISOString().slice(0, 10);
    const endDate = today.toISOString().slice(0, 10);

    const endpoints: string[] = Array.isArray(cfg.enabled_endpoints) ? cfg.enabled_endpoints : ['time_registration_shifts', 'planning_shifts', 'revenue_days'];
    let totalInserted = 0;
    const results: any[] = [];

    for (const endpoint of endpoints) {
      try {
        const { data: syncData, error: syncErr } = await supabase.functions.invoke('eitje-api-sync', {
          body: { endpoint, start_date: startDate, end_date: endDate, sync_mode: 'incremental', test_mode: false }
        });
        if (syncErr) throw syncErr;
        const inserted = syncData?.records_inserted || 0;
        totalInserted += inserted;

        if (endpoint === 'time_registration_shifts') {
          const { error: procErr } = await supabase.rpc('process_time_registration_shifts_v2', { start_date: startDate, end_date: endDate });
          if (procErr) throw new Error(`process_v2: ${procErr.message}`);
          const { error: aggErr } = await supabase.rpc('aggregate_hours_v2', { start_date: startDate, end_date: endDate });
          if (aggErr) throw new Error(`aggregate_v2: ${aggErr.message}`);
        }
        results.push({ endpoint, success: true, inserted });
      } catch (e: any) {
        results.push({ endpoint, success: false, error: e?.message || 'Unknown error' });
      }
    }

    return new Response(JSON.stringify({
      success: results.every(r => r.success),
      startDate, endDate, totalInserted, results, ts: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


