import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface ProcessRequest {
  location_id?: string;
  date?: string;
  process_all?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { location_id, date, process_all }: ProcessRequest = await req.json()
    
    console.log('🔄 Processing Bork raw data...', { location_id, date, process_all })

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Build query for raw data
    let query = supabase
      .from('bork_sales_data')
      .select('*')
      .eq('category', 'STEP1_RAW_DATA')

    if (location_id) {
      query = query.eq('location_id', location_id)
    }
    
    if (date) {
      query = query.eq('date', date)
    }

    const { data: rawData, error: rawError } = await query

    if (rawError) {
      throw new Error(`Failed to fetch raw data: ${rawError.message}`)
    }

    if (!rawData || rawData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No raw data found to process',
          records_processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${rawData.length} raw data records to process`)

    let totalProcessed = 0
    const results = []

    // Process each raw data record
    for (const rawRecord of rawData) {
      console.log(`🔄 Processing raw record ${rawRecord.id} for location ${rawRecord.location_id}...`)
      
      const processedRecords = await processRawRecord(supabase, rawRecord)
      totalProcessed += processedRecords.length
      
      results.push({
        location_id: rawRecord.location_id,
        date: rawRecord.date,
        records_created: processedRecords.length
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${totalProcessed} individual sales records`,
        total_records_processed: totalProcessed,
        raw_records_processed: rawData.length,
        results: results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error processing raw data:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process raw data', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processRawRecord(supabase: any, rawRecord: any) {
  try {
    console.log('🔄 Processing raw record:', rawRecord.id)
    
    // Extract the raw API response
    const rawResponse = rawRecord.raw_data?.raw_response || rawRecord.raw_data?.response
    if (!rawResponse || !Array.isArray(rawResponse)) {
      console.log('⚠️ No valid raw response found in record')
      return []
    }

    console.log(`📊 Found ${rawResponse.length} tickets in raw response`)

    const processedRecords = []

    // Process each ticket
    for (const ticket of rawResponse) {
      if (!ticket.Orders || !Array.isArray(ticket.Orders)) {
        console.log('⚠️ No orders found in ticket')
        continue
      }

      // Process each order
      for (const order of ticket.Orders) {
        if (!order.Lines || !Array.isArray(order.Lines)) {
          console.log('⚠️ No lines found in order')
          continue
        }

        // Process each line item
        for (const line of order.Lines) {
          const processedRecord = {
            location_id: rawRecord.location_id,
            import_id: rawRecord.import_id,
            date: rawRecord.date,
            product_name: line.ProductName || line.name || 'Unknown Product',
            category: line.Category || line.product?.productGroupName || 'Unknown Category',
            quantity: parseFloat(line.Qty || line.quantity || 0),
            price: parseFloat(line.Price || line.unitPrice || 0),
            revenue: parseFloat(line.TotalInc || line.totalPrice || 0),
            raw_data: {
              ticket: ticket,
              order: order,
              line: line,
              processed_at: new Date().toISOString()
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }

          processedRecords.push(processedRecord)
        }
      }
    }

    console.log(`✅ Processed ${processedRecords.length} individual sales records`)

    // Insert processed records
    if (processedRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('bork_sales_data')
        .insert(processedRecords)

      if (insertError) {
        console.error('❌ Error inserting processed records:', insertError)
        throw new Error(`Failed to insert processed records: ${insertError.message}`)
      }

      console.log(`✅ Successfully inserted ${processedRecords.length} records`)
    }

    return processedRecords
  } catch (error) {
    console.error('❌ Error processing raw record:', error)
    return []
  }
}
