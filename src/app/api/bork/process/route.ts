import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';
import { aggregateSalesDataForDateRange } from '@/lib/bork/aggregation-service';

export async function POST(request: NextRequest) {
  try {
    const { location_id, process_all } = await request.json();
    
    console.log('[API /bork/process] Processing raw data:', { location_id, process_all });
    
    const supabase = await createClient();
    
    // Fetch raw data with optimized query - no limit, we'll process all
    let query = supabase
      .from('bork_sales_data')
      .select('id, location_id, category')
      .eq('category', 'STEP1_RAW_DATA');
    
    if (location_id && !process_all) {
      query = query.eq('location_id', location_id);
    }
    
    // Add timeout protection for database query
    const queryPromise = query;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 15000)
    );

    const { data: rawData, error: queryError } = await Promise.race([queryPromise, timeoutPromise]) as { data: any[] | null; error: any };
    
    if (queryError) {
      console.error('[API /bork/process] Query error:', queryError);
      return NextResponse.json({ 
        success: false, 
        error: `Database query failed: ${queryError.message}` 
      }, { status: 500 });
    }
    
    console.log('[API /bork/process] Found', rawData?.length || 0, 'records');
    console.log('[API /bork/process] Sample records:', rawData?.slice(0, 2));
    
    // Process ALL records in batches with fail-safe retry logic and progress tracking
    let processed = 0;
    const processedByLocation: { [locationId: string]: number } = {};
    const batchSize = 10; // Process 10 records at a time
    const maxRetries = 3;
    const totalRecords = rawData.length;
    
    console.log(`[API /bork/process] Starting to process ${totalRecords} records in batches of ${batchSize}`);
    
    for (let i = 0; i < totalRecords; i += batchSize) {
      const batch = rawData.slice(i, i + batchSize);
      const batchNumber = Math.floor(i/batchSize) + 1;
      const totalBatches = Math.ceil(totalRecords/batchSize);
      const progress = Math.round((i / totalRecords) * 100);
      
      console.log(`[API /bork/process] Processing batch ${batchNumber}/${totalBatches} (${progress}% complete) - ${batch.length} records`);
      
      let batchProcessed = 0;
      let retryCount = 0;
      
      while (batchProcessed < batch.length && retryCount < maxRetries) {
        try {
          // Process batch with timeout protection
          const batchPromise = Promise.all(
            batch.map(async (record: any) => {
              const { error: updateError } = await supabase
                .from('bork_sales_data')
                .update({ 
                  category: 'STEP2_PROCESSED',
                  updated_at: new Date().toISOString()
                })
                .eq('id', record.id);
              
              if (updateError) {
                throw new Error(`Update failed for record ${record.id}: ${updateError.message}`);
              }
              
              // Track processed records per location
              processedByLocation[record.location_id] = (processedByLocation[record.location_id] || 0) + 1;
              
              return record.id;
            })
          );
          
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Batch processing timeout')), 10000) // 10 second timeout per batch
          );
          
          const processedIds = await Promise.race([batchPromise, timeoutPromise]) as string[];
          batchProcessed = processedIds.length;
          processed += batchProcessed;
          
          const currentProgress = Math.round(((i + batchProcessed) / totalRecords) * 100);
          console.log(`[API /bork/process] Batch ${batchNumber} completed: ${batchProcessed}/${batch.length} records processed (${currentProgress}% total progress)`);
          
        } catch (error) {
          retryCount++;
          console.error(`[API /bork/process] Batch ${batchNumber} failed (attempt ${retryCount}/${maxRetries}):`, error);
          
          if (retryCount < maxRetries) {
            console.log(`[API /bork/process] Retrying batch ${batchNumber} in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay before retry
          } else {
            console.error(`[API /bork/process] Batch ${batchNumber} failed after ${maxRetries} attempts, skipping`);
            break;
          }
        }
      }
      
      // 1 second delay between batches to prevent overwhelming the database
      if (i + batchSize < totalRecords) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`[API /bork/process] Processing complete: ${processed}/${totalRecords} records processed successfully`);
    console.log(`[API /bork/process] Per-location breakdown:`, processedByLocation);
    
    // After processing raw data, aggregate sales data for each location
    console.log('[API /bork/process] Starting aggregation phase...');
    const aggregationResults: { [locationId: string]: { success: boolean; aggregatedDates: string[]; errors: string[] } } = {};
    
    // Get unique locations that were processed
    const processedLocations = Object.keys(processedByLocation);
    
    for (const locationId of processedLocations) {
      try {
        console.log(`[API /bork/process] Aggregating data for location ${locationId}...`);
        
        // Get date range for this location from processed data
        const { data: dateData, error: dateError } = await supabase
          .from('bork_sales_data')
          .select('date')
          .eq('location_id', locationId)
          .eq('category', 'STEP2_PROCESSED')
          .order('date', { ascending: true });
        
        if (dateError) {
          console.error(`[API /bork/process] Date query error for location ${locationId}:`, dateError);
          aggregationResults[locationId] = { success: false, aggregatedDates: [], errors: [`Date query failed: ${dateError.message}`] };
          continue;
        }
        
        if (!dateData || dateData.length === 0) {
          console.log(`[API /bork/process] No processed data found for location ${locationId}`);
          aggregationResults[locationId] = { success: true, aggregatedDates: [], errors: [] };
          continue;
        }
        
        // Get date range
        const dates = dateData.map(d => d.date).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        
        console.log(`[API /bork/process] Aggregating location ${locationId} from ${startDate} to ${endDate}`);
        
        // Aggregate sales data for this location and date range
        const aggregationResult = await aggregateSalesDataForDateRange(locationId, startDate, endDate);
        aggregationResults[locationId] = aggregationResult;
        
        if (aggregationResult.success) {
          const mode = aggregationResult.incremental ? 'incremental' : 'full';
          console.log(`[API /bork/process] Successfully aggregated ${aggregationResult.aggregatedDates.length} dates for location ${locationId} (${mode} mode)`);
        } else {
          console.error(`[API /bork/process] Aggregation failed for location ${locationId}:`, aggregationResult.errors);
        }
        
      } catch (error) {
        console.error(`[API /bork/process] Aggregation error for location ${locationId}:`, error);
        aggregationResults[locationId] = { 
          success: false, 
          aggregatedDates: [], 
          errors: [error instanceof Error ? error.message : 'Unknown aggregation error']
        };
      }
    }
    
    console.log('[API /bork/process] Aggregation phase complete');
    
    return NextResponse.json({ 
      success: true, 
      processed,
      processedByLocation,
      aggregationResults
    });
    
  } catch (error) {
    console.error('[API /bork/process] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
