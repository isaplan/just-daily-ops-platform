import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

/**
 * P&L DATA API
 * 
 * Fetches Profit & Loss data from powerbi_pnl_data table
 * with filtering by year and location
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-data] P&L data request received');
    
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || '', 10);
    const location = searchParams.get('location') || 'all';

    // DEFENSIVE: Validate required parameters
    if (isNaN(year) || year < 2020 || year > 2030) {
      return NextResponse.json({
        success: false,
        error: 'Invalid year. Please provide a valid year between 2020-2030.'
      }, { status: 400 });
    }

    // DEFENSIVE: Create Supabase client
    console.log('[API /finance/pnl-data] Creating Supabase client...');
    const supabase = await createClient();
    console.log('[API /finance/pnl-data] Supabase client created successfully');

    // DEFENSIVE: Build query with proper filtering
    let query = supabase
      .from('powerbi_pnl_data')
      .select('category, subcategory, gl_account, amount, month, location_id, year')
      .eq('year', year)
      .order('category', { ascending: true })
      .order('subcategory', { ascending: true })
      .order('month', { ascending: true });

    // Apply location filter if not 'all'
    if (location !== 'all') {
      // Location is a UUID string, not an integer
      query = query.eq('location_id', location);
    }

    console.log('[API /finance/pnl-data] Executing query...');
    const { data, error } = await query;
    console.log('[API /finance/pnl-data] Query executed. Error:', error);

    if (error) {
      console.error('[API /finance/pnl-data] Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch P&L data',
        details: error.message
      }, { status: 500 });
    }

    console.log(`[API /finance/pnl-data] Fetched ${data?.length || 0} P&L records for year ${year}, location ${location}`);

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: {
        year,
        location,
        recordCount: data?.length || 0
      }
    });

  } catch (error) {
    console.error('[API /finance/pnl-data] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch P&L data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
