"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, Target, TrendingUp, Activity, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const dashboardItems = [
  { title: "Dashboard", url: "/finance/daily-ops", icon: LayoutDashboard },
  { title: "Daily KPIs", url: "/finance/daily-ops/kpis", icon: Target },
  { title: "Trends", url: "/finance/daily-ops/trends", icon: TrendingUp },
  { title: "Productivity", url: "/finance/daily-ops/productivity", icon: Activity },
  { title: "We Never Knew This", url: "/finance/daily-ops/insights", icon: Sparkles },
];

export default function DailyOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Parent Navigation */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Operations</CardTitle>
          <CardDescription>Comprehensive daily operations management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {dashboardItems.map((item) => (
              <Link key={item.url} href={item.url}>
                <Button
                  variant={pathname === item.url ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Child Content */}
      {children}
    </div>
  );
}
