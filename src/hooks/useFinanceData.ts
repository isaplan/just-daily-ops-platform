"use client"

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface FinanceData {
  id: string;
  location_id: string;
  date: string;
  category: string;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

interface UseFinanceDataParams {
  locationIds: string[];
  startDate: string;
  endDate: string;
  category?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}

export function useFinanceData({
  locationIds,
  startDate,
  endDate,
  category = "STEP6_PROCESSED_DATA",
  searchQuery,
  page = 1,
  limit = 50,
}: UseFinanceDataParams) {
  return useQuery({
    queryKey: ["financeData", locationIds, startDate, endDate, category, searchQuery, page, limit],
    queryFn: async () => {
      const supabase = createClient();
      
      let query = supabase
        .from("bork_sales_data")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("location_id", locationIds)
        .eq("category", category);

      if (searchQuery) {
        query = query.or(
          `raw_data->>product_name.ilike.%${searchQuery}%,raw_data->>category.ilike.%${searchQuery}%`
        );
      }

      const { data, error } = await query
        .order("date", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return data as FinanceData[];
    },
  });
}