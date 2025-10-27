import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/integrations/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[API /raw-data] Fetching raw data...');
    
    const supabase = await createClient();
    
    // Get pagination parameters from query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    console.log(`[API /raw-data] Pagination: page=${page}, limit=${limit}, offset=${offset}`);
    
    // Add timeout wrapper for database query
    const queryPromise = supabase
      .from('bork_sales_data')
      .select('id, location_id, category, quantity, created_at, date')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database query timeout')), 15000)
    );
    
    try {
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error) {
        console.error('[API /raw-data] Database error:', error);

        // Fallback: Return empty data when database is down
        if (error.message.includes('521') || error.message.includes('Web server is down') || error.message.includes('canceling statement due to statement timeout') || error.message.includes('Database query timeout')) {
          console.log('[API /raw-data] Database is down, returning empty data');
          return NextResponse.json({
            success: true,
            data: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0
            }
          });
        }

        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }

      // Get total count for pagination metadata
      const { count, error: countError } = await supabase
        .from('bork_sales_data')
        .select('*', { count: 'exact', head: true });

      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      console.log(`[API /raw-data] Found ${data?.length || 0} records (page ${page}/${totalPages})`);

      return NextResponse.json({
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      });
      
    } catch (timeoutError) {
      console.error('[API /raw-data] Timeout error:', timeoutError);
      console.log('[API /raw-data] Database timeout, returning empty data');
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }
    
  } catch (error) {
    console.error('[API /raw-data] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
