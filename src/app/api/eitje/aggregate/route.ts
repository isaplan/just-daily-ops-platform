import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/integrations/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { endpoint, year, month } = await request.json();
    
    console.log(`[API /eitje/aggregate] Processing ${endpoint} for ${year}-${month}`);
    
    if (!endpoint || !year || !month) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing required parameters: endpoint, year, month" 
      }, { status: 400 });
    }

    const supabase = await createClient();
    
    // Process based on endpoint
    if (endpoint === 'time_registration_shifts') {
      await processTimeRegistrationShifts(supabase, year, month);
    } else if (endpoint === 'revenue_days') {
      await processRevenueDays(supabase, year, month);
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `Unsupported endpoint: ${endpoint}` 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${endpoint} for ${year}-${month}` 
    });
    
  } catch (error) {
    console.error('[API /eitje/aggregate] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 });
  }
}

/**
 * Process time registration shifts into aggregated format
 */
async function processTimeRegistrationShifts(supabase: any, year: number, month: number) {
  console.log(`[API /eitje/aggregate] Processing time registration shifts for ${year}-${month}`);
  
  // Get raw data for the month - calculate correct last day
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // Get last day of month
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  
  const { data: rawData, error } = await supabase
    .from('eitje_time_registration_shifts_raw')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }
  
  console.log(`[API /eitje/aggregate] Found ${rawData?.length || 0} raw records`);
  
  if (!rawData || rawData.length === 0) {
    console.log('[API /eitje/aggregate] No raw data found, skipping processing');
    return;
  }
  
  // Group by date, environment_id, and team_id
  const groupedData = new Map();
  
  for (const record of rawData) {
    const rawDataObj = record.raw_data;
    const date = record.date;
    const environmentId = record.environment_id || rawDataObj.environment?.id;
    const teamId = record.team_id || rawDataObj.team?.id || null;
    
    if (!environmentId) {
      console.log(`[API /eitje/aggregate] Skipping record without environment_id:`, record.id);
      continue;
    }
    
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
    
    // Calculate hours worked - try normalized columns first, then raw_data
    const hoursWorked = Number(record.hours_worked || record.hours || record.total_hours || 0) ||
      (rawDataObj.start && rawDataObj.end 
        ? (new Date(rawDataObj.end).getTime() - new Date(rawDataObj.start).getTime()) / (1000 * 60 * 60)
        : 0);
    
    const breakMinutes = Number(record.break_minutes || record.breaks || record.break_minutes_actual || 0) ||
      Number(rawDataObj.break_minutes || rawDataObj.breaks || 0);
    const actualHours = Math.max(0, hoursWorked - (breakMinutes / 60));
    
    group.total_hours_worked += actualHours;
    group.total_breaks_minutes += breakMinutes;
    
    // Extract wage cost - prioritize normalized columns, then try multiple raw_data paths
    let wageCost = Number(record.wage_cost || 0);
    
    // If no wage_cost in normalized column, check raw_data JSONB with multiple paths
    if (!wageCost || wageCost === 0) {
      wageCost = Number(
        rawDataObj.wage_cost ||
        rawDataObj.wageCost ||
        rawDataObj.costs?.wage ||
        rawDataObj.costs?.wage_cost ||
        rawDataObj.labor_cost ||
        rawDataObj.laborCost ||
        rawDataObj.total_cost ||
        rawDataObj.totalCost ||
        rawDataObj.cost ||
        rawDataObj.price ||
        0
      );
    }
    
    // If still no cost, use fallback calculation (€15/hour)
    if (!wageCost || wageCost === 0) {
      wageCost = actualHours * 15;
    }
    
    group.total_wage_cost += wageCost;
    
    // Track unique employees
    const userId = record.user_id || rawDataObj.user?.id;
    if (userId) {
      group.unique_employees.add(userId);
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
  
  console.log(`[API /eitje/aggregate] Created ${aggregatedData.length} aggregated records`);
  
  // Upsert aggregated data (handle duplicates)
  const { error: upsertError } = await supabase
    .from('eitje_labor_hours_aggregated')
    .upsert(aggregatedData, {
      onConflict: 'date,environment_id,team_id'
    });
    
  if (upsertError) {
    throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
  }
  
  console.log('[API /eitje/aggregate] Successfully processed time registration shifts');
}

/**
 * Process revenue days into aggregated format
 */
async function processRevenueDays(supabase: any, year: number, month: number) {
  console.log(`[API /eitje/aggregate] Processing revenue days for ${year}-${month}`);
  
  // Get raw data for the month - calculate correct last day
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate(); // Get last day of month
  const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  
  const { data: rawData, error } = await supabase
    .from('eitje_revenue_days_raw')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);
    
  if (error) {
    throw new Error(`Failed to fetch raw data: ${error.message}`);
  }
  
  console.log(`[API /eitje/aggregate] Found ${rawData?.length || 0} raw revenue records`);
  
  if (!rawData || rawData.length === 0) {
    console.log('[API /eitje/aggregate] No raw revenue data found, skipping processing');
    return;
  }
  
  // Group by date and environment_id - COMPLIANCE: Extract from normalized columns
  const groupedData = new Map();
  
  for (const record of rawData) {
    // COMPLIANCE: Use normalized columns, fallback to raw_data only if needed
    const date = record.date;
    const environmentId = record.environment_id || record.raw_data?.environment?.id || 0;
    
    if (!environmentId) {
      console.log(`[API /eitje/aggregate] Skipping revenue record without environment_id:`, record.id);
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
    // Payment methods - may not exist in this structure, check if there are nested objects
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
  
  console.log(`[API /eitje/aggregate] Created ${aggregatedData.length} aggregated revenue records`);
  
  // Upsert into aggregated table
  const { error: insertError } = await supabase
    .from('eitje_revenue_days_aggregated')
    .upsert(aggregatedData, {
      onConflict: 'date,environment_id'
    });
    
  if (insertError) {
    throw new Error(`Failed to insert aggregated revenue data: ${insertError.message}`);
  }
  
  console.log('[API /eitje/aggregate] Successfully processed revenue days');
}