import { NextRequest, NextResponse } from 'next/server';
import { createEitjeApiService, EitjeApiConfig } from '@/lib/eitje/api-service';

/**
 * EITJE DATA FETCHING ENDPOINT - EXTREME DEFENSIVE MODE
 * 
 * This endpoint handles fetching and processing Eitje sales data
 * with comprehensive validation and error handling.
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /eitje/data] Data fetch request received');
    
    const { searchParams } = new URL(request.url);
    const baseUrl = searchParams.get('baseUrl');
    const apiKey = searchParams.get('apiKey');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const locationId = searchParams.get('locationId');
    
    // DEFENSIVE: Validate required parameters
    if (!baseUrl || !apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: baseUrl and apiKey are required'
      }, { status: 400 });
    }
    
    // DEFENSIVE: Validate date format if provided
    if (startDate && !isValidDate(startDate)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid startDate format. Use YYYY-MM-DD'
      }, { status: 400 });
    }
    
    if (endDate && !isValidDate(endDate)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid endDate format. Use YYYY-MM-DD'
      }, { status: 400 });
    }
    
    // DEFENSIVE: Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({
        success: false,
        error: 'startDate cannot be after endDate'
      }, { status: 400 });
    }
    
    // DEFENSIVE: Create API service
    const config: EitjeApiConfig = {
      baseUrl,
      apiKey,
      timeout: 30000,
      retryAttempts: 3,
      enableLogging: true,
      validateData: true
    };
    
    const apiService = createEitjeApiService(config);
    
    // DEFENSIVE: Fetch data with timeout protection
    const dataResult = await Promise.race([
      apiService.fetchSalesData(startDate || undefined, endDate || undefined, locationId || undefined),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Data fetch timeout')), 30000)
      )
    ]) as any;
    
    if (!dataResult.success) {
      console.error('[API /eitje/data] Data fetch failed:', dataResult.error);
      return NextResponse.json({
        success: false,
        error: `Data fetch failed: ${dataResult.error}`,
        details: {
          statusCode: dataResult.statusCode,
          responseTime: dataResult.responseTime,
          retryCount: dataResult.retryCount
        }
      }, { status: 502 });
    }
    
    // DEFENSIVE: Validate data structure
    if (!Array.isArray(dataResult.data)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid data structure: Expected array of records'
      }, { status: 502 });
    }
    
    // DEFENSIVE: Process and validate data
    const processedData = dataResult.data.map((record: any, index: number) => {
      try {
        return {
          id: record.id || `eitje-${Date.now()}-${index}`,
          location_id: record.location_id,
          date: record.date,
          product_name: record.product_name || 'Unknown Product',
          product_sku: record.product_sku,
          category: record.category,
          quantity: Number(record.quantity) || 0,
          price: Number(record.price) || 0,
          revenue: Number(record.revenue) || 0,
          revenue_excl_vat: Number(record.revenue_excl_vat) || 0,
          revenue_incl_vat: Number(record.revenue_incl_vat) || 0,
          vat_rate: Number(record.vat_rate) || 0,
          vat_amount: Number(record.vat_amount) || 0,
          cost_price: record.cost_price ? Number(record.cost_price) : null,
          created_at: record.created_at || new Date().toISOString(),
          updated_at: record.updated_at || new Date().toISOString()
        };
      } catch (error) {
        console.warn(`[API /eitje/data] Error processing record ${index}:`, error);
        return null;
      }
    }).filter(record => record !== null);
    
    // DEFENSIVE: Check data quality
    const hasRevenueData = processedData.some(record => 
      record.revenue > 0 || record.revenue_excl_vat > 0 || record.revenue_incl_vat > 0
    );
    
    if (!hasRevenueData) {
      console.warn('[API /eitje/data] No revenue data found in records');
    }
    
    console.log(`[API /eitje/data] Successfully fetched ${processedData.length} records`);
    
    return NextResponse.json({
      success: true,
      data: processedData,
      summary: {
        totalRecords: processedData.length,
        hasRevenueData,
        dateRange: {
          start: startDate,
          end: endDate
        },
        locationId
      },
      stats: apiService.getStats()
    });
    
  } catch (error) {
    console.error('[API /eitje/data] Unexpected error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown data fetch error'
    }, { status: 500 });
  }
}

/**
 * DEFENSIVE: Validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Method not allowed. Use GET to fetch data.'
  }, { status: 405 });
}
