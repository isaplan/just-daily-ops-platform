"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";

export default function SettingsThemesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Palette className="h-8 w-8" />
          Themes Settings
        </h1>
        <p className="text-muted-foreground">
          Customize application themes and appearance
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <CardDescription>Manage application themes and styling</CardDescription>
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


