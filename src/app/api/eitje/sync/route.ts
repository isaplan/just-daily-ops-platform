import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { 
  fetchEitjeEnvironments,
  fetchEitjeTeams,
  fetchEitjeUsers,
  fetchEitjeShiftTypes,
  fetchEitjeTimeRegistrationShifts,
  fetchEitjePlanningShifts,
  fetchEitjeRevenueDays,
  getEitjeCredentials
} from '@/lib/eitje/api-service';

/**
 * EITJE DATA SYNCHRONIZATION ENDPOINT
 * 
 * Handles manual data synchronization from Eitje API to database
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/sync] Manual sync request received');
    
    const body = await request.json();
    const { 
      endpoint,
      startDate, 
      endDate, 
      batchSize = 100
    } = body;

    // DEFENSIVE: Check if this is a master data endpoint (no dates required)
    const masterDataEndpoints = ['environments', 'teams', 'users', 'shift_types'];
    const isMasterData = endpoint && masterDataEndpoints.includes(endpoint);
    
    // DEFENSIVE: Validate required parameters based on endpoint type
    if (!isMasterData && (!startDate || !endDate)) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: startDate and endDate are required for data endpoints'
      }, { status: 400 });
    }

    // DEFENSIVE: Validate date format (only for data endpoints)
    if (!isMasterData && (!isValidDate(startDate) || !isValidDate(endDate))) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      }, { status: 400 });
    }

    // DEFENSIVE: Validate date range (only for data endpoints)
    if (!isMasterData && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({
        success: false,
        error: 'startDate cannot be after endDate'
      }, { status: 400 });
    }

    // DEFENSIVE: Get Eitje credentials
    const { baseUrl, credentials } = await getEitjeCredentials();

    // DEFENSIVE: Fetch data from Eitje API using simple functions
    const startTime = Date.now();
    let data;

    try {
      // Route to appropriate endpoint method
      switch (endpoint) {
        case 'environments':
          data = await fetchEitjeEnvironments(baseUrl, credentials);
          console.log('[API /eitje/sync] Environments data:', { 
            dataType: typeof data, 
            isArray: Array.isArray(data), 
            length: Array.isArray(data) ? data.length : 'not array',
            firstItem: Array.isArray(data) && data.length > 0 ? data[0] : 'no items'
          });
          break;
        case 'teams':
          data = await fetchEitjeTeams(baseUrl, credentials);
          break;
        case 'users':
          data = await fetchEitjeUsers(baseUrl, credentials);
          break;
        case 'shift_types':
          data = await fetchEitjeShiftTypes(baseUrl, credentials);
          break;
        case 'time_registration_shifts':
          data = await fetchEitjeTimeRegistrationShifts(baseUrl, credentials, startDate, endDate);
          break;
        case 'planning_shifts':
          data = await fetchEitjePlanningShifts(baseUrl, credentials, startDate, endDate);
          break;
        case 'revenue_days':
          data = await fetchEitjeRevenueDays(baseUrl, credentials, startDate, endDate);
          break;
        default:
          return NextResponse.json({
            success: false,
            error: `Unknown endpoint: ${endpoint}`
          }, { status: 400 });
      }
    } catch (fetchError) {
      return NextResponse.json({
        success: false,
        error: `Data fetch failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
        details: {
          endpoint,
          errorType: fetchError instanceof Error ? fetchError.constructor.name : 'Unknown'
        }
      }, { status: 502 });
    }

    // DEFENSIVE: Process and store data
    console.log('[API /eitje/sync] Data received:', { 
      dataLength: data?.length || 0, 
      endpoint,
      batchSize 
    });
    const syncResult = await processAndStoreData(data || [], batchSize, endpoint);
    const syncTime = Date.now() - startTime;

    console.log('[API /eitje/sync] Manual sync completed:', syncResult);

    return NextResponse.json({
      success: true,
      message: 'Manual sync completed successfully',
      result: {
        success: true,
        recordsProcessed: syncResult.recordsProcessed,
        recordsAdded: syncResult.recordsAdded,
        recordsUpdated: syncResult.recordsUpdated,
        errors: syncResult.errors,
        errorDetails: syncResult.errorDetails,
        syncTime,
        lastSyncDate: new Date().toISOString(),
        nextSyncDate: new Date(Date.now() + 15 * 60000).toISOString(), // 15 minutes from now
        debug: {
          dataFetched: data?.length || 0,
          dataType: Array.isArray(data) ? 'array' : typeof data,
          endpoint
        }
      }
    });

  } catch (error) {
    console.error('[API /eitje/sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform manual sync',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DEFENSIVE: Process and store synchronized data
 */
