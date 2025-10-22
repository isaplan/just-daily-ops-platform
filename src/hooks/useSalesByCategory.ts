import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TimeGranularity } from "@/lib/finance/chartDataAggregator";

interface DateRange {
  start: Date;
  end: Date;
}

interface CategorySelection {
  category: string;
  subcategory?: string;
}

interface CategoryData {
  category: string;
  subcategory?: string;
  data: Array<{ period: string; value: number }>;
}

/**
 * Fetch sales data for multiple selected categories
 * Groups by product category from bork_sales_data
 * Supports single location, multiple locations, or all locations
 */
export function useSalesByCategory(
  locationFilter: string | string[] | null,
  dateRange: DateRange | null,
  selectedCategories: CategorySelection[],
  granularity: TimeGranularity = "month",
  includeVat: boolean = false
) {
  // Create stable query key for array inputs
  const locationKey = Array.isArray(locationFilter) 
    ? [...locationFilter].sort().join(',') 
    : locationFilter;
  
  return useQuery({
    queryKey: ["sales-by-category", locationKey, dateRange, selectedCategories, granularity, includeVat],
    enabled: !!dateRange && selectedCategories.length > 0,
    queryFn: async () => {
      if (!dateRange || selectedCategories.length === 0) return [];

      const results: CategoryData[] = [];
      const revenueField = includeVat ? 'revenue_inc_vat' : 'revenue_ex_vat';

      // Fetch data for each selected category
      for (const selection of selectedCategories) {
        // Fetch all data with pagination
        let allCategoryData: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          let query = supabase
            .from("bork_sales_data")
            .select(`date, category, ${revenueField}`)
            .range(from, from + pageSize - 1);

          // Date range filter
          query = query
            .gte("date", dateRange.start.toISOString().split('T')[0])
            .lte("date", dateRange.end.toISOString().split('T')[0]);

          // Location filter
          if (Array.isArray(locationFilter) && locationFilter.length > 0) {
            query = query.in("location_id", locationFilter as string[]);
          } else if (locationFilter && locationFilter !== "all") {
            query = query.eq("location_id", locationFilter as string);
          }

          // Category filter - use ilike for flexible matching
          query = query.ilike("category", `%${selection.category}%`);

          // Subcategory filter if specified
          if (selection.subcategory) {
            query = query.ilike("category", `%${selection.subcategory}%`);
          }

          const { data, error } = await query;
          if (error) throw error;

          if (data && data.length > 0) {
            allCategoryData = [...allCategoryData, ...data];
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        // Group by time period and sum revenue
        const grouped = groupByTimePeriod(allCategoryData, granularity, revenueField);

        results.push({
          category: selection.category,
          subcategory: selection.subcategory,
          data: grouped,
        });
      }

      return results;
    },
  });
}

/**
 * Group sales by time period and sum revenue
 */
function groupByTimePeriod(
  data: any[],
  granularity: TimeGranularity,
  revenueField: string
): Array<{ period: string; value: number }> {
  const grouped = new Map<string, number>();

  data.forEach((row) => {
    const date = new Date(row.date);
    let periodKey: string;
    
    if (granularity === "month") {
      periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (granularity === "quarter") {
      const quarter = Math.ceil((date.getMonth() + 1) / 3);
      periodKey = `${date.getFullYear()}-Q${quarter}`;
    } else {
      periodKey = `${date.getFullYear()}`;
    }

    const currentValue = grouped.get(periodKey) || 0;
    grouped.set(periodKey, currentValue + (Number(row[revenueField]) || 0));
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, value]) => ({ period, value }));
}
