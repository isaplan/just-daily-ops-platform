"use client"

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  RefreshCw,
  Upload,
  Database,
  Settings
} from "lucide-react";
import { useFinanceData } from "@/hooks/useFinanceData";
import { useRevenueData } from "@/hooks/useRevenueData";
import { usePnLCalculations } from "@/hooks/usePnLCalculations";
import { useSalesData } from "@/hooks/useSalesData";

export default function FinancePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  // Mock location IDs - in real app, get from user context
  const locationIds = ["550e8400-e29b-41d4-a716-446655440001"];
  const startDate = "2024-01-01";
  const endDate = "2024-12-31";

  const { data: financeData, isLoading: financeLoading } = useFinanceData({
    locationIds,
    startDate,
    endDate,
  });

  const { data: revenueData, isLoading: revenueLoading } = useRevenueData({
    locationIds,
    startDate,
    endDate,
  });

  const { data: pnlData, isLoading: pnlLoading } = usePnLCalculations({
    locationIds,
    startDate,
    endDate,
  });

  const { data: salesData, isLoading: salesLoading } = useSalesData({
    locationIds,
    startDate,
    endDate,
  });

  const handleSync = async (syncType: 'daily' | 'range' | 'master') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bork-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: locationIds[0],
          dateRange: { start: startDate, end: endDate },
          syncType
        })
      });

      if (response.ok) {
        setLastSync(new Date().toISOString());
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate KPIs
  const totalRevenue = revenueData?.reduce((sum, item) => sum + item.revenue, 0) || 0;
  const totalProfit = pnlData?.reduce((sum, item) => sum + item.profit, 0) || 0;
  const totalTransactions = salesData?.length || 0;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-600">Comprehensive financial insights and data management</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            {lastSync && `Last sync: ${new Date(lastSync).toLocaleString()}`}
          </div>
          <Button 
            onClick={() => handleSync('range')} 
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+10% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{profitMargin.toFixed(1)}% margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalTransactions > 0 ? (totalRevenue / totalTransactions).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bork-api">Bork API</TabsTrigger>
          <TabsTrigger value="imports">Data Imports</TabsTrigger>
          <TabsTrigger value="pnl">P&L Analysis</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Revenue Chart Component
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  P&L Chart Component
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bork-api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bork API Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Button onClick={() => handleSync('daily')} disabled={isLoading}>
                    <Database className="w-4 h-4 mr-2" />
                    Daily Sync
                  </Button>
                  <Button onClick={() => handleSync('range')} disabled={isLoading}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Range Sync
                  </Button>
                  <Button onClick={() => handleSync('master')} disabled={isLoading}>
                    <Settings className="w-4 h-4 mr-2" />
                    Master Data Sync
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Sync your sales data from the Bork API. Choose between daily sync, 
                  range sync, or master data synchronization.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Imports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV/Excel File
                </Button>
                <p className="text-sm text-gray-600">
                  Upload sales data from CSV or Excel files. The system will automatically 
                  map columns and validate your data.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pnl" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                P&L Analysis Component
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500">
                Reports Component
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}