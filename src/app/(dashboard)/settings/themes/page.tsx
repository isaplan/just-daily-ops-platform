"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsThemesPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings - Themes</CardTitle>
          <CardDescription>Theme customization</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This page is under development.</p>
        </CardContent>
      </Card>
    </div>
  );
}


