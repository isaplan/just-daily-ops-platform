"use client"

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface RevenueData {
  date: string;
  revenue: number;
}

interface UseRevenueDataParams {
  locationIds: string[];
  startDate: string;
  endDate: string;
}

export function useRevenueData({
  locationIds,
  startDate,
  endDate,
}: UseRevenueDataParams) {
  return useQuery({
    queryKey: ["revenueData", locationIds, startDate, endDate],
    queryFn: async () => {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("bork_sales_data")
        .select("date, raw_data")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("location_id", locationIds)
        .eq("category", "STEP6_PROCESSED_DATA");

      if (error) throw error;

      // Aggregate revenue by date
      const revenueMap = new Map<string, number>();
      
      data?.forEach(item => {
        const date = item.date;
        const revenue = parseFloat(item.raw_data?.revenue || item.raw_data?.amount || 0);
        revenueMap.set(date, (revenueMap.get(date) || 0) + revenue);
      });

      return Array.from(revenueMap.entries()).map(([date, revenue]) => ({
        date,
        revenue,
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    },
  });
}