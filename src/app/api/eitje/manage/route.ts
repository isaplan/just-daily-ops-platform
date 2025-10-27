import { NextRequest, NextResponse } from 'next/server';
import { 
  fetchEitjeEnvironments,
  fetchEitjeTeams,
  fetchEitjeUsers,
  fetchEitjeShiftTypes,
  fetchEitjeTimeRegistrationShifts,
  fetchEitjePlanningShifts,
  fetchEitjeRevenueDays,
  fetchEitjeAvailabilityShifts,
  fetchEitjeLeaveRequests,
  fetchEitjeEvents,
  getEitjeCredentials,
  saveEitjeRawData
} from '@/lib/eitje/api-service';

/**
 * EITJE ENDPOINT MANAGEMENT API - EXTREME DEFENSIVE MODE
 * 
 * Provides comprehensive management capabilities for all Eitje API endpoints
 * Supports: test, sync, validate, and bulk operations
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/manage] Management request received');
    
    const body = await request.json();
    const { 
      action,
      endpoint,
      startDate = '2024-10-24',
      endDate = '2024-10-25',
      batchSize = 100,
      validateOnly = false
    } = body;

    // DEFENSIVE: Validate required parameters
    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: action is required'
      }, { status: 400 });
    }

    if (!endpoint && action !== 'list') {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: endpoint is required for this action'
      }, { status: 400 });
    }

    // DEFENSIVE: Get Eitje credentials
    const { baseUrl, credentials } = await getEitjeCredentials();

    // DEFENSIVE: Define endpoint configurations
    const endpointConfigs = {
      environments: {
        displayName: 'Environments',
        category: 'master_data',
        requiresDates: false,
        maxDays: null,
        table: 'eitje_environments',
        fn: () => fetchEitjeEnvironments(baseUrl, credentials)
      },
      teams: {
        displayName: 'Teams',
        category: 'master_data',
        requiresDates: false,
        maxDays: null,
        table: 'eitje_teams',
        fn: () => fetchEitjeTeams(baseUrl, credentials)
      },
      users: {
        displayName: 'Users',
        category: 'master_data',
        requiresDates: false,
        maxDays: null,
        table: 'eitje_users',
        fn: () => fetchEitjeUsers(baseUrl, credentials)
      },
      shift_types: {
        displayName: 'Shift Types',
        category: 'master_data',
        requiresDates: false,
        maxDays: null,
        table: 'eitje_shift_types',
        fn: () => fetchEitjeShiftTypes(baseUrl, credentials)
      },
      time_registration_shifts: {
        displayName: 'Time Registration Shifts',
        category: 'labor_data',
        requiresDates: true,
        maxDays: 7,
        table: 'eitje_time_registration_shifts_raw',
        fn: () => fetchEitjeTimeRegistrationShifts(baseUrl, credentials, startDate, endDate)
      },
      planning_shifts: {
        displayName: 'Planning Shifts',
        category: 'labor_data',
        requiresDates: true,
        maxDays: 7,
        table: 'eitje_planning_shifts_raw',
        fn: () => fetchEitjePlanningShifts(baseUrl, credentials, startDate, endDate)
      },
      revenue_days: {
        displayName: 'Revenue Days',
        category: 'revenue_data',
        requiresDates: true,
        maxDays: 90,
        table: 'eitje_revenue_days_raw',
        fn: () => fetchEitjeRevenueDays(baseUrl, credentials, startDate, endDate)
      },
      availability_shifts: {
        displayName: 'Availability Shifts',
        category: 'labor_data',
        requiresDates: true,
        maxDays: 7,
        table: 'eitje_availability_shifts_raw',
        fn: () => fetchEitjeAvailabilityShifts(baseUrl, credentials, startDate, endDate)
      },
      leave_requests: {
        displayName: 'Leave Requests',
        category: 'labor_data',
        requiresDates: true,
        maxDays: 7,
        table: 'eitje_leave_requests_raw',
        fn: () => fetchEitjeLeaveRequests(baseUrl, credentials, startDate, endDate)
      },
      events: {
        displayName: 'Events',
        category: 'labor_data',
        requiresDates: true,
        maxDays: 90,
        table: 'eitje_events_raw',
        fn: () => fetchEitjeEvents(baseUrl, credentials, startDate, endDate)
      }
    };

    // DEFENSIVE: Handle different actions
    switch (action) {
      case 'list':
        return NextResponse.json({
          success: true,
          message: 'Available Eitje endpoints',
          endpoints: Object.entries(endpointConfigs).map(([key, config]) => ({
            name: key,
            displayName: config.displayName,
            category: config.category,
            requiresDates: config.requiresDates,
            maxDays: config.maxDays,
            table: config.table
          }))
        });

      case 'test':
        return await testEndpoint(endpoint, endpointConfigs[endpoint as keyof typeof endpointConfigs]);

      case 'sync':
        return await syncEndpoint(endpoint, endpointConfigs[endpoint as keyof typeof endpointConfigs], batchSize, validateOnly);

      case 'validate':
        return await validateEndpoint(endpoint, endpointConfigs[endpoint as keyof typeof endpointConfigs], startDate, endDate);

      case 'bulk_test':
        return await bulkTestEndpoints(endpointConfigs);

      case 'bulk_sync':
        return await bulkSyncEndpoints(endpointConfigs, startDate, endDate, batchSize, validateOnly);

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Supported actions: list, test, sync, validate, bulk_test, bulk_sync`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[API /eitje/manage] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process management request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DEFENSIVE: Test individual endpoint
async function testEndpoint(endpoint: string, config: any) {
  if (!config) {
    return NextResponse.json({
      success: false,
      error: `Unknown endpoint: ${endpoint}`
    }, { status: 400 });
  }

  const startTime = Date.now();
  
  try {
    console.log(`[API /eitje/manage] Testing ${endpoint}...`);
    
    const data = await config.fn();
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: `${config.displayName} test successful`,
      endpoint: {
        name: endpoint,
        displayName: config.displayName,
        category: config.category,
        requiresDates: config.requiresDates,
        maxDays: config.maxDays
      },
      testResult: {
        success: true,
        dataCount: Array.isArray(data) ? data.length : 'not array',
        responseTime,
        hasData: !!data,
        error: null
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      message: `${config.displayName} test failed`,
      endpoint: {
        name: endpoint,
        displayName: config.displayName,
        category: config.category,
        requiresDates: config.requiresDates,
        maxDays: config.maxDays
      },
      testResult: {
        success: false,
        dataCount: 0,
        responseTime,
        hasData: false,
        error: errorMessage
      }
    });
  }
}

// DEFENSIVE: Sync individual endpoint
async function syncEndpoint(endpoint: string, config: any, batchSize: number, validateOnly: boolean) {
  if (!config) {
    return NextResponse.json({
      success: false,
      error: `Unknown endpoint: ${endpoint}`
    }, { status: 400 });
  }

  const startTime = Date.now();
  
  try {
    console.log(`[API /eitje/manage] Syncing ${endpoint}...`);
    
    const data = await config.fn();
    
    if (validateOnly) {
      return NextResponse.json({
        success: true,
        message: `${config.displayName} validation successful`,
        endpoint: {
          name: endpoint,
          displayName: config.displayName,
          category: config.category,
          table: config.table
        },
        syncResult: {
          success: true,
          dataCount: Array.isArray(data) ? data.length : 'not array',
          validated: true,
          synced: false,
          error: null
        }
      });
    }
    
    // DEFENSIVE: Save data to database
    if (Array.isArray(data) && data.length > 0) {
      await saveEitjeRawData(config.table, data);
    }
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: `${config.displayName} sync successful`,
      endpoint: {
        name: endpoint,
        displayName: config.displayName,
        category: config.category,
        table: config.table
      },
      syncResult: {
        success: true,
        dataCount: Array.isArray(data) ? data.length : 'not array',
        validated: false,
        synced: true,
        responseTime,
        error: null
      }
    });
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json({
      success: false,
      message: `${config.displayName} sync failed`,
      endpoint: {
        name: endpoint,
        displayName: config.displayName,
        category: config.category,
        table: config.table
      },
      syncResult: {
        success: false,
        dataCount: 0,
        validated: false,
        synced: false,
        responseTime,
        error: errorMessage
      }
    });
  }
}

// DEFENSIVE: Validate individual endpoint
async function validateEndpoint(endpoint: string, config: any, startDate: string, endDate: string) {
  if (!config) {
    return NextResponse.json({
      success: false,
      error: `Unknown endpoint: ${endpoint}`
    }, { status: 400 });
  }

  // DEFENSIVE: Validate date range if required
  if (config.requiresDates) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return NextResponse.json({
        success: false,
        error: 'startDate cannot be after endDate'
      }, { status: 400 });
    }
    
    if (config.maxDays && daysDiff > config.maxDays) {
      return NextResponse.json({
        success: false,
        error: `Date range too large: ${daysDiff} days. Maximum ${config.maxDays} days allowed for ${endpoint}`
      }, { status: 400 });
    }
  }

  return NextResponse.json({
    success: true,
    message: `${config.displayName} validation successful`,
    endpoint: {
      name: endpoint,
      displayName: config.displayName,
      category: config.category,
      requiresDates: config.requiresDates,
      maxDays: config.maxDays
    },
    validation: {
      valid: true,
      dateRange: config.requiresDates ? { startDate, endDate } : null,
      constraints: {
        maxDays: config.maxDays
      }
    }
  });
}

// DEFENSIVE: Bulk test all endpoints
async function bulkTestEndpoints(configs: any) {
  const results: Record<string, any> = {};
  const startTime = Date.now();
  
  for (const [endpoint, config] of Object.entries(configs)) {
    const endpointStartTime = Date.now();
    
    try {
      console.log(`[API /eitje/manage] Bulk testing ${endpoint}...`);
      
      const data = await config.fn();
      const responseTime = Date.now() - endpointStartTime;
      
      results[endpoint] = {
        success: true,
        dataCount: Array.isArray(data) ? data.length : 'not array',
        responseTime,
        hasData: !!data,
        error: null
      };
      
    } catch (error) {
      const responseTime = Date.now() - endpointStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      results[endpoint] = {
        success: false,
        dataCount: 0,
        responseTime,
        hasData: false,
        error: errorMessage
      };
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  return NextResponse.json({
    success: true,
    message: `Bulk test completed: ${successful}/${total} endpoints successful`,
    results,
    summary: {
      total,
      successful,
      failed: total - successful,
      totalTime,
      successRate: `${Math.round((successful / total) * 100)}%`
    }
  });
}

// DEFENSIVE: Bulk sync all endpoints
async function bulkSyncEndpoints(configs: any, startDate: string, endDate: string, batchSize: number, validateOnly: boolean) {
  const results: Record<string, any> = {};
  const startTime = Date.now();
  
  for (const [endpoint, config] of Object.entries(configs)) {
    const endpointStartTime = Date.now();
    
    try {
      console.log(`[API /eitje/manage] Bulk syncing ${endpoint}...`);
      
      const data = await config.fn();
      
      if (!validateOnly && Array.isArray(data) && data.length > 0) {
        await saveEitjeRawData(config.table, data);
      }
      
      const responseTime = Date.now() - endpointStartTime;
      
      results[endpoint] = {
        success: true,
        dataCount: Array.isArray(data) ? data.length : 'not array',
        responseTime,
        synced: !validateOnly,
        error: null
      };
      
    } catch (error) {
      const responseTime = Date.now() - endpointStartTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      results[endpoint] = {
        success: false,
        dataCount: 0,
        responseTime,
        synced: false,
        error: errorMessage
      };
    }
  }
  
  const totalTime = Date.now() - startTime;
  const successful = Object.values(results).filter(r => r.success).length;
  const total = Object.keys(results).length;
  
  return NextResponse.json({
    success: true,
    message: `Bulk sync completed: ${successful}/${total} endpoints successful`,
    results,
    summary: {
      total,
      successful,
      failed: total - successful,
      totalTime,
      successRate: `${Math.round((successful / total) * 100)}%`,
      validateOnly
    }
  });
}
