import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Endpoint configuration with CORRECT date range limits per Eitje API spec
const ENDPOINT_CONFIG: Record<string, {
  requiresDates: boolean;
  method: 'GET' | 'POST';
  table: string;
  maxDays?: number;
  defaultFilterType?: 'resource_date' | 'updated';
}> = {
  // Master data (no dates needed)
  'teams': { requiresDates: false, method: 'GET', table: 'eitje_teams' },
  'users': { requiresDates: false, method: 'GET', table: 'eitje_users' },
  'environments': { requiresDates: false, method: 'GET', table: 'eitje_environments' },
  'shift_types': { requiresDates: false, method: 'GET', table: 'eitje_shift_types' },
  
  // Date-required endpoints - CORRECTED LIMITS per API documentation
  'time_registration_shifts': { 
    requiresDates: true, 
    method: 'GET', 
    table: 'eitje_time_registration_shifts',
    maxDays: 7,  // ⚠️ CRITICAL FIX: Changed from 90 to 7 (API limit for resource_date filter)
    defaultFilterType: 'resource_date'
  },
  'planning_shifts': { 
    requiresDates: true, 
    method: 'GET', 
    table: 'eitje_planning_shifts',
    maxDays: 7,  // ⚠️ CRITICAL FIX: Changed from 90 to 7 (API limit for resource_date filter)
    defaultFilterType: 'resource_date'
  },
  'revenue_days': { 
    requiresDates: true, 
    method: 'GET', 
    table: 'eitje_revenue_days',
    maxDays: 90,  // ✅ CORRECT: revenue_days allows 90 days
    defaultFilterType: 'resource_date'
  },
  'events': { 
    requiresDates: true, 
    method: 'POST', 
    table: 'eitje_shifts',
    maxDays: 90,  // ✅ CORRECT: events allows 90 days
    defaultFilterType: 'resource_date'
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { 
      endpoint = 'teams',
      test_mode = false,
      sync_mode = 'test',
      start_date,
      end_date,
      days_back = 14,
      location_id,
      header_strategy = 'auto'
    } = await req.json();

    console.log(`[eitje-api-sync] Starting sync (${sync_mode.toUpperCase()} MODE) [build: v2025-10-16-01]`, {
      endpoint,
      start_date,
      end_date,
      test_mode,
      location_id
    });

    // Fetch global Eitje API credentials
    // Handle multiple credentials by taking the first active one
    console.log('[eitje-api-sync] Fetching credentials...');
    const { data: credentialsList, error: credError } = await supabaseClient
      .from('api_credentials')
      .select('*')
      .eq('provider', 'eitje')
      .eq('is_active', true)
      .limit(1);
    
    if (credError) {
      console.error('[eitje-api-sync] Error fetching credentials:', JSON.stringify(credError, null, 2));
      throw new Error(`Failed to fetch credentials: ${credError.message || 'Unknown error'}`);
    }
    
    console.log('[eitje-api-sync] Credentials query result:', {
      hasData: !!credentialsList,
      dataLength: credentialsList?.length || 0,
      firstCredId: credentialsList?.[0]?.id || 'none'
    });
    
    const credentials = credentialsList && Array.isArray(credentialsList) && credentialsList.length > 0 
      ? credentialsList[0] 
      : null;

    if (!credentials || !credentials.id) {
      console.error('[eitje-api-sync] No active Eitje API credentials found', {
        credentialsListLength: credentialsList?.length || 0,
        credentialsType: typeof credentials,
        credentialsIsNull: credentials === null
      });
      throw new Error('No active Eitje API credentials found. Please configure credentials in the UI.');
    }

    console.log('[eitje-api-sync] Using credential ID:', credentials.id);

    // Cast additional_config to access nested properties (same fix as UI)
    const credConfig = credentials.additional_config as Record<string, any> || {};
    const partnerUsername = credConfig.partner_username;
    const partnerPassword = credConfig.partner_password;
    const apiUsername = credConfig.api_username;
    const apiPassword = credConfig.api_password;

    if (!partnerUsername || !partnerPassword || !apiUsername || !apiPassword) {
      console.error('[eitje-api-sync] Credential validation failed', {
        has_partner_username: !!partnerUsername,
        has_partner_password: !!partnerPassword,
        has_api_username: !!apiUsername,
        has_api_password: !!apiPassword,
        config_keys: Object.keys(credConfig),
        raw_config: credentials.additional_config
      });
      throw new Error('Missing required credentials');
    }

    console.log('[eitje-api-sync] Using credentials', {
      header_strategy,
      endpoint,
      has_partner_creds: !!partnerUsername && !!partnerPassword,
      has_api_creds: !!apiUsername && !!apiPassword
    });

    // Calculate date range based on sync mode
    let finalStartDate = start_date;
    let finalEndDate = end_date;

    const config = ENDPOINT_CONFIG[endpoint];
    if (!config) {
      throw new Error(`Unknown endpoint: ${endpoint}`);
    }

    if (config.requiresDates && !finalStartDate) {
      // For ongoing mode, use rolling window
      if (sync_mode === 'ongoing') {
        const today = new Date();
        const pastDate = new Date(today);
        pastDate.setDate(pastDate.getDate() - days_back);
        finalStartDate = pastDate.toISOString().split('T')[0];
        finalEndDate = today.toISOString().split('T')[0];
      }
    }

    // Validate date range
    if (config.requiresDates && finalStartDate && finalEndDate && config.maxDays) {
      const start = new Date(finalStartDate);
      const end = new Date(finalEndDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > config.maxDays) {
        throw new Error(`Date range too large for ${endpoint}. Max ${config.maxDays} days, got ${daysDiff} days.`);
      }
    }

    // Build Eitje API URL and request
    const baseUrl = 'https://open-api.eitje.app/open_api';
    const method = config.method;
    
    let url = `${baseUrl}/${endpoint}`;
    let requestBody = null;

    // For GET requests with date filters, use URL query parameters
    if (method === 'GET' && config.requiresDates && finalStartDate && finalEndDate) {
      const params = new URLSearchParams({
        'filters[start_date]': finalStartDate,
        'filters[end_date]': finalEndDate
      });
      url = `${url}?${params.toString()}`;
    } 
    // For POST requests, use body
    else if (method !== 'GET' && config.requiresDates && finalStartDate && finalEndDate) {
      requestBody = {
        filters: {
          start_date: finalStartDate,
          end_date: finalEndDate
        }
      };
    }

    // Helper function to build headers
    const buildHeaders = (strategy: 'standard' | 'alternative'): Record<string, string> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (strategy === 'alternative') {
        headers['partner-username'] = partnerUsername;
        headers['partner-password'] = partnerPassword;
        headers['api-username'] = apiUsername;
        headers['api-password'] = apiPassword;
      } else {
        headers['PartnerUsername'] = partnerUsername;
        headers['PartnerPassword'] = partnerPassword;
        headers['ApiUsername'] = apiUsername;
        headers['ApiPassword'] = apiPassword;
      }

      return headers;
    };

    // Helper function to call API with retry logic for auto mode
    const callEitjeApi = async (strategyToUse: 'standard' | 'alternative', attempt: number = 1) => {
      const headers = buildHeaders(strategyToUse);

      console.log(`[eitje-api-sync] Calling Eitje API (attempt ${attempt}, strategy: ${strategyToUse})`, {
        url,
        method,
        endpoint,
        body: requestBody
      });

      const fetchOptions: RequestInit = {
        method,
        headers
      };

      // Only add body for non-GET requests
      if (method !== 'GET' && requestBody) {
        fetchOptions.body = JSON.stringify(requestBody);
      }

      let response = await fetch(url, fetchOptions);

      console.log(`[eitje-api-sync] Response metadata (attempt ${attempt})`, {
        status: response.status,
        contentType: response.headers.get('content-type'),
        strategy: strategyToUse,
        endpoint
      });

      // If GET failed with 400/404, try POST with X-HTTP-Method-Override as fallback
      if (method === 'GET' && (response.status === 400 || response.status === 404) && !requestBody && config.requiresDates && finalStartDate && finalEndDate) {
        console.log(`[eitje-api-sync] GET failed, trying POST with X-HTTP-Method-Override fallback`);
        
        const fallbackBody = {
          filters: {
            start_date: finalStartDate,
            end_date: finalEndDate
          }
        };
        
        const fallbackHeaders = {
          ...headers,
          'X-HTTP-Method-Override': 'GET'
        };
        
        response = await fetch(`${baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: fallbackHeaders,
          body: JSON.stringify(fallbackBody)
        });
        
        console.log(`[eitje-api-sync] Fallback POST response`, {
          status: response.status,
          contentType: response.headers.get('content-type')
        });
      }

      return { response, strategyUsed: strategyToUse };
    };

    // Create sync log
    // Use minimal payload - only include columns that definitely exist
    const syncLogPayload: any = {
      sync_type: endpoint,
      status: 'pending'
    };
    
    // Only add optional fields if they exist (don't fail if they don't)
    // These are tried in order of preference
    if (location_id) {
      syncLogPayload.location_id = location_id;
    }
    
    const { data: syncLogData, error: syncLogError } = await supabaseClient
      .from('api_sync_logs')
      .insert(syncLogPayload)
      .select()
      .single();
    
    if (syncLogError) {
      console.error('[eitje-api-sync] Failed to create sync log:', syncLogError);
      throw new Error(`Failed to create sync log: ${syncLogError.message}`);
    }
    
    if (!syncLogData || !syncLogData.id) {
      console.error('[eitje-api-sync] Sync log was not created properly');
      throw new Error('Failed to create sync log: No ID returned');
    }
    
    const syncLog = syncLogData;
    console.log('[eitje-api-sync] Created sync log:', syncLog.id);

    // Call API with retry logic for auto mode
    let eitjeResponse: Response;
    let strategyUsed: 'standard' | 'alternative';

    if (header_strategy === 'auto') {
      // Try standard first
      const firstAttempt = await callEitjeApi('standard', 1);
      eitjeResponse = firstAttempt.response;
      strategyUsed = firstAttempt.strategyUsed;

      // If 401 with auth error, retry with alternative
      if (!eitjeResponse.ok && eitjeResponse.status === 401) {
        const errorText = await eitjeResponse.text();
        if (errorText.includes('not all required auth keys present') || errorText.includes('auth')) {
          console.log('[eitje-api-sync] Auto-retry with alternative headers');
          const secondAttempt = await callEitjeApi('alternative', 2);
          eitjeResponse = secondAttempt.response;
          strategyUsed = secondAttempt.strategyUsed;
        }
      }
    } else {
      // Use specified strategy
      const attempt = await callEitjeApi(header_strategy as 'standard' | 'alternative', 1);
      eitjeResponse = attempt.response;
      strategyUsed = attempt.strategyUsed;
    }

    console.log('[eitje-api-sync] Final response', {
      status: eitjeResponse.status,
      strategyUsed,
      success: eitjeResponse.ok
    });

    if (!eitjeResponse.ok) {
      const errorText = await eitjeResponse.text();
      console.error('[eitje-api-sync] API Error:', errorText);
      
      await supabaseClient
        .from('api_sync_logs')
        .update({
          status: 'failed',
          error_message: `HTTP ${eitjeResponse.status}: ${errorText}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      throw new Error(`Eitje API error: ${eitjeResponse.status} - ${errorText}`);
    }

    const contentType = eitjeResponse.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await eitjeResponse.text();
      console.error('[eitje-api-sync] Non-JSON response:', text);
      
      await supabaseClient
        .from('api_sync_logs')
        .update({
          status: 'failed',
          error_message: `Expected JSON, got ${contentType}`,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      throw new Error('API returned non-JSON response');
    }

    const responseText = await eitjeResponse.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
      
      // Handle various response formats
      let dataArray = data;
      if (!Array.isArray(data)) {
        // Try common wrapper patterns
        if (data.data && Array.isArray(data.data)) {
          dataArray = data.data;
        } else if (data.items && Array.isArray(data.items)) {
          dataArray = data.items;
        } else if (data.results && Array.isArray(data.results)) {
          dataArray = data.results;
        } else if (data[endpoint] && Array.isArray(data[endpoint])) {
          dataArray = data[endpoint];
        } else {
          console.log(`[eitje-api-sync] Response is not an array and no known wrapper found`, {
            keys: Object.keys(data),
            endpoint
          });
          dataArray = [];
        }
      }
      
      data = dataArray;
      
      console.log('[eitje-api-sync] Successfully parsed JSON', {
        count: data.length,
        endpoint
      });
    } catch (parseError) {
      console.error('[eitje-api-sync] JSON parse error:', parseError);
      
      await supabaseClient
        .from('api_sync_logs')
        .update({
          status: 'failed',
          error_message: 'Invalid JSON response',
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      throw new Error('Failed to parse API response');
    }

    // Handle test mode with ENHANCED logging
    if (test_mode) {
      console.log('[eitje-api-sync] Test mode - returning FULL response structure for analysis');
      
      // Analyze field structure
      const sampleRecord = Array.isArray(data) && data.length > 0 ? data[0] : null;
      const fieldNames = sampleRecord ? Object.keys(sampleRecord) : [];
      
      // Log complete structure for documentation purposes
      console.log('[eitje-api-sync] Response analysis', {
        total_records: Array.isArray(data) ? data.length : 0,
        field_names: fieldNames,
        sample_record_structure: sampleRecord ? JSON.stringify(sampleRecord, null, 2) : 'No data'
      });
      
      await supabaseClient
        .from('api_sync_logs')
        .update({
          status: 'completed',
          records_fetched: Array.isArray(data) ? data.length : 0,
          completed_at: new Date().toISOString(),
          metadata: {
            test_mode: true,
            field_names: fieldNames,
            sample_record_keys: fieldNames
          }
        })
        .eq('id', syncLog.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          test_mode: true,
          raw_response: data,  // Return FULL response, not just sample
          sample_records: Array.isArray(data) ? data.slice(0, 5) : data,
          total_count: Array.isArray(data) ? data.length : 0,
          endpoint,
          field_discovery: {
            field_names: fieldNames,
            record_count: Array.isArray(data) ? data.length : 0
          },
          sync_log_id: syncLog.id,
          date_range: { start: finalStartDate, end: finalEndDate },
          api_config: {
            max_days_allowed: config.maxDays,
            method: config.method,
            filter_type: config.defaultFilterType
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process and store data
    const items = Array.isArray(data) ? data : (data?.data || []);
    let insertedCount = 0;

    if (items.length > 0) {
      insertedCount = await insertData(supabaseClient, endpoint, items, syncLog.id, location_id);
    }

    // Update sync log
    await supabaseClient
      .from('api_sync_logs')
      .update({
        status: 'completed',
        records_fetched: items.length,
        records_inserted: insertedCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLog.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        records_fetched: items.length,
        records_inserted: insertedCount,
        endpoint,
        sync_mode,
        date_range: { start: finalStartDate, end: finalEndDate },
        sync_log_id: syncLog.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[eitje-api-sync] Fatal error:', errorMessage);
    console.error('[eitje-api-sync] Error stack:', errorStack);
    console.error('[eitje-api-sync] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        error_type: error instanceof Error ? error.constructor.name : typeof error,
        details: errorStack || error?.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function insertData(
  supabase: any,
  endpoint: string,
  items: any[],
  importId: string,
  locationId: string | null
): Promise<number> {
  const config = ENDPOINT_CONFIG[endpoint];
  if (!config) return 0;

  const tableName = config.table;

  // Transform data based on endpoint
  let transformed: any[] = [];

  switch (endpoint) {
    case 'teams':
      transformed = items.map(item => ({
        eitje_team_id: item.id,
        name: item.name,
        raw_data: item
      }));
      break;

    case 'users':
      transformed = items.map(item => ({
        eitje_user_id: item.id,
        name: item.name,
        email: item.email,
        raw_data: item
      }));
      break;

    case 'environments':
      transformed = items.map(item => ({
        eitje_environment_id: item.id,
        name: item.name,
        location_id: locationId,
        raw_data: item
      }));
      break;

    case 'shift_types':
      transformed = items.map(item => ({
        eitje_shift_type_id: item.id,
        name: item.name,
        color: item.color,
        raw_data: item
      }));
      break;

    case 'time_registration_shifts':
    case 'planning_shifts':
      // Import field mapping utilities (inline for edge function)
      const extractField = (record: any, fieldPaths: string[], defaultValue: any = null): any => {
        for (const path of fieldPaths) {
          const parts = path.split('.');
          let current = record;
          for (const part of parts) {
            if (current === null || current === undefined) break;
            current = current[part];
          }
          if (current !== undefined && current !== null) {
            return current;
          }
        }
        return defaultValue;
      };

      const computeHours = (startTime: string | null, endTime: string | null, breakMinutes: number = 0): number | null => {
        if (!startTime || !endTime) return null;
        try {
          // Handle ISO datetime
          if (startTime.includes('T')) startTime = startTime.split('T')[1].substring(0, 8);
          if (endTime.includes('T')) endTime = endTime.split('T')[1].substring(0, 8);
          
          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);
          
          let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
          if (totalMinutes < 0) totalMinutes += 24 * 60; // Overnight shift
          totalMinutes -= breakMinutes;
          
          return totalMinutes > 0 ? Number((totalMinutes / 60).toFixed(2)) : null;
        } catch {
          return null;
        }
      };

      // Log first item for field discovery
      if (items.length > 0) {
        console.log('[eitje-api-sync] Raw API response structure:', {
          endpoint,
          available_fields: Object.keys(items[0]),
          sample_item: JSON.stringify(items[0], null, 2)
        });
      }
      
      transformed = items.map(item => {
        // Use documented field mappings with fallbacks
        const startTime = extractField(item, ['start_time', 'start', 'startDateTime']);
        const endTime = extractField(item, ['end_time', 'end', 'endDateTime']);
        const breakMinutes = extractField(item, ['break_minutes', 'breaks', 'breakMinutes'], 0);
        const hoursWorked = extractField(item, ['hours_worked', 'hours', 'totalHours']) 
                           || computeHours(startTime, endTime, breakMinutes) 
                           || 0;
        const wageCost = extractField(item, ['wage_cost', 'costs.wage', 'wageCost']);
        
        // Validate critical fields
        const warnings = [];
        if (!item.id) warnings.push('missing_id');
        if (!item.date) warnings.push('missing_date');
        if (!startTime) warnings.push('missing_start_time');
        if (!endTime) warnings.push('missing_end_time');
        
        if (warnings.length > 0) {
          console.warn('[eitje-api-sync] Incomplete record:', {
            shift_id: item.id,
            warnings,
            available_fields: Object.keys(item)
          });
        }
        
        return {
          eitje_shift_id: item.id,
          environment_id: extractField(item, ['environment_id', 'environment.id', 'environmentId']),
          eitje_team_id: extractField(item, ['team_id', 'team.id', 'teamId']),
          eitje_user_id: extractField(item, ['user_id', 'user.id', 'userId']),
          date: item.date,
          start_time: startTime,
          end_time: endTime,
          break_minutes: breakMinutes,
          hours_worked: hoursWorked,
          wage_cost: wageCost,
          skill_set: extractField(item, ['skill_set', 'skillSet']),
          shift_type: extractField(item, ['shift_type', 'shiftType']),
          status: extractField(item, ['status'], endpoint === 'planning_shifts' ? 'planned' : null),
          import_id: importId,
          location_id: locationId,
          raw_data: item  // ALWAYS store complete original response
        };
      });
      
      // Log transformation summary
      const completeRecords = transformed.filter(r => r.start_time && r.end_time && r.hours_worked > 0).length;
      console.log('[eitje-api-sync] Transformation summary:', {
        endpoint,
        total_records: transformed.length,
        complete_records: completeRecords,
        completeness_pct: ((completeRecords / transformed.length) * 100).toFixed(1)
      });
      break;

    case 'revenue_days':
      transformed = items.map(item => ({
        eitje_revenue_id: item.id,
        date: item.date,
        environment_id: item.environment?.id || item.environment_id,
        revenue: item.revenue || item.amount || item.total || 0,
        revenue_ex_vat: item.revenue_ex_vat || item.revenue_excl_vat || null,
        vat_amount: item.vat_amount || item.vat || null,
        transactions_count: item.transactions_count || item.transaction_count || 0,
        import_id: importId,
        location_id: locationId,
        raw_data: item
      }));
      break;

    case 'events':
      transformed = items.map(item => ({
        eitje_shift_id: item.id,
        environment_id: item.environment?.id,
        team_id: item.team?.id,
        user_id: item.user?.id,
        date: item.date,
        start_time: item.start_time,
        end_time: item.end_time,
        break_minutes: item.break_minutes || 0,
        hours_worked: item.hours_worked || 0,
        wage_cost: item.wage_cost,
        skill_set: item.skill_set,
        import_id: importId,
        location_id: locationId
      }));
      break;

    default:
      return 0;
  }

  if (transformed.length === 0) return 0;

  // Upsert data (handle duplicates)
  const uniqueField = endpoint === 'teams' ? 'eitje_team_id' :
    endpoint === 'users' ? 'eitje_user_id' :
    endpoint === 'environments' ? 'eitje_environment_id' :
    endpoint === 'shift_types' ? 'eitje_shift_type_id' :
    endpoint === 'revenue_days' ? 'eitje_revenue_id' :
    'eitje_shift_id';

  try {
    const { error } = await supabase
      .from(tableName)
      .upsert(transformed, { 
        onConflict: uniqueField,
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error(`[eitje-api-sync] Insert error for ${endpoint}:`, error);
      return 0;
    }
    
    return transformed.length;
  } catch (error) {
    console.error(`[eitje-api-sync] Fatal insert error for ${endpoint}:`, error);
    return 0;
  }
}
