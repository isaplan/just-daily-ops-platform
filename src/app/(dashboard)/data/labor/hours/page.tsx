"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EitjeDataFilters } from "@/components/view-data/EitjeDataFilters";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { DatePreset, getDateRangeForPreset } from "@/components/view-data/DateFilterPresets";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 50;

export default function DataLaborHoursPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("this-month");
  const [currentPage, setCurrentPage] = useState(1);

  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("locations").select("id, name").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: any = {};

    if (dateRange) {
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedMonth) {
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

  const handleDatePresetChange = (preset: DatePreset) => {
    setSelectedDatePreset(preset);
    setCurrentPage(1);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Labor Data - Hours</h1>
        <p className="text-muted-foreground">View labor hours data from Eitje</p>
      </div>

      <EitjeDataFilters
        selectedYear={selectedYear}
        onYearChange={(year) => {
          setSelectedYear(year);
          setCurrentPage(1);
        }}
        selectedMonth={selectedMonth}
        onMonthChange={(month) => {
          setSelectedMonth(month);
          setCurrentPage(1);
        }}
        selectedDay={null}
        onDayChange={() => {}}
        selectedLocation={selectedLocation}
        onLocationChange={(location) => {
          setSelectedLocation(location);
          setCurrentPage(1);
        }}
        selectedDatePreset={selectedDatePreset}
        onDatePresetChange={handleDatePresetChange}
        locations={locationOptions}
      />

      <Card>
        <CardHeader>
          <CardTitle>Labor Hours (Processed)</CardTitle>
          <CardDescription>
            Showing {data?.records.length || 0} of {data?.total || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.records.length === 0 ? (
                      <TableRow>
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

