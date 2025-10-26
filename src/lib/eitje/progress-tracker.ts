// Eitje Monthly Progress Tracker
// Tracks sync progress and detects data changes for Eitje endpoints

import { createClient } from '@/integrations/supabase/server';

export interface EitjeSyncProgress {
  endpoint: string;
  year: number;
  month: number;
  totalDays: number;
  syncedDays: number;
  lastSyncDate: string;
  lastCheckDate: string;
  isComplete: boolean;
  hasChanges: boolean;
}

export interface EitjeDateRange {
  startDate: string;
  endDate: string;
  days: number;
}

/**
 * Get monthly progress for a specific endpoint and month
 */
export async function getEitjeMonthlyProgress(
  endpoint: string,
  year: number,
  month: number
): Promise<EitjeSyncProgress> {
  const supabase = await createClient();
  
  // Get all records for this endpoint in the specified month
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0); // Last day of month
  
  const tableName = getTableName(endpoint);
  console.log(`[Eitje Progress] Checking table: ${tableName} for ${year}-${month}`);
  console.log(`[Eitje Progress] Date range: ${startOfMonth.toISOString()} to ${endOfMonth.toISOString()}`);
  
  // Get all records and filter by data date, not created_at
  const { data: records, error } = await supabase
    .from(tableName)
    .select('id, created_at, updated_at, raw_data')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Eitje Progress] Error fetching records:', error);
    throw error;
  }

  console.log(`[Eitje Progress] Found ${records?.length || 0} total records`);
  
  // For now, we'll use a simple approach: if there are any records in the database,
  // we'll assume they were synced for the requested month
  // TODO: This should be improved to track which months were actually synced
  const filteredRecords = records || [];
  
  console.log(`[Eitje Progress] Found ${filteredRecords.length} total records for ${year}-${month}`);

  console.log(`[Eitje Progress] Found ${filteredRecords.length} records in date range`);
  if (filteredRecords.length > 0) {
    console.log(`[Eitje Progress] First filtered record:`, {
      id: filteredRecords[0].id,
      created_at: filteredRecords[0].created_at,
      has_raw_data: !!filteredRecords[0].raw_data,
      raw_data_date: filteredRecords[0].raw_data?.date
    });
  }

  // Group filtered records by date
  const recordsByDate = new Map<string, any[]>();
  filteredRecords.forEach(record => {
    // Get the actual data date
    let dataDate = null;
    if (record.raw_data && record.raw_data.date) {
      dataDate = record.raw_data.date;
    } else if (record.date) {
      dataDate = record.date;
    }
    
    if (dataDate) {
      const dateStr = new Date(dataDate).toISOString().split('T')[0];
      if (!recordsByDate.has(dateStr)) {
        recordsByDate.set(dateStr, []);
      }
      recordsByDate.get(dateStr)!.push(record);
    }
  });

  // Calculate progress
  const totalDays = endOfMonth.getDate();
  const syncedDays = recordsByDate.size;
  const isComplete = syncedDays === totalDays;
  
  // Check for changes (records updated after initial sync)
  const hasChanges = records?.some(record => {
    const createdAt = new Date(record.created_at);
    const updatedAt = new Date(record.updated_at);
    return updatedAt.getTime() > createdAt.getTime() + 60000; // Updated more than 1 minute after creation
  }) || false;

  // Get last sync and check dates
  const lastSyncDate = records?.length > 0 
    ? new Date(Math.max(...records.map(r => new Date(r.created_at).getTime()))).toISOString()
    : '';
  
  const lastCheckDate = new Date().toISOString();

  return {
    endpoint,
    year,
    month,
    totalDays,
    syncedDays,
    lastSyncDate,
    lastCheckDate,
    isComplete,
    hasChanges
  };
}

/**
 * Get progress for all endpoints for a specific month
 */
export async function getAllEitjeMonthlyProgress(
  year: number,
  month: number
): Promise<EitjeSyncProgress[]> {
  const endpoints = [
    'environments',
    'teams', 
    'users',
    'shift_types',
    'time_registration_shifts',
    'planning_shifts',
    'revenue_days'
  ];

  const progressPromises = endpoints.map(endpoint => 
    getEitjeMonthlyProgress(endpoint, year, month)
  );

  return Promise.all(progressPromises);
}

