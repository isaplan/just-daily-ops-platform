import { createClient } from '@/integrations/supabase/server';

/**
 * EITJE AGGREGATION SERVICE
 * 
 * Processes raw Eitje data into aggregated metrics for fast dashboard loading
 * Follows EXTREME DEFENSIVE MODE: simple, modular, debuggable
 */

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  environmentId?: number;
  teamId?: number;
}

export interface AggregationResult {
  recordsProcessed: number;
  recordsAggregated: number;
  errors: string[];
  processingTime: number;
}

export interface LaborHoursRecord {
  date: string;
  environment_id: number;
  team_id?: number;
  total_hours_worked: number;
  total_breaks_minutes: number;
  total_wage_cost: number;
  employee_count: number;
  shift_count: number;
  avg_hours_per_employee: number;
  avg_wage_per_hour: number;
}

export interface PlanningHoursRecord {
  date: string;
  environment_id: number;
  team_id?: number;
  planned_hours_total: number;
  total_breaks_minutes: number;
  total_planned_cost: number;
  employee_count: number;
  shift_count: number;
  confirmed_count: number;
  cancelled_count: number;
  planned_count: number;
  avg_hours_per_employee: number;
  avg_cost_per_hour: number;
}

export interface RevenueDaysRecord {
  date: string;
  environment_id: number;
  total_revenue: number;
  transaction_count: number;
  avg_revenue_per_transaction: number;
}

/**
 * Helper function to extract field values from raw_data JSONB
 * Tries multiple field paths and returns first non-null value
 */
function extractFieldValue(rawData: any, fieldPaths: string[]): any {
  if (!rawData || typeof rawData !== 'object') return null;
  
  for (const path of fieldPaths) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], rawData);
    if (value !== null && value !== undefined && value !== '') {
      return value;
    }
  }
  return null;
}

/**
 * Calculate hours worked from start/end times if hours field is missing
 */
function calculateHoursFromTimes(startTime: string | null, endTime: string | null): number {
  if (!startTime || !endTime) return 0;
  
  try {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(0, diffHours);
  } catch (error) {
    console.warn('[Eitje Aggregation] Error calculating hours from times:', error);
    return 0;
  }
}

/**
 * Aggregate Labor Hours from time_registration_shifts_raw
 */
