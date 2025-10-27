import { NextRequest, NextResponse } from 'next/server';
import { processAllData, processAllDataForLocation } from '@/lib/finance/powerbi/aggregator';

export async function POST(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-aggregate] Starting aggregation process');
    
    const body = await request.json();
    const { locationId, year, importId } = body;

    // Generate import ID if not provided
    const aggregationImportId = importId || `aggregation-${Date.now()}`;

    let result;

    if (locationId && year) {
      // Process specific location and year
      console.log(`[API /finance/pnl-aggregate] Processing location ${locationId}, year ${year}`);
      result = await processAllDataForLocation(locationId, year, aggregationImportId);
    } else {
      // Process all data
      console.log('[API /finance/pnl-aggregate] Processing all data');
      result = await processAllData(aggregationImportId);
    }

    console.log('[API /finance/pnl-aggregate] Aggregation completed:', result);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors,
      message: `Successfully processed ${result.processed} months with ${result.errors.length} errors`
    });

  } catch (error) {
    console.error('[API /finance/pnl-aggregate] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Aggregation failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-aggregate] Getting aggregation status');
    
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    const year = searchParams.get('year');

    // This would typically query the aggregated table to show current status
    // For now, return a simple status
    return NextResponse.json({
      success: true,
      message: 'Aggregation API is ready',
      parameters: {
        locationId: locationId || 'all',
        year: year || 'all'
      }
    });

  } catch (error) {
    console.error('[API /finance/pnl-aggregate] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

