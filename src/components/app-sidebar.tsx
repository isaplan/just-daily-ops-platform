"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShoppingCart,
  ClipboardCheck,
  Send,
  FileText,
  RotateCcw,
  Package,
  BarChart3,
  Box,
  Truck,
  MapPin,
  Activity,
  Palette,
  Users,
  LayoutDashboard,
  Utensils,
  ClipboardList,
  TrendingUp,
  BarChartBig,
  DollarSign,
  Upload,
  Sparkles,
  TrendingDown,
  Trash2,
  Database,
  Wifi,
  Map,
  Menu,
  X,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserRole } from "@/hooks/useUserRole";
import { useDepartment } from "@/contexts/DepartmentContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ordersItems = [
  { title: "Create Order", url: "/create-order", icon: ShoppingCart },
  { title: "Check Order", url: "/check-order", icon: ClipboardCheck },
  { title: "Send Order", url: "/send-order", icon: Send },
  { title: "All Orders", url: "/ordered-list", icon: FileText },
  { title: "Returns", url: "/returns", icon: RotateCcw },
];

const stockItems = [
  { title: "Stock Levels", url: "/stock", icon: Package },
  { title: "Monthly Stock Count", url: "/monthly-stock-count", icon: ClipboardList },
  { title: "Sales Import", url: "/sales-import", icon: TrendingUp },
  { title: "Variance Analysis", url: "/variance-analysis", icon: BarChartBig },
  { title: "Stock History", url: "/products-history", icon: BarChart3 },
  { title: "All Products", url: "/products", icon: Box },
  { title: "Product Recipes", url: "/recipes", icon: Utensils },
];

const operationsItems = [
  { title: "Combined Products", url: "/combined-products", icon: TrendingUp },
  { title: "Daily Waste", url: "/waste", icon: Trash2 },
  { title: "Menu Builder", url: "/menu/builder", icon: Utensils },
];

const financeItems = [
  { title: "Profit & Loss", url: "/finance/pnl", icon: DollarSign },
  { title: "P&L Balance", url: "/finance/pnl/balance", icon: BarChartBig },
  { title: "Sales", url: "/finance/sales", icon: TrendingUp },
  { title: "Labor", url: "/finance/labor", icon: Users },
  { title: "Analytics & AI", url: "/finance/analytics", icon: BarChart3 },
  { title: "View Data", url: "/finance/data", icon: Database },
  { title: "Financial Insights", url: "/finance/insights", icon: Sparkles },
  { title: "Financial Reports", url: "/finance/reports", icon: FileText },
];

const adminItems = [
  { title: "Suppliers", url: "/suppliers", icon: Truck },
  { title: "Locations", url: "/locations", icon: MapPin },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Member Activity", url: "/member-activity", icon: Activity },
  { title: "Package Usage", url: "/cloud-admin/package-usage", icon: Package },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const { isOwner } = useUserRole();
  const { department, setDepartment } = useDepartment();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => pathname === path;

  const departmentConfig = {
    orders: {
      color: "border-orange-400",
      label: "Orders Department",
      items: ordersItems,
      dashboard: "/departments/orders",
    },
    stock: {
      color: "border-green-400",
      label: "Stock Department",
      items: stockItems,
      dashboard: "/departments/stock",
    },
    operations: {
      color: "border-blue-400",
      label: "Operations Department",
      items: operationsItems,
      dashboard: "/departments/operations",
    },
    finance: {
      color: "border-red-400",
      label: "Finance Department",
      items: financeItems,
      dashboard: "/departments/finance",
    },
  };

  const currentConfig = departmentConfig[department];

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-black bg-white">
      <SidebarContent className="flex flex-col">
        {/* Department Switcher */}
        {!collapsed && (
          <div className="p-4 space-y-2 border-b-2 border-black">
            <p className="text-xs text-muted-foreground mb-2">Switch Department</p>
            <div className="grid grid-cols-2 gap-1">
              <Button
                size="sm"
                variant={department === "orders" ? "default" : "ghost"}
                onClick={() => setDepartment("orders")}
                className={cn(
                  "text-xs h-8 border-2 border-black",
                  department === "orders" 
                    ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                    : "bg-transparent text-foreground hover:bg-muted"
                )}
              >
                Orders
              </Button>
              <Button
                size="sm"
                variant={department === "stock" ? "default" : "ghost"}
                onClick={() => setDepartment("stock")}
                className={cn(
                  "text-xs h-8 border-2 border-black",
                  department === "stock" 
                    ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                    : "bg-transparent text-foreground hover:bg-muted"
                )}
              >
                Stock
              </Button>
              <Button
                size="sm"
                variant={department === "operations" ? "default" : "ghost"}
                onClick={() => setDepartment("operations")}
                className={cn(
                  "text-xs h-8 border-2 border-black",
                  department === "operations" 
                    ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                    : "bg-transparent text-foreground hover:bg-muted"
                )}
              >
                Operations
              </Button>
              <Button
                size="sm"
                variant={department === "finance" ? "default" : "ghost"}
                onClick={() => setDepartment("finance")}
                className={cn(
                  "text-xs h-8 border-2 border-black",
                  department === "finance" 
                    ? "bg-accent text-accent-foreground hover:bg-accent/90" 
                    : "bg-transparent text-foreground hover:bg-muted"
                )}
              >
                Finance
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">

        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance")}>
                  <Link href="/finance">
                    <LayoutDashboard />
                    <span>Main Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance")}>
                  <Link href="/finance">
                    <LayoutDashboard />
                    <span>{currentConfig.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Department Pages */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            {currentConfig.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentConfig.items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

          {/* Admin Section - Only visible in Operations for Owner/Admin */}
          {department === "operations" && isOwner() && (
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.url} asChild>
                    <Link href={item.url} aria-current={isActive(item.url) ? "page" : undefined}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </div>

        {/* Import & Connection Section - Sticky Bottom */}
        <div className="mt-auto border-t-2 border-black pb-4">
          <SidebarGroup>
            <SidebarGroupLabel>Import & Connection</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/imports")}>
                  <Link href="/finance/imports">
                    <Upload />
                    <span>Data Imports</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/bork-api")}>
                  <Link href="/finance/bork-api">
                    <Wifi />
                    <span>Bork API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/eitje-api")}>
                  <Link href="/finance/eitje-api">
                    <Wifi />
                    <span>Eitje API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/finance/formitable-api")}>
                  <Link href="/finance/formitable-api">
                    <Wifi />
                    <span>Formitable API Connect</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/roadmap")}>
                  <Link href="/roadmap">
                    <Map />
                    <span>Roadmap</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
