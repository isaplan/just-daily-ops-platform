"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SyncConfig {
  id?: string;
  mode: 'manual' | 'incremental' | 'backfill';
  incremental_interval_minutes: number;
  worker_interval_minutes: number;
  enabled_endpoints: string[];
  quiet_hours_start?: number;
  quiet_hours_end?: number;
  created_at?: string;
  updated_at?: string;
}

export function EitjeCronjobConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SyncConfig>({
    mode: 'manual',
    incremental_interval_minutes: 60,
    worker_interval_minutes: 5,
    enabled_endpoints: ['time_registration_shifts', 'planning_shifts', 'revenue_days'],
    quiet_hours_start: 22,
    quiet_hours_end: 6
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [configExists, setConfigExists] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/eitje/sync-config');
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to load config: ${response.statusText}`);
        } else {
          const text = await response.text();
          throw new Error(`API returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
        }
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got ${contentType || 'unknown'}: ${text.substring(0, 100)}`);
      }

      const result = await response.json();
      
      if (result.success) {
        if (result.data) {
          setConfig(result.data);
          setConfigExists(true);
          if (result.data.updated_at) {
            setLastSaved(new Date(result.data.updated_at));
          } else if (result.data.created_at) {
            setLastSaved(new Date(result.data.created_at));
          }
        } else {
          setConfigExists(false);
          setLastSaved(null);
        }
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: "Error",
        description: "Failed to load sync configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/eitje/sync-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('[EitjeCronjobConfig] HTTP error:', response.status, response.statusText);
        console.error('[EitjeCronjobConfig] Error response:', result);
        throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (result.success && result.data) {
        // Update config with saved data (includes timestamps)
        setConfig(result.data);
        setConfigExists(true);
        setLastSaved(new Date()); // Update to current time
        
        toast({
          title: "Success",
          description: `Sync ${config.mode === 'incremental' ? 'activated' : 'paused'} successfully`,
        });
        
        // Reload to get fresh data from server
        await loadConfig();
      } else {
        const errorMsg = result.error || 'Failed to save config';
        console.error('[EitjeCronjobConfig] Save failed:', result);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleMode = () => {
    setConfig(prev => ({
      ...prev,
      mode: prev.mode === 'incremental' ? 'manual' : 'incremental'
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cronjob Scheduling</CardTitle>
        <CardDescription>
          Configure automated Eitje data synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Status Toggle */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-3">
                <Badge variant={config.mode === 'incremental' ? 'default' : 'secondary'}>
                  {config.mode === 'incremental' ? 'Active (Incremental)' : 'Manual'}
                </Badge>
                <Button
                  variant={config.mode === 'incremental' ? 'destructive' : 'default'}
                  size="sm"
                  onClick={toggleMode}
                  disabled={saving}
                >
                  {config.mode === 'incremental' ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Incremental
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Incremental mode enables hourly cron jobs to sync yesterday's data
              </p>
            </div>

            {/* Incremental Interval */}
            <div className="space-y-2">
              <Label>Incremental Sync Interval (minutes)</Label>
              <Select
                value={config.incremental_interval_minutes.toString()}
                onValueChange={(value) => setConfig(prev => ({
                  ...prev,
                  incremental_interval_minutes: parseInt(value)
                }))}
                disabled={saving}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">Every Hour (60 min)</SelectItem>
                  <SelectItem value="120">Every 2 Hours (120 min)</SelectItem>
                  <SelectItem value="360">Every 6 Hours (360 min)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: Cron job runs hourly. This setting affects sync window size.
              </p>
            </div>

            {/* Enabled Endpoints */}
            <div className="space-y-2">
              <Label>Enabled Endpoints</Label>
              <div className="space-y-2">
                {['time_registration_shifts', 'planning_shifts', 'revenue_days'].map(endpoint => (
                  <div key={endpoint} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`endpoint-${endpoint}`}
                      checked={config.enabled_endpoints.includes(endpoint)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig(prev => ({
                            ...prev,
                            enabled_endpoints: [...prev.enabled_endpoints, endpoint]
                          }));
                        } else {
                          setConfig(prev => ({
                            ...prev,
                            enabled_endpoints: prev.enabled_endpoints.filter(e => e !== endpoint)
                          }));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor={`endpoint-${endpoint}`} className="font-normal">
                      {endpoint.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button onClick={saveConfig} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>
              
              {/* Last Saved Timestamp */}
              <div className="flex justify-end">
                {configExists && lastSaved ? (
                  <p className="text-xs text-muted-foreground">
                    Last saved: {lastSaved.toLocaleString(undefined, { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-500">
                    ⚠️ No configuration saved yet. Click "Save Configuration" to create one.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

