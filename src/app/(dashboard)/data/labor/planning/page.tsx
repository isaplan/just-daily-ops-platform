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
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";

const ITEMS_PER_PAGE = 50;

export default function DataLaborPlanningPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations
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
    staleTime: 10 * 60 * 1000,
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
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
    
    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedDay !== null && selectedMonth !== null) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, dateRange]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-planning-processed", queryFilters, currentPage, environmentIds],
    queryFn: async () => {
      const supabase = createClient();
      
      let query = supabase
        .from("eitje_planning_shifts_processed")
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

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: records, error: queryError, count } = await query;

      if (queryError) throw queryError;

      // All fields are already normalized in processed table
      const recordsWithNames = (records || []).map((record: {
        id?: string | number;
        eitje_id?: number;
        date?: string;
        user_id?: number;
        user_name?: string;
        user_first_name?: string;
        user_last_name?: string;
        environment_id?: number;
        environment_name?: string;
        team_id?: number;
        team_name?: string | null;
        [key: string]: unknown;
      }) => ({
        ...record,
        user_name: record.user_name || `${record.user_first_name || ''} ${record.user_last_name || ''}`.trim() || `User ${record.user_id}`,
        environment_name: record.environment_name || `Location ${record.environment_id}`,
        team_name: record.team_name || (record.team_id ? `Team ${record.team_id}` : null),
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
            setSelectedDay(null);
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
          <CardTitle>Planning Data Table</CardTitle>
          <CardDescription>
            Showing {data?.records.length || 0} of {data?.total || 0} records
          </CardDescription>
        </CardHeader>
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
              <div className="mt-16 bg-white rounded-sm border border-black px-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Eitje ID</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Worker</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">Start Time</TableHead>
                      <TableHead className="font-semibold">End Time</TableHead>
                      <TableHead className="font-semibold">Planned Hours</TableHead>
                      <TableHead className="font-semibold">Breaks (min)</TableHead>
                      <TableHead className="font-semibold">Planned Cost</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Shift Type</TableHead>
                      <TableHead className="font-semibold">Skill Set</TableHead>
                      <TableHead className="font-semibold">Notes</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                          No data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record: {
                        id?: string | number;
                        eitje_id?: number;
                        date?: string;
                        user_id?: number;
                        user_name?: string;
                        user_first_name?: string;
                        user_last_name?: string;
                        environment_id?: number;
                        environment_name?: string;
                        team_id?: number;
                        team_name?: string | null;
                        start_time?: string;
                        start_datetime?: string;
                        start?: string;
                        end_time?: string;
                        end_datetime?: string;
                        end?: string;
                        planned_hours?: number;
                        hours_planned?: number;
                        hours?: number;
                        total_hours?: number;
                        break_minutes?: number;
                        breaks?: number;
                        break_minutes_planned?: number;
                        planned_cost?: number;
                        wage_cost?: number;
                        confirmed?: boolean;
                        cancelled?: boolean;
                        status?: string;
                        shift_type?: string;
                        skill_set?: string;
                        notes?: string;
                        remarks?: string;
                        created_at?: string;
                        [key: string]: unknown;
                      }) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.eitje_id || "-"}</TableCell>
                          <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                          <TableCell>{record.user_name || `${record.user_first_name || ''} ${record.user_last_name || ''}`.trim() || `User ${record.user_id}`}</TableCell>
                          <TableCell>{record.environment_name || `Location ${record.environment_id}`}</TableCell>
                          <TableCell>{record.team_name || (record.team_id ? `Team ${record.team_id}` : "-")}</TableCell>
                          <TableCell>
                            {record.start_time ? formatDateDDMMYYTime(record.start_time) : 
                             record.start_datetime ? formatDateDDMMYYTime(record.start_datetime) :
                             record["start"] ? formatDateDDMMYYTime(record["start"]) : "-"}
                          </TableCell>
                          <TableCell>
                            {record.end_time ? formatDateDDMMYYTime(record.end_time) : 
                             record.end_datetime ? formatDateDDMMYYTime(record.end_datetime) :
                             record["end"] ? formatDateDDMMYYTime(record["end"]) : "-"}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {Number(record.planned_hours || record.hours_planned || record.hours || record.total_hours || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>{record.break_minutes || record.breaks || record.break_minutes_planned || 0}</TableCell>
                          <TableCell>
                            {record.planned_cost || record.wage_cost ? `€${Math.round(Number(record.planned_cost || record.wage_cost))}` : "-"}
                          </TableCell>
                          <TableCell>
                            {record.confirmed ? "Confirmed" : record.cancelled ? "Cancelled" : record.status || "Planned"}
                          </TableCell>
                          <TableCell>{record.shift_type || "-"}</TableCell>
                          <TableCell>{record.skill_set || "-"}</TableCell>
                          <TableCell>{record.notes || record.remarks || "-"}</TableCell>
                          <TableCell>{formatDateDDMMYYTime(record.created_at)}</TableCell>
                        </TableRow>
                      ))
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
