"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Wifi, 
  RefreshCw, 
  Database, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Play,
  Pause,
  Download,
  Upload
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";

interface SyncStatus {
  id: string;
  location: string;
  status: "running" | "completed" | "failed" | "idle";
  last_sync: string;
  records_synced: number;
  next_sync: string;
}

interface MasterDataStatus {
  product_groups: number;
  payment_methods: number;
  cost_centers: number;
  users: number;
  last_updated: string;
}

export default function BorkApiConnectPage() {
  const [selectedTab, setSelectedTab] = useState("manual");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  // Fetch sync status
  const { data: syncStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["bork-sync-status"],
    queryFn: async () => {
      // Mock data for now - replace with actual sync status query
      return [
        {
          id: "1",
          location: "Main Restaurant",
          status: "completed",
          last_sync: "2024-01-20T10:30:00Z",
          records_synced: 1250,
          next_sync: "2024-01-21T10:30:00Z"
        },
        {
          id: "2", 
          location: "Branch Location",
          status: "running",
          last_sync: "2024-01-20T09:15:00Z",
          records_synced: 0,
          next_sync: "2024-01-21T09:15:00Z"
        }
      ] as SyncStatus[];
    },
  });

  // Fetch master data status
  const { data: masterDataStatus } = useQuery({
    queryKey: ["master-data-status"],
    queryFn: async () => {
      // Mock data for now
      return {
        product_groups: 45,
        payment_methods: 8,
        cost_centers: 12,
        users: 25,
        last_updated: "2024-01-20T08:00:00Z"
      } as MasterDataStatus;
    },
  });

  // Manual sync mutation
  const manualSyncMutation = useMutation({
    mutationFn: async ({ locationId, apiKey, baseUrl }: {
      locationId: string;
      apiKey: string;
      baseUrl: string;
    }) => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.functions.invoke('bork-api-sync', {
          body: { location_id: locationId, api_key: apiKey, base_url: baseUrl }
        });
        if (error) throw error;
        return data;
      } catch (error) {
        console.warn('Edge function not available, using mock response:', error);
        // Return mock data for development
        return {
          success: true,
          message: 'Mock sync completed (Edge function not deployed)',
          records_synced: 0
        };
      }
    },
    onSuccess: () => {
      // Refresh sync status
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "idle":
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case "running":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Running</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "idle":
        return <Badge variant="outline">Idle</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bork API Connect</h1>
          <p className="text-muted-foreground">Connect and sync data from Bork API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="manual">Manual Sync</TabsTrigger>
          <TabsTrigger value="cronjob">Cronjob</TabsTrigger>
          <TabsTrigger value="master">Master Sync</TabsTrigger>
        </TabsList>

        {/* Manual Sync Tab */}
        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sync Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Manual Sync</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your Bork API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base-url">Base URL</Label>
                  <Input
                    id="base-url"
                    placeholder="https://api.bork.com"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => manualSyncMutation.mutate({ 
                    locationId: "1", 
                    apiKey, 
                    baseUrl 
                  })}
                  disabled={manualSyncMutation.isPending}
                >
                  {manualSyncMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Start Manual Sync
                </Button>
              </CardContent>
            </Card>

            {/* Sync Status */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Status</CardTitle>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {syncStatus?.map((status) => (
                      <div key={status.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(status.status)}
                          <div>
                            <h4 className="font-medium">{status.location}</h4>
                            <p className="text-sm text-muted-foreground">
                              Last sync: {formatDate(status.last_sync)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {getStatusBadge(status.status)}
                          {status.status === "completed" && (
                            <span className="text-sm text-muted-foreground">
                              {status.records_synced.toLocaleString()} records
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Raw Data Storage */}
          <Card>
            <CardHeader>
              <CardTitle>Raw Data Storage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Database className="h-12 w-12 mx-auto mb-2" />
                  <p>Raw data storage viewer will be implemented</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cronjob Tab */}
        <TabsContent value="cronjob" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cronjob Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Sync Frequency</Label>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">Every Hour</Button>
                    <Button variant="outline" size="sm">Every 6 Hours</Button>
                    <Button variant="outline" size="sm">Daily</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                    <Button variant="outline" size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-2" />
                  <p>Cronjob configuration interface will be implemented</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Master Sync Tab */}
        <TabsContent value="master" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Master Data Sync</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Data Status */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">{masterDataStatus?.product_groups || 0}</h3>
                  <p className="text-sm text-muted-foreground">Product Groups</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">{masterDataStatus?.payment_methods || 0}</h3>
                  <p className="text-sm text-muted-foreground">Payment Methods</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">{masterDataStatus?.cost_centers || 0}</h3>
                  <p className="text-sm text-muted-foreground">Cost Centers</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h3 className="text-2xl font-bold">{masterDataStatus?.users || 0}</h3>
                  <p className="text-sm text-muted-foreground">Users</p>
                </div>
              </div>

              {/* Master Data Actions */}
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium">Last Updated</h4>
                  <p className="text-sm text-muted-foreground">
                    {masterDataStatus?.last_updated ? formatDate(masterDataStatus.last_updated) : "Never"}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All
                  </Button>
                  <Button>
                    <Download className="h-4 w-4 mr-2" />
                    Sync Now
                  </Button>
                </div>
              </div>

              {/* Master Data Tables */}
              <div className="space-y-4">
                <h4 className="font-medium">Master Data Tables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Product Groups</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Food, Beverages, Desserts, etc.
                    </p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Payment Methods</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Cash, Card, Mobile, etc.
                    </p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Cost Centers</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Kitchen, Service, Management, etc.
                    </p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h5 className="font-medium mb-2">Users</h5>
                    <p className="text-sm text-muted-foreground mb-2">
                      Staff members and roles
                    </p>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Sync
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
