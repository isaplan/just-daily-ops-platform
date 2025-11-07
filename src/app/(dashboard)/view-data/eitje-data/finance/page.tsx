"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
<<<<<<< HEAD
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
=======
import { format } from "date-fns";
>>>>>>> origin/main

const ITEMS_PER_PAGE = 50;

export default function FinancePage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
<<<<<<< HEAD
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
=======
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-month");
>>>>>>> origin/main
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
<<<<<<< HEAD
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .neq("name", "All HNHG Locations")
        .neq("name", "All HNG Locations")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
=======
      const { data, error } = await supabase.from("locations").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
>>>>>>> origin/main
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
<<<<<<< HEAD
      ...locations.map((loc: { id: string; name: string }) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch environment IDs when a location is selected
  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery({
    queryKey: ["eitje-environments", selectedLocation],
    queryFn: async () => {
      if (selectedLocation === "all") return null;
      
      const supabase = createClient();
      try {
        const { data: locsData } = await supabase
          .from("locations")
          .select("id, name");
        
        const selectedLoc = locsData?.find((loc: { id: string; name: string }) => loc.id === selectedLocation);
        if (!selectedLoc) return [];
        
        const { data: allEnvs, error } = await supabase
          .from("eitje_environments")
          .select("id, raw_data");
        
        if (error) {
          console.error("Error fetching environments:", error);
          return [];
        }
        
        const matchedIds = (allEnvs || [])
          .filter((env: { id: number; raw_data?: { name?: string } }) => {
            const envName = env.raw_data?.name || "";
            return envName.toLowerCase() === selectedLoc.name.toLowerCase();
          })
          .map((env: { id: number }) => env.id);
        
        return matchedIds;
      } catch (error) {
        console.error("Error in environment ID query:", error);
        return [];
      }
    },
    enabled: selectedLocation !== "all",
    staleTime: 10 * 60 * 1000,
  });

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: { startDate?: string; endDate?: string } = {};
=======
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  const queryFilters = useMemo(() => {
    const filters: any = {};
>>>>>>> origin/main
    
    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
<<<<<<< HEAD
    } else if (selectedDay !== null && selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
=======
>>>>>>> origin/main
    } else if (selectedMonth) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

<<<<<<< HEAD
    return filters;
  }, [selectedYear, selectedMonth, selectedDay, dateRange]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-finance-processed", queryFilters, currentPage, environmentIds],
=======
    if (selectedLocation !== "all") {
      filters.environmentId = selectedLocation;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedLocation, dateRange, selectedDatePreset]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-finance", queryFilters, currentPage],
>>>>>>> origin/main
    queryFn: async () => {
      const supabase = createClient();
      
      let query = supabase
<<<<<<< HEAD
        .from("eitje_revenue_days_processed")
        .select("*", { count: "exact" });

      // Apply date filters
      if (queryFilters.startDate && queryFilters.endDate) {
        query = query
          .gte("date", queryFilters.startDate)
          .lte("date", queryFilters.endDate);
      }

      // Apply location filter
      if (selectedLocation !== "all" && environmentIds) {
        if (environmentIds.length > 0) {
          query = query.in("environment_id", environmentIds);
        }
        // If no matching environment IDs found, don't filter (show all)
      }

      query = query.order("date", { ascending: false });

=======
        .from("eitje_revenue_days_aggregated")
        .select("*", { count: "exact" })
        .order("date", { ascending: false });

      if (queryFilters.startDate && queryFilters.endDate) {
        query = query.gte("date", queryFilters.startDate).lte("date", queryFilters.endDate);
      }

      if (queryFilters.environmentId) {
        query = query.eq("environment_id", queryFilters.environmentId);
      }

>>>>>>> origin/main
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: records, error: queryError, count } = await query;

      if (queryError) throw queryError;

<<<<<<< HEAD
      // All fields are already normalized in processed table
      const recordsWithNames = (records || []).map((record: {
        id?: string | number;
        eitje_id?: number;
        date?: string;
        environment_id?: number;
        environment_name?: string;
        revenue?: number;
        transaction_count?: number;
        [key: string]: unknown;
      }) => ({
        ...record,
        environment_name: record.environment_name || `Location ${record.environment_id}`,
      }));

      return {
        records: recordsWithNames,
        total: count || 0,
      };
    },
    enabled: !!queryFilters.startDate && (selectedLocation === "all" || !isLoadingEnvIds),
  });

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  const handleDatePresetChange = (preset: DatePreset) => {
    setSelectedDatePreset(preset);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6 min-w-0">
=======
      return {
        records: records || [],
        total: count || 0,
      };
    },
    enabled: !!queryFilters.startDate,
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Finance Data</CardTitle>
          <CardDescription>
            View revenue days and financial data from Eitje
          </CardDescription>
        </CardHeader>
      </Card>

