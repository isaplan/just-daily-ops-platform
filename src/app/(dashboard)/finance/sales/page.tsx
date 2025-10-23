"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, Calendar, Database, TrendingUp, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { SalesKpiCard } from "@/components/sales/SalesKpiCard";
import { SalesCategoryFilter, CategorySelection } from "@/components/sales/SalesCategoryFilter";
import { SalesChart } from "@/components/sales/SalesChart";
import { MasterDataUpdateNotification } from "@/components/sales/MasterDataUpdateNotification";
import SmartPeriodSelector, { PeriodPreset } from "@/components/finance/SmartPeriodSelector";
import LocationMultiSelect from "@/components/finance/LocationMultiSelect";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSalesData, useSalesTimeSeries, SalesMetricType } from "@/hooks/useSalesData";
import { useSalesByCategory } from "@/hooks/useSalesByCategory";
import { cn } from "@/lib/utils";

interface DateRange {
  start: Date;
  end: Date;
}

export default function Sales() {
  // Initialize default date range (current month)
  const getDefaultDateRange = (): DateRange => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  };

  // State management
  const [activeLocations, setActiveLocations] = useState<string[]>([]);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CategorySelection[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<SalesMetricType>("revenue");
  const [comparisonMode, setComparisonMode] = useState(false);
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [granularity, setGranularity] = useState<"day" | "week" | "month" | "quarter" | "year">("month");
  const [includeVat, setIncludeVat] = useState(false); // Default to excl. VAT
  
  // Period presets and date ranges - initialize with current month
  const [periodPreset, setPeriodPreset] = useState<string>("this-month");
  const [dateRange, setDateRange] = useState<DateRange | null>(getDefaultDateRange());
  const [comparisonPeriodPreset, setComparisonPeriodPreset] = useState<string>("last-month");
  const [comparisonDateRange, setComparisonDateRange] = useState<DateRange | null>(null);

  // Fetch locations
  const { data: locations = [] } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("locations").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Default to "All Locations" on initial load
  useEffect(() => {
    if (locations.length > 0 && activeLocations.length === 0) {
      setActiveLocations(["all"]);
    }
  }, [locations, activeLocations.length]);

  // Safety guard: reset to "all" if pseudo location is selected
  useEffect(() => {
    if (activeLocations.length === 1 && activeLocations[0] === '93cd36b7-790c-4d29-9344-631188af32e4') {
      setActiveLocations(["all"]);
    }
  }, [activeLocations]);

  // Smart default granularity based on date range
  useEffect(() => {
    if (!dateRange) return;
    
    const daysDiff = Math.ceil(
      (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Auto-select granularity based on range
    if (daysDiff <= 7) {
      setGranularity("day");
    } else if (daysDiff <= 60) {
      setGranularity("week");
    } else if (daysDiff <= 365) {
      setGranularity("month");
    } else if (daysDiff <= 1095) {
      setGranularity("quarter");
    } else {
      setGranularity("year");
    }
  }, [dateRange]);

  // Compute location filter: "all" if selected, else array of location IDs
  const locationFilter = activeLocations.includes("all") ? "all" : activeLocations;

  // Fetch sales data for primary period
  const { data: primaryData, isLoading: primaryLoading, error: primaryError } = useSalesData({
    locationFilter,
    dateRange,
    includeVat
  });

  // Check data source status
  const { data: dataSourceStatus } = useQuery({
    queryKey: ["sales-data-source-status"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bork_sales_data")
        .select("id")
        .eq("category", "STEP6_STORED_DATA")
        .limit(1);
      
      if (error) throw error;
      return {
        hasProcessedData: data && data.length > 0,
        recordCount: data ? data.length : 0
      };
    },
  });

  // Fetch sales data for comparison period
  const { data: comparisonData, isLoading: comparisonLoading } = useSalesData({
    locationFilter,
    dateRange: comparisonMode ? comparisonDateRange : null,
    includeVat
  });

  // Fetch category-specific data when categories are selected
  const { data: categoryData = [] } = useSalesByCategory(
    locationFilter,
    dateRange,
    selectedCategories,
    granularity,
    includeVat
  );

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format number
  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat("nl-NL", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate percentage change
  const calculatePercentChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Get comparison label
  const getComparisonLabel = (): string => {
    if (!comparisonDateRange) return "previous period";
    const start = comparisonDateRange.start.toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
    return start;
  };

  // Handle period selection
  const handlePeriodChange = (preset: string, range: DateRange) => {
    setPeriodPreset(preset);
    setDateRange(range);
  };

  const handleComparisonPeriodChange = (preset: string, range: DateRange) => {
    setComparisonPeriodPreset(preset);
    setComparisonDateRange(range);
  };

  // Handle metric selection from KPI cards
  const handleMetricSelect = (metric: SalesMetricType) => {
    setSelectedMetric(metric);
    // Clear category selections when selecting a primary metric
    setSelectedCategories([]);
  };

  return (
    <div className={cn(
      "container mx-auto p-6 space-y-6 transition-all duration-300",
      isCategoryFilterOpen && "mr-[500px] sm:mr-[540px]"
    )}>
      {/* Master Data Update Notification */}
      <MasterDataUpdateNotification />
      
      {/* Sticky Header */}
      <div className="sticky top-16 z-40 bg-background pb-4 border-b -mx-6 px-6 -mt-6 pt-6">
        <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Sales Performance</h1>
            {dataSourceStatus && (
              <Badge 
                variant={dataSourceStatus.hasProcessedData ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {dataSourceStatus.hasProcessedData ? (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    Connected to Bork API
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3" />
                    No Processed Data
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {dataSourceStatus?.hasProcessedData 
              ? `Connected to ${dataSourceStatus.recordCount} processed sales records from Bork API`
              : "Analyze sales data from Bork POS"
            }
          </p>
        </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryFilterOpen(true)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Category Filters
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Period & Location Selection */}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Period A */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {comparisonMode ? "Period A (Primary)" : "Period"}
              </Label>
              <SmartPeriodSelector
                value={periodPreset as PeriodPreset}
                onChange={handlePeriodChange}
              />
            </div>

            {/* Period B (Comparison) */}
            {comparisonMode && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Period B (Comparison)
                </Label>
                <SmartPeriodSelector
                  value={comparisonPeriodPreset as PeriodPreset}
                  onChange={handleComparisonPeriodChange}
                />
              </div>
            )}
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <Label>Locations</Label>
            <LocationMultiSelect
              locations={locations}
              activeLocations={activeLocations}
              onChange={setActiveLocations}
            />
          </div>

          {/* Comparison Mode Toggle */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Switch
                id="comparison-mode"
                checked={comparisonMode}
                onCheckedChange={setComparisonMode}
              />
              <Label htmlFor="comparison-mode" className="cursor-pointer">
                Enable comparison mode
              </Label>
            </div>
            
            {/* VAT Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="vat-toggle"
                checked={includeVat}
                onCheckedChange={setIncludeVat}
              />
              <Label htmlFor="vat-toggle" className="cursor-pointer">
                Include VAT
              </Label>
              <Badge variant="outline" className="ml-1">
                {includeVat ? "Incl. BTW" : "Excl. BTW"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SalesKpiCard
          title={`Revenue ${includeVat ? '(incl. VAT)' : '(excl. VAT)'}`}
          value={primaryData?.revenue || 0}
          previousValue={comparisonMode ? (comparisonData?.revenue || 0) : undefined}
          comparisonLabel={comparisonMode ? getComparisonLabel() : undefined}
          format="currency"
          isLoading={primaryLoading}
          onClick={() => handleMetricSelect("revenue")}
          isSelected={selectedMetric === "revenue" && selectedCategories.length === 0}
        />
        <SalesKpiCard
          title="Units Sold"
          value={primaryData?.quantity || 0}
          previousValue={comparisonMode ? (comparisonData?.quantity || 0) : undefined}
          comparisonLabel={comparisonMode ? getComparisonLabel() : undefined}
          format="number"
          isLoading={primaryLoading}
          onClick={() => handleMetricSelect("quantity")}
          isSelected={selectedMetric === "quantity" && selectedCategories.length === 0}
        />
        <SalesKpiCard
          title="Avg Item Price"
          value={primaryData?.avgPrice || 0}
          previousValue={comparisonMode ? (comparisonData?.avgPrice || 0) : undefined}
          comparisonLabel={comparisonMode ? getComparisonLabel() : undefined}
          format="currency"
          isLoading={primaryLoading}
          onClick={() => handleMetricSelect("avg_price")}
          isSelected={selectedMetric === "avg_price" && selectedCategories.length === 0}
        />
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Top Category</h3>
            {primaryLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </div>
            ) : (
              <div>
                <p className="text-2xl font-bold">{primaryData?.topCategory || "N/A"}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {primaryData?.topCategory && selectedCategories.length === 0 ? "by revenue" : ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <SalesKpiCard
          title="Product Count"
          value={primaryData?.productCount || 0}
          previousValue={comparisonMode ? (comparisonData?.productCount || 0) : undefined}
          comparisonLabel={comparisonMode ? getComparisonLabel() : undefined}
          format="number"
          isLoading={primaryLoading}
        />
      </div>

      {/* VAT & Profit Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">VAT Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">9% (Food)</span>
                <span className="font-semibold">{formatCurrency(primaryData?.vatBreakdown?.rate9?.vat || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">21% (Drinks)</span>
                <span className="font-semibold">{formatCurrency(primaryData?.vatBreakdown?.rate21?.vat || 0)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-medium">Total VAT</span>
                <span className="font-semibold text-lg">{formatCurrency(primaryData?.vatAmount || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Cost Analysis</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Cost</span>
                <span className="font-semibold">{formatCurrency(primaryData?.costTotal || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Revenue {includeVat ? '(incl. VAT)' : '(excl. VAT)'}</span>
                <span className="font-semibold">{formatCurrency(primaryData?.revenue || 0)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-medium">Profit Margin</span>
                <span className="font-semibold text-lg">{primaryData?.profitMargin?.toFixed(1) || 0}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-4">Both Views</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Excl. VAT</span>
                <span className="font-semibold">{formatCurrency(primaryData?.revenueExVat || 0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Incl. VAT</span>
                <span className="font-semibold">{formatCurrency(primaryData?.revenueIncVat || 0)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-medium">Difference</span>
                <span className="font-semibold text-lg">{formatCurrency(primaryData?.vatAmount || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label>Chart Type:</Label>
              <Button
                variant={chartType === "line" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("line")}
              >
                Line
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
              >
                Bar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label>Granularity:</Label>
              <Button
                variant={granularity === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => setGranularity("day")}
              >
                Daily
              </Button>
              <Button
                variant={granularity === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setGranularity("week")}
              >
                Weekly
              </Button>
              <Button
                variant={granularity === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setGranularity("month")}
              >
                Monthly
              </Button>
              <Button
                variant={granularity === "quarter" ? "default" : "outline"}
                size="sm"
                onClick={() => setGranularity("quarter")}
              >
                Quarterly
              </Button>
              <Button
                variant={granularity === "year" ? "default" : "outline"}
                size="sm"
                onClick={() => setGranularity("year")}
              >
                Yearly
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      <SalesChart
        selectedMetric={selectedMetric}
        activeLocations={activeLocations}
        dateRange={dateRange}
        comparisonDateRange={comparisonMode ? comparisonDateRange : null}
        chartType={chartType}
        granularity={granularity}
        selectedCategories={selectedCategories}
        categoryData={categoryData}
        includeVat={includeVat}
      />

      {/* Category Filter Sheet */}
      <SalesCategoryFilter
        open={isCategoryFilterOpen}
        onOpenChange={setIsCategoryFilterOpen}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />
    </div>
  );
}
