import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Upload, Sparkles, FileText, TrendingUp, TrendingDown, Users, Clock, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PeriodSelector } from "@/components/finance/PeriodSelector";
import { RevenueKpiCard } from "@/components/finance/RevenueKpiCard";
import { RevenueTrendChart } from "@/components/finance/RevenueTrendChart";
import { SalesIntelligenceCard } from "@/components/finance/SalesIntelligenceCard";
import { useRevenueData } from "@/hooks/useRevenueData";
import { useSalesIntelligence } from "@/hooks/useSalesIntelligence";
import { PeriodType, formatPeriodLabel } from "@/lib/dateUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FinanceDashboard() {
  const [period, setPeriod] = useState<PeriodType>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [comparisonCount, setComparisonCount] = useState(3);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch revenue data
  const { data: revenueData, isLoading: revenueLoading } = useRevenueData(
    period,
    currentDate,
    comparisonCount,
    selectedLocation
  );

  // Fetch sales intelligence
  const { data: salesData, isLoading: salesLoading } = useSalesIntelligence(
    period,
    currentDate,
    selectedLocation
  );

  // Labor data removed - use Eitje API sync instead
  const laborData = { totalHours: 0, totalCost: 0, hasData: false };

  // Calculate comparison average
  const comparisonAverage = revenueData
    ? revenueData.comparison.reduce((sum, val) => sum + val, 0) / revenueData.comparison.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive financial analytics and KPIs
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/finance/imports">
              <Upload className="mr-2 h-4 w-4" />
              Import Data
            </Link>
          </Button>
          <Button asChild>
            <Link to="/finance/insights">
              <Sparkles className="mr-2 h-4 w-4" />
              AI Insights
            </Link>
          </Button>
        </div>
      </div>

      {/* Location Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Location:</span>
              <Select
                value={selectedLocation || "all"}
                onValueChange={(value) => setSelectedLocation(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Period Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            comparisonCount={comparisonCount}
            onComparisonCountChange={setComparisonCount}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="labor">Labor</TabsTrigger>
          <TabsTrigger value="sales">Sales Intelligence</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue KPI */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <RevenueKpiCard
              title={`Revenue - ${formatPeriodLabel(period, currentDate)}`}
              value={revenueData?.current || 0}
              previousValue={comparisonAverage}
              comparisonLabel={`avg of last ${comparisonCount}`}
              isLoading={revenueLoading}
            />
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average per Period</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="h-8 bg-muted animate-pulse rounded" />
                ) : (
                  <div className="text-2xl font-bold">
                    €{comparisonAverage.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {comparisonCount} previous periods
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Analyzed</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comparisonCount + 1}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Periods in comparison
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend Chart */}
          <RevenueTrendChart
            data={revenueData?.chartData || []}
            isLoading={revenueLoading}
          />
        </TabsContent>

        {/* Labor Tab */}
        <TabsContent value="labor" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {laborData?.totalHours.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}h
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {laborData?.hasData ? "Recorded hours" : "No data available"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Labor Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{laborData?.totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {laborData?.hasData ? "Total labor costs" : "No data available"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Hourly Rate</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  €{laborData?.totalHours && laborData?.totalHours > 0
                    ? (laborData.totalCost / laborData.totalHours).toFixed(2)
                    : "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Per hour</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {laborData?.hasData ? "Active" : "No Data"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {laborData?.hasData ? "Labor tracking enabled" : "Import labor data to track"}
                </p>
              </CardContent>
            </Card>
          </div>

          {!laborData?.hasData && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <h3 className="text-lg font-semibold mb-2">No Labor Data Available</h3>
                  <p className="mb-4">Import Eitje labor hours data to see detailed analytics</p>
                  <Button asChild>
                    <Link to="/finance/imports">
                      <Upload className="mr-2 h-4 w-4" />
                      Import Labor Data
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sales Intelligence Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <SalesIntelligenceCard
              title="Top Products by Revenue"
              data={salesData?.topProducts || []}
              isLoading={salesLoading}
            />
            <SalesIntelligenceCard
              title="Top Categories by Revenue"
              data={salesData?.topCategories || []}
              isLoading={salesLoading}
            />
          </div>
        </TabsContent>

      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Button asChild variant="outline" className="h-20 flex-col gap-2">
            <Link to="/finance/overview">
              <DollarSign className="h-6 w-6" />
              <span>Finance Overview</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2">
            <Link to="/finance/imports">
              <Upload className="h-6 w-6" />
              <span>Import Data</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2">
            <Link to="/finance/insights">
              <Sparkles className="h-6 w-6" />
              <span>View Insights</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-20 flex-col gap-2">
            <Link to="/finance/reports">
              <FileText className="h-6 w-6" />
              <span>Reports</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
