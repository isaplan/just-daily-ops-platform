import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface SalesData {
  id: string;
  location_id: string;
  date: string;
  category: string;
  raw_data: any;
  created_at: string;
}

interface UseSalesDataProps {
  start: string;
  end: string;
}

export function useSalesData({ start, end }: UseSalesDataProps) {
  const [data, setData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();
        
        const { data: salesData, error: salesError } = await supabase
          .from('bork_sales_data')
          .select('*')
          .eq('category', 'STEP6_PROCESSED_DATA')
          .gte('date', start)
          .lte('date', end)
          .order('created_at', { ascending: false });

        if (salesError) {
          throw new Error(salesError.message);
        }

        setData(salesData || []);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching sales data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, [start, end]);

  return { data, isLoading, error };
}