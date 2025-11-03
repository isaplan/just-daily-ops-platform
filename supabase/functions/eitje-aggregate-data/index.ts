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

  // Group by date, environment_id, and team_id - COMPLIANCE: Extract from normalized columns
  const groupedData = new Map<string, any>();

  for (const record of rawData) {
    // COMPLIANCE: Use normalized columns, fallback to raw_data only if needed
    const date = record.date;
    const environmentId = record.environment_id || record.raw_data?.environment?.id || 0;
    const teamId = record.team_id || record.raw_data?.team?.id || null;

    if (!environmentId) {
      console.log(`[eitje-aggregate-data] Skipping record without environment_id: ${record.id}`);
      continue;
    }

    // Group by date, environment_id, and team_id (team_id can be null)
    const key = `${date}-${environmentId}-${teamId || 'null'}`;

    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        team_id: teamId,
        total_hours_worked: 0,
        total_breaks_minutes: 0,
        total_wage_cost: 0,
        employee_count: 0,
        shift_count: 0,
        unique_employees: new Set()
      });
    }

    const group = groupedData.get(key);

    // COMPLIANCE: Prioritize normalized columns over raw_data JSONB
    // Calculate hours worked - try normalized columns first
    const hoursWorked = record.hours_worked || record.hours || record.total_hours || 0;
    let actualHours = Number(hoursWorked);
    
    // If no hours in normalized columns, calculate from times
    if (!actualHours) {
      const startTime = record.start_time || record.start_datetime || record.raw_data?.start;
      const endTime = record.end_time || record.end_datetime || record.raw_data?.end;
      
      if (startTime && endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);
        const calculatedHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        actualHours = calculatedHours;
      }
    }
    
    // Get break minutes - prioritize normalized columns
    const breakMinutes = Number(record.break_minutes || record.breaks || record.break_minutes_actual || 0) ||
      Number(record.raw_data?.break_minutes || 0);
    
    // Subtract breaks from hours if breaks are in minutes
    if (actualHours > 0 && breakMinutes > 0) {
      actualHours = Math.max(0, actualHours - (breakMinutes / 60));
    }
    
    group.total_hours_worked += actualHours;
    group.total_breaks_minutes += breakMinutes;

    // Get wage cost - prioritize normalized columns, then try raw_data JSONB paths
    let wageCost = Number(record.wage_cost || 0);
    
    // If no wage_cost in normalized column, check raw_data JSONB
    if (!wageCost || wageCost === 0) {
      const rawData = record.raw_data || {};
      
      // Try multiple possible paths in raw_data
      wageCost = Number(
        rawData.wage_cost ||
        rawData.wageCost ||
        rawData.costs?.wage ||
        rawData.costs?.wage_cost ||
        rawData.labor_cost ||
        rawData.laborCost ||
        rawData.total_cost ||
        rawData.totalCost ||
        rawData.cost ||
        rawData.price ||
        0
      );
    }
    
    // If still no cost, use fallback calculation
    if (!wageCost || wageCost === 0) {
      wageCost = actualHours * 15; // Default €15/hour if no cost data
    }
    
    group.total_wage_cost += wageCost;

    // Track unique employees
    const employeeId = record.user_id || record.raw_data?.user?.id;
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
      team_id: group.team_id,
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
        onConflict: 'date,environment_id,team_id'
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

  // Group by date and environment_id - COMPLIANCE: Extract from normalized columns
  const groupedData = new Map<string, any>();

  for (const record of rawData) {
    // COMPLIANCE: Use normalized columns, fallback to raw_data only if needed
    const date = record.date;
    const environmentId = record.environment_id || record.raw_data?.environment?.id || 0;

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
        total_revenue_excl_vat: 0,
        total_revenue_incl_vat: 0,
        total_vat_amount: 0,
        total_cash_revenue: 0,
        total_card_revenue: 0,
        total_digital_revenue: 0,
        total_other_revenue: 0,
        total_net_revenue: 0,
        total_gross_revenue: 0,
        transaction_count: 0,
        vat_rate_sum: 0,
        vat_rate_count: 0,
        transaction_values: [],
        currency: 'EUR'
      });
    }

    const group = groupedData.get(key);

    // COMPLIANCE: Extract from normalized columns first, fallback to raw_data JSONB
    const rawData = record.raw_data || {};
    
    // Helper to extract value: prioritize normalized column, then raw_data JSONB paths
    const extractValue = (normalizedValue: any, jsonPaths: string[], defaultValue: any = 0) => {
      if (normalizedValue !== null && normalizedValue !== undefined && normalizedValue !== 0) {
        return Number(normalizedValue);
      }
      // Fallback to raw_data JSONB
      for (const path of jsonPaths) {
        const keys = path.split('.');
        let value = rawData;
        for (const key of keys) {
          value = value?.[key];
          if (value === null || value === undefined) break;
        }
        if (value !== null && value !== undefined) {
          return Number(value) || defaultValue;
        }
      }
      return defaultValue;
    };
    
    // Revenue: amt_in_cents is in cents, convert to euros (no decimals)
    const revenueInCents = extractValue(record.total_revenue || record.revenue, 
      ['amt_in_cents', 'amount', 'revenue', 'total', 'total_revenue'], 0);
    const revenue = Math.round(revenueInCents / 100); // Convert cents to euros, no decimals
    const revenueExclVat = extractValue(record.net_revenue || record.revenue_excl_vat,
      ['revenue_excl_vat', 'net_revenue', 'revenue_ex_vat', 'net'], 0);
    const revenueInclVat = extractValue(record.gross_revenue || record.revenue_incl_vat,
      ['revenue_incl_vat', 'gross_revenue', 'revenue', 'total'], 0);
    const vatAmount = extractValue(record.vat_amount,
      ['vat_amount', 'vat', 'tax_amount'], 0);
    const vatPercentage = extractValue(record.vat_percentage || record.vat_rate,
      ['vat_percentage', 'vat_rate', 'tax_rate', 'vat'], 0);
    const cashRev = extractValue(record.cash_revenue,
      ['cash_revenue', 'cash', 'payment_methods.cash', 'payments.cash'], 0);
    const cardRev = extractValue(record.card_revenue,
      ['card_revenue', 'card', 'payment_methods.card', 'payments.card'], 0);
    const digitalRev = extractValue(record.digital_revenue,
      ['digital_revenue', 'digital', 'payment_methods.digital', 'payments.digital'], 0);
    const otherRev = extractValue(record.other_revenue || 0,
      ['other_revenue', 'other', 'payment_methods.other', 'payments.other'], 0);
    const netRev = extractValue(record.net_revenue,
      ['net_revenue', 'net'], 0);
    const grossRev = extractValue(record.gross_revenue,
      ['gross_revenue', 'gross'], 0);
    
    group.total_revenue += revenue;
    group.total_revenue_excl_vat += revenueExclVat;
    group.total_revenue_incl_vat += revenueInclVat;
    group.total_vat_amount += vatAmount;
    group.total_cash_revenue += cashRev;
    group.total_card_revenue += cardRev;
    group.total_digital_revenue += digitalRev;
    group.total_other_revenue += otherRev;
    group.total_net_revenue += netRev;
    group.total_gross_revenue += grossRev;
    
    if (vatPercentage > 0) {
      group.vat_rate_sum += vatPercentage;
      group.vat_rate_count += 1;
    }
    
    if (revenue > 0) {
      group.transaction_values.push(revenue);
    }
    
    // Transaction count: prioritize normalized, fallback to raw_data
    const transactionCount = extractValue(record.transaction_count,
      ['transaction_count', 'transactions_count', 'count', 'number_of_transactions'], 1);
    group.transaction_count += transactionCount || 1;
    
    // Currency: prioritize normalized, fallback to raw_data
    if (!group.currency || group.currency === 'EUR') {
      group.currency = record.currency || 
        rawData.currency || 
        rawData.currency_code || 
        'EUR';
    }
  }

  // Convert to array and calculate all metrics
  const aggregatedData = Array.from(groupedData.values()).map(group => {
    const avgRevenuePerTransaction = group.transaction_count > 0
      ? group.total_revenue / group.transaction_count
      : 0;
    
    const avgVatRate = group.vat_rate_count > 0
      ? group.vat_rate_sum / group.vat_rate_count
      : 0;
    
    const maxTransactionValue = group.transaction_values.length > 0
      ? Math.max(...group.transaction_values)
      : 0;
    
    const minTransactionValue = group.transaction_values.length > 0
      ? Math.min(...group.transaction_values)
      : 0;
    
    // Calculate payment method percentages
    const totalPaymentRevenue = group.total_cash_revenue + group.total_card_revenue + 
                                group.total_digital_revenue + group.total_other_revenue;
    const cashPercentage = totalPaymentRevenue > 0 
      ? (group.total_cash_revenue / totalPaymentRevenue) * 100 
      : 0;
    const cardPercentage = totalPaymentRevenue > 0 
      ? (group.total_card_revenue / totalPaymentRevenue) * 100 
      : 0;
    const digitalPercentage = totalPaymentRevenue > 0 
      ? (group.total_digital_revenue / totalPaymentRevenue) * 100 
      : 0;
    const otherPercentage = totalPaymentRevenue > 0 
      ? (group.total_other_revenue / totalPaymentRevenue) * 100 
      : 0;

    return {
      date: group.date,
      environment_id: group.environment_id,
        total_revenue: Math.round(group.total_revenue), // No decimals
        transaction_count: group.transaction_count,
        avg_revenue_per_transaction: Math.round(avgRevenuePerTransaction), // No decimals
        // VAT fields
        total_revenue_excl_vat: Math.round(group.total_revenue_excl_vat), // No decimals
        total_revenue_incl_vat: Math.round(group.total_revenue_incl_vat), // No decimals
        total_vat_amount: Math.round(group.total_vat_amount), // No decimals
        avg_vat_rate: Math.round(avgVatRate * 100) / 100, // Percentage keeps 2 decimals
        // Payment method fields
        total_cash_revenue: Math.round(group.total_cash_revenue), // No decimals
        total_card_revenue: Math.round(group.total_card_revenue), // No decimals
        total_digital_revenue: Math.round(group.total_digital_revenue), // No decimals
        total_other_revenue: Math.round(group.total_other_revenue), // No decimals
        // Payment method percentages
        cash_percentage: Math.round(cashPercentage * 100) / 100, // Keep 2 decimals
        card_percentage: Math.round(cardPercentage * 100) / 100,
        digital_percentage: Math.round(digitalPercentage * 100) / 100,
        other_percentage: Math.round(otherPercentage * 100) / 100,
        // Transaction metrics
        max_transaction_value: Math.round(maxTransactionValue), // No decimals
        min_transaction_value: Math.round(minTransactionValue), // No decimals
      // Additional fields
      currency: group.currency,
      net_revenue: Math.round(group.total_net_revenue), // No decimals
      gross_revenue: Math.round(group.total_gross_revenue), // No decimals
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

