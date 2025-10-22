// API CLEAN SLATE - V1: Step 2 - Raw Data Storage
// Registration of API calls with success/failed filtering and data preview

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ApiCallLog {
  id: string;
  location_name: string;
  status: 'success' | 'failed';
  record_count: number;
  timestamp: string;
  raw_data?: Record<string, unknown>;
  error_message?: string;
}

export function RawDataStorage() {
  const [selectedLog, setSelectedLog] = useState<ApiCallLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [callLogs, setCallLogs] = useState<ApiCallLog[]>([]);

  // Load real data from database
  const loadRealCallLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('bork_sales_data')
        .select('*')
        .eq('category', 'STEP1_RAW_DATA')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading call logs:', error);
        return;
      }

      if (data) {
        const logs: ApiCallLog[] = data.map((record: Record<string, unknown>) => ({
          id: record.id as string,
          location_name: getLocationName(record.location_id as string),
          status: (record.quantity as number) > 0 ? 'success' : 'failed',
          record_count: (record.quantity as number) || 0,
          timestamp: record.created_at as string,
          raw_data: record.raw_data as Record<string, unknown>,
          error_message: (record.quantity as number) === 0 ? 'No data received' : undefined
        }));
        setCallLogs(logs);
        console.log('🔍 CURSOR-DEV: Loaded real call logs:', logs);
      }
    } catch (error) {
      console.error('Error loading real call logs:', error);
    }
  }, []); // Empty dependency array for useCallback

  // Helper function to get location name from ID
  const getLocationName = (locationId: string): string => {
    const locationMap: { [key: string]: string } = {
      '550e8400-e29b-41d4-a716-446655440002': 'Bar Bea',
      '550e8400-e29b-41d4-a716-446655440003': "L'Amour Toujours",
      '550e8400-e29b-41d4-a716-446655440001': 'Van Kinsbergen'
    };
    return locationMap[locationId] || `Unknown Location (${locationId})`;
  };

  // Load real data on component mount
  useEffect(() => {
    loadRealCallLogs();
  }, [loadRealCallLogs]);


  const filteredLogs = callLogs.filter(log => {
    if (filter === 'all') return true;
    return log.status === filter;
  });

  const testApiCall = useMutation({
    mutationFn: async ({ locationId, apiKey, baseUrl, locationName }: {
      locationId: string;
      apiKey: string;
      baseUrl: string;
      locationName: string;
    }) => {
      console.log(`🧪 Testing API call for ${locationName}...`);
      
      const { data, error } = await supabase.functions.invoke('bork-api-test', {
        body: {
          locationId,
          apiKey,
          baseUrl,
          startDate: "2025-09-18",
          endDate: "2025-09-18", 
          syncType: "manual"
        }
      });

      if (error) throw error;
      return { ...data, locationName };
    },
    onSuccess: (data) => {
      console.log('✅ API Call Success:', data);
      
      // Refresh real data from database instead of adding mock log
      loadRealCallLogs();
      toast.success(`✅ ${data.locationName} API call successful!`);
      
      // Debug: Check if data was actually stored
      console.log('🔍 Step 2 Debug: Checking if data was stored...');
      setTimeout(async () => {
        // Check all records first to see what's actually stored
        const { data: allData, error: allError } = await supabase
          .from('bork_sales_data')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);
        
        console.log('🔍 Step 2 Debug: All data in bork_sales_data:', { allData, allError, count: allData?.length || 0 });
        
        // Show all data in toast for debugging
        if (allData && allData.length > 0) {
          toast.info(`Found ${allData.length} total records in database. Categories: ${allData.map(r => r.category).join(', ')}`);
        } else {
          toast.error("⚠️ No data found in bork_sales_data table at all!");
        }
        
        // Then check for specific category
        const { data: storedData, error } = await supabase
          .from('bork_sales_data')
          .select('*')
          .eq('category', 'STEP1_RAW_DATA')
          .order('created_at', { ascending: false })
          .limit(5);
        
        console.log('🔍 Step 2 Debug: Stored data check:', { storedData, error, count: storedData?.length || 0 });
        if (storedData?.length === 0) {
          toast.error("⚠️ API call succeeded but no data was stored in database!");
        }
      }, 2000);
    },
    onError: (error, variables) => {
      console.error('❌ API Call Error:', error);
      
      // Add failed call to logs
      const newLog: ApiCallLog = {
        id: Date.now().toString(),
        location_name: variables.locationName || 'Unknown Location',
        status: 'failed',
        record_count: 0, // Hidden from UI
        timestamp: new Date().toISOString(),
        error_message: error.message
      };
      
      setCallLogs(prev => [newLog, ...prev]);
      toast.error("❌ API call failed: " + error.message);
    }
  });

  const handleRowClick = (log: ApiCallLog) => {
    setSelectedLog(log);
  };

  const handleDeleteLog = (logId: string) => {
    setCallLogs(prev => prev.filter(log => log.id !== logId));
    toast.success("Failed API call removed from log");
  };

  return (
    <div className="space-y-6">
      {/* Test API Calls */}
      <Card>
        <CardHeader>
          <CardTitle>🧪 Test API Calls</CardTitle>
          <CardDescription>
            Make API calls to test raw data storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <Button 
              onClick={() => testApiCall.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440002",
                apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                baseUrl: "https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com",
                locationName: "Bar Bea"
              })}
              disabled={testApiCall.isPending}
              className="w-full"
            >
              {testApiCall.isPending ? "Testing..." : "🧪 Bar Bea"}
            </Button>

            <Button 
              onClick={() => testApiCall.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440003",
                apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                baseUrl: "https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com",
                locationName: "L'Amour Toujours"
              })}
              disabled={testApiCall.isPending}
              className="w-full"
            >
              {testApiCall.isPending ? "Testing..." : "🧪 L'Amour Toujours"}
            </Button>

            <Button 
              onClick={() => testApiCall.mutate({
                locationId: "550e8400-e29b-41d4-a716-446655440001",
                apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                baseUrl: "https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com",
                locationName: "Van Kinsbergen"
              })}
              disabled={testApiCall.isPending}
              className="w-full"
            >
              {testApiCall.isPending ? "Testing..." : "🧪 Van Kinsbergen"}
            </Button>

            <Button 
              onClick={() => {
                testApiCall.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440002",
                  apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                  baseUrl: "https://GGRZ28Q3MDRQ2UQ3MDRQ.trivecgateway.com",
                  locationName: "Bar Bea"
                });
                testApiCall.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440003",
                  apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                  baseUrl: "https://7JFC2JUXTGVR2UTXUARY28QX.trivecgateway.com",
                  locationName: "L'Amour Toujours"
                });
                testApiCall.mutate({
                  locationId: "550e8400-e29b-41d4-a716-446655440001",
                  apiKey: "1f518c6dce0a466d8d0f7c95b0717de4",
                  baseUrl: "https://7ARQ28QXMGRQ6UUXTGVW2UQ.trivecgateway.com",
                  locationName: "Van Kinsbergen"
                });
              }}
              disabled={testApiCall.isPending}
              className="w-full"
              variant="outline"
            >
              {testApiCall.isPending ? "Testing All..." : "🧪 Test All"}
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">🔍 Debug: Check Database Storage</h4>
            <p className="text-sm text-blue-700 mb-2">
              If API calls show success but no data appears in Step 4, check if data was actually stored.
            </p>
            <Button 
              onClick={async () => {
                console.log('🔍 Checking database for stored raw data...');
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                console.log('🔍 Connected to database:', supabaseUrl);
                const projectId = supabaseUrl?.split('//')[1]?.split('.')[0];
                const dbName = projectId === 'cajxmwyiwrhzryvawjkm' ? 'Just Stock It (Production)' : `Project ${projectId}`;
                console.log('🔍 Database project:', dbName);
                
                const { data, error } = await supabase
                  .from('bork_sales_data')
                  .select('*')
                  .eq('category', 'STEP1_RAW_DATA')
                  .order('created_at', { ascending: false });
                
                console.log('🔍 Database check result:', { data, error, count: data?.length || 0 });
                toast.info(`Found ${data?.length || 0} raw data records in database (${dbName})`);
              }}
              variant="outline"
              size="sm"
            >
              🔍 Check Database Storage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Call Registration Log */}
      <Card>
        <CardHeader>
          <CardTitle>📋 API Call Registration Log</CardTitle>
          <CardDescription>
            Track all API calls with success/failed status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All ({callLogs.length})
            </Button>
            <Button 
              variant={filter === 'success' ? 'default' : 'outline'}
              onClick={() => setFilter('success')}
            >
              Success ({callLogs.filter(log => log.status === 'success').length})
            </Button>
            <Button 
              variant={filter === 'failed' ? 'default' : 'outline'}
              onClick={() => setFilter('failed')}
            >
              Failed ({callLogs.filter(log => log.status === 'failed').length})
            </Button>
            <Button 
              onClick={loadRealCallLogs} 
              variant="outline"
              size="sm"
              className="ml-2"
            >
              🔄 Refresh
            </Button>
            {callLogs.filter(log => log.status === 'failed').length > 0 && (
              <Button 
                variant="destructive"
                size="sm"
                onClick={() => {
                  setCallLogs(prev => prev.filter(log => log.status !== 'failed'));
                  toast.success("All failed API calls removed");
                }}
                className="gap-1"
              >
                <span className="text-white font-bold">×</span>
                Clear All Failed
              </Button>
            )}
            {callLogs.length > 0 && (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  setCallLogs([]);
                  toast.success("All test logs cleared");
                }}
                className="gap-1"
              >
                🗑️ Clear All Tests
              </Button>
            )}
          </div>

          {/* Call Logs Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow 
                    key={log.id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRowClick(log)}
                  >
                    <TableCell className="font-medium">{log.location_name}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {log.status === 'failed' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLog(log.id);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <span className="text-white font-bold">×</span>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No API calls found for the selected filter.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Removed duplicate dialog to fix JSX error */}

      {/* Data Preview Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📄 Data Preview - {selectedLog?.location_name}</DialogTitle>
            <DialogDescription>
              Raw data from API call on {selectedLog && new Date(selectedLog.timestamp).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Status:</strong> 
                  <Badge variant={selectedLog.status === 'success' ? 'default' : 'destructive'} className="ml-2">
                    {selectedLog.status}
                  </Badge>
                </div>
                <div>
                  <strong>Timestamp:</strong> {new Date(selectedLog.timestamp).toLocaleString()}
                </div>
                {selectedLog.error_message && (
                  <div>
                    <strong>Error:</strong> {selectedLog.error_message}
                  </div>
                )}
              </div>
              
              <div>
                <strong>Raw Data:</strong>
                <pre className="mt-2 p-4 bg-gray-100 rounded-lg text-xs overflow-auto max-h-96">
                  {JSON.stringify(selectedLog.raw_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