export async function aggregateLaborHours(dateRange: DateRange): Promise<AggregationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('[Eitje Aggregation] Starting labor hours aggregation for:', dateRange);
    
    const supabase = await createClient();
    
    if (!supabase || typeof supabase.from !== 'function') {
      throw new Error('Failed to initialize Supabase client');
    }
    
    // Build query with filters
    let query = supabase
      .from('eitje_time_registration_shifts_raw')
      .select('*')
      .gte('date', dateRange.startDate)
      .lte('date', dateRange.endDate);
    
    if (dateRange.environmentId) {
      query = query.eq('environment_id', dateRange.environmentId);
    }
    
    if (dateRange.teamId) {
      query = query.eq('team_id', dateRange.teamId);
    }
    
    const { data: rawRecords, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch raw data: ${fetchError.message}`);
    }
    
    if (!rawRecords || rawRecords.length === 0) {
      console.log('[Eitje Aggregation] No raw records found for labor hours');
      return {
        recordsProcessed: 0,
        recordsAggregated: 0,
        errors: [],
        processingTime: Date.now() - startTime
      };
    }
    
    console.log(`[Eitje Aggregation] Found ${rawRecords.length} raw labor records`);
    
    // Group records by (date, environment_id, team_id)
    const groupedRecords = new Map<string, any[]>();
    
    rawRecords.forEach(record => {
      // Extract date from raw_data if record.date is not available
      const recordDate = record.date || extractFieldValue(record.raw_data, ['date', 'start_date', 'resource_date']);
      if (!recordDate) {
        console.warn('[Eitje Aggregation] Skipping record without date:', record.id);
        return;
      }
      
      // Extract environment_id and team_id from raw_data
      const environmentId = record.environment_id || extractFieldValue(record.raw_data, ['environment_id', 'environment.id', 'environment']);
      const teamId = record.team_id || extractFieldValue(record.raw_data, ['team_id', 'team.id', 'team']);
      
      // Debug logging for environment extraction
      if (!environmentId) {
        console.warn('[Eitje Aggregation] No environment_id found for record:', {
          id: record.id,
          date: recordDate,
          raw_data_keys: record.raw_data ? Object.keys(record.raw_data) : 'no raw_data',
          environment_id: record.environment_id
        });
      }
      
      const key = `${recordDate}-${environmentId || 'null'}-${teamId || 'null'}`;
      if (!groupedRecords.has(key)) {
        groupedRecords.set(key, []);
      }
      groupedRecords.get(key)!.push(record);
    });
    
    console.log(`[Eitje Aggregation] Grouped into ${groupedRecords.size} unique groups`);
    
    // Process each group
    const aggregatedRecords: LaborHoursRecord[] = [];
    
    for (const [key, records] of groupedRecords) {
      try {
        const parts = key.split('-');
        const date = parts.slice(0, 3).join('-'); // Rejoin date parts
        const environmentId = parts[3];
        const teamId = parts[4];
        
        let totalHoursWorked = 0;
        let totalBreaksMinutes = 0;
        let totalWageCost = 0;
        const uniqueEmployees = new Set<number>();
        
        records.forEach(record => {
          // Extract hours worked (try multiple field names)
          const hoursWorked = extractFieldValue(record.raw_data, [
            'hours_worked', 'hours', 'totalHours', 'total_hours'
          ]) || calculateHoursFromTimes(
            extractFieldValue(record.raw_data, ['start_time', 'start', 'startDateTime']),
            extractFieldValue(record.raw_data, ['end_time', 'end', 'endDateTime'])
          );
          
          totalHoursWorked += Number(hoursWorked) || 0;
          
          // Extract breaks (try multiple field names)
          const breaks = extractFieldValue(record.raw_data, [
            'break_minutes', 'breaks', 'breakMinutes', 'break_minutes_actual'
          ]) || 0;
          totalBreaksMinutes += Number(breaks) || 0;
          
          // Extract wage cost (try multiple field names)
          const wageCost = extractFieldValue(record.raw_data, [
            'wage_cost', 'costs.wage', 'wageCost', 'costs.wage_cost'
          ]) || 0;
          totalWageCost += Number(wageCost) || 0;
          
          // Track unique employees
          if (record.user_id) {
            uniqueEmployees.add(record.user_id);
          }
        });
        
        const employeeCount = uniqueEmployees.size;
        const shiftCount = records.length;
        const avgHoursPerEmployee = employeeCount > 0 ? totalHoursWorked / employeeCount : 0;
        const avgWagePerHour = totalHoursWorked > 0 ? totalWageCost / totalHoursWorked : 0;
        
        aggregatedRecords.push({
          date,
          environment_id: Number(environmentId),
          team_id: teamId === 'null' ? null : Number(teamId),
          total_hours_worked: Math.round(totalHoursWorked * 100) / 100,
          total_breaks_minutes: totalBreaksMinutes,
          total_wage_cost: Math.round(totalWageCost * 100) / 100,
          employee_count: employeeCount,
          shift_count: shiftCount,
          avg_hours_per_employee: Math.round(avgHoursPerEmployee * 100) / 100,
          avg_wage_per_hour: Math.round(avgWagePerHour * 100) / 100
        });
        
      } catch (error) {
        const errorMsg = `Error processing group ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[Eitje Aggregation]', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Upsert aggregated records
    if (aggregatedRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('eitje_labor_hours_aggregated')
        .upsert(aggregatedRecords, {
          onConflict: 'date,environment_id,team_id'
        });
      
      if (upsertError) {
        throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
      }
    }
    
    console.log(`[Eitje Aggregation] Labor hours aggregation completed: ${aggregatedRecords.length} records`);
    
    return {
      recordsProcessed: rawRecords.length,
      recordsAggregated: aggregatedRecords.length,
      errors,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    const errorMsg = `Labor hours aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Eitje Aggregation]', errorMsg);
    errors.push(errorMsg);
    
    return {
      recordsProcessed: 0,
      recordsAggregated: 0,
      errors,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Aggregate Planning Hours from planning_shifts_raw
 */
export async function aggregatePlanningHours(dateRange: DateRange): Promise<AggregationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('[Eitje Aggregation] Starting planning hours aggregation for:', dateRange);
    
    const supabase = await createClient();
    
    // Build query with filters
    let query = supabase
      .from('eitje_planning_shifts_raw')
      .select('*')
      .gte('date', dateRange.startDate)
      .lte('date', dateRange.endDate);
    
    if (dateRange.environmentId) {
      query = query.eq('environment_id', dateRange.environmentId);
    }
    
    if (dateRange.teamId) {
      query = query.eq('team_id', dateRange.teamId);
    }
    
    const { data: rawRecords, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch raw data: ${fetchError.message}`);
    }
    
    if (!rawRecords || rawRecords.length === 0) {
      console.log('[Eitje Aggregation] No raw records found for planning hours');
      return {
        recordsProcessed: 0,
        recordsAggregated: 0,
        errors: [],
        processingTime: Date.now() - startTime
      };
    }
    
    console.log(`[Eitje Aggregation] Found ${rawRecords.length} raw planning records`);
    
    // Group records by (date, environment_id, team_id)
    const groupedRecords = new Map<string, any[]>();
    
    rawRecords.forEach(record => {
      const key = `${record.date}-${record.environment_id}-${record.team_id || 'null'}`;
      if (!groupedRecords.has(key)) {
        groupedRecords.set(key, []);
      }
      groupedRecords.get(key)!.push(record);
    });
    
    console.log(`[Eitje Aggregation] Grouped into ${groupedRecords.size} unique groups`);
    
    // Process each group
    const aggregatedRecords: PlanningHoursRecord[] = [];
    
    for (const [key, records] of groupedRecords) {
      try {
        const [date, environmentId, teamId] = key.split('-');
        
        let plannedHoursTotal = 0;
        let totalBreaksMinutes = 0;
        let totalPlannedCost = 0;
        const uniqueEmployees = new Set<number>();
        let confirmedCount = 0;
        let cancelledCount = 0;
        let plannedCount = 0;
        
        records.forEach(record => {
          // Extract planned hours
          const plannedHours = extractFieldValue(record.raw_data, [
            'planned_hours', 'hours', 'totalHours', 'total_hours'
          ]) || calculateHoursFromTimes(
            extractFieldValue(record.raw_data, ['start_time', 'start', 'startDateTime']),
            extractFieldValue(record.raw_data, ['end_time', 'end', 'endDateTime'])
          );
          
          plannedHoursTotal += Number(plannedHours) || 0;
          
          // Extract breaks
          const breaks = extractFieldValue(record.raw_data, [
            'break_minutes', 'breaks', 'breakMinutes', 'break_minutes_actual'
          ]) || 0;
          totalBreaksMinutes += Number(breaks) || 0;
          
          // Extract planned cost
          const plannedCost = extractFieldValue(record.raw_data, [
            'planned_cost', 'costs.planned', 'plannedCost', 'wage_cost'
          ]) || 0;
          totalPlannedCost += Number(plannedCost) || 0;
          
          // Track unique employees
          if (record.user_id) {
            uniqueEmployees.add(record.user_id);
          }
          
          // Count by status
          const status = extractFieldValue(record.raw_data, ['status']) || 'planned';
          if (status === 'confirmed') confirmedCount++;
          else if (status === 'cancelled') cancelledCount++;
          else plannedCount++;
        });
        
        const employeeCount = uniqueEmployees.size;
        const shiftCount = records.length;
        const avgHoursPerEmployee = employeeCount > 0 ? plannedHoursTotal / employeeCount : 0;
        const avgCostPerHour = plannedHoursTotal > 0 ? totalPlannedCost / plannedHoursTotal : 0;
        
        aggregatedRecords.push({
          date,
          environment_id: Number(environmentId),
          team_id: teamId === 'null' ? null : Number(teamId),
          planned_hours_total: Math.round(plannedHoursTotal * 100) / 100,
          total_breaks_minutes: totalBreaksMinutes,
          total_planned_cost: Math.round(totalPlannedCost * 100) / 100,
          employee_count: employeeCount,
          shift_count: shiftCount,
          confirmed_count: confirmedCount,
          cancelled_count: cancelledCount,
          planned_count: plannedCount,
          avg_hours_per_employee: Math.round(avgHoursPerEmployee * 100) / 100,
          avg_cost_per_hour: Math.round(avgCostPerHour * 100) / 100
        });
        
      } catch (error) {
        const errorMsg = `Error processing group ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[Eitje Aggregation]', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Upsert aggregated records
    if (aggregatedRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('eitje_planning_hours_aggregated')
        .upsert(aggregatedRecords, {
          onConflict: 'date,environment_id,team_id'
        });
      
      if (upsertError) {
        throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
      }
    }
    
    console.log(`[Eitje Aggregation] Planning hours aggregation completed: ${aggregatedRecords.length} records`);
    
    return {
      recordsProcessed: rawRecords.length,
      recordsAggregated: aggregatedRecords.length,
      errors,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    const errorMsg = `Planning hours aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Eitje Aggregation]', errorMsg);
    errors.push(errorMsg);
    
    return {
      recordsProcessed: 0,
      recordsAggregated: 0,
      errors,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Aggregate Revenue Days from revenue_days_raw
 */
export async function aggregateRevenueDays(dateRange: DateRange): Promise<AggregationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  
  try {
    console.log('[Eitje Aggregation] Starting revenue days aggregation for:', dateRange);
    
    const supabase = await createClient();
    
    // Build query with filters
    let query = supabase
      .from('eitje_revenue_days_raw')
      .select('*')
      .gte('date', dateRange.startDate)
      .lte('date', dateRange.endDate);
    
    if (dateRange.environmentId) {
      query = query.eq('environment_id', dateRange.environmentId);
    }
    
    const { data: rawRecords, error: fetchError } = await query;
    
    if (fetchError) {
      throw new Error(`Failed to fetch raw data: ${fetchError.message}`);
    }
    
    if (!rawRecords || rawRecords.length === 0) {
      console.log('[Eitje Aggregation] No raw records found for revenue days');
      return {
        recordsProcessed: 0,
        recordsAggregated: 0,
        errors: [],
        processingTime: Date.now() - startTime
      };
    }
    
    console.log(`[Eitje Aggregation] Found ${rawRecords.length} raw revenue records`);
    
    // Group records by (date, environment_id)
    const groupedRecords = new Map<string, any[]>();
    
    rawRecords.forEach(record => {
      // Extract environment_id from raw_data.environment.id
      const environmentId = record.raw_data?.environment?.id || record.environment_id || 0;
      const key = `${record.date}-${environmentId}`;
      if (!groupedRecords.has(key)) {
        groupedRecords.set(key, []);
      }
      groupedRecords.get(key)!.push(record);
    });
    
    console.log(`[Eitje Aggregation] Grouped into ${groupedRecords.size} unique groups`);
    
    // Process each group
    const aggregatedRecords: RevenueDaysRecord[] = [];
    
    for (const [key, records] of groupedRecords) {
      try {
        const parts = key.split('-');
        const date = `${parts[0]}-${parts[1]}-${parts[2]}`; // Reconstruct full date
        const environmentId = parts[3];
        
        let totalRevenue = 0;
        let transactionCount = 0;
        
        records.forEach(record => {
          // Extract revenue from amt_in_cents (convert to euros)
          const revenueCents = record.raw_data?.amt_in_cents || 0;
          const revenue = Number(revenueCents) / 100; // Convert cents to euros
          
          totalRevenue += revenue;
          
          // Each record represents one transaction
          transactionCount += 1;
        });
        
        const avgRevenuePerTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;
        
        aggregatedRecords.push({
          date,
          environment_id: Number(environmentId),
          total_revenue: Math.round(totalRevenue * 100) / 100,
          transaction_count: transactionCount,
          avg_revenue_per_transaction: Math.round(avgRevenuePerTransaction * 100) / 100
        });
        
      } catch (error) {
        const errorMsg = `Error processing group ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('[Eitje Aggregation]', errorMsg);
        errors.push(errorMsg);
      }
    }
    
    // Upsert aggregated records
    if (aggregatedRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from('eitje_revenue_days_aggregated')
        .upsert(aggregatedRecords, {
          onConflict: 'date,environment_id'
        });
      
      if (upsertError) {
        throw new Error(`Failed to upsert aggregated data: ${upsertError.message}`);
      }
    }
    
    console.log(`[Eitje Aggregation] Revenue days aggregation completed: ${aggregatedRecords.length} records`);
    
    return {
      recordsProcessed: rawRecords.length,
      recordsAggregated: aggregatedRecords.length,
      errors,
      processingTime: Date.now() - startTime
    };
    
  } catch (error) {
    const errorMsg = `Revenue days aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Eitje Aggregation]', errorMsg);
    errors.push(errorMsg);
    
    return {
      recordsProcessed: 0,
      recordsAggregated: 0,
      errors,
      processingTime: Date.now() - startTime
    };
  }
}
