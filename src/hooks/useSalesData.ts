import { useState, useEffect } from 'react';
import { createClient } from '@/integrations/supabase/client';

interface SalesData {
  id: string;
  location_id: string;
  date: string;
  category: string;
  raw_data: any;
  created_at: string;
}

interface UseSalesDataProps {
  locationFilter: string | string[] | "all";
  dateRange: { start: Date; end: Date } | null;
  includeVat?: boolean;
}

export function useSalesData({ locationFilter, dateRange, includeVat = false }: UseSalesDataProps) {
  const [data, setData] = useState<SalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Early return if dateRange is null or undefined
        if (!dateRange || !dateRange.start || !dateRange.end) {
          setData([]);
          setIsLoading(false);
          return;
        }

        const supabase = createClient();
        
        let query = supabase
          .from('bork_sales_data')
          .select('*')
          .eq('category', 'STEP6_PROCESSED_DATA')
          .gte('date', dateRange.start.toISOString().split('T')[0])
          .lte('date', dateRange.end.toISOString().split('T')[0])
          .order('created_at', { ascending: false });

        // Apply location filter
        if (locationFilter !== "all") {
          if (Array.isArray(locationFilter)) {
            query = query.in('location_id', locationFilter);
          } else {
            query = query.eq('location_id', locationFilter);
          }
        }

        const { data: salesData, error: salesError } = await query;

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
  }, [locationFilter, dateRange, includeVat]);

  return { data, isLoading, error };
}