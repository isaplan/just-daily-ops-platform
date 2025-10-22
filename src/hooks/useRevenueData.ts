import { useState, useEffect } from 'react';
import { createClient } from '@/integrations/supabase/client';

interface RevenueData {
  totalRevenue: number;
  dailyBreakdown: Array<{
    date: string;
    revenue: number;
    profit: number;
    transactions: number;
  }>;
  revenueGrowth: number;
}

interface UseRevenueDataProps {
  start: string;
  end: string;
}

export function useRevenueData({ start, end }: UseRevenueDataProps) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();
        
        // Fetch processed sales data
        const { data: salesData, error: salesError } = await supabase
          .from('bork_sales_data')
          .select('*')
          .eq('category', 'STEP6_PROCESSED_DATA')
          .gte('date', start)
          .lte('date', end)
          .order('date', { ascending: true });

        if (salesError) {
          throw new Error(salesError.message);
        }

        // Calculate revenue metrics
        const totalRevenue = salesData?.reduce((sum, sale) => {
          const revenue = sale.raw_data?.amount || sale.raw_data?.revenue || 0;
          return sum + revenue;
        }, 0) || 0;

        // Group by date for daily breakdown
        const dailyBreakdown = salesData?.reduce((acc: any, sale) => {
          const date = sale.date;
          const revenue = sale.raw_data?.amount || sale.raw_data?.revenue || 0;
          const profit = revenue * 0.3; // Simplified profit calculation
          
          if (!acc[date]) {
            acc[date] = { date, revenue: 0, profit: 0, transactions: 0 };
          }
          
          acc[date].revenue += revenue;
          acc[date].profit += profit;
          acc[date].transactions += 1;
          
          return acc;
        }, {});

        const dailyBreakdownArray = Object.values(dailyBreakdown || {}).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Calculate growth (simplified - would need historical data)
        const revenueGrowth = 12.5; // Placeholder

        setData({
          totalRevenue,
          dailyBreakdown: dailyBreakdownArray as any[],
          revenueGrowth
        });
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching revenue data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenueData();
  }, [start, end]);

  return { data, isLoading, error };
}