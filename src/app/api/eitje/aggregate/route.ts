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
  
  // Get raw data for the month
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
  
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
  
  // Group by date and environment_id
  const groupedData = new Map();
  
  for (const record of rawData) {
    const rawData = record.raw_data;
    const date = record.date;
    const environmentId = rawData.environment?.id;
    
    if (!environmentId) {
      console.log(`[API /eitje/aggregate] Skipping record without environment_id:`, record.id);
      continue;
    }
    
    const key = `${date}-${environmentId}`;
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        date,
        environment_id: environmentId,
        total_hours_worked: 0,
        total_wage_cost: 0,
        employee_count: 0,
        unique_employees: new Set()
      });
    }
    
    const group = groupedData.get(key);
    
    // Calculate hours worked from start/end times
    const startTime = new Date(rawData.start);
    const endTime = new Date(rawData.end);
    const hoursWorked = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    const breakMinutes = rawData.break_minutes || 0;
    const actualHours = Math.max(0, hoursWorked - (breakMinutes / 60));
    
    group.total_hours_worked += actualHours;
    
    // For wage cost, we'll need to calculate based on hours and rate
    // For now, use a placeholder calculation
    const hourlyRate = 15; // This should come from user data or configuration
    group.total_wage_cost += actualHours * hourlyRate;
    
    group.unique_employees.add(rawData.user?.id);
    group.employee_count = group.unique_employees.size;
  }
  
  // Convert to array and prepare for insertion
  const aggregatedData = Array.from(groupedData.values()).map(group => ({
    date: group.date,
    environment_id: group.environment_id,
    total_hours_worked: group.total_hours_worked,
    total_wage_cost: group.total_wage_cost,
    employee_count: group.employee_count,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  console.log(`[API /eitje/aggregate] Created ${aggregatedData.length} aggregated records`);
  
  // Insert into aggregated table (use regular insert since tables don't exist yet)
  const { error: insertError } = await supabase
    .from('eitje_labor_hours_aggregated')
    .insert(aggregatedData);
    
  if (insertError) {
    throw new Error(`Failed to insert aggregated data: ${insertError.message}`);
  }
  
  console.log('[API /eitje/aggregate] Successfully processed time registration shifts');
}

/**
 * Process revenue days into aggregated format
 */
async function processRevenueDays(supabase: any, year: number, month: number) {
  console.log(`[API /eitje/aggregate] Processing revenue days for ${year}-${month}`);
  
  // Get raw data for the month
  const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
  
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
  
  // Group by date and environment_id
  const groupedData = new Map();
  
  for (const record of rawData) {
    const rawData = record.raw_data;
    const date = record.date;
    const environmentId = rawData.environment?.id;
    
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
        transaction_count: 0
      });
    }
    
    const group = groupedData.get(key);
    
    // Convert cents to euros
    const revenueInEuros = (rawData.amt_in_cents || 0) / 100;
    group.total_revenue += revenueInEuros;
    group.transaction_count += 1;
  }
  
  // Convert to array and prepare for insertion
  const aggregatedData = Array.from(groupedData.values()).map(group => ({
    date: group.date,
    environment_id: group.environment_id,
    total_revenue: group.total_revenue,
    transaction_count: group.transaction_count,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  console.log(`[API /eitje/aggregate] Created ${aggregatedData.length} aggregated revenue records`);
  
  // Insert into aggregated table (use regular insert since tables don't exist yet)
  const { error: insertError } = await supabase
    .from('eitje_revenue_days_aggregated')
    .insert(aggregatedData);
    
  if (insertError) {
    throw new Error(`Failed to insert aggregated revenue data: ${insertError.message}`);
  }
  
  console.log('[API /eitje/aggregate] Successfully processed revenue days');
}