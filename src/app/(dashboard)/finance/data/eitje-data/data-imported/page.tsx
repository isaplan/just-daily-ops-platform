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

export default function DataImportedPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedDatePreset, setSelectedDatePreset] = useState<DatePreset>("last-month");
  const [currentPage, setCurrentPage] = useState(1);

  // Get date range from preset
  const dateRange = useMemo(() => {
    return getDateRangeForPreset(selectedDatePreset);
  }, [selectedDatePreset]);

  // Helper to detect network errors
  const isNetworkError = (error: any): boolean => {
    const message = error?.message || error?.details || "";
    return (
      message.includes("Failed to fetch") ||
      message.includes("ERR_CONNECTION_RESET") ||
      message.includes("ERR_TIMED_OUT") ||
      message.includes("ERR_NETWORK_CHANGED") ||
      message.includes("NetworkError") ||
      message.includes("network")
    );
  };

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
    staleTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      // Retry more for network errors
      if (isNetworkError(error)) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  });

  const locationOptions = useMemo(() => {
    return [
      { value: "all", label: "All Locations" },
      ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
    ];
  }, [locations]);

  // Fetch environment IDs when a location is selected
  const { data: environmentIds, isLoading: isLoadingEnvIds } = useQuery({
    queryKey: ["eitje-environments", selectedLocation],
    queryFn: async () => {
      if (selectedLocation === "all") return null;
      
      const supabase = createClient();
      try {
        const { data: locsData, error: locsError } = await supabase
          .from("locations")
          .select("id, name");
        
        if (locsError) {
          if (isNetworkError(locsError)) {
            throw new Error("Network connection issue. Please check your internet connection and try again.");
          }
          throw locsError;
        }
        
        const selectedLoc = locsData?.find((loc) => loc.id === selectedLocation);
        if (!selectedLoc) return [];
        
        const { data: allEnvs, error } = await supabase
          .from("eitje_environments")
          .select("id, raw_data");
        
        if (error) {
          if (isNetworkError(error)) {
            throw new Error("Network connection issue. Please check your internet connection and try again.");
          }
          console.error("Error fetching environments:", error);
          return [];
        }
        
        const matchedIds = (allEnvs || [])
          .filter((env: any) => {
            const envName = env.raw_data?.name || "";
            return envName.toLowerCase() === selectedLoc.name.toLowerCase();
          })
          .map((env: any) => env.id);
        
        return matchedIds;
      } catch (error) {
        // Re-throw network errors for retry handling
        if (isNetworkError(error)) {
          throw error;
        }
        console.error("Error in environment ID query:", error);
        return [];
      }
    },
    enabled: selectedLocation !== "all",
    retry: (failureCount, error) => {
      // Retry more for network errors
      if (isNetworkError(error)) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  });

  // Build query filters
  const queryFilters = useMemo(() => {
    const filters: any = {};
    
    if (dateRange) {
      // Convert Date objects to YYYY-MM-DD format
      filters.startDate = dateRange.start.toISOString().split("T")[0];
      filters.endDate = dateRange.end.toISOString().split("T")[0];
    } else if (selectedDay !== null && selectedMonth !== null && selectedYear) {
      // If both day and month are selected, filter by specific day
      filters.startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
      filters.endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
    } else if (selectedMonth !== null && selectedYear) {
      // If only month is selected, filter by entire month
      filters.startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      filters.endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
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

  // Fetch raw data - SELECT FROM RAW TABLE
  const { data, isLoading, error } = useQuery({
    queryKey: ["eitje-raw-data", queryFilters, currentPage, environmentIds],
    queryFn: async () => {
      try {
        const supabase = createClient();
        
        // Validate that we have date filters
        if (!queryFilters?.startDate || !queryFilters?.endDate) {
          console.warn("Missing date filters, returning empty result");
          return {
            records: [],
            total: 0,
          };
        }
        
        // Fetch raw data from time_registration_shifts_raw
        let query = supabase
          .from("eitje_time_registration_shifts_raw")
          .select(`
            id,
            eitje_id,
            date,
            user_id,
            team_id,
            environment_id,
            start_time,
            end_time,
            start_datetime,
            end_datetime,
            hours_worked,
            hours,
            total_hours,
            break_minutes,
            breaks,
            break_minutes_actual,
            wage_cost,
            status,
            skill_set,
            shift_type,
            notes,
            raw_data,
            created_at,
            updated_at
          `, { count: "exact" });

        // Apply date filters
        query = query
          .gte("date", queryFilters.startDate)
          .lte("date", queryFilters.endDate);

        // Apply location filter
        if (selectedLocation !== "all" && environmentIds) {
          if (environmentIds.length > 0) {
            query = query.in("environment_id", environmentIds);
          } else {
            query = query.eq("environment_id", -999);
          }
        }

        // Apply ordering (latest date first)
        query = query.order("date", { ascending: false });

        // Apply pagination
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data: records, error: queryError, count } = await query;

        if (queryError) {
          // Check if it's a network error
          const isNetwork = isNetworkError(queryError);
          
          // Log the error in multiple ways to see what we're actually getting
          console.error("Supabase query error (raw):", queryError);
          console.error("Supabase query error (stringified):", JSON.stringify(queryError, null, 2));
          console.error("Supabase query error (isNetwork):", isNetwork);
          
          // Create a more descriptive error
          const errorMessage = queryError?.message || queryError?.details || "Unknown Supabase error";
          const userMessage = isNetwork
            ? "Network connection issue. Please check your internet connection and try again."
            : `Failed to fetch raw data: ${errorMessage}`;
          
          throw new Error(userMessage);
        }

        if (!records) {
          console.warn("No records returned from query");
          return {
            records: [],
            total: 0,
          };
        }

        // Fetch environment, team, and user names separately
        const recordEnvironmentIds = [...new Set((records || []).map((r: any) => r.environment_id).filter(Boolean))];
        const recordTeamIds = [...new Set((records || []).map((r: any) => r.team_id).filter(Boolean))];
        const recordUserIds = [...new Set((records || []).map((r: any) => r.user_id).filter(Boolean))];

        let environmentMap: Record<number, string> = {};
        let teamMap: Record<number, string> = {};
        let userMap: Record<number, string> = {};
        
        // Fetch environments
        if (recordEnvironmentIds.length > 0) {
          try {
            const { data: environments, error: envError } = await supabase
              .from("eitje_environments")
              .select("id, raw_data")
              .in("id", recordEnvironmentIds);
            
            if (envError) {
              // Only log non-network errors (network errors are handled by retry logic)
              if (!isNetworkError(envError)) {
                console.error("Error fetching environments:", envError);
              }
            } else if (environments) {
              environmentMap = Object.fromEntries(
                environments.map((env: any) => [
                  env.id,
                  env.raw_data?.name || `Environment ${env.id}`
                ])
              );
            }
          } catch (error) {
            // Only log non-network errors
            if (!isNetworkError(error)) {
              console.error("Error in environment query:", error);
            }
          }
        }

        // Fetch teams
        if (recordTeamIds.length > 0) {
          try {
            const { data: teams, error: teamError } = await supabase
              .from("eitje_teams")
              .select("id, raw_data")
              .in("id", recordTeamIds);
            
            if (teamError) {
              // Only log non-network errors
              if (!isNetworkError(teamError)) {
                console.error("Error fetching teams:", teamError);
              }
            } else if (teams) {
              teamMap = Object.fromEntries(
                teams.map((team: any) => [
                  team.id,
                  team.raw_data?.name || `Team ${team.id}`
                ])
              );
            }
          } catch (error) {
            // Only log non-network errors
            if (!isNetworkError(error)) {
              console.error("Error in team query:", error);
            }
          }
        }

        // Fetch users
        if (recordUserIds.length > 0) {
          try {
            const { data: users, error: userError } = await supabase
              .from("eitje_users")
              .select("eitje_user_id, raw_data")
              .in("eitje_user_id", recordUserIds);
            
            if (userError) {
              // Only log non-network errors
              if (!isNetworkError(userError)) {
                console.error("Error fetching users:", userError);
              }
            } else if (users) {
              userMap = Object.fromEntries(
                users.map((user: any) => [
                  user.eitje_user_id,
                  user.raw_data?.name || user.raw_data?.firstName || `User ${user.eitje_user_id}`
                ])
              );
            }
          } catch (error) {
            // Only log non-network errors
            if (!isNetworkError(error)) {
              console.error("Error in user query:", error);
            }
          }
        }

        // Helper function to flatten nested objects
        const flattenObject = (obj: any, prefix = ''): Record<string, any> => {
          const flattened: Record<string, any> = {};
          for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
              const newKey = prefix ? `${prefix}_${key}` : key;
              if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
                // Recursively flatten nested objects
                Object.assign(flattened, flattenObject(obj[key], newKey));
              } else {
                flattened[newKey] = obj[key];
              }
            }
          }
          return flattened;
        };

        // Merge names into records and map raw_data to existing columns
        const recordsWithNames = (records || []).map((record: any) => {
          const rawData = record.raw_data || {};
          
          // Helper to extract from raw_data with multiple path attempts
          const getFromRawData = (paths: string[], fallback: any = null): any => {
            for (const path of paths) {
              const keys = path.split('.');
              let value = rawData;
              for (const key of keys) {
                value = value?.[key];
                if (value === undefined || value === null) break;
              }
              if (value !== undefined && value !== null) {
                // If it's an object, try to extract a primitive value
                if (typeof value === 'object' && !Array.isArray(value)) {
                  // Try common object properties
                  if (value.name !== undefined) return value.name;
                  if (value.id !== undefined) return value.id;
                  if (value.value !== undefined) return value.value;
                  if (value.label !== undefined) return value.label;
                  // If no common property, return the object (will be handled by extractValue in render)
                  return value;
                }
                return value;
              }
            }
            return fallback;
          };
          
          // Map raw_data fields to existing column structure
          // User: Try multiple paths from raw_data
          const rawUser = getFromRawData(['user.id', 'user_id', 'user', 'employee.id', 'employee_id']);
          
          // Team: Try multiple paths
          const rawTeam = getFromRawData(['team.id', 'team_id', 'team']);
          
          // Location/Environment: Try multiple paths
          const rawEnvironment = getFromRawData(['environment.id', 'environment_id', 'environment', 'location.id', 'location_id']);
          
          // Start Time: Try multiple paths
          const rawStartTime = getFromRawData(['start_time', 'start', 'startDateTime', 'start_datetime']);
          
          // End Time: Try multiple paths
          const rawEndTime = getFromRawData(['end_time', 'end', 'endDateTime', 'end_datetime']);
          
          // Hours: Try multiple paths
          const rawHours = getFromRawData(['hours_worked', 'hours', 'totalHours', 'total_hours']);
          
          // Breaks: Try multiple paths
          const rawBreaks = getFromRawData(['break_minutes', 'breaks', 'breakMinutes', 'break_minutes_actual']);
          
          // Wage Cost: Try multiple paths
          const rawWageCost = getFromRawData(['wage_cost', 'wageCost', 'costs.wage', 'costs.wage_cost', 'labor_cost', 'laborCost']);
          
          // Shift Type: Try multiple paths
          const rawShiftType = getFromRawData(['shift_type', 'shiftType', 'type']);
          
          // Status: Try multiple paths
          const rawStatus = getFromRawData(['status', 'state']);
          
          // Helper to ensure we always return a primitive value (never an object)
          const toPrimitive = (value: any): string | number | null => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'object' && !Array.isArray(value)) {
              // Extract from object
              if (value.name !== undefined) return String(value.name);
              if (value.id !== undefined) return String(value.id);
              if (value.value !== undefined) return String(value.value);
              if (value.label !== undefined) return String(value.label);
              // Fallback: stringify
              return JSON.stringify(value).substring(0, 100);
            }
            if (Array.isArray(value)) return value.join(", ");
            return value;
          };
          
          return {
            ...record,
            // Use normalized values first, fallback to raw_data, ensure primitives
            environment_id: record.environment_id || rawEnvironment || null,
            team_id: record.team_id || rawTeam || null,
            user_id: record.user_id || rawUser || null,
            start_time: record.start_time || record.start_datetime || rawStartTime || null,
            end_time: record.end_time || record.end_datetime || rawEndTime || null,
            hours_worked: record.hours_worked || record.hours || record.total_hours || rawHours || 0,
            break_minutes: record.break_minutes || record.breaks || record.break_minutes_actual || rawBreaks || 0,
            wage_cost: record.wage_cost || rawWageCost || null,
            shift_type: toPrimitive(record.shift_type || rawShiftType),
            status: toPrimitive(record.status || rawStatus),
            // Names from lookups
            environment_name: environmentMap[record.environment_id || rawEnvironment] || null,
            team_name: (record.team_id || rawTeam) ? (teamMap[record.team_id || rawTeam] || null) : null,
            user_name: (record.user_id || rawUser) ? (userMap[record.user_id || rawUser] || null) : null,
            // Keep full raw_data for inspection
            raw_data_full: rawData
          };
        });

        console.log("Raw data query result:", {
          recordsCount: recordsWithNames.length,
          total: count || 0,
          filters: queryFilters,
          firstRecord: recordsWithNames[0] || null,
          recordsStructure: recordsWithNames.length > 0 ? Object.keys(recordsWithNames[0]) : [],
        });

        return {
          records: recordsWithNames,
          total: count || 0,
        };
      } catch (err: any) {
        // Catch any unexpected errors
        const isNetwork = isNetworkError(err);
        console.error("Unexpected error in queryFn:", err);
        console.error("Error details:", {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
          isNetwork,
          err: err
        });
        
        // Re-throw with network-aware message
        if (isNetwork && !err.message.includes("Network connection")) {
          throw new Error("Network connection issue. Please check your internet connection and try again.");
        }
        
        throw err;
      }
    },
    enabled: !!queryFilters?.startDate && !!queryFilters?.endDate && (selectedLocation === "all" || !isLoadingEnvIds),
    retry: (failureCount, error) => {
      // Retry more for network errors
      if (isNetworkError(error)) {
        return failureCount < 3;
      }
      return failureCount < 1;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      return Math.min(1000 * Math.pow(2, attemptIndex), 4000);
    },
  });

  const totalPages = useMemo(() => {
    if (!data?.total) return 1;
    return Math.ceil(data.total / ITEMS_PER_PAGE);
  }, [data?.total]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setSelectedMonth(null);
    setSelectedDay(null);
    setSelectedDatePreset(preset);
    setCurrentPage(1);
  };

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
          setSelectedYear(2025);
          setSelectedMonth(null);
          setSelectedDay(null);
          setSelectedLocation("all");
          setSelectedDatePreset("this-month");
          setCurrentPage(1);
        }}
      />

      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle>Imported Raw Data</CardTitle>
          <CardDescription>
            Showing {data?.records.length || 0} of {data?.total || 0} raw records from time registration shifts
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <div className="text-destructive font-semibold mb-2">
                {error instanceof Error ? error.message : "Unknown error"}
              </div>
              {error instanceof Error && error.message.includes("Network connection") && (
                <div className="text-sm text-muted-foreground mt-2">
                  The query will automatically retry. If the problem persists, please check your internet connection.
                </div>
              )}
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {/* Debug info - remove after fixing */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-2 bg-muted text-xs rounded">
                  <strong>Debug:</strong> Data loaded - Records: {data?.records?.length || 0}, Total: {data?.total || 0}
                  {data?.records?.[0] && (
                    <div className="mt-1">
                      First record keys: {Object.keys(data.records[0]).join(", ")}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-16 bg-white rounded-sm border border-black px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Team</TableHead>
                      <TableHead className="font-semibold">Location</TableHead>
                      <TableHead className="font-semibold">Start Time</TableHead>
                      <TableHead className="font-semibold">End Time</TableHead>
                      <TableHead className="font-semibold">Hours Worked</TableHead>
                      <TableHead className="font-semibold">Break Minutes</TableHead>
                      <TableHead className="font-semibold">Wage Cost</TableHead>
                      <TableHead className="font-semibold">Shift Type</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!data.records || data.records.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          No data found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.records.map((record: any) => {
                        const formatTime = (timeStr: string | null) => {
                          if (!timeStr) return "-";
                          try {
                            const date = new Date(timeStr);
                            return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                          } catch {
                            return timeStr;
                          }
                        };

                        // Helper to extract value from object or return primitive
                        const extractValue = (value: any): string | number => {
          if (value === null || value === undefined) return "-";
          if (typeof value === 'object') {
            // If it's an object, try to extract common properties
            if (value.name) return String(value.name);
            if (value.id) return String(value.id);
            if (value.value) return String(value.value);
            if (value.label) return String(value.label);
            // If it's an array, join it
            if (Array.isArray(value)) return value.join(", ");
            // Otherwise stringify it
            return JSON.stringify(value).substring(0, 50);
          }
          return value;
        };

                        return (
                          <TableRow key={record.id}>
                            <TableCell>{formatDateDDMMYY(record.date)}</TableCell>
                            {/* User: Show name if available, otherwise show ID from raw_data */}
                            <TableCell>
                              {record.user_name || (record.user_id ? `User ${record.user_id}` : "-")}
                            </TableCell>
                            {/* Team: Show name if available, otherwise show ID from raw_data */}
                            <TableCell>
                              {record.team_name || (record.team_id ? `Team ${record.team_id}` : "-")}
                            </TableCell>
                            {/* Location: Show name if available, otherwise show ID from raw_data */}
                            <TableCell>
                              {record.environment_name || (record.environment_id ? `Loc ${record.environment_id}` : "-")}
                            </TableCell>
                            {/* Start Time: Use mapped value from raw_data */}
                            <TableCell>{formatTime(record.start_time || record.start_datetime)}</TableCell>
                            {/* End Time: Use mapped value from raw_data */}
                            <TableCell>{formatTime(record.end_time || record.end_datetime)}</TableCell>
                            {/* Hours Worked: Use mapped value from raw_data */}
                            <TableCell>{Number(record.hours_worked || 0).toFixed(2)}</TableCell>
                            {/* Break Minutes: Use mapped value from raw_data */}
                            <TableCell>{record.break_minutes || 0}</TableCell>
                            {/* Wage Cost: Use mapped value from raw_data */}
                            <TableCell className="font-semibold">
                              {record.wage_cost && Number(record.wage_cost) > 0 
                                ? `€${Math.round(Number(record.wage_cost))}` 
                                : "-"}
                            </TableCell>
                            {/* Shift Type: Already converted to primitive in mapping */}
                            <TableCell>{record.shift_type || "-"}</TableCell>
                            {/* Status: Already converted to primitive in mapping */}
                            <TableCell>{record.status || "-"}</TableCell>
                            <TableCell>
                              {record.created_at ? formatDateDDMMYYTime(record.created_at) : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
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