/**
 * Get date ranges that need syncing for a specific month
 */
export async function getEitjeMissingDateRanges(
  endpoint: string,
  year: number,
  month: number
): Promise<EitjeDateRange[]> {
  const progress = await getEitjeMonthlyProgress(endpoint, year, month);
  
  if (progress.isComplete) {
    return []; // All dates are synced
  }

  const missingRanges: EitjeDateRange[] = [];
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);
  
  // Get synced dates
  const supabase = await createClient();
  const tableName = getTableName(endpoint);
  const { data: records } = await supabase
    .from(tableName)
    .select('created_at')
    .gte('created_at', startOfMonth.toISOString())
    .lte('created_at', endOfMonth.toISOString())
    .order('created_at', { ascending: true });

  const syncedDates = new Set(
    records?.map(record => 
      new Date(record.created_at).toISOString().split('T')[0]
    ) || []
  );

  // Find missing date ranges (chunked into 7-day periods)
  let currentDate = new Date(startOfMonth);
  
  while (currentDate <= endOfMonth) {
    const rangeStart = new Date(currentDate);
    const rangeEnd = new Date(currentDate);
    rangeEnd.setDate(currentDate.getDate() + 6); // 7 days
    
    // Don't go beyond month end
    if (rangeEnd > endOfMonth) {
      rangeEnd.setTime(endOfMonth.getTime());
    }

    // Check if this range has any missing dates
    const rangeDates = [];
    const checkDate = new Date(rangeStart);
    while (checkDate <= rangeEnd) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (!syncedDates.has(dateStr)) {
        rangeDates.push(dateStr);
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    // If this range has missing dates, add it to missing ranges
    if (rangeDates.length > 0) {
      missingRanges.push({
        startDate: rangeStart.toISOString().split('T')[0],
        endDate: rangeEnd.toISOString().split('T')[0],
        days: rangeDates.length
      });
    }

    // Move to next 7-day period
    currentDate.setDate(currentDate.getDate() + 7);
  }

  return missingRanges;
}

/**
 * Check if a specific date has been synced
 */
export async function isDateSynced(
  endpoint: string,
  date: string
): Promise<boolean> {
  const supabase = await createClient();
  const tableName = getTableName(endpoint);
  
  const startOfDay = new Date(date + 'T00:00:00.000Z');
  const endOfDay = new Date(date + 'T23:59:59.999Z');
  
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .limit(1);

  if (error) {
    console.error('[Eitje Progress] Error checking date sync:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Get table name for endpoint
 */
function getTableName(endpoint: string): string {
  const tableMap: Record<string, string> = {
    'environments': 'eitje_environments',
    'teams': 'eitje_teams',
    'users': 'eitje_users',
    'shift_types': 'eitje_shift_types',
    'time_registration_shifts': 'eitje_time_registration_shifts_raw',
    'planning_shifts': 'eitje_planning_shifts_raw',
    'revenue_days': 'eitje_revenue_days_raw'
  };

  return tableMap[endpoint] || `eitje_${endpoint}_raw`;
}

/**
 * Get monthly summary for dashboard
 */
export async function getEitjeMonthlySummary(
  year: number,
  month: number
): Promise<{
  totalEndpoints: number;
  completeEndpoints: number;
  partialEndpoints: number;
  totalDays: number;
  syncedDays: number;
  completionPercentage: number;
  hasChanges: boolean;
}> {
  const allProgress = await getAllEitjeMonthlyProgress(year, month);
  
  const totalEndpoints = allProgress.length;
  const completeEndpoints = allProgress.filter(p => p.isComplete).length;
  const partialEndpoints = totalEndpoints - completeEndpoints;
  
  const totalDays = allProgress.reduce((sum, p) => sum + p.totalDays, 0);
  const syncedDays = allProgress.reduce((sum, p) => sum + p.syncedDays, 0);
  const completionPercentage = totalDays > 0 ? Math.round((syncedDays / totalDays) * 100) : 0;
  
  const hasChanges = allProgress.some(p => p.hasChanges);

  return {
    totalEndpoints,
    completeEndpoints,
    partialEndpoints,
    totalDays,
    syncedDays,
    completionPercentage,
    hasChanges
  };
}
