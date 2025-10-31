import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Eitje Aggregation Edge Function
 * Aggregates raw Eitje data into aggregated tables for UI usage
 * Called automatically after incremental sync completes
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { endpoint, startDate, endDate } = body;

    if (!endpoint || !startDate || !endDate) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters: endpoint, startDate, endDate' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[eitje-aggregate-data] Aggregating ${endpoint} for ${startDate} to ${endDate}`);

    if (endpoint === 'time_registration_shifts') {
      await aggregateTimeRegistrationShifts(supabaseClient, startDate, endDate);
    } else if (endpoint === 'revenue_days') {
      await aggregateRevenueDays(supabaseClient, startDate, endDate);
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Unsupported endpoint: ${endpoint}` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully aggregated ${endpoint} for ${startDate} to ${endDate}`,
        endpoint,
        dateRange: { startDate, endDate }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[eitje-aggregate-data] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Aggregate time registration shifts
 */
async function aggregateTimeRegistrationShifts(supabaseClient: any, startDate: string, endDate: string) {
  console.log(`[eitje-aggregate-data] Aggregating time registration shifts from ${startDate} to ${endDate}`);

  // Fetch raw data
  const { data: rawData, error } = await supabaseClient
    .from('eitje_time_registration_shifts_raw')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }

  if (!rawData || rawData.length === 0) {
    console.log('[eitje-aggregate-data] No raw data found for time registration shifts');
    return;
  }

  console.log(`[eitje-aggregate-data] Found ${rawData.length} raw time registration records`);

  // Group by date and environment_id
  const groupedData = new Map<string, any>();

  for (const record of rawData) {
    const rawDataObj = record.raw_data;
    const date = record.date;
    const environmentId = rawDataObj?.environment?.id || record.environment_id;

    if (!environmentId) {
      console.log(`[eitje-aggregate-data] Skipping record without environment_id: ${record.id}`);
      continue;
    }

    const key = `${date}-${environmentId}`;

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        total_hours_worked: 0,
        total_breaks_minutes: 0,
        total_wage_cost: 0,
        employee_count: 0,
        shift_count: 0,
        unique_employees: new Set()
      });
    }

    const group = groupedData.get(key);

    // Calculate hours worked
    const startTime = rawDataObj?.start;
    const endTime = rawDataObj?.end;
    
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const breakMinutes = rawDataObj?.break_minutes || 0;
      const actualHours = Math.max(0, hoursWorked - (breakMinutes / 60));
      
      group.total_hours_worked += actualHours;
      group.total_breaks_minutes += breakMinutes;

      // Calculate wage cost (simplified - uses default rate)
      const hourlyRate = rawDataObj?.hourly_rate || 15; // Default rate if not provided
      group.total_wage_cost += actualHours * hourlyRate;
    }

    // Track unique employees
    const employeeId = rawDataObj?.user?.id;
    if (employeeId) {
      group.unique_employees.add(employeeId);
    }

    group.shift_count += 1;
    group.employee_count = group.unique_employees.size;
  }

  // Convert to array and calculate averages
  const aggregatedData = Array.from(groupedData.values()).map(group => {
    const avgHoursPerEmployee = group.employee_count > 0 
      ? group.total_hours_worked / group.employee_count 
      : 0;
    const avgWagePerHour = group.total_hours_worked > 0
      ? group.total_wage_cost / group.total_hours_worked
      : 0;

    return {
      date: group.date,
      environment_id: group.environment_id,
      total_hours_worked: Math.round(group.total_hours_worked * 100) / 100,
      total_breaks_minutes: group.total_breaks_minutes,
      total_wage_cost: Math.round(group.total_wage_cost * 100) / 100,
      employee_count: group.employee_count,
      shift_count: group.shift_count,
      avg_hours_per_employee: Math.round(avgHoursPerEmployee * 100) / 100,
      avg_wage_per_hour: Math.round(avgWagePerHour * 100) / 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  console.log(`[eitje-aggregate-data] Created ${aggregatedData.length} aggregated labor hours records`);

  // Upsert aggregated data
  if (aggregatedData.length > 0) {
    const { error: upsertError } = await supabaseClient
      .from('eitje_labor_hours_aggregated')
      .upsert(aggregatedData, {
        onConflict: 'date,environment_id'
      });

    if (upsertError) {
      throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
    }
  }

  console.log('[eitje-aggregate-data] Successfully aggregated time registration shifts');
}

/**
 * Aggregate revenue days
 */
async function aggregateRevenueDays(supabaseClient: any, startDate: string, endDate: string) {
  console.log(`[eitje-aggregate-data] Aggregating revenue days from ${startDate} to ${endDate}`);

  // Fetch raw data
  const { data: rawData, error } = await supabaseClient
    .from('eitje_revenue_days_raw')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }

  if (!rawData || rawData.length === 0) {
    console.log('[eitje-aggregate-data] No raw data found for revenue days');
    return;
  }

  console.log(`[eitje-aggregate-data] Found ${rawData.length} raw revenue records`);

  // Group by date and environment_id
  const groupedData = new Map<string, any>();

  for (const record of rawData) {
    const rawDataObj = record.raw_data;
    const date = record.date;
    const environmentId = rawDataObj?.environment?.id || record.environment_id;

    if (!environmentId) {
      console.log(`[eitje-aggregate-data] Skipping revenue record without environment_id: ${record.id}`);
      continue;
    }

    const key = `${date}-${environmentId}`;

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        total_revenue: 0,
        transaction_count: 0
      });
    }

    const group = groupedData.get(key);

    // Convert cents to euros
    const revenueCents = rawDataObj?.amt_in_cents || 0;
    const revenue = Number(revenueCents) / 100;
    
    group.total_revenue += revenue;
    group.transaction_count += 1;
  }

  // Convert to array and calculate averages
  const aggregatedData = Array.from(groupedData.values()).map(group => {
    const avgRevenuePerTransaction = group.transaction_count > 0
      ? group.total_revenue / group.transaction_count
      : 0;

    return {
      date: group.date,
      environment_id: group.environment_id,
      total_revenue: Math.round(group.total_revenue * 100) / 100,
      transaction_count: group.transaction_count,
      avg_revenue_per_transaction: Math.round(avgRevenuePerTransaction * 100) / 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  console.log(`[eitje-aggregate-data] Created ${aggregatedData.length} aggregated revenue records`);

  // Upsert aggregated data
  if (aggregatedData.length > 0) {
    const { error: upsertError } = await supabaseClient
      .from('eitje_revenue_days_aggregated')
      .upsert(aggregatedData, {
        onConflict: 'date,environment_id'
      });

    if (upsertError) {
      throw new Error(`Failed to upsert aggregated revenue data: ${upsertError.message}`);
    }
  }

  console.log('[eitje-aggregate-data] Successfully aggregated revenue days');
}

