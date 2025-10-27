import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /finance/pnl-test-aggregation] Testing aggregation calculations');
    
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId') || '550e8400-e29b-41d4-a716-446655440001';
    const year = parseInt(searchParams.get('year') || '2025');
    const month = parseInt(searchParams.get('month') || '1');

    // Fetch raw data
    const supabase = await createClient();
    const { data: rawData, error: fetchError } = await supabase
      .from('powerbi_pnl_data')
      .select('location_id, year, month, category, subcategory, gl_account, amount, import_id')
      .eq('location_id', locationId)
      .eq('year', year)
      .eq('month', month);

    if (fetchError) {
      console.error('[API /finance/pnl-test-aggregation] Fetch error:', fetchError);
      return NextResponse.json({
        success: false,
        error: fetchError.message
      }, { status: 500 });
    }

    console.log(`[API /finance/pnl-test-aggregation] Found ${rawData.length} raw records`);

    // Test aggregation logic using gl_account
    const revenue = 0; // TODO: Get from actual revenue data
    const opbrengst = 0; // TODO: Get from actual opbrengst data
    
    const costs = {
      kostprijs: sumByGlAccount(rawData, 'Kostprijs van de omzet'),
      personeel: 0, // TODO: Get from actual personnel data
      overige: sumByGlAccount(rawData, 'Overige bedrijfskosten'),
      afschrijvingen: sumByGlAccount(rawData, 'Afschrijvingen op immateriële en materiële vaste activa'),
      financieel: 0 // TODO: Get from actual financial data
    };

    const total_costs = Object.values(costs).reduce((sum, val) => sum + val, 0);
    const resultaat = revenue + opbrengst + total_costs;

    // Get unique gl_accounts and categories
    const glAccounts = [...new Set(rawData.map(d => d.gl_account))];
    const categories = [...new Set(rawData.map(d => d.category))];

    const result = {
      success: true,
      locationId,
      year,
      month,
      recordCount: rawData.length,
      calculations: {
        revenue,
        opbrengst,
        costs,
        total_costs,
        resultaat
      },
      glAccounts: glAccounts.sort(),
      categories: categories.sort()
    };

    console.log('[API /finance/pnl-test-aggregation] Aggregation results:', result.calculations);

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API /finance/pnl-test-aggregation] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function sumByGlAccount(data: any[], glAccount: string): number {
  return data
    .filter(record => record.gl_account === glAccount)
    .reduce((sum, record) => sum + (record.amount || 0), 0);
}
