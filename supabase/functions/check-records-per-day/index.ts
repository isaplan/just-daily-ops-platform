import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all records grouped by location and date
    const { data: records, error: recordsError } = await supabase
      .from('bork_sales_data')
      .select(`
        location_id,
        date,
        category,
        created_at
      `)
      .order('date', { ascending: false })
      .order('location_id');

    if (recordsError) {
      throw new Error(`Failed to fetch records: ${recordsError.message}`)
    }

    // Get location names
    const { data: locations, error: locError } = await supabase
      .from('locations')
      .select('id, name');

    if (locError) {
      throw new Error(`Failed to fetch locations: ${locError.message}`)
    }

    // Group by location and date
    const grouped: Record<string, {
      location_id: string;
      date: string;
      count: number;
      categories: Set<string>;
      last_updated: string;
    }> = {};

    records.forEach(record => {
      const key = `${record.location_id}_${record.date}`;
      if (!grouped[key]) {
        grouped[key] = {
          location_id: record.location_id,
          date: record.date,
          count: 0,
          categories: new Set(),
          last_updated: record.created_at
        };
      }
      grouped[key].count++;
      grouped[key].categories.add(record.category);
      // Keep the most recent timestamp
      if (new Date(record.created_at) > new Date(grouped[key].last_updated)) {
        grouped[key].last_updated = record.created_at;
      }
    });

    // Create location map
    const locationMap: Record<string, string> = {};
    locations.forEach(loc => {
      locationMap[loc.id] = loc.name;
    });

    // Convert to array and sort
    const results = Object.values(grouped).map(record => ({
      location_id: record.location_id,
      location_name: locationMap[record.location_id] || record.location_id,
      date: record.date,
      count: record.count,
      categories: Array.from(record.categories),
      last_updated: record.last_updated
    })).sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return a.location_name.localeCompare(b.location_name);
    });

    // Calculate summary stats
    const totalRecords = records.length;
    const uniqueDays = new Set(records.map(r => r.date)).size;
    const uniqueLocations = new Set(records.map(r => r.location_id)).size;
    const averageRecordsPerDay = uniqueDays > 0 ? (totalRecords / uniqueDays).toFixed(1) : '0';

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_records: totalRecords,
          unique_days: uniqueDays,
          unique_locations: uniqueLocations,
          average_records_per_day: averageRecordsPerDay
        },
        records_per_day: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Check records error:', error)
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

