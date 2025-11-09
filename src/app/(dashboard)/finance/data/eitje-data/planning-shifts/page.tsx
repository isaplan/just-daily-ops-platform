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
import { getEnvIdsForLocation } from "@/lib/eitje/env-utils";
import { ShowMoreColumnsToggle } from "@/components/view-data/ShowMoreColumnsToggle";

const ITEMS_PER_PAGE = 50;

export default function PlanningShiftsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("last-month");
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllColumns, setShowAllColumns] = useState(false);

  // Get date range from preset
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
      ...locations.map((loc: { id: string; name: string }) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch environment IDs (Eitje environment IDs) when a location is selected
  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery({
    queryKey: ["eitje-environments", selectedLocation],
    queryFn: async () => {
      if (selectedLocation === "all") return null;
      return await getEnvIdsForLocation(selectedLocation);
    },
    enabled: selectedLocation !== "all",
    staleTime: 10 * 60 * 1000,
  });

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: {
      startDate?: string;
      endDate?: string;
      environmentId?: string;
    } = {};
    
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
      // Filter by year
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }

    if (selectedLocation !== "all") {
      filters.environmentId = selectedLocation;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedDay, selectedLocation, dateRange]);

  // Fetch planning shifts data
  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-planning-shifts", queryFilters, currentPage, environmentIds],
    queryFn: async () => {
      const supabase = createClient();
      
      // Base query: processed planning shifts - fetch all existing fields
      let query = supabase
        .from("eitje_planning_shifts_processed")
        .select(`
          id,
          eitje_id,
          date,
          environment_id,
          environment_name,
          team_id,
          team_name,
          user_id,
          user_name,
          start_time,
          end_time,
          planned_hours,
          hours,
          total_hours,
          break_minutes,
          break_minutes_planned,
          planned_cost,
          wage_cost,
          status,
          shift_type,
          type_name,
          notes,
          remarks,
          created_at,
          updated_at
        `, { count: "exact" });

      // Apply date filters
      if (queryFilters.startDate && queryFilters.endDate) {
        query = query
          .gte("date", queryFilters.startDate)
          .lte("date", queryFilters.endDate);
      }

      // Apply location filter (via environment IDs)
      if (selectedLocation !== "all" && environmentIds && environmentIds.length > 0) {
        query = query.in("environment_id", environmentIds);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      // Order by date desc, then user name
      query = query.order("date", { ascending: false });

      const { data: records, error: queryError, count } = await query;

      if (queryError) {
        console.error("Supabase query error:", queryError);
        throw queryError;
      }

      // Process records - use extracted names directly from processed table
      const recordsWithNames = (records || []).map((r: any) => {
        const plannedHours = Number(r.planned_hours ?? r.hours ?? r.total_hours ?? 0);
        const breaks = r.break_minutes_planned ?? r.break_minutes ?? 0;
        const plannedCost = r.planned_cost ?? r.wage_cost ?? null;
        // Calculate hourly rate
        const hourlyRate = plannedHours > 0 && plannedCost ? Number(plannedCost) / plannedHours : null;
        
        return {
          id: r.id,
          eitje_id: r.eitje_id,
          date: r.date,
          environment_id: r.environment_id,
          environment_name: r.environment_name || null,
          team_id: r.team_id,
          team_name: r.team_name || null,
          user_id: r.user_id,
          user_name: r.user_name || String(r.user_id),
          start_time: r.start_time,
          end_time: r.end_time,
          planned_hours: plannedHours,
          break_minutes: breaks,
          planned_cost: plannedCost,
          hourly_rate: hourlyRate,
          status: r.status,
          shift_type: r.shift_type,
          type_name: r.type_name,
          notes: r.notes,
          remarks: r.remarks,
          updated_at: r.updated_at ?? null,
        };
      });
      // Sort by date desc, then user name
      recordsWithNames.sort((a: any, b: any) => {
        const dc = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dc !== 0) return dc;
        return String(a.user_name || "").localeCompare(String(b.user_name || ""));
      });

      return {
        records: recordsWithNames,
        total: count || 0,
      };
    },
    enabled: !isLoadingEnvIds && (selectedLocation === "all" || environmentIds !== null),
  });

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="p-0">
          <EitjeDataFilters
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
            selectedDay={selectedDay}
            onDayChange={setSelectedDay}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            locationOptions={locationOptions}
            selectedDatePreset={selectedDatePreset}
            onDatePresetChange={setSelectedDatePreset}
          />

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
              <div className="mt-16">
                <ShowMoreColumnsToggle
                  isExpanded={showAllColumns}
                  onToggle={setShowAllColumns}
                  coreColumnCount={8}
                  totalColumnCount={15}
                />
              </div>
              <div className="mt-4 bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Environment</TableHead>
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Planned Hours</TableHead>
                      <TableHead className="font-semibold">Break Minutes</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Updated At</TableHead>
                      {showAllColumns && (
                        <>
                          <TableHead className="font-semibold">Eitje ID</TableHead>
                          <TableHead className="font-semibold">Start Time</TableHead>
                          <TableHead className="font-semibold">End Time</TableHead>
                          <TableHead className="font-semibold">Planned Cost</TableHead>
                          <TableHead className="font-semibold">Hourly Rate</TableHead>
                          <TableHead className="font-semibold">Shift Type</TableHead>
                          <TableHead className="font-semibold">Type Name</TableHead>
                          <TableHead className="font-semibold">Notes</TableHead>
                          <TableHead className="font-semibold">Remarks</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={showAllColumns ? 15 : 8} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record: any) => {
                        return (
                          <TableRow key={record.id}>
                            <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                            <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
                            <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
                            <TableCell>
                              {record.user_name || String(record.user_id) || "-"}
                            </TableCell>
                            <TableCell>
                              {record.planned_hours > 0
                                ? `${record.planned_hours.toFixed(2)}h`
                                : "-"}
                            </TableCell>
                            <TableCell>{record.break_minutes || 0}</TableCell>
                            <TableCell>{record.status || "planned"}</TableCell>
                            <TableCell>
                              {record.updated_at ? formatDateDDMMYYTime(record.updated_at) : "-"}
                            </TableCell>
                            {showAllColumns && (
                              <>
                                <TableCell>{record.eitje_id || "-"}</TableCell>
                                <TableCell>
                                  {record.start_time ? formatDateDDMMYYTime(record.start_time) : "-"}
                                </TableCell>
                                <TableCell>
                                  {record.end_time ? formatDateDDMMYYTime(record.end_time) : "-"}
                                </TableCell>
                                <TableCell>
                                  {record.planned_cost ? `€${Number(record.planned_cost).toFixed(2)}` : "-"}
                                </TableCell>
                                <TableCell>
                                  {record.hourly_rate ? `€${record.hourly_rate.toFixed(2)}` : "-"}
                                </TableCell>
                                <TableCell>{record.shift_type || "-"}</TableCell>
                                <TableCell>{record.type_name || "-"}</TableCell>
                                <TableCell className="max-w-xs truncate">{record.notes || "-"}</TableCell>
                                <TableCell className="max-w-xs truncate">{record.remarks || "-"}</TableCell>
                              </>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({data.total} total records)
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