async function processAndStoreData(
  data: unknown[], 
  batchSize: number,
  endpoint: string
): Promise<{
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  errors: number;
  errorDetails?: string[];
}> {
  let recordsProcessed = 0;
  let recordsAdded = 0;
  const recordsUpdated = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  try {
        // DEFENSIVE: Determine target table based on endpoint
        const tableMap: Record<string, string> = {
          'environments': 'eitje_environments',
          'teams': 'eitje_teams', 
          'users': 'eitje_users',
          'shift_types': 'eitje_shift_types',
          'time_registration_shifts': 'eitje_time_registration_shifts_raw',
          'planning_shifts': 'eitje_planning_shifts_raw',
          'revenue_days': 'eitje_revenue_days_raw'
        };

        const targetTable = tableMap[endpoint];
        if (!targetTable) {
          throw new Error(`No table mapping found for endpoint: ${endpoint}`);
        }

        // DEFENSIVE: Create Supabase client
        const supabase = await createClient();
        
        // DEFENSIVE: Process data in batches
        console.log('[API /eitje/sync] Starting batch processing:', { 
          totalRecords: data.length, 
          batchSize, 
          targetTable 
        });
        
        // Prepare all records for batch insert
        const recordsToInsert = [];
        for (const record of data) {
          try {
            // DEFENSIVE: Validate record structure
            const isValid = validateRecord(record);
            if (!isValid) {
              errors++;
              continue;
            }

            // DEFENSIVE: Store raw data directly for now
            recordsToInsert.push({
              id: (record as any).id,
              raw_data: record,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          } catch (recordError) {
            const errorMsg = `Record processing error: ${recordError instanceof Error ? recordError.message : 'Unknown error'}`;
            console.error('[API /eitje/sync] Record processing error:', recordError);
            errorDetails.push(errorMsg);
            errors++;
          }
        }

        // DEFENSIVE: Batch insert all records at once
        if (recordsToInsert.length > 0) {
          console.log('[API /eitje/sync] Batch inserting records:', { 
            count: recordsToInsert.length,
            targetTable 
          });
          
          const { error } = await supabase
            .from(targetTable)
            .upsert(recordsToInsert, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            });

          if (error) {
            const errorMsg = `Batch insert error: ${error.message} (code: ${error.code})`;
            console.error('[API /eitje/sync] Batch insert error:', { 
              error: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
              table: targetTable,
              recordCount: recordsToInsert.length
            });
            errorDetails.push(errorMsg);
            errors += recordsToInsert.length;
          } else {
            console.log('[API /eitje/sync] Successfully batch inserted records:', recordsToInsert.length);
            recordsProcessed += recordsToInsert.length;
            recordsAdded += recordsToInsert.length;
          }
        }

    console.log(`[API /eitje/sync] Processed ${recordsProcessed} records, ${errors} errors`);
    
    return {
      recordsProcessed,
      recordsAdded,
      recordsUpdated,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined
    };

  } catch (error) {
    console.error('[API /eitje/sync] Data processing failed:', error);
    throw error;
  }
}

/**
 * DEFENSIVE: Validate record structure
 */
function validateRecord(record: unknown): boolean {
  return !!(
    record &&
    typeof record === 'object' &&
    record !== null &&
    'id' in record
  );
}

/**
 * DEFENSIVE: Transform record for storage
 */
function transformRecord(record: unknown): Record<string, unknown> {
  const rec = record as Record<string, unknown>;
  const user = rec.user as Record<string, unknown> | undefined;
  const team = rec.team as Record<string, unknown> | undefined;
  const environment = rec.environment as Record<string, unknown> | undefined;
  const skillSet = rec.skill_set as Record<string, unknown> | undefined;
  const shiftType = rec.shift_type as Record<string, unknown> | undefined;
  
  return {
    id: rec.id || '',
    date: rec.date || '',
    user_id: user?.id || null,
    team_id: team?.id || null,
    environment_id: environment?.id || null,
    start_time: rec.start || null,
    end_time: rec.end || null,
    break_minutes: rec.break_minutes || 0,
    published: rec.published || false,
    skill_set: skillSet?.name || null,
    shift_type: shiftType?.name || null,
    remarks: rec.remarks || null,
    raw_data: record,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * DEFENSIVE: Validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && !!dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}
