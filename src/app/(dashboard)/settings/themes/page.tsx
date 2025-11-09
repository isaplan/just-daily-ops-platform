"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
<<<<<<< HEAD
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
=======

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
>>>>>>> eitje-api
        </CardContent>
      </Card>
    </div>
  );
}

<<<<<<< HEAD
=======

>>>>>>> eitje-api
