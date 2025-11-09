"use client";

<<<<<<< HEAD
import { useMemo, useState } from "react";
=======
import { useState, useMemo } from "react";
>>>>>>> eitje-api
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
<<<<<<< HEAD
import { format } from "date-fns";
=======
import { formatDateDDMMYY, formatDateDDMMYYTime } from "@/lib/dateFormatters";
>>>>>>> eitje-api

const ITEMS_PER_PAGE = 50;

export default function DataLaborHoursPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
<<<<<<< HEAD
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-month");
=======
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-year");
>>>>>>> eitje-api
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
      const { data, error } = await supabase.from("locations").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
=======
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
>>>>>>> eitje-api
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
<<<<<<< HEAD
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: any = {};

    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
=======
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
>>>>>>> eitje-api
    } else if (selectedMonth) {
      filters.startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${lastDay}`;
    } else {
      filters.startDate = `${selectedYear}-01-01`;
      filters.endDate = `${selectedYear}-12-31`;
    }
<<<<<<< HEAD

    if (selectedLocation !== "all") {
      filters.environmentId = selectedLocation;
    }

    return filters;
  }, [selectedYear, selectedMonth, selectedLocation, dateRange]);

  // Fetch environment ids mapped from selected location (UUID -> list of eitje_environment_id integers)
  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery({
    queryKey: ["eitje-env-by-location", selectedLocation, locations],
    queryFn: async () => {
      if (selectedLocation === "all") return null;
      const supabase = createClient();
      // Find the selected location name locally
      const selectedLoc = (locations as any[])?.find((l) => l.id === selectedLocation);
      const selectedName = selectedLoc?.name?.toLowerCase();
      if (!selectedName) return [];

      // Fetch environments and match by name (works across schema variants)
      const { data, error } = await supabase
        .from("eitje_environments")
        .select("eitje_environment_id, raw_data");
      if (error) throw error;

      const ids = (data || [])
        .filter((env: any) => (env.raw_data?.name || "").toLowerCase() === selectedName)
        .map((env: any) => env.eitje_environment_id)
        .filter((id: any) => id != null);
      return ids;
    },
    enabled: selectedLocation !== "all",
    staleTime: 10 * 60 * 1000,
  });

  // Fetch processed shifts data
  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-hours-processed", queryFilters, currentPage, environmentIds],
    queryFn: async () => {
      const supabase = createClient();

      let query = supabase
        .from("eitje_time_registration_shifts_processed")
        .select(
          `id,date,environment_id,team_id,user_id,hours_worked,hourly_rate,wage_cost,status,created_at`,
          { count: "exact" }
        )
        .order("date", { ascending: false });

      // Apply date filters
      if (queryFilters.startDate && queryFilters.endDate) {
        query = query.gte("date", queryFilters.startDate).lte("date", queryFilters.endDate);
      }

      // Apply location filter (mapped to environment ids)
      if (selectedLocation !== "all") {
        if (environmentIds && environmentIds.length > 0) {
          query = query.in("environment_id", environmentIds);
        } else {
          // no matching environments -> return empty set
          query = query.eq("environment_id", -999999);
        }
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: records, error: queryError, count } = await query;

      if (queryError) throw queryError;

      // Map environment/team/user ids to names for display
      const envIds = [...new Set((records || []).map((r: any) => r.environment_id).filter(Boolean))];
      const teamIds = [...new Set((records || []).map((r: any) => r.team_id).filter(Boolean))];
      const userIds = [...new Set((records || []).map((r: any) => r.user_id).filter(Boolean))];

      let envMap: Record<number, string> = {};
      let teamMap: Record<number, string> = {};
      let userMap: Record<number, string> = {};

      if (envIds.length > 0) {
        // Try to fetch names; be tolerant to schema differences (name may be in raw_data)
        const { data: envs } = await supabase
          .from("eitje_environments")
          .select("eitje_environment_id, name, raw_data");
        envMap = Object.fromEntries(
          (envs || [])
            .filter((e: any) => envIds.includes(e.eitje_environment_id))
            .map((e: any) => [e.eitje_environment_id, e.name || e.raw_data?.name || `Environment ${e.eitje_environment_id}`])
        );
      }

      if (teamIds.length > 0) {
        const { data: teams } = await supabase
          .from("eitje_teams")
          .select("eitje_team_id, name")
          .in("eitje_team_id", teamIds);
        teamMap = Object.fromEntries((teams || []).map((t: any) => [t.eitje_team_id, t.name]));
      }

      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from("eitje_users")
          .select("eitje_user_id, name")
          .in("eitje_user_id", userIds);
        userMap = Object.fromEntries((users || []).map((u: any) => [u.eitje_user_id, u.name]));
      }

      const withNames = (records || []).map((r: any) => ({
        ...r,
        environment_name: envMap[r.environment_id] || r.environment_id,
        team_name: r.team_id != null ? (teamMap[r.team_id] || r.team_id) : null,
        user_name: r.user_id != null ? (userMap[r.user_id] || r.user_id) : null,
      }));

      return {
        records: withNames,
        total: count || 0,
      };
    },
    enabled: !!queryFilters.startDate && (selectedLocation === "all" || !isLoadingEnvIds),
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);
=======
    
    return filters;
  }, [selectedYear, selectedMonth, selectedDay, dateRange]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-hours-processed", queryFilters, currentPage, environmentIds],
    queryFn: async () => {
      if (!queryFilters.startDate || !queryFilters.endDate) {
        throw new Error("Missing date filters");
      }

      // Build query params for API endpoint
      const params = new URLSearchParams({
        endpoint: "time_registration_shifts",
        startDate: queryFilters.startDate,
        endDate: queryFilters.endDate,
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });

      // Apply location filter - use first environment ID if available
      if (selectedLocation !== "all" && environmentIds && environmentIds.length > 0) {
        params.append("environmentId", String(environmentIds[0]));
      }

      const response = await fetch(`/api/eitje/processed?${params.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON Response:", text.substring(0, 200));
        throw new Error(`Expected JSON but got ${contentType}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "API request failed");
      }

      // All fields are already normalized in processed table
      const recordsWithNames = (result.records || []).map((record: {
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
        total: result.total || 0,
      };
    },
    enabled: !!queryFilters.startDate && !!queryFilters.endDate && (selectedLocation === "all" || !isLoadingEnvIds),
  });

  const totalPages = Math.ceil((data?.total || 0) / ITEMS_PER_PAGE);
>>>>>>> eitje-api

  const handleDatePresetChange = (preset: DatePreset) => {
    setSelectedDatePreset(preset);
    setCurrentPage(1);
  };

  return (
<<<<<<< HEAD
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Labor Data - Hours</h1>
        <p className="text-muted-foreground">View labor hours data from Eitje</p>
      </div>

=======
    <div className="container mx-auto py-6 space-y-6 min-w-0">
>>>>>>> eitje-api
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
          setCurrentPage(1);
        }}
        selectedDay={null}
        onDayChange={() => {}}
=======
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
>>>>>>> eitje-api
        selectedLocation={selectedLocation}
        onLocationChange={(location) => {
          setSelectedLocation(location);
          setCurrentPage(1);
        }}
        selectedDatePreset={selectedDatePreset}
        onDatePresetChange={handleDatePresetChange}
        locations={locationOptions}
<<<<<<< HEAD
      />

      <Card>
        <CardHeader>
          <CardTitle>Labor Hours (Processed)</CardTitle>
=======
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
          <CardTitle>Hours Data Table</CardTitle>
>>>>>>> eitje-api
          <CardDescription>
            Showing {data?.records.length || 0} of {data?.total || 0} records
          </CardDescription>
        </CardHeader>
<<<<<<< HEAD
        <CardContent>
=======
        <CardContent className="p-0">
>>>>>>> eitje-api
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Wage Cost</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
=======
              <div className="mt-16 bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Eitje ID</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Worker</TableHead>
                      <TableHead className="font-semibold">Worker Code</TableHead>
                      <TableHead className="font-semibold">Worker Email</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Location Code</TableHead>
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">Team Code</TableHead>
                      <TableHead className="font-semibold">Start Time</TableHead>
                      <TableHead className="font-semibold">End Time</TableHead>
                      <TableHead className="font-semibold">Hours Worked</TableHead>
                      <TableHead className="font-semibold">Breaks (min)</TableHead>
                      <TableHead className="font-semibold">Hourly Rate</TableHead>
                      <TableHead className="font-semibold">Wage Cost</TableHead>
                      <TableHead className="font-semibold">Total Cost</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Shift Type</TableHead>
                      <TableHead className="font-semibold">Skill Set</TableHead>
                      <TableHead className="font-semibold">Notes</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
                      <TableHead className="font-semibold">Updated At</TableHead>
>>>>>>> eitje-api
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
<<<<<<< HEAD
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>{record.date ? format(new Date(record.date), "yyyy-MM-dd") : "-"}</TableCell>
                          <TableCell>{record.environment_name || record.environment_id || "-"}</TableCell>
                          <TableCell>{record.team_name || record.team_id || "-"}</TableCell>
                          <TableCell>{record.user_name || record.user_id || "-"}</TableCell>
                          <TableCell>{record.hours_worked || record.hours || record.total_hours || "-"}</TableCell>
                          <TableCell>{record.wage_cost ? `€${Number(record.wage_cost).toFixed(2)}` : "-"}</TableCell>
                          <TableCell>{record.status || "-"}</TableCell>
                          <TableCell>
                            {record.created_at ? format(new Date(record.created_at), "yyyy-MM-dd HH:mm") : "-"}
                          </TableCell>
                        </TableRow>
                      ))
=======
                        <TableCell colSpan={22} className="text-center py-8 text-muted-foreground">
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
                        user_email?: string;
                        user_code?: string;
                        environment_id?: number;
                        environment_name?: string;
                        environment_code?: string;
                        team_id?: number;
                        team_name?: string | null;
                        team_code?: string;
                        start_time?: string;
                        start_datetime?: string;
                        start?: string;
                        end_time?: string;
                        end_datetime?: string;
                        end?: string;
                        hours_worked?: number;
                        hours?: number;
                        total_hours?: number;
                        break_minutes?: number;
                        breaks?: number;
                        break_minutes_actual?: number;
                        hourly_rate?: number;
                        wage_cost?: number;
                        costs_wage?: number;
                        costs_wage_cost?: number;
                        costs_total?: number;
                        labor_cost?: number;
                        total_cost?: number;
                        totalCost?: number;
                        status?: string;
                        shift_type?: string;
                        skill_set?: string;
                        skillSet?: string;
                        notes?: string;
                        remarks?: string;
                        created_at?: string;
                        updated_at?: string;
                        [key: string]: unknown;
                      }) => {
                        // Safely access date fields with proper null checks
                        const startTime = record.start_time || record.start_datetime || record["start"] || null;
                        const endTime = record.end_time || record.end_datetime || record["end"] || null;
                        const hours = Number(record.hours_worked || record.hours || record.total_hours || 0);
                        const hourlyRate = record.hourly_rate || (hours > 0 && record.wage_cost ? Number(record.wage_cost) / hours : null);
                        const totalCost = record.total_cost || record.totalCost || record.costs_total || record.labor_cost || record.wage_cost || null;
                        
                        return (
                          <TableRow key={record.id || `record-${record.eitje_id}-${record.date}`}>
                            <TableCell>{record.eitje_id || "-"}</TableCell>
                            <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                            <TableCell>{record.user_name || `${record.user_first_name || ''} ${record.user_last_name || ''}`.trim() || `User ${record.user_id}`}</TableCell>
                            <TableCell>{record.user_code || "-"}</TableCell>
                            <TableCell>{record.user_email || "-"}</TableCell>
                            <TableCell>{record.environment_name || `Location ${record.environment_id}`}</TableCell>
                            <TableCell>{record.environment_code || "-"}</TableCell>
                            <TableCell>{record.team_name || (record.team_id ? `Team ${record.team_id}` : "-")}</TableCell>
                            <TableCell>{record.team_code || "-"}</TableCell>
                            <TableCell>
                              {startTime ? formatDateDDMMYYTime(startTime) : "-"}
                            </TableCell>
                            <TableCell>
                              {endTime ? formatDateDDMMYYTime(endTime) : "-"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {hours.toFixed(2)}
                            </TableCell>
                            <TableCell>{record.break_minutes || record.breaks || record.break_minutes_actual || 0}</TableCell>
                            <TableCell>
                              {hourlyRate ? `€${hourlyRate.toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {record.wage_cost ? `€${Number(record.wage_cost).toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {totalCost ? `€${Number(totalCost).toFixed(2)}` : "-"}
                            </TableCell>
                            <TableCell>{record.status || "-"}</TableCell>
                            <TableCell>{record.shift_type || "-"}</TableCell>
                            <TableCell>{record.skill_set || record.skillSet || "-"}</TableCell>
                            <TableCell>{record.notes || record.remarks || "-"}</TableCell>
                            <TableCell>{record.created_at ? formatDateDDMMYYTime(record.created_at) : "-"}</TableCell>
                            <TableCell>{record.updated_at ? formatDateDDMMYYTime(record.updated_at) : "-"}</TableCell>
                          </TableRow>
                        );
                      })
>>>>>>> eitje-api
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
>>>>>>> eitje-api
