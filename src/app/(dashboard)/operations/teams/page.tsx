"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck } from "lucide-react";

export default function OperationsTeamsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <UserCheck className="h-8 w-8" />
          Teams
        </h1>
        <p className="text-muted-foreground">
          Manage teams and team members
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teams Management</CardTitle>
          <CardDescription>View and manage all teams</CardDescription>
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

