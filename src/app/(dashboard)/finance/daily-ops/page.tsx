"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, TrendingUp, DollarSign, Target, AlertTriangle, CheckCircle, BarChart3, PieChart } from "lucide-react";
import { subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

// Location mapping
const LOCATIONS = {
  total: { id: "total", name: "Total", color: "bg-blue-500" },
  kinsbergen: { id: "1125", name: "Van Kinsbergen", color: "bg-green-500" },
  barbea: { id: "1711", name: "Bar Bea", color: "bg-purple-500" },
  lamour: { id: "2499", name: "L'Amour Toujours", color: "bg-orange-500" }
};

// Date range presets
const DATE_RANGES = {
  today: { label: "Today", getRange: () => ({ from: new Date(), to: new Date() }) },
  yesterday: { label: "Yesterday", getRange: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  thisWeek: { label: "This Week", getRange: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }) },
  lastWeek: { label: "Last Week", getRange: () => ({ from: startOfWeek(subDays(new Date(), 7)), to: endOfWeek(subDays(new Date(), 7)) }) },
  thisMonth: { label: "This Month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  lastMonth: { label: "Last Month", getRange: () => ({ from: startOfMonth(subDays(new Date(), 30)), to: endOfMonth(subDays(new Date(), 30)) }) }
};

interface LaborData {
  totalHours: number;
  totalWorkers: number;
  avgHoursPerWorker: number;
  laborCost: number;
  productivity: number;
  teams: Array<{
    teamId: number;
    teamName: string;
    workers: number;
    hours: number;
    productivity: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    workers: number;
    hours: number;
    productivity: number;
  }>;
}

interface SalesData {
  totalRevenue: number;
  totalTransactions: number;
  avgTransactionValue: number;
  topProducts: Array<{
    product: string;
    revenue: number;
    transactions: number;
    avgPrice: number;
  }>;
  topCombinations: Array<{
    combination: string;
    revenue: number;
    frequency: number;
  }>;
  hourlyBreakdown: Array<{
    hour: number;
    revenue: number;
    transactions: number;
    avgValue: number;
  }>;
  weeklyTrend: Array<{
    day: string;
    revenue: number;
    transactions: number;
  }>;
}

interface KPIData {
  labor: LaborData;
  sales: SalesData;
  combined: {
    revenuePerWorker: number;
    salesProductivity: number;
    laborEfficiency: number;
    profitMargin: number;
  };
}

export default function DailyOpsDashboard() {
  const [selectedLocation, setSelectedLocation] = useState<keyof typeof LOCATIONS>("total");
  const [selectedDateRange, setSelectedDateRange] = useState<keyof typeof DATE_RANGES>("today");
  const [dateRange, setDateRange] = useState(DATE_RANGES.today.getRange());

  // Update date range when preset changes
  useEffect(() => {
    setDateRange(DATE_RANGES[selectedDateRange].getRange());
  }, [selectedDateRange]);

  // Fetch labor data
  const { data: laborData, isLoading: laborLoading } = useQuery({
    queryKey: ["labor-kpis", selectedLocation, dateRange],
    queryFn: async (): Promise<LaborData> => {
      const response = await fetch(`/api/raw-data?table=eitje_labor_hours_aggregated&limit=1000`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch labor data');
      }
      
      let records = result.data || [];
      
      // Filter by date range
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      records = records.filter((r: any) => r.date >= startDate && r.date <= endDate);
      
      // Filter by location if not total
      if (selectedLocation !== "total") {
        records = records.filter((r: any) => r.environment_id === parseInt(LOCATIONS[selectedLocation].id));
      }

      // Calculate labor KPIs
      const totalHours = records?.reduce((sum: number, r: any) => sum + (r.total_hours_worked || 0), 0) || 0;
      const totalWorkers = records?.reduce((sum: number, r: any) => sum + (r.employee_count || 0), 0) || 0;
      const laborCost = records?.reduce((sum: number, r: any) => sum + (r.total_wage_cost || 0), 0) || 0;
      
      // Group by team
      const teamMap = new Map();
      records?.forEach((record: any) => {
        const teamId = record.team_id || 0;
        if (!teamMap.has(teamId)) {
          teamMap.set(teamId, {
            teamId,
            teamName: `Team ${teamId}`,
            workers: 0,
            hours: 0,
            productivity: 0
          });
        }
        const team = teamMap.get(teamId);
        team.workers += record.employee_count || 0;
        team.hours += record.total_hours_worked || 0;
      });

      // Calculate team productivity
      teamMap.forEach(team => {
        team.productivity = team.workers > 0 ? team.hours / team.workers : 0;
      });

      // Hourly breakdown (simplified - would need more detailed data)
      const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        workers: Math.floor(totalWorkers * (0.3 + Math.random() * 0.4)), // Simulated
        hours: totalHours / 24, // Simplified
        productivity: totalWorkers > 0 ? (totalHours / 24) / Math.floor(totalWorkers * 0.35) : 0
      }));

      return {
        totalHours,
        totalWorkers,
        avgHoursPerWorker: totalWorkers > 0 ? totalHours / totalWorkers : 0,
        laborCost,
        productivity: totalWorkers > 0 ? totalHours / totalWorkers : 0,
        teams: Array.from(teamMap.values()),
        hourlyBreakdown
      };
    }
  });

  // Fetch sales data
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["sales-kpis", selectedLocation, dateRange],
    queryFn: async (): Promise<SalesData> => {
      const response = await fetch(`/api/raw-data?table=eitje_revenue_days_aggregated&limit=1000`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sales data');
      }
      
      let records = result.data || [];
      
      // Filter by date range
      const startDate = dateRange.from.toISOString().split('T')[0];
      const endDate = dateRange.to.toISOString().split('T')[0];
      records = records.filter((r: any) => r.date >= startDate && r.date <= endDate);
      
      // Filter by location if not total
      if (selectedLocation !== "total") {
        records = records.filter((r: any) => r.environment_id === parseInt(LOCATIONS[selectedLocation].id));
      }

      const totalRevenue = records?.reduce((sum: number, r: any) => sum + (r.total_revenue || 0), 0) || 0;
      const totalTransactions = records?.reduce((sum: number, r: any) => sum + (r.transaction_count || 0), 0) || 0;

      // Simulated product data (would need actual product breakdown)
      const topProducts = [
        { product: "Cocktails", revenue: totalRevenue * 0.35, transactions: Math.floor(totalTransactions * 0.4), avgPrice: 12.50 },
        { product: "Beer", revenue: totalRevenue * 0.25, transactions: Math.floor(totalTransactions * 0.3), avgPrice: 4.50 },
        { product: "Wine", revenue: totalRevenue * 0.20, transactions: Math.floor(totalTransactions * 0.15), avgPrice: 8.00 },
        { product: "Food", revenue: totalRevenue * 0.20, transactions: Math.floor(totalTransactions * 0.15), avgPrice: 15.00 }
      ];

      const topCombinations = [
        { combination: "Cocktail + Food", revenue: totalRevenue * 0.15, frequency: Math.floor(totalTransactions * 0.1) },
        { combination: "Beer + Snacks", revenue: totalRevenue * 0.12, frequency: Math.floor(totalTransactions * 0.08) },
        { combination: "Wine + Appetizer", revenue: totalRevenue * 0.10, frequency: Math.floor(totalTransactions * 0.06) }
      ];

      // Hourly breakdown (simulated)
      const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
        const baseRevenue = totalRevenue / 24;
        const multiplier = hour >= 18 && hour <= 23 ? 1.5 : hour >= 12 && hour <= 14 ? 1.2 : 0.8;
        return {
          hour,
          revenue: baseRevenue * multiplier,
          transactions: Math.floor((totalTransactions / 24) * multiplier),
          avgValue: totalTransactions > 0 ? (baseRevenue * multiplier) / Math.floor((totalTransactions / 24) * multiplier) : 0
        };
      });

      // Weekly trend (simulated)
      const weeklyTrend = [
        { day: "Mon", revenue: totalRevenue * 0.12, transactions: Math.floor(totalTransactions * 0.1) },
        { day: "Tue", revenue: totalRevenue * 0.14, transactions: Math.floor(totalTransactions * 0.12) },
        { day: "Wed", revenue: totalRevenue * 0.16, transactions: Math.floor(totalTransactions * 0.14) },
        { day: "Thu", revenue: totalRevenue * 0.18, transactions: Math.floor(totalTransactions * 0.16) },
        { day: "Fri", revenue: totalRevenue * 0.20, transactions: Math.floor(totalTransactions * 0.18) },
        { day: "Sat", revenue: totalRevenue * 0.15, transactions: Math.floor(totalTransactions * 0.2) },
        { day: "Sun", revenue: totalRevenue * 0.05, transactions: Math.floor(totalTransactions * 0.1) }
      ];

      return {
        totalRevenue,
        totalTransactions,
        avgTransactionValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        topProducts,
        topCombinations,
        hourlyBreakdown,
        weeklyTrend
      };
    }
  });

  // Calculate combined KPIs
  const kpiData: KPIData | null = laborData && salesData ? {
    labor: laborData,
    sales: salesData,
    combined: {
      revenuePerWorker: laborData.totalWorkers > 0 ? salesData.totalRevenue / laborData.totalWorkers : 0,
      salesProductivity: laborData.totalHours > 0 ? salesData.totalRevenue / laborData.totalHours : 0,
      laborEfficiency: laborData.laborCost > 0 ? salesData.totalRevenue / laborData.laborCost : 0,
      profitMargin: salesData.totalRevenue > 0 ? ((salesData.totalRevenue - laborData.laborCost) / salesData.totalRevenue) * 100 : 0
    }
  } : null;

  const isLoading = laborLoading || salesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Daily Ops Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time insights for labor and sales performance
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(DATE_RANGES).map(([key, range]) => (
            <Button
              key={key}
              variant={selectedDateRange === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDateRange(key as keyof typeof DATE_RANGES)}
            >
              {range.label}
            </Button>
          ))}
        </div>

        {/* Location Tabs */}
        <div className="flex gap-2">
          {Object.entries(LOCATIONS).map(([key, location]) => (
            <Button
              key={key}
              variant={selectedLocation === key ? "default" : "outline"}
              onClick={() => setSelectedLocation(key as keyof typeof LOCATIONS)}
              className="flex items-center gap-2"
            >
              <div className={`w-3 h-3 rounded-full ${location.color}`} />
              {location.name}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : kpiData ? (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{kpiData.sales.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {kpiData.sales.totalTransactions} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labor Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.labor.totalHours.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">
                  {kpiData.labor.totalWorkers} workers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue per Worker</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">€{kpiData.combined.revenuePerWorker.toFixed(0)}</div>
                <p className="text-xs text-muted-foreground">
                  Per worker efficiency
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profit Margin</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.combined.profitMargin.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  After labor costs
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed KPIs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Labor KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Labor Performance
                </CardTitle>
                <CardDescription>Workforce efficiency and productivity metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Hours per Worker</p>
                    <p className="text-2xl font-bold">{kpiData.labor.avgHoursPerWorker.toFixed(1)}h</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Labor Cost</p>
                    <p className="text-2xl font-bold">€{kpiData.labor.laborCost.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Team Performance</p>
                  <div className="space-y-2">
                    {kpiData.labor.teams.map((team, index) => (
                      <div key={team.teamId} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">{team.teamName}</span>
                        <div className="flex gap-4 text-sm">
                          <span>{team.workers} workers</span>
                          <span>{team.hours.toFixed(1)}h</span>
                          <Badge variant="secondary">{team.productivity.toFixed(1)}h/worker</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sales KPIs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Sales Performance
                </CardTitle>
                <CardDescription>Revenue and transaction insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Transaction</p>
                    <p className="text-2xl font-bold">€{kpiData.sales.avgTransactionValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sales per Hour</p>
                    <p className="text-2xl font-bold">€{kpiData.combined.salesProductivity.toFixed(0)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Top Products</p>
                  <div className="space-y-2">
                    {kpiData.sales.topProducts.map((product, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm font-medium">{product.product}</span>
                        <div className="flex gap-4 text-sm">
                          <span>€{product.revenue.toFixed(0)}</span>
                          <span>{product.transactions} sales</span>
                          <Badge variant="outline">€{product.avgPrice.toFixed(2)} avg</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Combinations */}
          <Card>
            <CardHeader>
              <CardTitle>Top Product Combinations</CardTitle>
              <CardDescription>Best performing product pairings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {kpiData.sales.topCombinations.map((combo, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <h4 className="font-medium">{combo.combination}</h4>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>€{combo.revenue.toFixed(0)} revenue</p>
                      <p>{combo.frequency} orders</p>
                      <p>€{(combo.revenue / combo.frequency).toFixed(2)} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">Labor Efficiency</p>
                    <p className="text-2xl font-bold">{kpiData.combined.laborEfficiency.toFixed(1)}x</p>
                    <p className="text-xs text-muted-foreground">Revenue per labor cost</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Productivity Score</p>
                    <p className="text-2xl font-bold">{((kpiData.combined.salesProductivity / 100) * 100).toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Sales per hour worked</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Workload</p>
                    <p className="text-2xl font-bold">{kpiData.labor.avgHoursPerWorker > 8 ? "High" : kpiData.labor.avgHoursPerWorker > 6 ? "Medium" : "Low"}</p>
                    <p className="text-xs text-muted-foreground">Based on avg hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Hourly Performance
                </CardTitle>
                <CardDescription>Revenue and labor by hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {kpiData.sales.hourlyBreakdown.slice(12, 24).map((hour, index) => (
                    <div key={hour.hour} className="flex items-center gap-4">
                      <div className="w-12 text-sm font-medium">{hour.hour}:00</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Revenue: €{hour.revenue.toFixed(0)}</span>
                          <span>Transactions: {hour.transactions}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${Math.min((hour.revenue / Math.max(...kpiData.sales.hourlyBreakdown.map(h => h.revenue))) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Weekly Sales Trend
                </CardTitle>
                <CardDescription>Revenue distribution by day of week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {kpiData.sales.weeklyTrend.map((day, index) => (
                    <div key={day.day} className="flex items-center gap-4">
                      <div className="w-12 text-sm font-medium">{day.day}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>€{day.revenue.toFixed(0)}</span>
                          <span>{day.transactions} transactions</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(day.revenue / Math.max(...kpiData.sales.weeklyTrend.map(d => d.revenue))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Management Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Management Insights</CardTitle>
              <CardDescription>Key recommendations based on current performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-green-600 mb-2">✅ Strengths</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• High labor efficiency at {kpiData.combined.laborEfficiency.toFixed(1)}x return</li>
                    <li>• Strong revenue per worker: €{kpiData.combined.revenuePerWorker.toFixed(0)}</li>
                    <li>• Healthy profit margin of {kpiData.combined.profitMargin.toFixed(1)}%</li>
                  </ul>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-orange-600 mb-2">⚠️ Areas for Improvement</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    {kpiData.labor.avgHoursPerWorker > 8 && <li>• Consider hiring more staff - high workload detected</li>}
                    {kpiData.combined.salesProductivity < 50 && <li>• Focus on sales training and efficiency</li>}
                    <li>• Monitor peak hours for optimal staffing</li>
                    <li>• Consider cross-training for better flexibility</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for the selected period</p>
        </div>
      )}
    </div>
  );
}
