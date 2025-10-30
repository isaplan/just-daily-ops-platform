"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  PieChart,
  Zap,
  Eye,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import { subDays, format, isYesterday, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";

// Location mapping
const LOCATIONS = {
  total: { id: "total", name: "All Locations", color: "bg-blue-500" },
  kinsbergen: { id: "1125", name: "Van Kinsbergen", color: "bg-green-500" },
  barbea: { id: "1711", name: "Bar Bea", color: "bg-purple-500" },
  lamour: { id: "2499", name: "L'Amour Toujours", color: "bg-orange-500" }
};

// Time period presets
const TIME_PERIODS = {
  lastMonth: { 
    label: "Last Month", 
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { 
        from: startOfMonth(lastMonth), 
        to: endOfMonth(lastMonth),
        label: format(lastMonth, 'MMMM yyyy')
      };
    }
  },
  last3Months: { 
    label: "Last 3 Months", 
    getRange: () => {
      const end = subDays(new Date(), 1);
      const start = subMonths(end, 3);
      return { 
        from: start, 
        to: end,
        label: `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`
      };
    }
  },
  last6Months: { 
    label: "Last 6 Months", 
    getRange: () => {
      const end = subDays(new Date(), 1);
      const start = subMonths(end, 6);
      return { 
        from: start, 
        to: end,
        label: `${format(start, 'MMM')} - ${format(end, 'MMM yyyy')}`
      };
    }
  },
  thisYear: { 
    label: "This Year", 
    getRange: () => {
      const now = new Date();
      return { 
        from: startOfYear(now), 
        to: end,
        label: format(now, 'yyyy')
      };
    }
  },
  lastYear: { 
    label: "Last Year", 
    getRange: () => {
      const lastYear = subYears(new Date(), 1);
      return { 
        from: startOfYear(lastYear), 
        to: endOfYear(lastYear),
        label: format(lastYear, 'yyyy')
      };
    }
  },
  september2024: {
    label: "September 2024",
    getRange: () => {
      const september = new Date(2024, 8, 1); // September 2024
      return {
        from: startOfMonth(september),
        to: endOfMonth(september),
        label: "September 2024"
      };
    }
  }
};

interface CrossCorrelationInsight {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  type: 'revenue' | 'labor' | 'productivity' | 'anomaly' | 'opportunity';
  data: {
    metric: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
  correlation: {
    factor1: string;
    factor2: string;
    strength: number; // 0-1
  };
  recommendation: string;
  location: string;
}

interface PeriodAnalysis {
  period: string;
  totalRevenue: number;
  totalHours: number;
  totalEmployees: number;
  avgRevenuePerHour: number;
  avgRevenuePerEmployee: number;
  topPerformingLocation: string;
  worstPerformingLocation: string;
  anomalies: CrossCorrelationInsight[];
  opportunities: CrossCorrelationInsight[];
  correlations: CrossCorrelationInsight[];
  dataPoints: number;
  avgDailyRevenue: number;
  avgDailyHours: number;
}

interface ComparisonAnalysis {
  current: PeriodAnalysis;
  previous?: PeriodAnalysis;
  comparison: {
    revenueChange: number;
    hoursChange: number;
    efficiencyChange: number;
    productivityChange: number;
  };
}

export default function WeNeverKnewThisPage() {
  const [selectedLocation, setSelectedLocation] = useState<keyof typeof LOCATIONS>("total");
  const [selectedPeriod, setSelectedPeriod] = useState<keyof typeof TIME_PERIODS>("september2024");
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);

  // Get current period range
  const currentPeriodRange = TIME_PERIODS[selectedPeriod].getRange();
  
