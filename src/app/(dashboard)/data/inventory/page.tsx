"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
<<<<<<< HEAD
import { Package } from "lucide-react";

export default function DataInventoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          Inventory Data
        </h1>
        <p className="text-muted-foreground">
          View and manage inventory data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Data</CardTitle>
          <CardDescription>View and manage inventory data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Content will be implemented here</p>
          </div>
=======

export default function DataInventoryPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Data - Inventory - APICBASE Dashboard</CardTitle>
          <CardDescription>APICBASE inventory dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This page is under development.</p>
>>>>>>> eitje-api
        </CardContent>
      </Card>
    </div>
  );
}

<<<<<<< HEAD
=======

>>>>>>> eitje-api
