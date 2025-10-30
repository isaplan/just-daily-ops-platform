'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Database,
  Play,
  RotateCcw
} from 'lucide-react';

interface EndpointStatus {
  endpoint: string;
  displayName: string;
  status: 'not_synced' | 'synced' | 'processed' | 'error';
  recordsCount: number;
  lastSync?: string;
  error?: string;
}

interface MonthCardProps {
  year: number;
  month: number;
  monthName: string;
  onSyncAll: (year: number, month: number) => Promise<void>;
}

const ENDPOINTS: Array<{ key: string; displayName: string; isMasterData: boolean }> = [
  { key: 'environments', displayName: 'Environments', isMasterData: true },
  { key: 'teams', displayName: 'Teams', isMasterData: true },
  { key: 'users', displayName: 'Users', isMasterData: true },
  { key: 'shift_types', displayName: 'Shift Types', isMasterData: true },
  { key: 'time_registration_shifts', displayName: 'Time Shifts', isMasterData: false },
  { key: 'revenue_days', displayName: 'Revenue Days', isMasterData: false },
];

export function MonthCard({ year, month, monthName, onSyncAll }: MonthCardProps) {
  const [endpointStatuses, setEndpointStatuses] = useState<EndpointStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Load endpoint statuses for this month
  const loadEndpointStatuses = async () => {
    setLoading(true);
    try {
      const statuses: EndpointStatus[] = [];
      
      for (const endpoint of ENDPOINTS) {
        // Check if raw data exists for this endpoint and month
        const response = await fetch(`/api/eitje/endpoint-status?endpoint=${endpoint.key}&year=${year}&month=${month}`);
        const data = await response.json();
        
        if (data.success) {
          const hasRawData = data.data.rawDataCount > 0;
          const hasAggregatedData = data.data.aggregatedDataCount > 0;
          
          let status: EndpointStatus['status'] = 'not_synced';
          if (hasAggregatedData) {
            status = 'processed';
          } else if (hasRawData) {
            status = 'synced';
          }
          
          console.log(`[MonthCard] ${endpoint.key}: rawDataCount=${data.data.rawDataCount}, aggregatedDataCount=${data.data.aggregatedDataCount}, status=${status}`);
          
          statuses.push({
            endpoint: endpoint.key,
            displayName: endpoint.displayName,
            status,
            recordsCount: data.data.rawDataCount || 0,
            lastSync: data.data.lastSync,
            error: data.data.error
          });
        } else {
          statuses.push({
            endpoint: endpoint.key,
            displayName: endpoint.displayName,
            status: 'error',
            recordsCount: 0,
            error: data.error
          });
        }
      }
      
      console.log(`[MonthCard] Final statuses for ${year}-${month}:`, statuses);
      setEndpointStatuses(statuses);
      setRefreshKey(prev => prev + 1); // Force re-render
    } catch (error) {
      console.error(`Failed to load statuses for ${year}-${month}:`, error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEndpointStatuses();
  }, [year, month]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await onSyncAll(year, month);
      // Reload statuses after sync with a longer delay to ensure data is committed
      setTimeout(async () => {
        console.log(`[MonthCard] Refreshing statuses after sync for ${year}-${month}`);
        await loadEndpointStatuses();
      }, 2000);
    } catch (error) {
      console.error(`Sync all failed for ${year}-${month}:`, error);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'processed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'synced':
        return <Database className="h-4 w-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'processed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Done</Badge>;
      case 'synced':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Raw Data</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Not Synced</Badge>;
    }
  };

  // Check if all endpoints are processed
  const allProcessed = endpointStatuses.length > 0 && endpointStatuses.every(ep => ep.status === 'processed');
  const hasErrors = endpointStatuses.some(ep => ep.status === 'error');
  const hasData = endpointStatuses.some(ep => ep.recordsCount > 0);

  if (loading) {
    return (
      <Card className="w-full lg:w-6/12 md:w-6/12 sm:w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>{monthName} {year}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadEndpointStatuses}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Summary */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Processed: {endpointStatuses.filter(ep => ep.status === 'processed').length}/{endpointStatuses.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="h-4 w-4 text-blue-500" />
            <span>Total Records: {endpointStatuses.reduce((sum, ep) => sum + ep.recordsCount, 0)}</span>
          </div>
        </div>

        {/* Individual Endpoint Status */}
        <div className="space-y-2">
          {endpointStatuses.map((endpoint) => (
            <div key={endpoint.endpoint} className="flex items-center justify-between p-2 border rounded">
              <div className="flex items-center space-x-2">
                {getStatusIcon(endpoint.status)}
                <span className="text-sm font-medium">{endpoint.displayName}</span>
                <span className="text-xs text-gray-500">({endpoint.recordsCount} records)</span>
              </div>
              {getStatusBadge(endpoint.status)}
            </div>
          ))}
        </div>

        {/* Single Sync Button */}
        <div className="pt-2">
          <Button
            onClick={handleSyncAll}
            disabled={syncing || allProcessed}
            className="w-full"
            variant={hasErrors ? "destructive" : allProcessed ? "outline" : "default"}
          >
            {syncing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Syncing All Endpoints...
              </>
            ) : allProcessed ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                All Done
              </>
            ) : hasErrors ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                Retry Sync All
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Sync All Endpoints
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
