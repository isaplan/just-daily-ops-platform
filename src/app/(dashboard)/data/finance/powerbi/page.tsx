"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function DataFinancePowerBIPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Finance Data - PowerBI
        </h1>
        <p className="text-muted-foreground">
          PowerBI financial data and analytics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>PowerBI Data</CardTitle>
          <CardDescription>View and manage PowerBI financial data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Content will be implemented here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}






