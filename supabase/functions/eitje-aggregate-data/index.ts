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
    } else if (endpoint === 'planning_shifts') {
      await aggregatePlanningShifts(supabaseClient, startDate, endDate);
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

  // Fetch from processed table (all fields already normalized)
  const { data: processedData, error } = await supabaseClient
    .from('eitje_time_registration_shifts_processed')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to fetch processed data: ${error.message}`);
  }

  if (!processedData || processedData.length === 0) {
    console.log('[eitje-aggregate-data] No processed data found for time registration shifts');
    return;
  }

  console.log(`[eitje-aggregate-data] Found ${processedData.length} processed time registration records`);

  // Group by date, environment_id, team_id, and user_id (per worker per day)
  const groupedData = new Map<string, any>();

  for (const record of processedData) {
    const date = record.date;
    const environmentId = record.environment_id;
    const teamId = record.team_id || null;
    const userId = record.user_id;

    if (!environmentId) {
      console.log(`[eitje-aggregate-data] Skipping record without environment_id: ${record.id}`);
      continue;
    }

    // Group by date, environment, team, and user (one row per worker per day)
    const key = `${date}-${environmentId}-${teamId || 'null'}-${userId || 'null-user'}`;

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        team_id: teamId,
        user_id: userId,
        total_hours_worked: 0,
        total_breaks_minutes: 0,
        total_wage_cost: 0,
        shift_count: 0
      });
    }

    const group = groupedData.get(key);

    // Use normalized columns directly (no JSONB parsing needed)
    const hoursWorked = Number(record.hours_worked || record.hours || record.total_hours || 0) ||
      (record.start && record.end 
        ? (new Date(record.end).getTime() - new Date(record.start).getTime()) / (1000 * 60 * 60)
        : 0);
    
    const breakMinutes = Number(record.break_minutes || record.breaks || record.break_minutes_actual || 0);
    const actualHours = Math.max(0, hoursWorked - (breakMinutes / 60));
    
    group.total_hours_worked += actualHours;
    group.total_breaks_minutes += breakMinutes;

    // Extract wage cost from normalized columns
    let wageCost = Number(record.wage_cost || record.costs_wage || record.costs_wage_cost || 
      record.labor_cost || record.total_cost || 0);

    // If still no cost, use fallback calculation (€15/hour)
    if (!wageCost || wageCost === 0) {
      wageCost = actualHours * 15;
    }

    group.total_wage_cost += wageCost;
    group.shift_count += 1;
  }

  // Convert to array - each row represents one worker per day
  const aggregatedData = Array.from(groupedData.values()).map(group => {
    const avgWagePerHour = group.total_hours_worked > 0
      ? group.total_wage_cost / group.total_hours_worked
      : 0;

    return {
      date: group.date,
      environment_id: group.environment_id,
      team_id: group.team_id,
      user_id: group.user_id,
      total_hours_worked: Math.round(group.total_hours_worked * 100) / 100,
      total_breaks_minutes: group.total_breaks_minutes,
      total_wage_cost: Math.round(group.total_wage_cost * 100) / 100,
      shift_count: group.shift_count,
      employee_count: 1, // Always 1 since this is per worker
      avg_hours_per_employee: Math.round(group.total_hours_worked * 100) / 100, // Same as total_hours for single worker
      avg_wage_per_hour: Math.round(avgWagePerHour * 100) / 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  console.log(`[eitje-aggregate-data] Created ${aggregatedData.length} aggregated labor hours records`);

  // Upsert aggregated data - grouped by user_id
  if (aggregatedData.length > 0) {
    const { error: upsertError } = await supabaseClient
      .from('eitje_labor_hours_aggregated')
      .upsert(aggregatedData, {
        onConflict: 'date,environment_id,team_id,user_id'
      });

    if (upsertError) {
      console.error('[eitje-aggregate-data] Upsert error:', upsertError);
      // If constraint doesn't exist, try with old constraint
      if (upsertError.message?.includes('constraint') || upsertError.code === '42P10') {
        console.log('[eitje-aggregate-data] Trying with old constraint (without user_id)...');
        const { error: retryError } = await supabaseClient
          .from('eitje_labor_hours_aggregated')
          .upsert(aggregatedData.map(({ user_id, ...rest }) => rest), {
            onConflict: 'date,environment_id,team_id'
          });
        if (retryError) {
          throw new Error(`Failed to upsert aggregated data: ${retryError.message}`);
        }
      } else {
        throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
      }
    }
  }

  console.log('[eitje-aggregate-data] Successfully aggregated time registration shifts');
}

/**
 * Aggregate planning shifts
 */
async function aggregatePlanningShifts(supabaseClient: any, startDate: string, endDate: string) {
  console.log(`[eitje-aggregate-data] Aggregating planning shifts from ${startDate} to ${endDate}`);

  // Fetch from processed table (all fields already normalized)
  const { data: processedData, error } = await supabaseClient
    .from('eitje_planning_shifts_processed')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to fetch processed data: ${error.message}`);
  }

  if (!processedData || processedData.length === 0) {
    console.log('[eitje-aggregate-data] No processed data found for planning shifts');
    return;
  }

  console.log(`[eitje-aggregate-data] Found ${processedData.length} processed planning shift records`);

  // Group by date, environment_id, team_id, and user_id (per worker per day)
  const groupedData = new Map<string, any>();

  for (const record of processedData) {
    const date = record.date;
    const environmentId = record.environment_id;
    const teamId = record.team_id || null;
    const userId = record.user_id;

    if (!environmentId) {
      console.log(`[eitje-aggregate-data] Skipping planning shift record without environment_id: ${record.id}`);
      continue;
    }

    // Group by date, environment, team, and user (one row per worker per day)
    const key = `${date}-${environmentId}-${teamId || 'null'}-${userId || 'null-user'}`;

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        team_id: teamId,
        user_id: userId,
        planned_hours_total: 0,
        total_breaks_minutes: 0,
        total_planned_cost: 0,
        shift_count: 0,
        confirmed_count: 0,
        cancelled_count: 0,
        planned_count: 0
      });
    }

    const group = groupedData.get(key);

    // Use normalized columns directly
    const plannedHours = Number(record.planned_hours || record.hours_planned || record.hours || record.total_hours || 0);
    const breakMinutes = Number(record.break_minutes || record.breaks || record.break_minutes_planned || 0);
    
    group.planned_hours_total += plannedHours;
    group.total_breaks_minutes += breakMinutes;

    // Extract planned cost from normalized columns
    let plannedCost = Number(record.planned_cost || record.wage_cost || record.costs_wage || record.costs_wage_cost || 0);

    // If still no cost, use fallback calculation (€15/hour)
    if (!plannedCost || plannedCost === 0) {
      plannedCost = plannedHours * 15;
    }

    group.total_planned_cost += plannedCost;
    group.shift_count += 1;

    // Count status
    if (record.confirmed === true) {
      group.confirmed_count += 1;
    } else if (record.cancelled === true) {
      group.cancelled_count += 1;
    } else {
      group.planned_count += 1;
    }
  }

  // Convert to array - each row represents one worker per day
  const aggregatedData = Array.from(groupedData.values()).map(group => {
    const avgHoursPerEmployee = group.planned_hours_total; // Same as total for single worker
    const avgCostPerHour = group.planned_hours_total > 0
      ? group.total_planned_cost / group.planned_hours_total
      : 0;

    return {
      date: group.date,
      environment_id: group.environment_id,
      team_id: group.team_id,
      user_id: group.user_id,
      planned_hours_total: Math.round(group.planned_hours_total * 100) / 100,
      total_breaks_minutes: group.total_breaks_minutes,
      total_planned_cost: Math.round(group.total_planned_cost * 100) / 100,
      shift_count: group.shift_count,
      employee_count: 1, // Always 1 since this is per worker
      confirmed_count: group.confirmed_count,
      cancelled_count: group.cancelled_count,
      planned_count: group.planned_count,
      avg_hours_per_employee: Math.round(avgHoursPerEmployee * 100) / 100,
      avg_cost_per_hour: Math.round(avgCostPerHour * 100) / 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  console.log(`[eitje-aggregate-data] Created ${aggregatedData.length} aggregated planning shift records`);

  // Upsert aggregated data - grouped by user_id
  if (aggregatedData.length > 0) {
    const { error: upsertError } = await supabaseClient
      .from('eitje_planning_hours_aggregated')
      .upsert(aggregatedData, {
        onConflict: 'date,environment_id,team_id,user_id'
      });

    if (upsertError) {
      console.error('[eitje-aggregate-data] Upsert error:', upsertError);
      // If constraint doesn't exist, try with old constraint
      if (upsertError.message?.includes('constraint') || upsertError.code === '42P10') {
        console.log('[eitje-aggregate-data] Trying with old constraint (without user_id)...');
        const { error: retryError } = await supabaseClient
          .from('eitje_planning_hours_aggregated')
          .upsert(aggregatedData.map(({ user_id, ...rest }) => rest), {
            onConflict: 'date,environment_id,team_id'
          });
        if (retryError) {
          throw new Error(`Failed to upsert aggregated planning shift data: ${retryError.message}`);
        }
      } else {
        throw new Error(`Failed to upsert aggregated planning shift data: ${upsertError.message}`);
      }
    }
  }

  console.log('[eitje-aggregate-data] Successfully aggregated planning shifts');
}

/**
 * Aggregate revenue days
 */
async function aggregateRevenueDays(supabaseClient: any, startDate: string, endDate: string) {
  console.log(`[eitje-aggregate-data] Aggregating revenue days from ${startDate} to ${endDate}`);

  // Fetch from processed table (all fields already normalized)
  const { data: processedData, error } = await supabaseClient
    .from('eitje_revenue_days_processed')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    throw new Error(`Failed to fetch processed data: ${error.message}`);
  }

  if (!processedData || processedData.length === 0) {
    console.log('[eitje-aggregate-data] No processed data found for revenue days');
    return;
  }

  console.log(`[eitje-aggregate-data] Found ${processedData.length} processed revenue records`);

  // Group by date and environment_id
  const groupedData = new Map<string, any>();

  for (const record of processedData) {
    // Use normalized columns directly (no JSONB parsing needed)
    const date = record.date;
    const environmentId = record.environment_id;

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

    // Use normalized columns directly
    // Revenue: amt_in_cents is in cents, convert to euros
    const amtInCents = Number(record.amt_in_cents || 0);
    const revenue = amtInCents > 0 ? Math.round(amtInCents / 100) : Number(record.total_revenue || record.revenue || 0);
    
    group.total_revenue += revenue;
    group.transaction_count += Number(record.transaction_count || record.transactions_count || record.count || 1);
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

