import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * EITJE DATA PROCESSING ENDPOINT
 * 
 * Processes raw Eitje data into aggregated metrics (like Bork system)
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[API /eitje/process] Processing raw Eitje data...');
    
    const body = await request.json();
    const { 
      startDate, 
      endDate, 
      locationIds = [], 
      includeVat = true 
    } = body;

    // DEFENSIVE: Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: startDate and endDate are required'
      }, { status: 400 });
    }

    // DEFENSIVE: Validate date format
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      }, { status: 400 });
    }

    // DEFENSIVE: Fetch raw data
    const rawData = await fetchRawData(startDate, endDate, locationIds);
    
    if (rawData.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No raw data found for processing',
        result: {
          recordsProcessed: 0,
          recordsAggregated: 0,
          processingTime: 0
        }
      });
    }

    // DEFENSIVE: Process raw data into aggregated metrics
    const startTime = Date.now();
    const aggregatedData = await processRawDataIntoAggregated(rawData, includeVat);
    const processingTime = Date.now() - startTime;

    console.log(`[API /eitje/process] Processed ${rawData.length} raw records into ${aggregatedData.length} aggregated records`);

    return NextResponse.json({
      success: true,
      message: 'Raw data processed successfully',
      result: {
        recordsProcessed: rawData.length,
        recordsAggregated: aggregatedData.length,
        processingTime,
        dateRange: { startDate, endDate },
        locations: locationIds.length > 0 ? locationIds : 'all'
      }
    });

  } catch (error) {
    console.error('[API /eitje/process] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process raw data'
    }, { status: 500 });
  }
}

/**
 * DEFENSIVE: Fetch raw data from database
 */
async function fetchRawData(
  startDate: string, 
  endDate: string, 
  locationIds: string[]
): Promise<any[]> {
  const supabase = await createClient();
  let query = supabase
    .from('eitje_sales_data')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false });

  // DEFENSIVE: Add location filter if specified
  if (locationIds.length > 0) {
    query = query.in('location_id', locationIds);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[API /eitje/process] Database error:', error);
    throw new Error('Failed to fetch raw data');
  }

  return data || [];
}

/**
 * DEFENSIVE: Process raw data into aggregated metrics
 */
async function processRawDataIntoAggregated(
  rawData: any[], 
  includeVat: boolean
): Promise<any[]> {
  // DEFENSIVE: Group data by location and date
  const groupedData = rawData.reduce((groups, record) => {
    const key = `${record.location_id || 'unknown'}_${record.date}`;
    if (!groups[key]) {
      groups[key] = {
        location_id: record.location_id,
        date: record.date,
        records: []
      };
    }
    groups[key].records.push(record);
    return groups;
  }, {} as Record<string, any>);

  const aggregatedData = [];

  // DEFENSIVE: Process each group
  for (const [key, group] of Object.entries(groupedData)) {
    try {
      const aggregated = calculateAggregatedMetrics(group.records, includeVat);
      aggregatedData.push(aggregated);
    } catch (error) {
      console.error(`[API /eitje/process] Failed to process group ${key}:`, error);
    }
  }

  // DEFENSIVE: Store aggregated data
  if (aggregatedData.length > 0) {
    const supabase = await createClient();
    const { error } = await supabase
      .from('eitje_sales_aggregated')
      .upsert(aggregatedData, {
        onConflict: 'location_id,date',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[API /eitje/process] Failed to store aggregated data:', error);
      throw new Error('Failed to store aggregated data');
    }
  }

  return aggregatedData;
}

/**
 * DEFENSIVE: Calculate aggregated metrics (similar to Bork system)
 */
function calculateAggregatedMetrics(records: any[], includeVat: boolean): any {
  // DEFENSIVE: Basic totals
  const totalQuantity = records.reduce((sum, record) => sum + (record.quantity || 0), 0);
  const totalRevenue = records.reduce((sum, record) => sum + (record.revenue || 0), 0);
  
  // DEFENSIVE: VAT calculations (assume 21% VAT rate)
  const vatRate = 0.21;
  const totalRevenueExclVat = includeVat ? totalRevenue / (1 + vatRate) : totalRevenue;
  const totalVatAmount = includeVat ? totalRevenue - totalRevenueExclVat : 0;
  const totalRevenueInclVat = includeVat ? totalRevenue : totalRevenue * (1 + vatRate);
  
  // DEFENSIVE: Cost estimation (assume 30% cost margin)
  const costMargin = 0.30;
  const totalCost = totalRevenueExclVat * costMargin;
  
  // DEFENSIVE: Product metrics
  const productCount = records.length;
  const uniqueProducts = new Set(records.map(r => r.product_name)).size;
  
  // DEFENSIVE: Category analysis
  const categoryRevenue: Record<string, number> = {};
  records.forEach(record => {
    const category = record.category || 'Unknown';
    categoryRevenue[category] = (categoryRevenue[category] || 0) + (record.revenue || 0);
  });
  
  const topCategory = Object.entries(categoryRevenue)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || null;
  
  const categoryBreakdown = Object.entries(categoryRevenue).map(([category, revenue]) => ({
    category,
    revenue,
    percentage: totalRevenueInclVat > 0 ? (revenue / totalRevenueInclVat) * 100 : 0
  }));
  
  // DEFENSIVE: VAT breakdown
  const vat9Base = 0; // No 9% VAT data available
  const vat9Amount = 0;
  const vat21Base = totalRevenueExclVat;
  const vat21Amount = totalVatAmount;
  
  return {
    location_id: records[0]?.location_id || null,
    date: records[0]?.date || '',
    total_quantity: totalQuantity,
    total_revenue_excl_vat: totalRevenueExclVat,
    total_revenue_incl_vat: totalRevenueInclVat,
    total_vat_amount: totalVatAmount,
    total_cost: totalCost,
    avg_price: totalQuantity > 0 ? totalRevenueExclVat / totalQuantity : 0,
    vat_9_base: vat9Base,
    vat_9_amount: vat9Amount,
    vat_21_base: vat21Base,
    vat_21_amount: vat21Amount,
    product_count: productCount,
    unique_products: uniqueProducts,
    top_category: topCategory,
    category_breakdown: categoryBreakdown,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * DEFENSIVE: Validate date format
 */
function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}
