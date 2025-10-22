import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MetricType = "revenue" | "gross_profit" | "ebitda" | "labor_cost" | "other_costs";

interface PnLData {
  revenue: number;
  gross_profit: number;
  ebitda: number;
  labor_cost: number;
  other_costs: number;
  cogs: number;
}

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Fetch P&L data from pre-aggregated summary table
 * Supports "All Locations" with simple SUM()
 */
export function usePnLSummary(
  locationId: string | null,
  dateRange: DateRange | null
) {
  return useQuery({
    queryKey: ["pnl-summary", locationId, dateRange],
    queryFn: async () => {
      if (!dateRange) return null;

      const startYear = dateRange.start.getFullYear();
      const startMonth = dateRange.start.getMonth() + 1;
      const endYear = dateRange.end.getFullYear();
      const endMonth = dateRange.end.getMonth() + 1;

      let query = supabase
        .from("pnl_monthly_summary")
        .select("*");

      // Filter by year and month range
      if (startYear === endYear) {
        query = query
          .eq("year", startYear)
          .gte("month", startMonth)
          .lte("month", endMonth);
      } else {
        query = query.or(
          `and(year.eq.${startYear},month.gte.${startMonth}),` +
          `and(year.eq.${endYear},month.lte.${endMonth})` +
          (endYear - startYear > 1 ? `,and(year.gt.${startYear},year.lt.${endYear})` : '')
        );
      }

      // Location filter (null or "all" = all locations)
      if (locationId && locationId !== "all") {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return aggregatePnLData(data || []);
    },
    enabled: !!dateRange,
  });
}

/**
 * Simple aggregation - SUM the pre-calculated fields
 */
function aggregatePnLData(data: any[]): PnLData {
  const totals = data.reduce((acc, record) => ({
    revenue: acc.revenue + (Number(record.revenue_net) || 0),
    cogs: acc.cogs + (Number(record.cogs_total) || 0),
    labor: acc.labor + (Number(record.labor_cost_total) || 0),
    opex: acc.opex + (Number(record.opex_total) || 0),
    depreciation: acc.depreciation + (Number(record.depreciation) || 0),
    finance: acc.finance + (Number(record.finance_costs) || 0),
  }), {
    revenue: 0,
    cogs: 0,
    labor: 0,
    opex: 0,
    depreciation: 0,
    finance: 0
  });

  const gross_profit = totals.revenue - totals.cogs;
  const ebitda = gross_profit - totals.labor - totals.opex + totals.depreciation;

  return {
    revenue: totals.revenue,
    gross_profit,
    ebitda,
    labor_cost: totals.labor,
    other_costs: totals.opex,
    cogs: totals.cogs
  };
}

/**
 * Time series data for charts
 */
export function usePnLTimeSeries(
  locationId: string | null,
  dateRange: DateRange | null,
  metric: MetricType
) {
  return useQuery({
    queryKey: ["pnl-timeseries-summary", locationId, dateRange, metric],
    enabled: !!dateRange && locationId !== undefined,
    queryFn: async () => {
      if (!dateRange) return [];

      const startYear = dateRange.start.getFullYear();
      const startMonth = dateRange.start.getMonth() + 1;
      const endYear = dateRange.end.getFullYear();
      const endMonth = dateRange.end.getMonth() + 1;

      let query = supabase
        .from("pnl_monthly_summary")
        .select("year, month, revenue_net, cogs_total, labor_cost_total, opex_total, depreciation");

      // Filter by year and month range
      if (startYear === endYear) {
        query = query
          .eq("year", startYear)
          .gte("month", startMonth)
          .lte("month", endMonth);
      } else {
        query = query.or(
          `and(year.eq.${startYear},month.gte.${startMonth}),` +
          `and(year.eq.${endYear},month.lte.${endMonth})` +
          (endYear - startYear > 1 ? `,and(year.gt.${startYear},year.lt.${endYear})` : '')
        );
      }

      if (locationId && locationId !== "all") {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by month
      const grouped = groupByMonth(data || []);
      
      return grouped.map(item => ({
        period: item.period,
        value: extractMetricFromSummary(item.totals, metric),
      }));
    },
  });
}

function groupByMonth(data: any[]) {
  const grouped = new Map<string, any>();

  data.forEach((row) => {
    const monthKey = `${row.year}-${String(row.month).padStart(2, '0')}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, {
        revenue: 0,
        cogs: 0,
        labor: 0,
        opex: 0,
        depreciation: 0
      });
    }
    
    const totals = grouped.get(monthKey);
    totals.revenue += Number(row.revenue_net) || 0;
    totals.cogs += Number(row.cogs_total) || 0;
    totals.labor += Number(row.labor_cost_total) || 0;
    totals.opex += Number(row.opex_total) || 0;
    totals.depreciation += Number(row.depreciation) || 0;
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, totals]) => ({ period, totals }));
}

function extractMetricFromSummary(totals: any, metric: MetricType): number {
  switch (metric) {
    case "revenue":
      return totals.revenue;
    case "gross_profit":
      return totals.revenue - totals.cogs;
    case "ebitda":
      return totals.revenue - totals.cogs - totals.labor - totals.opex + totals.depreciation;
    case "labor_cost":
      return totals.labor;
    case "other_costs":
      return totals.opex;
    default:
      return 0;
  }
}
