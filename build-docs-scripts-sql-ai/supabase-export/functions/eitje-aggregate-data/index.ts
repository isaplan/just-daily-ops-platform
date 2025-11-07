import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Eitje Data Aggregation Edge Function
 * Aggregates raw Eitje data into aggregated format
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, startDate, endDate } = await req.json();
    
    console.log('[eitje-aggregate-data] Starting aggregation:', { endpoint, startDate, endDate });

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    let result: any = { success: false };

    // Route to appropriate aggregation function based on endpoint
    switch (endpoint) {
      case 'time_registration_shifts':
        result = await aggregateTimeRegistrationShifts(supabase, startDate, endDate);
        break;
      case 'planning_shifts':
        result = await aggregatePlanningShifts(supabase, startDate, endDate);
        break;
      case 'revenue_days':
        result = await aggregateRevenueDays(supabase, startDate, endDate);
        break;
      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: `Unknown endpoint: ${endpoint}`,
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    return new Response(
      JSON.stringify({
        ...result,
        endpoint,
        dateRange: { startDate, endDate },
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[eitje-aggregate-data] Fatal error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function aggregateTimeRegistrationShifts(supabase: any, startDate: string, endDate: string): Promise<any> {
  console.log('[eitje-aggregate-data] Aggregating time_registration_shifts...');

  const { data: rawData, error } = await supabase
    .from('eitje_time_registration_shifts')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }

  if (!rawData || rawData.length === 0) {
    console.log('[eitje-aggregate-data] No raw data found');
    return { success: true, recordsAggregated: 0, message: 'No data to aggregate' };
  }

  // Group by date and environment_id
  const grouped = new Map<string, any>();

  for (const record of rawData) {
    const rawDataObj = record.raw_data || {};
    const environmentId = rawDataObj.environment?.id;
    if (!environmentId) continue;

    const key = `${record.date}-${environmentId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: record.date,
        environment_id: environmentId,
        total_hours: 0,
        employee_count: 0,
        unique_employees: new Set()
      });
    }

    const group = grouped.get(key);
    const start = new Date(rawDataObj.start);
    const end = new Date(rawDataObj.end);
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const breakMinutes = rawDataObj.break_minutes || 0;
    const actualHours = Math.max(0, hours - (breakMinutes / 60));

    group.total_hours += actualHours;
    if (rawDataObj.user?.id) {
      group.unique_employees.add(rawDataObj.user.id);
    }
    group.employee_count = group.unique_employees.size;
  }

  // Prepare aggregated records
  const aggregated = Array.from(grouped.values()).map(g => ({
    date: g.date,
    environment_id: g.environment_id,
    total_hours_worked: g.total_hours,
    employee_count: g.employee_count,
    updated_at: new Date().toISOString()
  }));

  // Upsert aggregated data (assuming table exists)
  if (aggregated.length > 0) {
    const { error: upsertError } = await supabase
      .from('eitje_time_registration_shifts_aggregated')
      .upsert(aggregated, {
        onConflict: 'date,environment_id'
      });

    if (upsertError) {
      console.warn('[eitje-aggregate-data] Upsert error (table may not exist):', upsertError);
      return { success: true, recordsAggregated: aggregated.length, warning: 'Aggregated data calculated but not stored (table may not exist)' };
    }
  }

  return { success: true, recordsAggregated: aggregated.length };
}

async function aggregatePlanningShifts(supabase: any, startDate: string, endDate: string): Promise<any> {
  console.log('[eitje-aggregate-data] Aggregating planning_shifts...');
  // Similar logic to time_registration_shifts
  // Implementation depends on planning_shifts table structure
  return { success: true, recordsAggregated: 0, message: 'Planning shifts aggregation not yet implemented' };
}

async function aggregateRevenueDays(supabase: any, startDate: string, endDate: string): Promise<any> {
  console.log('[eitje-aggregate-data] Aggregating revenue_days...');

  const { data: rawData, error } = await supabase
    .from('eitje_revenue_days')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }

  if (!rawData || rawData.length === 0) {
    console.log('[eitje-aggregate-data] No raw revenue data found');
    return { success: true, recordsAggregated: 0, message: 'No data to aggregate' };
  }

  // Group by date and environment_id
  const grouped = new Map<string, any>();

  for (const record of rawData) {
    const rawDataObj = record.raw_data || {};
    const environmentId = rawDataObj.environment?.id;
    if (!environmentId) continue;

    const key = `${record.date}-${environmentId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        date: record.date,
        environment_id: environmentId,
        total_revenue: 0,
        transaction_count: 0
      });
    }

    const group = grouped.get(key);
    const revenueInEuros = (rawDataObj.amt_in_cents || 0) / 100;
    group.total_revenue += revenueInEuros;
    group.transaction_count += 1;
  }

  const aggregated = Array.from(grouped.values()).map(g => ({
    date: g.date,
    environment_id: g.environment_id,
    total_revenue: g.total_revenue,
    transaction_count: g.transaction_count,
    updated_at: new Date().toISOString()
  }));

  if (aggregated.length > 0) {
    const { error: upsertError } = await supabase
      .from('eitje_revenue_days_aggregated')
      .upsert(aggregated, {
        onConflict: 'date,environment_id'
      });

    if (upsertError) {
      console.warn('[eitje-aggregate-data] Upsert error (table may not exist):', upsertError);
      return { success: true, recordsAggregated: aggregated.length, warning: 'Aggregated data calculated but not stored (table may not exist)' };
    }
  }

  return { success: true, recordsAggregated: aggregated.length };
}