>>>>>>> origin/main
      <EitjeDataFilters
        selectedYear={selectedYear}
        onYearChange={(year) => {
          setSelectedYear(year);
          setCurrentPage(1);
        }}
        selectedMonth={selectedMonth}
        onMonthChange={(month) => {
          setSelectedMonth(month);
<<<<<<< HEAD
          if (month === null) {
            setSelectedDay(null);
          }
          setCurrentPage(1);
        }}
        selectedDay={selectedDay}
        onDayChange={(day) => {
          setSelectedDay(day);
=======
>>>>>>> origin/main
          setCurrentPage(1);
        }}
        selectedLocation={selectedLocation}
        onLocationChange={(location) => {
          setSelectedLocation(location);
          setCurrentPage(1);
        }}
        selectedDatePreset={selectedDatePreset}
<<<<<<< HEAD
        onDatePresetChange={handleDatePresetChange}
        locations={locationOptions}
        onResetToDefault={() => {
          setSelectedYear(new Date().getFullYear());
          setSelectedMonth(null);
          setSelectedDay(null);
          setSelectedLocation("all");
          setSelectedDatePreset("this-year");
          setCurrentPage(1);
        }}
      />

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Finance Data Table</CardTitle>
=======
        onDatePresetChange={(preset) => {
          setSelectedDatePreset(preset);
          setCurrentPage(1);
        }}
        locations={locationOptions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Data Table</CardTitle>
>>>>>>> origin/main
          <CardDescription>
            Showing {data?.records.length || 0} of {data?.total || 0} records
          </CardDescription>
        </CardHeader>
<<<<<<< HEAD
        <CardContent className="p-0">
=======
        <CardContent>
>>>>>>> origin/main
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
<<<<<<< HEAD
              <div className="mt-16 bg-white rounded-sm border border-black px-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Eitje ID</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Revenue</TableHead>
                      <TableHead className="font-semibold">Transaction Count</TableHead>
                      <TableHead className="font-semibold">Avg Transaction Value</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
=======
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Environment ID</TableHead>
                      <TableHead>Total Revenue</TableHead>
                      <TableHead>Transaction Count</TableHead>
                      <TableHead>Created At</TableHead>
>>>>>>> origin/main
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
<<<<<<< HEAD
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No data found
                        </TableCell>
                      </TableRow>
                      ) : (
                      data.records.map((record: {
                        id?: string | number;
                        eitje_id?: number;
                        date?: string;
                        environment_id?: number;
                        environment_name?: string;
                        revenue?: number;
                        total_revenue?: number;
                        amount?: number;
                        transaction_count?: number;
                        count?: number;
                        num_transactions?: number;
                        created_at?: string;
                        [key: string]: unknown;
                      }) => {
                        const revenue = record.revenue || record.total_revenue || record.amount || 0;
                        const transactionCount = record.transaction_count || record.count || record.num_transactions || 0;
                        const avgTransaction = transactionCount > 0 ? revenue / transactionCount : 0;

                        return (
                          <TableRow key={record.id}>
                            <TableCell>{record.eitje_id || "-"}</TableCell>
                            <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                            <TableCell>{record.environment_name || `Location ${record.environment_id}`}</TableCell>
                            <TableCell className="font-semibold">
                              {revenue !== null && revenue !== undefined 
                                ? `€${Number(revenue).toFixed(2)}` 
                                : "-"}
                            </TableCell>
                            <TableCell>{transactionCount !== null ? transactionCount : "-"}</TableCell>
                            <TableCell>
                              {avgTransaction > 0 ? `€${Number(avgTransaction).toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell>{formatDateDDMMYYTime(record.created_at)}</TableCell>
=======
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record: any) => {
                        // Try to extract revenue from raw_data if direct field doesn't exist
                        const revenue = record.total_revenue || record.revenue || 
                          (record.raw_data?.revenue) || 
                          (record.raw_data?.total_revenue) || "-";
                        const transactionCount = record.transaction_count || 
                          (record.raw_data?.transaction_count) || "-";

                        return (
                          <TableRow key={record.id}>
                            <TableCell>
                              {record.date ? format(new Date(record.date), "yyyy-MM-dd") : "-"}
                            </TableCell>
                            <TableCell>{record.environment_id || "-"}</TableCell>
                            <TableCell>
                              {revenue !== "-" ? `€${Number(revenue).toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell>{transactionCount}</TableCell>
                            <TableCell>
                              {record.created_at ? format(new Date(record.created_at), "yyyy-MM-dd HH:mm") : "-"}
                            </TableCell>
>>>>>>> origin/main
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
<<<<<<< HEAD
=======

>>>>>>> origin/main