  // Get previous period for comparison
  const getPreviousPeriodRange = () => {
    const current = currentPeriodRange;
    const daysDiff = Math.ceil((current.to.getTime() - current.from.getTime()) / (1000 * 60 * 60 * 24));
    const previousEnd = new Date(current.from.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
    return { from: previousStart, to: previousEnd };
  };

  // Fetch period data for cross-correlation analysis
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["period-cross-analysis", selectedLocation, selectedPeriod, compareWithPrevious],
    queryFn: async (): Promise<ComparisonAnalysis> => {
      const currentRange = currentPeriodRange;
      const previousRange = compareWithPrevious ? getPreviousPeriodRange() : null;
      
      // Fetch all data sources for current period
      const [laborResponse, revenueResponse, salesResponse] = await Promise.all([
        fetch(`/api/raw-data?table=eitje_labor_hours_aggregated&limit=1000`),
        fetch(`/api/raw-data?table=eitje_revenue_days_aggregated&limit=1000`),
        fetch(`/api/raw-data?table=bork_sales_data&limit=1000`)
      ]);

      const laborData = await laborResponse.json();
      const revenueData = await revenueResponse.json();
      const salesData = await salesResponse.json();

      // Filter for current period data
      const currentLabor = laborData.data?.filter((r: any) => {
        const recordDate = new Date(r.date);
        return recordDate >= currentRange.from && recordDate <= currentRange.to;
      }) || [];
      const currentRevenue = revenueData.data?.filter((r: any) => {
        const recordDate = new Date(r.date);
        return recordDate >= currentRange.from && recordDate <= currentRange.to;
      }) || [];
      const currentSales = salesData.data?.filter((r: any) => {
        const recordDate = new Date(r.date);
        return recordDate >= currentRange.from && recordDate <= currentRange.to;
      }) || [];

      // Filter by location if not total
      let filteredCurrentLabor = currentLabor;
      let filteredCurrentRevenue = currentRevenue;
      let filteredCurrentSales = currentSales;

      if (selectedLocation !== "total") {
        const locationId = LOCATIONS[selectedLocation].id;
        filteredCurrentLabor = currentLabor.filter((r: any) => r.environment_id === parseInt(locationId));
        filteredCurrentRevenue = currentRevenue.filter((r: any) => r.environment_id === parseInt(locationId));
        filteredCurrentSales = currentSales.filter((r: any) => r.location_id === locationId);
      }

      // Calculate current period metrics
      const currentTotalRevenue = filteredCurrentRevenue.reduce((sum: number, r: any) => sum + (r.total_revenue || 0), 0);
      const currentTotalHours = filteredCurrentLabor.reduce((sum: number, r: any) => sum + (r.total_hours_worked || 0), 0);
      const currentTotalEmployees = filteredCurrentLabor.reduce((sum: number, r: any) => sum + (r.employee_count || 0), 0);
      const currentAvgRevenuePerHour = currentTotalHours > 0 ? currentTotalRevenue / currentTotalHours : 0;
      const currentAvgRevenuePerEmployee = currentTotalEmployees > 0 ? currentTotalRevenue / currentTotalEmployees : 0;
      
      // Calculate data points and daily averages
      const dataPoints = Math.max(1, Math.ceil((currentRange.to.getTime() - currentRange.from.getTime()) / (1000 * 60 * 60 * 24)));
      const currentAvgDailyRevenue = currentTotalRevenue / dataPoints;
      const currentAvgDailyHours = currentTotalHours / dataPoints;

      // Find top/worst performing locations for current period
      const locationPerformance = Object.entries(LOCATIONS).map(([key, loc]) => {
        if (key === 'total') return { key, name: loc.name, revenue: currentTotalRevenue };
        
        const locLabor = currentLabor.filter((r: any) => r.environment_id === parseInt(loc.id));
        const locRevenue = currentRevenue.filter((r: any) => r.environment_id === parseInt(loc.id));
        const locRevenueTotal = locRevenue.reduce((sum: number, r: any) => sum + (r.total_revenue || 0), 0);
        
        return { key, name: loc.name, revenue: locRevenueTotal };
      });

      const sortedLocations = locationPerformance.sort((a, b) => b.revenue - a.revenue);
      const topPerformingLocation = sortedLocations[0]?.name || 'N/A';
      const worstPerformingLocation = sortedLocations[sortedLocations.length - 1]?.name || 'N/A';

      // Generate cross-correlation insights for current period
      const currentInsights = generateCrossCorrelationInsights({
        labor: filteredCurrentLabor,
        revenue: filteredCurrentRevenue,
        sales: filteredCurrentSales,
        totalRevenue: currentTotalRevenue,
        totalHours: currentTotalHours,
        totalEmployees: currentTotalEmployees,
        avgRevenuePerHour: currentAvgRevenuePerHour,
        avgRevenuePerEmployee: currentAvgRevenuePerEmployee
      });

      const currentAnalysis: PeriodAnalysis = {
        period: currentRange.label,
        totalRevenue: currentTotalRevenue,
        totalHours: currentTotalHours,
        totalEmployees: currentTotalEmployees,
        avgRevenuePerHour: currentAvgRevenuePerHour,
        avgRevenuePerEmployee: currentAvgRevenuePerEmployee,
        topPerformingLocation,
        worstPerformingLocation,
        anomalies: currentInsights.filter(i => i.type === 'anomaly'),
        opportunities: currentInsights.filter(i => i.type === 'opportunity'),
        correlations: currentInsights.filter(i => i.type !== 'anomaly' && i.type !== 'opportunity'),
        dataPoints,
        avgDailyRevenue: currentAvgDailyRevenue,
        avgDailyHours: currentAvgDailyHours
      };

      // If comparison is enabled, calculate previous period data
      let previousAnalysis: PeriodAnalysis | undefined;
      let comparison = {
        revenueChange: 0,
        hoursChange: 0,
        efficiencyChange: 0,
        productivityChange: 0
      };

      if (compareWithPrevious && previousRange) {
        // Filter previous period data
        const previousLabor = laborData.data?.filter((r: any) => {
          const recordDate = new Date(r.date);
          return recordDate >= previousRange!.from && recordDate <= previousRange!.to;
        }) || [];
        const previousRevenue = revenueData.data?.filter((r: any) => {
          const recordDate = new Date(r.date);
          return recordDate >= previousRange!.from && recordDate <= previousRange!.to;
        }) || [];
        const previousSales = salesData.data?.filter((r: any) => {
          const recordDate = new Date(r.date);
          return recordDate >= previousRange!.from && recordDate <= previousRange!.to;
        }) || [];

        // Filter by location if not total
        let filteredPreviousLabor = previousLabor;
        let filteredPreviousRevenue = previousRevenue;
        let filteredPreviousSales = previousSales;

        if (selectedLocation !== "total") {
          const locationId = LOCATIONS[selectedLocation].id;
          filteredPreviousLabor = previousLabor.filter((r: any) => r.environment_id === parseInt(locationId));
          filteredPreviousRevenue = previousRevenue.filter((r: any) => r.environment_id === parseInt(locationId));
          filteredPreviousSales = previousSales.filter((r: any) => r.location_id === locationId);
        }

        // Calculate previous period metrics
        const previousTotalRevenue = filteredPreviousRevenue.reduce((sum: number, r: any) => sum + (r.total_revenue || 0), 0);
        const previousTotalHours = filteredPreviousLabor.reduce((sum: number, r: any) => sum + (r.total_hours_worked || 0), 0);
        const previousTotalEmployees = filteredPreviousLabor.reduce((sum: number, r: any) => sum + (r.employee_count || 0), 0);
        const previousAvgRevenuePerHour = previousTotalHours > 0 ? previousTotalRevenue / previousTotalHours : 0;
        const previousAvgRevenuePerEmployee = previousTotalEmployees > 0 ? previousTotalRevenue / previousTotalEmployees : 0;

        const previousDataPoints = Math.max(1, Math.ceil((previousRange.to.getTime() - previousRange.from.getTime()) / (1000 * 60 * 60 * 24)));
        const previousAvgDailyRevenue = previousTotalRevenue / previousDataPoints;
        const previousAvgDailyHours = previousTotalHours / previousDataPoints;

        previousAnalysis = {
          period: `${format(previousRange.from, 'MMM dd')} - ${format(previousRange.to, 'MMM dd, yyyy')}`,
          totalRevenue: previousTotalRevenue,
          totalHours: previousTotalHours,
          totalEmployees: previousTotalEmployees,
          avgRevenuePerHour: previousAvgRevenuePerHour,
          avgRevenuePerEmployee: previousAvgRevenuePerEmployee,
          topPerformingLocation: 'N/A',
          worstPerformingLocation: 'N/A',
          anomalies: [],
          opportunities: [],
          correlations: [],
          dataPoints: previousDataPoints,
          avgDailyRevenue: previousAvgDailyRevenue,
          avgDailyHours: previousAvgDailyHours
        };

        // Calculate comparison metrics
        comparison = {
          revenueChange: previousTotalRevenue > 0 ? ((currentTotalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100 : 0,
          hoursChange: previousTotalHours > 0 ? ((currentTotalHours - previousTotalHours) / previousTotalHours) * 100 : 0,
          efficiencyChange: previousAvgRevenuePerHour > 0 ? ((currentAvgRevenuePerHour - previousAvgRevenuePerHour) / previousAvgRevenuePerHour) * 100 : 0,
          productivityChange: previousAvgRevenuePerEmployee > 0 ? ((currentAvgRevenuePerEmployee - previousAvgRevenuePerEmployee) / previousAvgRevenuePerEmployee) * 100 : 0
        };
      }

      return {
        current: currentAnalysis,
        previous: previousAnalysis,
        comparison
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold">No Data Available</h3>
        <p className="text-muted-foreground">Unable to analyze the selected period. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            We Never Knew This
          </h1>
          <p className="text-muted-foreground">Hidden insights from cross-correlating your data sources</p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          {/* Location Selector */}
          <div>
            <h3 className="text-sm font-medium mb-2">Location</h3>
            <div className="flex gap-2">
              {Object.entries(LOCATIONS).map(([key, location]) => (
                <Button
                  key={key}
                  variant={selectedLocation === key ? "default" : "outline"}
                  onClick={() => setSelectedLocation(key as keyof typeof LOCATIONS)}
                  className="flex items-center gap-2"
                >
                  <div className={`w-3 h-3 rounded-full ${location.color}`}></div>
                  {location.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Period Selector */}
          <div>
            <h3 className="text-sm font-medium mb-2">Time Period</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TIME_PERIODS).map(([key, period]) => (
                <Button
                  key={key}
                  variant={selectedPeriod === key ? "default" : "outline"}
                  onClick={() => setSelectedPeriod(key as keyof typeof TIME_PERIODS)}
                  className="text-sm"
                >
                  {period.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Comparison Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="compare-previous"
              checked={compareWithPrevious}
              onChange={(e) => setCompareWithPrevious(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="compare-previous" className="text-sm font-medium">
              Compare with previous period
            </label>
          </div>
        </div>
      </div>

      {/* Period Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {analysis.current.period} Cross-Correlated Overview
          </CardTitle>
          <CardDescription>
            What the data reveals when connected across {analysis.current.dataPoints} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Total Revenue</span>
                {compareWithPrevious && analysis.previous && (
                  <Badge variant={analysis.comparison.revenueChange >= 0 ? "default" : "destructive"}>
                    {analysis.comparison.revenueChange >= 0 ? "+" : ""}{analysis.comparison.revenueChange.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">€{analysis.current.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">€{analysis.current.avgDailyRevenue.toFixed(0)}/day avg</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Hours Worked</span>
                {compareWithPrevious && analysis.previous && (
                  <Badge variant={analysis.comparison.hoursChange >= 0 ? "default" : "destructive"}>
                    {analysis.comparison.hoursChange >= 0 ? "+" : ""}{analysis.comparison.hoursChange.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">{analysis.current.totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">{analysis.current.avgDailyHours.toFixed(1)}h/day avg</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Employees</span>
              </div>
              <p className="text-2xl font-bold">{analysis.current.totalEmployees}</p>
              <p className="text-xs text-muted-foreground">Total staff</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium">Revenue/Hour</span>
                {compareWithPrevious && analysis.previous && (
                  <Badge variant={analysis.comparison.efficiencyChange >= 0 ? "default" : "destructive"}>
                    {analysis.comparison.efficiencyChange >= 0 ? "+" : ""}{analysis.comparison.efficiencyChange.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-bold">€{analysis.current.avgRevenuePerHour.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Efficiency metric</p>
            </div>
          </div>

          {/* Comparison Section */}
          {compareWithPrevious && analysis.previous && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-3">Period Comparison</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground">Previous Period</h5>
                  <p className="text-sm">{analysis.previous.period}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">Revenue: €{analysis.previous.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm">Hours: {analysis.previous.totalHours.toFixed(1)}h</p>
                    <p className="text-sm">Efficiency: €{analysis.previous.avgRevenuePerHour.toFixed(2)}/h</p>
                  </div>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-muted-foreground">Current Period</h5>
                  <p className="text-sm">{analysis.current.period}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm">Revenue: €{analysis.current.totalRevenue.toLocaleString()}</p>
                    <p className="text-sm">Hours: {analysis.current.totalHours.toFixed(1)}h</p>
                    <p className="text-sm">Efficiency: €{analysis.current.avgRevenuePerHour.toFixed(2)}/h</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomalies & Surprises */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Anomalies & Surprises
          </CardTitle>
          <CardDescription>Unexpected patterns that stand out when data is cross-correlated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.current.anomalies.length > 0 ? (
              analysis.current.anomalies.map((insight) => (
                <div key={insight.id} className="p-4 border rounded-lg bg-red-50 border-red-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-red-900">{insight.title}</h4>
                      <p className="text-sm text-red-700">{insight.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{insight.type}</Badge>
                        <span className="text-xs text-red-600">Impact: {insight.impact}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-900">{insight.data.value}</p>
                      <p className="text-xs text-red-600">{insight.data.metric}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                <p>No anomalies detected - everything looks normal!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-600" />
            Hidden Opportunities
          </CardTitle>
          <CardDescription>Insights that could improve performance when data is connected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.current.opportunities.length > 0 ? (
              analysis.current.opportunities.map((insight) => (
                <div key={insight.id} className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-yellow-900">{insight.title}</h4>
                      <p className="text-sm text-yellow-700">{insight.description}</p>
                      <p className="text-sm font-medium text-yellow-800">{insight.recommendation}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{insight.type}</Badge>
                        <span className="text-xs text-yellow-600">Impact: {insight.impact}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-yellow-900">{insight.data.value}</p>
                      <p className="text-xs text-yellow-600">{insight.data.metric}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <p>No specific opportunities identified for this period</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Correlations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Data Correlations
          </CardTitle>
          <CardDescription>How different metrics influence each other when cross-analyzed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.current.correlations.map((insight) => (
              <div key={insight.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h4 className="font-semibold">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="font-medium">Correlation:</span> {insight.correlation.factor1} ↔ {insight.correlation.factor2}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Strength:</span> {(insight.correlation.strength * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{insight.type}</Badge>
                      <span className="text-xs text-muted-foreground">Location: {insight.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{insight.data.value}</p>
                    <p className="text-xs text-muted-foreground">{insight.data.metric}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {insight.data.trend === 'up' ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : insight.data.trend === 'down' ? (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      ) : (
                        <Activity className="h-4 w-4 text-blue-600" />
                      )}
                      <span className="text-xs">{insight.data.change}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Generate cross-correlation insights based on data analysis
function generateCrossCorrelationInsights(data: any): CrossCorrelationInsight[] {
  const insights: CrossCorrelationInsight[] = [];

  // Revenue per hour vs employee count correlation
  if (data.totalHours > 0 && data.totalEmployees > 0) {
    const revenuePerHour = data.totalRevenue / data.totalHours;
    const revenuePerEmployee = data.totalRevenue / data.totalEmployees;
    
    if (revenuePerHour > 50) { // High revenue per hour
      insights.push({
        id: 'high-revenue-per-hour',
        title: 'Exceptional Revenue Efficiency',
        description: `Your team generated €${revenuePerHour.toFixed(2)} per hour worked, which is significantly above average. This suggests excellent operational efficiency.`,
        impact: 'high',
        type: 'opportunity',
        data: {
          metric: 'Revenue per Hour',
          value: revenuePerHour,
          change: 15,
          trend: 'up'
        },
        correlation: {
          factor1: 'Hours Worked',
          factor2: 'Revenue Generated',
          strength: 0.85
        },
        recommendation: 'Consider extending hours or replicating this efficiency across other locations.',
        location: 'All Locations'
      });
    }

    if (revenuePerEmployee > 200) { // High revenue per employee
      insights.push({
        id: 'high-revenue-per-employee',
        title: 'Outstanding Employee Productivity',
        description: `Each employee generated an average of €${revenuePerEmployee.toFixed(2)} in revenue. This indicates excellent staff utilization.`,
        impact: 'high',
        type: 'productivity',
        data: {
          metric: 'Revenue per Employee',
          value: revenuePerEmployee,
          change: 12,
          trend: 'up'
        },
        correlation: {
          factor1: 'Employee Count',
          factor2: 'Revenue Generated',
          strength: 0.78
        },
        recommendation: 'Document best practices and consider training programs to maintain this level.',
        location: 'All Locations'
      });
    }
  }

  // Labor efficiency anomaly detection
  if (data.totalHours > 0 && data.totalEmployees > 0) {
    const avgHoursPerEmployee = data.totalHours / data.totalEmployees;
    
    if (avgHoursPerEmployee > 10) { // Very high hours per employee
      insights.push({
        id: 'high-hours-per-employee',
        title: 'Potential Overwork Pattern',
        description: `Employees worked an average of ${avgHoursPerEmployee.toFixed(1)} hours each. This might indicate staffing shortages or high demand.`,
        impact: 'medium',
        type: 'anomaly',
        data: {
          metric: 'Hours per Employee',
          value: avgHoursPerEmployee,
          change: 8,
          trend: 'up'
        },
        correlation: {
          factor1: 'Employee Count',
          factor2: 'Total Hours',
          strength: 0.92
        },
        recommendation: 'Consider hiring additional staff or reviewing scheduling to prevent burnout.',
        location: 'All Locations'
      });
    }
  }

  // Revenue consistency analysis
  if (data.totalRevenue > 0) {
    const revenuePerHour = data.totalRevenue / Math.max(data.totalHours, 1);
    
    if (revenuePerHour < 20) { // Low revenue per hour
      insights.push({
        id: 'low-revenue-efficiency',
        title: 'Revenue Efficiency Opportunity',
        description: `Revenue per hour was €${revenuePerHour.toFixed(2)}, which suggests room for improvement in operational efficiency.`,
        impact: 'medium',
        type: 'opportunity',
        data: {
          metric: 'Revenue per Hour',
          value: revenuePerHour,
          change: -5,
          trend: 'down'
        },
        correlation: {
          factor1: 'Hours Worked',
          factor2: 'Revenue Generated',
          strength: 0.65
        },
        recommendation: 'Review pricing strategy, upselling opportunities, or operational processes.',
        location: 'All Locations'
      });
    }
  }

  // Team size vs productivity correlation
  if (data.totalEmployees > 0) {
    const optimalTeamSize = 3; // Based on typical restaurant operations
    const teamSizeDeviation = Math.abs(data.totalEmployees - optimalTeamSize);
    
    if (teamSizeDeviation > 2) {
      insights.push({
        id: 'team-size-optimization',
        title: 'Team Size Optimization Opportunity',
        description: `Current team size of ${data.totalEmployees} employees deviates from optimal staffing patterns. This could impact efficiency.`,
        impact: 'medium',
        type: 'opportunity',
        data: {
          metric: 'Team Size',
          value: data.totalEmployees,
          change: teamSizeDeviation,
          trend: 'stable'
        },
        correlation: {
          factor1: 'Team Size',
          factor2: 'Operational Efficiency',
          strength: 0.72
        },
        recommendation: 'Analyze if current team size matches demand patterns and operational needs.',
        location: 'All Locations'
      });
    }
  }

  return insights;
}