"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

export default function OperationsLocationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MapPin className="h-8 w-8" />
          Locations
        </h1>
        <p className="text-muted-foreground">
          Manage locations and venues
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Locations Management</CardTitle>
          <CardDescription>View and manage all locations</CardDescription>
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

