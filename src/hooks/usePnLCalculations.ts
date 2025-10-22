"use client"

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface PnLData {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface UsePnLCalculationsParams {
  locationIds: string[];
  startDate: string;
  endDate: string;
}

export function usePnLCalculations({
  locationIds,
  startDate,
  endDate,
}: UsePnLCalculationsParams) {
  return useQuery({
    queryKey: ["pnlData", locationIds, startDate, endDate],
    queryFn: async () => {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("bork_sales_data")
        .select("raw_data")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("location_id", locationIds)
        .eq("category", "STEP6_PROCESSED_DATA");

      if (error) throw error;

      // Aggregate P&L by category
      const pnlMap = new Map<string, { revenue: number; cost: number; profit: number }>();
      
      data?.forEach(item => {
        const category = item.raw_data?.category || "Unknown";
        const revenue = parseFloat(item.raw_data?.revenue || item.raw_data?.amount || 0);
        const cost = parseFloat(item.raw_data?.cost || 0);
        const profit = revenue - cost;

        if (!pnlMap.has(category)) {
          pnlMap.set(category, { revenue: 0, cost: 0, profit: 0 });
        }

        const current = pnlMap.get(category)!;
        pnlMap.set(category, {
          revenue: current.revenue + revenue,
          cost: current.cost + cost,
          profit: current.profit + profit,
        });
      });

      return Array.from(pnlMap.entries()).map(([category, data]) => ({
        category,
        ...data,
      }));
    },
  });
}