"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function DataLaborHoursPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="h-8 w-8" />
          Labor Data - Hours
        </h1>
        <p className="text-muted-foreground">
          View labor hours data from Eitje
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Labor Hours</CardTitle>
          <CardDescription>View and manage labor hours data</CardDescription>
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

