import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { useState } from "react";

interface ChartDataPoint {
  date: string;
  revenue: number;
  foodRevenue?: number;
  beverageRevenue?: number;
}

interface RevenueTrendChartProps {
  data: ChartDataPoint[];
  isLoading?: boolean;
}

export function RevenueTrendChart({ data, isLoading = false }: RevenueTrendChartProps) {
  const [metric, setMetric] = useState<"total" | "split">("total");

  const chartConfig = {
    revenue: {
      label: "Total Revenue",
      color: "hsl(var(--primary))",
    },
    foodRevenue: {
      label: "Food Revenue",
      color: "hsl(var(--chart-1))",
    },
    beverageRevenue: {
      label: "Beverage Revenue",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Revenue Trend</CardTitle>
        <Select value={metric} onValueChange={(value) => setMetric(value as "total" | "split")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total">Total Revenue</SelectItem>
            <SelectItem value="split">Food vs Beverage</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[400px] bg-muted animate-pulse rounded" />
        ) : (
          <ChartContainer config={chartConfig} className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tickFormatter={(value) => value}
                />
                <YAxis
                  className="text-xs"
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {metric === "total" ? (
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="foodRevenue"
                      stroke="var(--color-foodRevenue)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="beverageRevenue"
                      stroke="var(--color-beverageRevenue)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
