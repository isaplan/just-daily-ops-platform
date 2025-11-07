"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";

const ITEMS_PER_PAGE = 50;

export default function FinancePage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("last-month");
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations - filter out "All HNHG Locations"
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .neq("name", "All HNHG Locations")
        .neq("name", "All HNG Locations")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - locations don't change often
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch environment IDs when a location is selected
  // Match by name since there's no location_id column in eitje_environments
  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery({
    queryKey: ["eitje-environments", selectedLocation],
    queryFn: async () => {
      if (selectedLocation === "all") return null;
      
      const supabase = createClient();
      try {
        // Get the selected location name
        const selectedLoc = locations.find((loc) => loc.id === selectedLocation);
        if (!selectedLoc) return [];
        
        // Fetch all environments and match by name
        const { data: allEnvs, error } = await supabase
          .from("eitje_environments")
          .select("id, raw_data");
        
        if (error) {
          console.error("Error fetching environments:", error);
          return [];
        }
        
        // Match environment names to location name (case-insensitive)
        const matchedIds = (allEnvs || [])
          .filter((env: any) => {
            const envName = env.raw_data?.name || "";
            return envName.toLowerCase() === selectedLoc.name.toLowerCase();
          })
          .map((env: any) => env.id);
        
        return matchedIds;
      } catch (error) {
        console.error("Error in environment ID query:", error);
        return [];
      }
    },
    enabled: selectedLocation !== "all" && locations.length > 0,
  });

  const queryFilters = useMemo(() => {
    const filters: any = {};
    
    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedDay !== null && selectedMonth !== null) {
      // If both day and month are selected, filter by specific day
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth) {
      // If only month is selected, filter by entire month
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    if (selectedLocation !== "all") {
      filters.environmentId = selectedLocation;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, dateRange, selectedDatePreset]);

  // Fetch aggregated data - COMPLIANCE: Use aggregated table, not raw
  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-finance", queryFilters, currentPage, environmentIds],
    queryFn: async () => {
      const supabase = createClient();
      
      // Fetch aggregated data
      let query = supabase
        .from("eitje_revenue_days_aggregated")
        .select(`
          id, 
          date, 
          environment_id,
          total_revenue, 
          transaction_count, 
          avg_revenue_per_transaction,
          total_revenue_excl_vat,
          total_revenue_incl_vat,
          total_vat_amount,
          avg_vat_rate,
          total_cash_revenue,
          total_card_revenue,
          total_digital_revenue,
          total_other_revenue,
          cash_percentage,
          card_percentage,
          digital_percentage,
          other_percentage,
          max_transaction_value,
          min_transaction_value,
          currency,
          net_revenue,
          gross_revenue,
          created_at, 
          updated_at
        `, { count: "exact" });

      // Apply date filters
      if (queryFilters.startDate && queryFilters.endDate) {
        query = query
          .gte("date", queryFilters.startDate)
          .lte("date", queryFilters.endDate);
      }

      // Apply location filter - use environmentIds from hook (mapped from location UUID)
      if (selectedLocation !== "all" && environmentIds) {
        if (environmentIds.length > 0) {
          query = query.in("environment_id", environmentIds);
        } else {
          // If location is selected but no environments found, return empty result
          // by filtering for an impossible value
          query = query.eq("environment_id", -999);
        }
      }

      // Apply ordering
      query = query.order("date", { ascending: false });

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: records, error: queryError, count } = await query;

      if (queryError) {
        console.error("Supabase query error:", {
          message: queryError.message,
          details: queryError.details,
          hint: queryError.hint,
          code: queryError.code,
          error: queryError
        });
        throw queryError;
      }

      // Fetch environment names separately
      // Filter out null/undefined and ensure we have valid integers
      // Note: Renamed to avoid shadowing the hook's environmentIds variable
      const recordEnvironmentIds = [...new Set((records || [])
        .map((r: any) => r.environment_id)
        .filter((id: any) => id != null && id !== undefined && !isNaN(Number(id)))
        .map((id: any) => Number(id))
      )];
      let environmentMap: Record<number, string> = {};
      
      if (recordEnvironmentIds.length > 0) {
        try {
          // Tables use id (not eitje_environment_id) and name is in raw_data
          const { data: environments, error: envError } = await supabase
            .from("eitje_environments")
            .select("id, raw_data")
            .in("id", recordEnvironmentIds);
          
          if (envError) {
            console.error("Error fetching environments:", {
              message: envError.message,
              details: envError.details,
              hint: envError.hint,
              code: envError.code
            });
          } else if (environments) {
            // Extract name from raw_data
            environmentMap = Object.fromEntries(
              environments.map((env: any) => [
                env.id,
                env.raw_data?.name || `Environment ${env.id}`
              ])
            );
          }
        } catch (error) {
          console.error("Error in environment query:", error);
        }
      }

      // Merge environment names into records
      const recordsWithNames = (records || []).map((record: any) => ({
        ...record,
        environment_name: environmentMap[record.environment_id] || null
      }));

      console.log("Finance query result:", {
        recordsCount: recordsWithNames.length,
        total: count || 0,
        filters: queryFilters,
        dateRange: dateRange ? { start: dateRange.start, end: dateRange.end } : null
      });

      return {
        records: recordsWithNames,
        total: count || 0,
      };
    },
    enabled: !!queryFilters.startDate && (selectedLocation === "all" || !isLoadingEnvIds),
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);

  return (
    <div className="space-y-6">
      <EitjeDataFilters
        selectedYear={selectedYear}
        onYearChange={(year) => {
          setSelectedYear(year);
          setCurrentPage(1);
        }}
        selectedMonth={selectedMonth}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          if (month === null) {
            setSelectedDay(null); // Clear day when month is cleared
          }
          setCurrentPage(1);
        }}
        selectedDay={selectedDay}
        onDayChange={(day) => {
          setSelectedDay(day);
          setCurrentPage(1);
        }}
        selectedLocation={selectedLocation}
        onLocationChange={(location) => {
          setSelectedLocation(location);
          setCurrentPage(1);
        }}
        selectedDatePreset={selectedDatePreset}
        onDatePresetChange={(preset) => {
          setSelectedDatePreset(preset);
          setCurrentPage(1);
        }}
        locations={locationOptions}
        onResetToDefault={() => {
          setSelectedYear(2025);
          setSelectedMonth(null);
          setSelectedDay(null);
          setSelectedLocation("all");
          setSelectedDatePreset("this-month");
          setCurrentPage(1);
        }}
      />

      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Error loading data: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              <div className="mt-16 bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Total Revenue</TableHead>
                      <TableHead className="font-semibold">Transaction Count</TableHead>
                      <TableHead className="font-semibold">Avg Revenue/Transaction</TableHead>
                      <TableHead className="font-semibold">Revenue Excl VAT</TableHead>
                      <TableHead className="font-semibold">Revenue Incl VAT</TableHead>
                      <TableHead className="font-semibold">VAT Amount</TableHead>
                      <TableHead className="font-semibold">Avg VAT Rate</TableHead>
                      <TableHead className="font-semibold">Cash Revenue</TableHead>
                      <TableHead className="font-semibold">Card Revenue</TableHead>
                      <TableHead className="font-semibold">Digital Revenue</TableHead>
                      <TableHead className="font-semibold">Other Revenue</TableHead>
                      <TableHead className="font-semibold">Cash %</TableHead>
                      <TableHead className="font-semibold">Card %</TableHead>
                      <TableHead className="font-semibold">Digital %</TableHead>
                      <TableHead className="font-semibold">Other %</TableHead>
                      <TableHead className="font-semibold">Max Transaction</TableHead>
                      <TableHead className="font-semibold">Min Transaction</TableHead>
                      <TableHead className="font-semibold">Currency</TableHead>
                      <TableHead className="font-semibold">Net Revenue</TableHead>
                      <TableHead className="font-semibold">Gross Revenue</TableHead>
                      <TableHead className="font-semibold">Updated At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={23} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record: any) => {
                        const formatCurrency = (value: any) => {
                          if (value === null || value === undefined || value === "-" || value === 0) return "-";
                          return `€${Math.round(Number(value))}`; // No decimals
                        };

                        const formatPercentage = (value: any) => {
                          if (value === null || value === undefined || value === "-" || value === 0) return "-";
                          return `${Number(value).toFixed(2)}%`;
                        };

                        return (
                          <TableRow key={record.id}>
                            <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                            <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(record.total_revenue)}</TableCell>
                            <TableCell>{record.transaction_count ?? "-"}</TableCell>
                            <TableCell>{formatCurrency(record.avg_revenue_per_transaction)}</TableCell>
                            <TableCell>{formatCurrency(record.total_revenue_excl_vat)}</TableCell>
                            <TableCell>{formatCurrency(record.total_revenue_incl_vat)}</TableCell>
                            <TableCell>{formatCurrency(record.total_vat_amount)}</TableCell>
                            <TableCell>{formatPercentage(record.avg_vat_rate)}</TableCell>
                            <TableCell>{formatCurrency(record.total_cash_revenue)}</TableCell>
                            <TableCell>{formatCurrency(record.total_card_revenue)}</TableCell>
                            <TableCell>{formatCurrency(record.total_digital_revenue)}</TableCell>
                            <TableCell>{formatCurrency(record.total_other_revenue)}</TableCell>
                            <TableCell>{formatPercentage(record.cash_percentage)}</TableCell>
                            <TableCell>{formatPercentage(record.card_percentage)}</TableCell>
                            <TableCell>{formatPercentage(record.digital_percentage)}</TableCell>
                            <TableCell>{formatPercentage(record.other_percentage)}</TableCell>
                            <TableCell>{formatCurrency(record.max_transaction_value)}</TableCell>
                            <TableCell>{formatCurrency(record.min_transaction_value)}</TableCell>
                            <TableCell>{record.currency || "EUR"}</TableCell>
                            <TableCell>{formatCurrency(record.net_revenue)}</TableCell>
                            <TableCell>{formatCurrency(record.gross_revenue)}</TableCell>
                            <TableCell>{formatDateDDMMYYTime(record.updated_at)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || isLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || isLoading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

