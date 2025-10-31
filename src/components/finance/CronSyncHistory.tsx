"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SyncHistoryItem {
  id: string;
  provider: 'bork' | 'eitje' | 'unknown';
  location: string;
  locationId?: string;
  syncType: string;
  status: string;
  success: boolean;
  recordsInserted: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
}

interface CronSyncHistoryProps {
  provider?: 'bork' | 'eitje';
  limit?: number;
}

export function CronSyncHistory({ provider = 'eitje', limit = 10 }: CronSyncHistoryProps) {
  const [history, setHistory] = useState<SyncHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
    // Refresh every 30 seconds
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, [provider, limit]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const url = `/api/cron/sync-history?provider=${provider}&limit=${limit}`;
      const response = await fetch(url);
      
      // Check if response is OK
      if (!response.ok) {
        // Try to get error message from response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch sync history: ${response.statusText}`);
        } else {
          // Response is HTML (error page) or other non-JSON
          const text = await response.text();
          throw new Error(`API returned non-JSON response (${response.status}): ${text.substring(0, 100)}`);
        }
      }

      // Check content-type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but got ${contentType || 'unknown'}: ${text.substring(0, 100)}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setHistory(result.data.history || []);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to load sync history');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[CronSyncHistory] Load error:', errorMessage, err);
      setError(errorMessage);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (ms: number | null): string => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sync History</CardTitle>
            <CardDescription>
              Recent automated sync attempts from cron jobs
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <XCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={loadHistory}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Retry
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No sync history found. Sync history will appear here after cron jobs run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {formatDate(item.startedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.success ? 'default' : 'destructive'}>
                        {item.success ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Success
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Failed
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.recordsInserted > 0 ? item.recordsInserted : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDuration(item.duration)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {item.errorMessage || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

