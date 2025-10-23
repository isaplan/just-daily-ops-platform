import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface RangeSyncRequest {
  start_date: string; // YYYYMMDD format
  end_date: string;   // YYYYMMDD format
  location_ids: string[];
  override: boolean;
}

interface RangeResult {
  date: string;
  results: Array<{
    location_id: string;
    success: boolean;
    records_stored: number;
    error?: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { start_date, end_date, location_ids, override }: RangeSyncRequest = await req.json()
    
    if (!start_date || !end_date || !location_ids || location_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: start_date, end_date, location_ids' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate date formats (YYYYMMDD)
    if (!/^\d{8}$/.test(start_date) || !/^\d{8}$/.test(end_date)) {
      return new Response(
        JSON.stringify({ error: 'Invalid date format. Expected YYYYMMDD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert YYYYMMDD to Date objects
    const startDate = new Date(
      parseInt(start_date.slice(0, 4)),    // year
      parseInt(start_date.slice(4, 6)) - 1, // month (0-indexed)
      parseInt(start_date.slice(6, 8))     // day
    )
    
    const endDate = new Date(
      parseInt(end_date.slice(0, 4)),      // year
      parseInt(end_date.slice(4, 6)) - 1, // month (0-indexed)
      parseInt(end_date.slice(6, 8))      // day
    )

    if (startDate > endDate) {
      return new Response(
        JSON.stringify({ error: 'start_date cannot be after end_date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate array of dates to process
    const datesToProcess: string[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().slice(0, 10).replace(/-/g, '') // Convert to YYYYMMDD
      datesToProcess.push(dateStr)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log(`📅 Processing ${datesToProcess.length} dates from ${start_date} to ${end_date}`)

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const rangeResults: RangeResult[] = []

    // Process each date
    for (const date of datesToProcess) {
      try {
        console.log(`🔄 Processing date: ${date}`)

        // Call the daily sync function internally
        const dailySyncResponse = await fetch(`${supabaseUrl}/functions/v1/bork-sync-daily`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: date,
            location_ids: location_ids,
            override: override,
          }),
        })

        if (!dailySyncResponse.ok) {
          const errorData = await dailySyncResponse.json()
          throw new Error(`Daily sync failed for ${date}: ${errorData.error || dailySyncResponse.statusText}`)
        }

        const dailyResult = await dailySyncResponse.json()
        
        rangeResults.push({
          date: date,
          results: dailyResult.results || [],
        })

        console.log(`✅ Completed date: ${date}`)

        // Rate limiting: 2 second delay between dates
        if (datesToProcess.indexOf(date) < datesToProcess.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.error(`❌ Failed to process date ${date}:`, error)
        
        rangeResults.push({
          date: date,
          results: location_ids.map(location_id => ({
            location_id,
            success: false,
            records_stored: 0,
            error: error.message,
          })),
        })
      }
    }

    // Calculate summary statistics
    const totalDays = datesToProcess.length
    const totalLocations = location_ids.length
    const totalOperations = totalDays * totalLocations
    
    const successfulOperations = rangeResults.reduce((sum, dayResult) => 
      sum + dayResult.results.filter(r => r.success).length, 0
    )
    
    const failedOperations = totalOperations - successfulOperations
    const totalRecordsStored = rangeResults.reduce((sum, dayResult) => 
      sum + dayResult.results.reduce((daySum, result) => daySum + result.records_stored, 0), 0
    )

    return new Response(
      JSON.stringify({
        success: true,
        message: `Range sync completed from ${start_date} to ${end_date}`,
        summary: {
          start_date,
          end_date,
          total_days: totalDays,
          total_locations: totalLocations,
          total_operations: totalOperations,
          successful_operations: successfulOperations,
          failed_operations: failedOperations,
          total_records_stored: totalRecordsStored,
        },
        results: rangeResults,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Range sync function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

