"use client"

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface SalesData {
  id: string;
  location_id: string;
  date: string;
  category: string;
  amount: number;
  product_name: string;
  quantity: number;
}

interface UseSalesDataParams {
  locationIds: string[];
  startDate: string;
  endDate: string;
}

export function useSalesData({
  locationIds,
  startDate,
  endDate,
}: UseSalesDataParams) {
  return useQuery({
    queryKey: ["salesData", locationIds, startDate, endDate],
    queryFn: async () => {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from("bork_sales_data")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate)
        .in("location_id", locationIds)
        .eq("category", "STEP6_PROCESSED_DATA");

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        location_id: item.location_id,
        date: item.date,
        category: item.raw_data?.category || "Unknown",
        amount: parseFloat(item.raw_data?.amount || item.raw_data?.revenue || 0),
        product_name: item.raw_data?.product_name || "Unknown",
        quantity: parseFloat(item.raw_data?.quantity || 1),
      })) || [];
    },
  });
}