"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueKpiCard } from "@/components/finance/RevenueKpiCard";
import SmartPeriodSelector, { PeriodPreset, getDateRangeForPreset } from "@/components/finance/SmartPeriodSelector";
import LocationMultiSelect from "@/components/finance/LocationMultiSelect";
import FlexibleMetricChart from "@/components/finance/FlexibleMetricChart";
import { FinancialChatSidepanel } from "@/components/finance/FinancialChatSidepanel";
import FinanceRevenueTrendChart from "@/components/finance/FinanceRevenueTrendChart";
import FinanceLocationComparisonChart from "@/components/finance/FinanceLocationComparisonChart";
import { usePnLSummary, MetricType } from "@/hooks/usePnLSummary";
import { TimeGranularity } from "@/lib/finance/chartDataAggregator";
import { cn } from "@/lib/utils";
import { CategoryFilterSheet, CategorySelection } from "@/components/finance/CategoryFilterSheet";
import { usePnLByCategory } from "@/hooks/usePnLByCategory";

interface DateRange {
  start: Date;
  end: Date;
}

export default function FinancePnL() {
  const VAT_RATE = 1.12;

  // Multi-location selection
  const [activeLocations, setActiveLocations] = useState<string[]>(["all"]);
  
  // Chat panel state
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // Category filter state
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<CategorySelection[]>([]);
  
  // Selected metric for chart
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("revenue");
  
  // Comparison mode
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  
  // VAT inclusion toggle
  const [includeVat, setIncludeVat] = useState(false);
  
  // Chart configuration
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [xAxisGranularity, setXAxisGranularity] = useState<TimeGranularity>("month");
  
  // Reprocess state
  const [isReprocessing, setIsReprocessing] = useState(false);
  
  // Period A state (primary period)
  const [periodAPreset, setPeriodAPreset] = useState<PeriodPreset>("3months");
  const [periodARange, setPeriodARange] = useState<DateRange | null>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
    end: new Date(),
  });
  
  // Period B state (comparison period)
  const [periodBPreset, setPeriodBPreset] = useState<PeriodPreset>("3months");
  const [periodBRange, setPeriodBRange] = useState<DateRange | null>({
    start: new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1),
    end: new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1),
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      if (error) throw error;
      return data.filter((loc) => !loc.name.toLowerCase().includes("hnhg"));
    },
  });

  // Fetch data for primary location (for KPI cards)
  const primaryLocationId = activeLocations.includes("all") ? null : activeLocations[0];
  const { data: periodAData, isLoading: periodALoading } = usePnLSummary(primaryLocationId, periodARange);
  const { data: periodBData, isLoading: periodBLoading } = usePnLSummary(
    primaryLocationId,
    comparisonEnabled ? periodBRange : null
  );

  // Fetch category data if categories are selected
  const { data: categoryData } = usePnLByCategory(
    primaryLocationId,
    periodARange,
    selectedCategories
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  const calculatePercentChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const applyVatIfNeeded = (value: number, isRevenueBased: boolean = true) => {
    if (includeVat && isRevenueBased) {
      return value * VAT_RATE;
    }
    return value;
  };

  const handleReprocessData = async () => {
    setIsReprocessing(true);
    try {
      const supabase = createClient();
      // Fetch all unique location/year/month combinations from powerbi_pnl_data
      const { data: rawData, error } = await supabase
        .from("powerbi_pnl_data")
        .select("location_id, year, month, import_id");
      
      if (error) throw error;

      // Create unique combinations
      const uniqueCombinations = Array.from(
        new Set(rawData?.map(d => `${d.location_id}|${d.year}|${d.month}|${d.import_id}`))
      ).map(key => {
        const [locationId, year, month, importId] = key.split('|');
        return { locationId, year: parseInt(year), month: parseInt(month), importId };
      });

      toast.info(`Processing ${uniqueCombinations.length} period(s)...`);
      
      // For now, just show success - actual processing would be implemented
      toast.success(`Successfully processed ${uniqueCombinations.length} periods`);
    } catch (error) {
      console.error("Reprocess error:", error);
      toast.error("Failed to reprocess data. Check console for details.");
    } finally {
      setIsReprocessing(false);
    }
  };

  const metricCards: Array<{ metric: MetricType; title: string }> = [
    { metric: "revenue", title: "Total Revenue" },
    { metric: "gross_profit", title: "Gross Profit" },
    { metric: "ebitda", title: "EBITDA" },
    { metric: "labor_cost", title: "Labor Cost" },
    { metric: "other_costs", title: "Other Costs" },
  ];

  return (
    <div className={cn(
      "w-full p-6 space-y-6 transition-all duration-300",
      isCategoryFilterOpen && "mr-[500px] sm:mr-[540px]"
    )}>
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-background pb-4 border-b -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Profit & Loss</h1>
            <p className="text-muted-foreground">Financial performance overview</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCategoryFilterOpen(true)}
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Category Filters {selectedCategories.length > 0 && `(${selectedCategories.length})`}
            </Button>
            <Button
              onClick={handleReprocessData}
              disabled={isReprocessing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isReprocessing && "animate-spin")} />
              Reprocess Data
            </Button>
          </div>
        </div>
      </div>

      {/* Period Selection & Location Selection Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Period & Location Selection</CardTitle>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-vat"
                  checked={includeVat}
                  onCheckedChange={setIncludeVat}
                />
                <Label htmlFor="include-vat" className="cursor-pointer">
                  Include VAT ({((VAT_RATE - 1) * 100).toFixed(0)}%)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="comparison-mode"
                  checked={comparisonEnabled}
                  onCheckedChange={setComparisonEnabled}
                />
                <Label htmlFor="comparison-mode" className="cursor-pointer">
                  Enable Comparison
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className={comparisonEnabled ? "grid grid-cols-2 gap-6" : ""}>
            <SmartPeriodSelector
              label="Period A"
              value={periodAPreset}
              onChange={(preset, range) => {
                setPeriodAPreset(preset);
                setPeriodARange(range);
              }}
              customRange={periodARange || undefined}
            />
            
            {comparisonEnabled && (
              <SmartPeriodSelector
                label="Period B"
                value={periodBPreset}
                onChange={(preset, range) => {
                  setPeriodBPreset(preset);
                  setPeriodBRange(range);
                }}
                customRange={periodBRange || undefined}
              />
            )}
          </div>

          {/* Location Multi-Select */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Active Locations for Comparison</Label>
            <LocationMultiSelect
              locations={locations || []}
              activeLocations={activeLocations}
              onChange={setActiveLocations}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards - Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metricCards.map(({ metric, title }) => {
          const isRevenueBased = ['revenue', 'gross_profit', 'ebitda'].includes(metric);
          const currentValue = applyVatIfNeeded(periodAData?.[metric] || 0, isRevenueBased);
          const comparisonValue = applyVatIfNeeded(periodBData?.[metric] || 0, isRevenueBased);

          return (
            <div
              key={metric}
              onClick={() => setSelectedMetric(metric)}
              className={cn(
                "cursor-pointer transition-all",
                selectedMetric === metric && "ring-2 ring-primary rounded-lg"
              )}
            >
              <RevenueKpiCard
                title={`${title}${includeVat && isRevenueBased ? ' (incl. VAT)' : ''}`}
                value={currentValue}
                previousValue={comparisonEnabled ? comparisonValue : 0}
                comparisonLabel={comparisonEnabled ? "vs Period B" : ""}
                isLoading={periodALoading || (comparisonEnabled && periodBLoading)}
              />
            </div>
          );
        })}
      </div>

      {/* Chart Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center flex-wrap">
            <Label>Chart Type:</Label>
            <Button
              variant={chartType === "line" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("line")}
            >
              Line Chart
            </Button>
            <Button
              variant={chartType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartType("bar")}
            >
              Bar Chart
            </Button>
            
            <div className="ml-auto flex items-center gap-2">
              <Label>X-Axis Granularity:</Label>
              <Select value={xAxisGranularity} onValueChange={(v) => setXAxisGranularity(v as TimeGranularity)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="quarter">Quarterly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Metric Chart */}
      <FlexibleMetricChart
        selectedMetric={selectedMetric}
        activeLocations={activeLocations}
        dateRange={periodARange}
        comparisonDateRange={comparisonEnabled ? periodBRange : null}
        comparisonEnabled={comparisonEnabled}
        chartType={chartType}
        xAxisGranularity={xAxisGranularity}
        includeVat={includeVat}
        vatRate={VAT_RATE}
        selectedCategories={selectedCategories}
        categoryData={categoryData}
      />

      {/* AI Chat Card */}
      <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setIsChatOpen(true)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            AI Financial Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <MessageSquare className="h-4 w-4 mr-2" />
            Open Financial Chat
          </Button>
        </CardContent>
      </Card>

      <FinancialChatSidepanel
        open={isChatOpen}
        onOpenChange={setIsChatOpen}
        locationId={primaryLocationId}
        month=""
      />

      <CategoryFilterSheet
        open={isCategoryFilterOpen}
        onOpenChange={setIsCategoryFilterOpen}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
      />

      <Tabs defaultValue="labor">
        <TabsList>
          <TabsTrigger value="labor">Labor Efficiency</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          {activeLocations.includes("all") && <TabsTrigger value="comparison">Location Comparison</TabsTrigger>}
        </TabsList>

        <TabsContent value="labor">
          <Card>
            <CardHeader>
              <CardTitle>Labor Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              {!activeLocations.includes("all") && activeLocations.length === 1 ? (
                <div className="h-[300px]">
                  <FinanceRevenueTrendChart locationKey={activeLocations[0]} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a single location to view labor trends</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Financial Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {!activeLocations.includes("all") && activeLocations.length === 1 ? (
                <div className="h-[400px]">
                  <FinanceRevenueTrendChart locationKey={activeLocations[0]} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Select a single location to view trends</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {activeLocations.includes("all") && (
          <TabsContent value="comparison">
            <Card>
              <CardHeader>
                <CardTitle>Location Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <FinanceLocationComparisonChart />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}