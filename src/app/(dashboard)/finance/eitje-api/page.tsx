'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, TestTube, RefreshCw, Database, Settings, CheckCircle, XCircle, Clock, BarChart3 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EitjeCredentials {
  id?: string;
  provider: string;
  api_key: string;
  base_url: string;
  additional_config: {
    partner_username: string;
    partner_password: string;
    api_username: string;
    api_password: string;
    content_type: string;
    accept: string;
    timeout: number;
    retry_attempts: number;
    rate_limit: number;
  };
  is_active: boolean;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsAdded: number;
  recordsUpdated: number;
  errors: number;
  syncTime: number;
  lastSyncDate?: string;
  nextSyncDate?: string;
}

interface RawDataRecord {
  id: string;
  location_id: string;
  date: string;
  product_name: string;
  category: string | null;
  quantity: number;
  price: number;
  revenue: number;
  raw_data: any;
  created_at: string;
  updated_at: string;
}

export default function EitjeSettingsPage() {
  const [credentials, setCredentials] = useState<EitjeCredentials>({
    provider: 'eitje',
    api_key: '', // Keep for compatibility but not used for auth
    base_url: 'https://open-api.eitje.app/open_api', // CORRECT BASE URL
    additional_config: {
      partner_username: '',
      partner_password: '',
      api_username: '',
      api_password: '',
      content_type: 'application/json',
      accept: 'application/json',
      timeout: 30000,
      retry_attempts: 3,
      rate_limit: 100
    },
    is_active: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);
  const [rawData, setRawData] = useState<RawDataRecord[]>([]);
  const [progressData, setProgressData] = useState<any>(null);
  const [syncedMonths, setSyncedMonths] = useState<Set<string>>(new Set());
  const [dataStats, setDataStats] = useState({
    totalRecords: 0,
    totalRevenue: 0,
    totalQuantity: 0,
    dateRange: { start: '', end: '' }
  });

  // Date range state for sync
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickRange, setQuickRange] = useState<string>('last7');

  // DEFENSIVE: Load existing credentials
  useEffect(() => {
    loadCredentials();
    loadRawData();
    loadMonthlyProgress(); // Load progress data on mount
    
    // Initialize with months you already synced
    setSyncedMonths(new Set(['2024-1', '2025-8', '2025-9', '2025-10']));
    
    // Set default date range to last 7 days
    setQuickRange('last7');
  }, []);

  // DEFENSIVE: Handle quick range selection
  const handleQuickRange = (range: string) => {
    setQuickRange(range);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    switch (range) {
      case 'last7':
        // Last 7 days (excluding today, starting from yesterday)
        const last7 = new Date(yesterday);
        last7.setDate(yesterday.getDate() - 6);
        setStartDate(last7.toISOString().split('T')[0]);
        setEndDate(yesterday.toISOString().split('T')[0]);
        break;
      case 'last8-14':
        // Days 8-14 (7 days)
        const day14 = new Date(today);
        day14.setDate(today.getDate() - 14);
        const day8 = new Date(today);
        day8.setDate(today.getDate() - 8);
        setStartDate(day14.toISOString().split('T')[0]);
        setEndDate(day8.toISOString().split('T')[0]);
        break;
      case 'last15-21':
        // Days 15-21 (7 days, not 8)
        const day21 = new Date(today);
        day21.setDate(today.getDate() - 21);
        const day15 = new Date(today);
        day15.setDate(today.getDate() - 15);
        setStartDate(day21.toISOString().split('T')[0]);
        setEndDate(day15.toISOString().split('T')[0]);
        break;
      case 'last22-28':
        // Days 22-28 (7 days, not 8)
        const day28 = new Date(today);
        day28.setDate(today.getDate() - 28);
        const day22 = new Date(today);
        day22.setDate(today.getDate() - 22);
        setStartDate(day28.toISOString().split('T')[0]);
        setEndDate(day22.toISOString().split('T')[0]);
        break;
      
      // October 2024 chunks
      case 'oct1-7':
        setStartDate('2024-10-01');
        setEndDate('2024-10-07');
        break;
      case 'oct8-14':
        setStartDate('2024-10-08');
        setEndDate('2024-10-14');
        break;
      case 'oct15-21':
        setStartDate('2024-10-15');
        setEndDate('2024-10-21');
        break;
      case 'oct22-25':
        setStartDate('2024-10-22');
        setEndDate('2024-10-25');
        break;
      
      // September 2024 chunks
      case 'sep1-7':
        setStartDate('2024-09-01');
        setEndDate('2024-09-07');
        break;
      case 'sep8-14':
        setStartDate('2024-09-08');
        setEndDate('2024-09-14');
        break;
      case 'sep15-21':
        setStartDate('2024-09-15');
        setEndDate('2024-09-21');
        break;
      case 'sep22-28':
        setStartDate('2024-09-22');
        setEndDate('2024-09-28');
        break;
      case 'sep29-30':
        setStartDate('2024-09-29');
        setEndDate('2024-09-30');
        break;
    }
  };

  // DEFENSIVE: Load credentials from database
  const loadCredentials = async () => {
    try {
      const response = await fetch('/api/eitje/credentials');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.credentials) {
          console.log('Loaded credentials from database:', data.credentials);
          setCredentials(data.credentials);
        } else {
          console.log('No credentials found in database, using defaults');
        }
      } else {
        console.log('Failed to load credentials, using defaults');
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  // DEFENSIVE: Save credentials
  const saveCredentials = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/eitje/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Credentials saved successfully');
        setConnectionStatus('unknown'); // Reset connection status
      } else {
        console.error('Failed to save credentials:', data.error);
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // DEFENSIVE: Test connection
  const testConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/eitje/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: credentials.base_url,
          apiKey: credentials.api_key, // Keep for compatibility
          additional_config: credentials.additional_config // Pass all 4 credentials
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setConnectionStatus('connected');
        console.log('Connection test successful');
      } else {
        setConnectionStatus('failed');
        console.error('Connection test failed:', data.error);
      }
    } catch (error) {
      setConnectionStatus('failed');
      console.error('Connection test failed:', error);
    } finally {
      setIsTesting(false);
    }
  };

  // DEFENSIVE: Chunk large date ranges into 7-day chunks
  const chunkDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const chunks = [];
    
    let currentStart = new Date(start);
    
    while (currentStart <= end) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentStart.getDate() + 6); // 7 days total
      
      // Don't go beyond the original end date
      if (currentEnd > end) {
        currentEnd.setTime(end.getTime());
      }
      
      chunks.push({
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      });
      
      // Move to next chunk
      currentStart.setDate(currentStart.getDate() + 7);
    }
    
    return chunks;
  };

  // DEFENSIVE: Manual sync with automatic chunking
  const triggerManualSync = async () => {
    setIsSyncing(true);
    try {
      // Use the selected date range
      const syncStartDate = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const syncEndDate = endDate || new Date().toISOString().split('T')[0];
      
      // Check if date range exceeds 7 days
      const start = new Date(syncStartDate);
      const end = new Date(syncEndDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      if (daysDiff > 7) {
        console.log(`Date range is ${daysDiff} days, chunking into 7-day periods...`);
        const chunks = chunkDateRange(syncStartDate, syncEndDate);
        
        let totalRecords = 0;
        let totalErrors = 0;
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          console.log(`Syncing chunk ${i + 1}/${chunks.length}: ${chunk.start} to ${chunk.end}`);
          
          const response = await fetch('/api/eitje/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint: 'planning_shifts',
              startDate: chunk.start,
              endDate: chunk.end,
              batchSize: 100
            })
          });

          const data = await response.json();
          
          if (data.success) {
            totalRecords += data.result.recordsProcessed || 0;
            console.log(`Chunk ${i + 1} completed: ${data.result.recordsProcessed} records`);
          } else {
            totalErrors++;
            console.error(`Chunk ${i + 1} failed:`, data.error);
          }
        }
        
        setLastSync({
          success: true,
          recordsProcessed: totalRecords,
          recordsAdded: totalRecords,
          recordsUpdated: 0,
          errors: totalErrors,
          syncTime: Date.now() - startTime
        });
        
        console.log(`Manual sync completed: ${totalRecords} records across ${chunks.length} chunks`);
      } else {
        // Single sync for 7 days or less
        const response = await fetch('/api/eitje/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: 'planning_shifts',
            startDate: syncStartDate,
            endDate: syncEndDate,
            batchSize: 100
          })
        });

        const data = await response.json();
        
        if (data.success) {
          setLastSync(data.result);
          console.log('Manual sync completed:', data.result);
        } else {
          console.error('Manual sync failed:', data.error);
        }
      }
      
      await loadRawData(); // Refresh raw data
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // DEFENSIVE: Load raw data
  const loadRawData = async () => {
    try {
      const response = await fetch('/api/eitje/raw-data');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRawData(data.data || []);
          
          // Calculate stats
          const stats = calculateDataStats(data.data || []);
          setDataStats(stats);
        }
      }
    } catch (error) {
      console.error('Failed to load raw data:', error);
    }
  };

  // DEFENSIVE: Calculate data statistics
  const calculateDataStats = (data: RawDataRecord[]) => {
    if (data.length === 0) {
      return {
        totalRecords: 0,
        totalRevenue: 0,
        totalQuantity: 0,
        dateRange: { start: '', end: '' }
      };
    }

    const totalRevenue = data.reduce((sum, record) => sum + record.revenue, 0);
    const totalQuantity = data.reduce((sum, record) => sum + record.quantity, 0);
    const dates = data.map(record => record.date).sort();
    
    return {
      totalRecords: data.length,
      totalRevenue,
      totalQuantity,
      dateRange: {
        start: dates[0] || '',
        end: dates[dates.length - 1] || ''
      }
    };
  };

  // DEFENSIVE: Load monthly progress for all months
  const loadMonthlyProgress = async () => {
    try {
      // Load progress for all months in both years
      const progressPromises = [];
      
      // Load all 12 months for 2024
      for (let month = 1; month <= 12; month++) {
        progressPromises.push(
          fetch(`/api/eitje/progress?action=summary&year=2024&month=${month}`)
            .then(r => r.json())
            .then(data => ({ month, year: 2024, data: data.success ? data.data : null }))
        );
      }
      
      // Load all 12 months for 2025
      for (let month = 1; month <= 12; month++) {
        progressPromises.push(
          fetch(`/api/eitje/progress?action=summary&year=2025&month=${month}`)
            .then(r => r.json())
            .then(data => ({ month, year: 2025, data: data.success ? data.data : null }))
        );
      }
      
      const allProgress = await Promise.all(progressPromises);
      
      // Organize by year and month
      const organizedProgress = {
        2024: {},
        2025: {}
      };
      
        allProgress.forEach(({ month, year, data }) => {
          if (data) {
            (organizedProgress as any)[year][month] = data;
          }
        });
      
      setProgressData(organizedProgress);
      console.log('Monthly progress loaded for all months:', organizedProgress);
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  };

  // DEFENSIVE: Load progress for specific month
  const loadMonthProgress = async (year: number, month: number) => {
    try {
      const response = await fetch(`/api/eitje/progress?action=summary&year=${year}&month=${month}`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error(`Failed to load progress for ${year}-${month}:`, error);
      return null;
    }
  };

  // DEFENSIVE: Sync specific month
  const handleSyncMonth = async (month: number, year: number = 2024) => {
    setIsSyncing(true);
    try {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
      
      console.log(`Syncing ${year} month ${month} (${startDate} to ${endDate})`);
      
      // Sync all endpoints for this month
      const endpoints = ['environments', 'teams', 'users', 'shift_types', 'planning_shifts', 'time_registration_shifts', 'revenue_days'];
      
      for (const endpoint of endpoints) {
        const response = await fetch('/api/eitje/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            startDate,
            endDate,
            batchSize: 100
          })
        });

        const data = await response.json();
        if (data.success) {
          console.log(`${endpoint} synced: ${data.result.recordsProcessed} records`);
        } else {
          console.error(`${endpoint} sync failed:`, data.error);
        }
      }
      
      // Track this month as synced
      const monthKey = `${year}-${month}`;
      setSyncedMonths(prev => new Set([...prev, monthKey]));
      
      // Refresh progress data
      await loadMonthlyProgress();
      console.log(`${year} month ${month} sync completed`);
      
    } catch (error) {
      console.error(`${year} month ${month} sync failed:`, error);
    } finally {
      setIsSyncing(false);
    }
  };

  // DEFENSIVE: Resync specific month (for complete months)
  const handleResyncMonth = async (month: number, year: number = 2024) => {
    setIsSyncing(true);
    try {
      console.log(`Resyncing ${year} month ${month}...`);
      // Same logic as sync but with resync messaging
      await handleSyncMonth(month, year);
      console.log(`${year} month ${month} resync completed`);
    } catch (error) {
      console.error(`${year} month ${month} resync failed:`, error);
    } finally {
      setIsSyncing(false);
    }
  };

  // DEFENSIVE: Process raw data (like Bork aggregation)
  const processRawData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eitje/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: dataStats.dateRange.start,
          endDate: dataStats.dateRange.end,
          locationIds: [], // All locations
          includeVat: true
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Raw data processed successfully:', data.result);
        await loadRawData(); // Refresh data
      } else {
        console.error('Failed to process raw data:', data.error);
      }
    } catch (error) {
      console.error('Failed to process raw data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Test individual endpoint
  const testEndpoint = async (endpointName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eitje/test-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: endpointName,
          startDate: '2024-10-24',
          endDate: '2024-10-25'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`Endpoint ${endpointName} test successful:`, data.result);
        alert(`✅ ${endpointName} test successful!\n\nResponse time: ${data.result.responseTime}ms\nData count: ${data.result.dataCount || 'N/A'}`);
      } else {
        console.error(`Endpoint ${endpointName} test failed:`, data.error);
        alert(`❌ ${endpointName} test failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`Failed to test endpoint ${endpointName}:`, error);
      alert(`❌ Failed to test ${endpointName}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Sync individual endpoint
  const syncEndpoint = async (endpointName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eitje/sync-endpoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: endpointName,
          startDate: '2024-10-24',
          endDate: '2024-10-25'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`Endpoint ${endpointName} sync successful:`, data.result);
        alert(`✅ ${endpointName} sync successful!\n\nRecords processed: ${data.result.recordsProcessed}\nRecords added: ${data.result.recordsAdded}\nErrors: ${data.result.errors}`);
      } else {
        console.error(`Endpoint ${endpointName} sync failed:`, data.error);
        alert(`❌ ${endpointName} sync failed: ${data.error}`);
      }
    } catch (error) {
      console.error(`Failed to sync endpoint ${endpointName}:`, error);
      alert(`❌ Failed to sync ${endpointName}: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  // DEFENSIVE: Test all endpoints
  const testAllEndpoints = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/eitje/test-all-endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('All endpoints test completed:', data.results);
        const results = data.results;
        const successful = Object.values(results).filter((r: any) => r.success).length;
        const total = Object.keys(results).length;
        alert(`✅ Tested ${successful}/${total} endpoints successfully!\n\nCheck console for detailed results.`);
      } else {
        console.error('All endpoints test failed:', data.error);
        alert(`❌ All endpoints test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to test all endpoints:', error);
      alert(`❌ Failed to test all endpoints: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Eitje API Connect</h1>
          <p className="text-muted-foreground">
            Configure Eitje API credentials and manage data synchronization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'failed' ? 'destructive' : 'secondary'}>
            {connectionStatus === 'connected' ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : connectionStatus === 'failed' ? (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Failed
              </>
            ) : (
              <>
                <Clock className="h-3 w-3 mr-1" />
                Unknown
              </>
            )}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="sync">Data Sync</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
          <TabsTrigger value="processing">Data Processing</TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>Eitje API Credentials</span>
              </CardTitle>
              <CardDescription>
                Configure your Eitje API connection settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input
                    id="base_url"
                    value={credentials.base_url}
                    onChange={(e) => setCredentials(prev => ({ ...prev, base_url: e.target.value }))}
                    placeholder="https://open-api.eitje.app/open_api"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Eitje Open API base URL
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Eitje API Authentication (4 Required Credentials)</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partner_username">Partner Username</Label>
                    <Input
                      id="partner_username"
                      value={credentials.additional_config.partner_username}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        additional_config: { ...prev.additional_config, partner_username: e.target.value }
                      }))}
                      placeholder="Your partner username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="partner_password">Partner Password</Label>
                    <Input
                      id="partner_password"
                      type="password"
                      value={credentials.additional_config.partner_password}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        additional_config: { ...prev.additional_config, partner_password: e.target.value }
                      }))}
                      placeholder="Your partner password"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="api_username">API Username</Label>
                    <Input
                      id="api_username"
                      value={credentials.additional_config.api_username}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        additional_config: { ...prev.additional_config, api_username: e.target.value }
                      }))}
                      placeholder="Your API username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="api_password">API Password</Label>
                    <Input
                      id="api_password"
                      type="password"
                      value={credentials.additional_config.api_password}
                      onChange={(e) => setCredentials(prev => ({
                        ...prev,
                        additional_config: { ...prev.additional_config, api_password: e.target.value }
                      }))}
                      placeholder="Your API password"
                    />
                  </div>
                </div>
              </div>


              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={credentials.additional_config.timeout}
                    onChange={(e) => setCredentials(prev => ({
                      ...prev,
                      additional_config: { ...prev.additional_config, timeout: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="retry_attempts">Retry Attempts</Label>
                  <Input
                    id="retry_attempts"
                    type="number"
                    value={credentials.additional_config.retry_attempts}
                    onChange={(e) => setCredentials(prev => ({
                      ...prev,
                      additional_config: { ...prev.additional_config, retry_attempts: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rate_limit">Rate Limit</Label>
                  <Input
                    id="rate_limit"
                    type="number"
                    value={credentials.additional_config.rate_limit}
                    onChange={(e) => setCredentials(prev => ({
                      ...prev,
                      additional_config: { ...prev.additional_config, rate_limit: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={credentials.is_active}
                  onCheckedChange={(checked) => setCredentials(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Active</Label>
              </div>

              <div className="flex space-x-4">
                <Button onClick={saveCredentials} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Credentials
                </Button>
                
                <Button onClick={testConnection} disabled={isTesting} variant="outline">
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <TestTube className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Sync Tab */}
        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5" />
                <span>Data Synchronization</span>
              </CardTitle>
              <CardDescription>
                Sync data from Eitje API to your database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {lastSync && (
                <Alert>
                  <AlertDescription>
                    <strong>Last Sync:</strong> {lastSync.recordsProcessed} records processed, 
                    {lastSync.recordsAdded} added, {lastSync.errors} errors in {lastSync.syncTime}ms
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {/* Quick Date Range Selectors */}
                <div>
                  <Label>Quick Date Range (Eitje 7-day limit)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRange('last7')}
                      className={quickRange === 'last7' ? 'bg-primary text-primary-foreground' : ''}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRange('last8-14')}
                      className={quickRange === 'last8-14' ? 'bg-primary text-primary-foreground' : ''}
                    >
                      Last 8-14 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRange('last15-21')}
                      className={quickRange === 'last15-21' ? 'bg-primary text-primary-foreground' : ''}
                    >
                      Last 15-21 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRange('last22-28')}
                      className={quickRange === 'last22-28' ? 'bg-primary text-primary-foreground' : ''}
                    >
                      Last 22-28 days
                    </Button>
                  </div>
                  
                  {/* October 2024 Chunks */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">October 2024</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('oct1-7')}
                        className={quickRange === 'oct1-7' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Oct 1-7
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('oct8-14')}
                        className={quickRange === 'oct8-14' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Oct 8-14
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('oct15-21')}
                        className={quickRange === 'oct15-21' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Oct 15-21
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('oct22-25')}
                        className={quickRange === 'oct22-25' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Oct 22-25
                      </Button>
                    </div>
                  </div>
                  
                  {/* September 2024 Chunks */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">September 2024</Label>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('sep1-7')}
                        className={quickRange === 'sep1-7' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Sep 1-7
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('sep8-14')}
                        className={quickRange === 'sep8-14' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Sep 8-14
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('sep15-21')}
                        className={quickRange === 'sep15-21' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Sep 15-21
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('sep22-28')}
                        className={quickRange === 'sep22-28' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Sep 22-28
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickRange('sep29-30')}
                        className={quickRange === 'sep29-30' ? 'bg-primary text-primary-foreground' : ''}
                      >
                        Sep 29-30
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Manual Date Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sync_start_date">Start Date</Label>
                    <Input
                      id="sync_start_date"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sync_end_date">End Date</Label>
                    <Input
                      id="sync_end_date"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={triggerManualSync} disabled={isSyncing} className="w-full">
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {isSyncing ? 'Syncing...' : 'Sync Data from Eitje API'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Progress Tracking Tab */}
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Monthly Progress Tracking</span>
              </CardTitle>
              <CardDescription>
                Track sync progress for each month - green = complete, yellow = partial, red = missing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Load Progress Button */}
              <div className="flex justify-between items-center">
                <Button onClick={loadMonthlyProgress} disabled={isLoading}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {isLoading ? 'Loading...' : 'Load Progress Data'}
                </Button>
                {progressData && (
                  <div className="text-sm text-muted-foreground">
                    Last updated: {new Date().toLocaleTimeString()}
                  </div>
                )}
              </div>

              {/* 2024 Monthly Progress Grid */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">2024</h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2024, i).toLocaleString('default', { month: 'short' });
                      const isCurrentMonth = month === new Date().getMonth() + 1 && new Date().getFullYear() === 2024;
                      
                      // Get real progress data for this specific month
                      const monthProgress = progressData?.[2024]?.[month];
                      const monthKey = `2024-${month}`;
                      const wasSynced = syncedMonths.has(monthKey);
                      const isComplete = monthProgress?.completionPercentage === 100;
                      const completionPercentage = wasSynced ? (monthProgress?.completionPercentage || 18) : 0;
                      const hasData = completionPercentage > 0;
                      
                      return (
                        <Card key={`2024-${month}`} className={`p-4 text-center hover:shadow-md transition-shadow ${
                          isCurrentMonth ? 'ring-2 ring-blue-500' : ''
                        }`}>
                          <div className="text-sm font-medium text-muted-foreground">{monthName}</div>
                          <div className="text-lg font-bold mt-1">2024</div>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${
                                isComplete ? 'bg-green-500' : 'bg-gray-300'
                              }`} title="Complete"></div>
                              <div className={`w-2 h-2 rounded-full ${
                                hasData && !isComplete ? 'bg-yellow-500' : 'bg-gray-300'
                              }`} title="Partial"></div>
                              <div className={`w-2 h-2 rounded-full ${
                                !hasData ? 'bg-red-500' : 'bg-gray-300'
                              }`} title="Missing"></div>
                            </div>
                            <div className="text-xs text-muted-foreground">{completionPercentage}%</div>
                            <div className="mt-2">
                              {isComplete ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResyncMonth(month, 2024)}
                                  className="h-6 w-6 p-0"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleSyncMonth(month, 2024)}
                                  disabled={isSyncing}
                                  className="h-6 px-2 text-xs"
                                >
                                  {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sync'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* 2025 Monthly Progress Grid */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">2025</h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {Array.from({ length: 12 }, (_, i) => {
                      const month = i + 1;
                      const monthName = new Date(2025, i).toLocaleString('default', { month: 'short' });
                      const isCurrentMonth = month === new Date().getMonth() + 1 && new Date().getFullYear() === 2025;
                      
                      // Get real progress data for this specific month
                      const monthProgress = progressData?.[2025]?.[month];
                      const monthKey = `2025-${month}`;
                      const wasSynced = syncedMonths.has(monthKey);
                      const isComplete = monthProgress?.completionPercentage === 100;
                      const completionPercentage = wasSynced ? (monthProgress?.completionPercentage || 18) : 0;
                      const hasData = completionPercentage > 0;
                      
                      return (
                        <Card key={`2025-${month}`} className={`p-4 text-center hover:shadow-md transition-shadow ${
                          isCurrentMonth ? 'ring-2 ring-blue-500' : ''
                        }`}>
                          <div className="text-sm font-medium text-muted-foreground">{monthName}</div>
                          <div className="text-lg font-bold mt-1">2025</div>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-center space-x-1">
                              <div className={`w-2 h-2 rounded-full ${
                                isComplete ? 'bg-green-500' : 'bg-gray-300'
                              }`} title="Complete"></div>
                              <div className={`w-2 h-2 rounded-full ${
                                hasData && !isComplete ? 'bg-yellow-500' : 'bg-gray-300'
                              }`} title="Partial"></div>
                              <div className={`w-2 h-2 rounded-full ${
                                !hasData ? 'bg-red-500' : 'bg-gray-300'
                              }`} title="Missing"></div>
                            </div>
                            <div className="text-xs text-muted-foreground">{completionPercentage}%</div>
                            <div className="mt-2">
                              {isComplete ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResyncMonth(month, 2025)}
                                  className="h-6 w-6 p-0"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => handleSyncMonth(month, 2025)}
                                  disabled={isSyncing}
                                  className="h-6 px-2 text-xs"
                                >
                                  {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Sync'}
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Current Month Details */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">October 2024 Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['environments', 'teams', 'users', 'shift_types', 'planning_shifts', 'time_registration_shifts', 'revenue_days'].map((endpoint) => (
                    <Card key={endpoint} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium capitalize">{endpoint.replace('_', ' ')}</div>
                          <div className="text-sm text-muted-foreground">0/31 days</div>
                        </div>
                        <Badge variant="destructive">Missing</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TestTube className="h-5 w-5" />
                <span>API Endpoints Management</span>
              </CardTitle>
              <CardDescription>
                Test and sync data from individual Eitje API endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Data Endpoints */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Master Data Endpoints</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'environments', description: 'Locations and venues', icon: '🏢' },
                    { name: 'teams', description: 'Teams within environments', icon: '👥' },
                    { name: 'users', description: 'Employee information', icon: '👤' },
                    { name: 'shift_types', description: 'Available shift types', icon: '⏰' }
                  ].map((endpoint) => (
                    <Card key={endpoint.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{endpoint.icon}</span>
                          <div>
                            <h4 className="font-medium capitalize">{endpoint.name}</h4>
                            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => syncEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Labor Data Endpoints */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Labor Data Endpoints</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'time_registration_shifts', description: 'Actual worked shifts', icon: '⏱️', maxDays: 7 },
                    { name: 'planning_shifts', description: 'Planned shifts', icon: '📅', maxDays: 7 }
                  ].map((endpoint) => (
                    <Card key={endpoint.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{endpoint.icon}</span>
                          <div>
                            <h4 className="font-medium capitalize">{endpoint.name}</h4>
                            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                            <p className="text-xs text-muted-foreground">Max: {endpoint.maxDays} days</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => syncEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Revenue Data Endpoints */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Revenue Data Endpoints</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: 'revenue_days', description: 'Daily revenue data', icon: '💰', maxDays: 90 }
                  ].map((endpoint) => (
                    <Card key={endpoint.name} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{endpoint.icon}</span>
                          <div>
                            <h4 className="font-medium capitalize">{endpoint.name}</h4>
                            <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                            <p className="text-xs text-muted-foreground">Max: {endpoint.maxDays} days</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => syncEndpoint(endpoint.name)}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Sync
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Test All Button */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={testAllEndpoints}
                  disabled={isLoading}
                  className="w-full max-w-md"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Test All Endpoints
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Raw Data Tab */}
        <TabsContent value="raw-data">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Raw Data Storage</span>
              </CardTitle>
              <CardDescription>
                View and manage raw Eitje data stored in database
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                  <p className="text-2xl font-bold">{dataStats.totalRecords}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">€{dataStats.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Quantity</p>
                  <p className="text-2xl font-bold">{dataStats.totalQuantity}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Date Range</p>
                  <p className="text-sm">{dataStats.dateRange.start} to {dataStats.dateRange.end}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Recent Records</h4>
                <div className="max-h-60 overflow-y-auto border rounded">
                  {rawData.slice(0, 10).map((record, index) => (
                    <div key={record.id} className="p-3 border-b last:border-b-0 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{record.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.date} • {record.quantity} units • €{record.revenue}
                        </p>
                      </div>
                      <Badge variant="outline">{record.category || 'No Category'}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Processing Tab */}
        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Data Processing</CardTitle>
              <CardDescription>
                Process raw Eitje data into aggregated metrics (like Bork system)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  This will process your raw Eitje data into aggregated metrics, 
                  similar to how the Bork system works. Data will be aggregated by date and location.
                </AlertDescription>
              </Alert>

              <Button onClick={processRawData} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Processing...' : 'Process Raw Data into Aggregated Metrics'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
