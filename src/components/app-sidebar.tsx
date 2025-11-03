"use client";

import { useState, useEffect } from "react";
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
  ChevronRight,
  Clock,
  DollarSign as DollarSignIcon,
  UserCheck,
  Building2,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserRole } from "@/hooks/useUserRole";
import { useDepartment } from "@/contexts/DepartmentContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

// Type definitions for menu items
type MenuItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  isCollapsible?: boolean;
  children?: MenuItem[];
};

const ordersItems: MenuItem[] = [
  { title: "Create Order", url: "/create-order", icon: ShoppingCart },
  { title: "Check Order", url: "/check-order", icon: ClipboardCheck },
  { title: "Send Order", url: "/send-order", icon: Send },
  { title: "All Orders", url: "/ordered-list", icon: FileText },
  { title: "Returns", url: "/returns", icon: RotateCcw },
];

const stockItems: MenuItem[] = [
  { title: "Stock Levels", url: "/stock", icon: Package },
  { title: "Monthly Stock Count", url: "/monthly-stock-count", icon: ClipboardList },
  { title: "Sales Import", url: "/sales-import", icon: TrendingUp },
  { title: "Variance Analysis", url: "/variance-analysis", icon: BarChartBig },
  { title: "Stock History", url: "/products-history", icon: BarChart3 },
  { title: "All Products", url: "/products", icon: Box },
  { title: "Product Recipes", url: "/recipes", icon: Utensils },
];

const operationsItems: MenuItem[] = [
  { title: "Combined Products", url: "/combined-products", icon: TrendingUp },
  { title: "Daily Waste", url: "/waste", icon: Trash2 },
  { title: "Menu Builder", url: "/menu/builder", icon: Utensils },
];

// View Data child items
const viewDataItems: MenuItem[] = [
  { title: "Hours", url: "/finance/data/eitje-data/hours", icon: Clock },
  { title: "Labor Costs", url: "/finance/data/eitje-data/labor-costs", icon: DollarSignIcon },
  { title: "Sales by Bork", url: "/finance/data/eitje-data/finance", icon: TrendingUp },
  { title: "Data Imported", url: "/finance/data/eitje-data/data-imported", icon: Database },
  { title: "Workers", url: "/finance/data/eitje-data/workers", icon: UserCheck },
  { title: "Locations & Teams", url: "/finance/data/eitje-data/locations-teams", icon: Building2 },
];

const financeItems: MenuItem[] = [
  { title: "Profit & Loss", url: "/finance/pnl", icon: DollarSign },
  { title: "P&L Balance", url: "/finance/pnl/balance", icon: BarChartBig },
  { title: "Sales", url: "/finance/sales", icon: TrendingUp },
  { title: "Labor", url: "/finance/labor", icon: Users },
  { title: "Analytics & AI", url: "/finance/analytics", icon: BarChart3 },
  { title: "View Data", url: "/finance/data", icon: Database, isCollapsible: true, children: viewDataItems },
  { title: "Financial Insights", url: "/finance/insights", icon: Sparkles },
  { title: "Financial Reports", url: "/finance/reports", icon: FileText },
];

const adminItems: MenuItem[] = [
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
  
  // Check if any child route is active (for auto-expanding collapsible items)
  const isChildActive = (children: MenuItem[] | undefined) => {
    return children?.some((child) => pathname.startsWith(child.url)) || false;
  };
  
  // State for collapsible "View Data" menu
  const viewDataItem = financeItems.find(item => item.isCollapsible);
  const shouldBeOpen = viewDataItem?.children ? isChildActive(viewDataItem.children) : false;
  const [isViewDataOpen, setIsViewDataOpen] = useState(shouldBeOpen);
  
  // Auto-expand "View Data" if any child route is active
  useEffect(() => {
    const item = financeItems.find(item => item.isCollapsible);
    if (item?.children) {
      const isActive = isChildActive(item.children);
      setIsViewDataOpen(isActive);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
    "back-office": {
      color: "border-purple-400",
      label: "Back-Office Department",
      items: [],
      dashboard: "/departments/back-office",
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
            <Select value={department} onValueChange={(value) => setDepartment(value as typeof department)}>
              <SelectTrigger className="w-full h-9 border-2 border-black">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orders">Orders</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="back-office">Back-Office</SelectItem>
              </SelectContent>
            </Select>
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
              {currentConfig.items.map((item) => {
                // Render collapsible item if it has children
                if (item.isCollapsible && item.children) {
                  const isOpen = item.title === "View Data" ? isViewDataOpen : false;
                  const isParentActive = isActive(item.url) || isChildActive(item.children);
                  
                  return (
                    <Collapsible 
                      key={item.title} 
                      open={isOpen} 
                      onOpenChange={item.title === "View Data" ? setIsViewDataOpen : undefined}
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton isActive={isParentActive}>
                            <item.icon />
                            <span>{item.title}</span>
                            <ChevronRight className={cn(
                              "ml-auto transition-transform duration-200",
                              isOpen && "rotate-90"
                            )} />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children?.map((child: MenuItem) => (
                              <SidebarMenuSubItem key={child.title}>
                                <SidebarMenuSubButton asChild isActive={isActive(child.url)}>
                                  <Link href={child.url}>
                                    <span>{child.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }
                
                // Render regular item
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/docs") || pathname.startsWith("/docs/")}>
                  <Link href="/docs">
                    <FileText />
                    <span>Documentation</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/design-systems") || pathname.startsWith("/design-systems/")}>
                  <Link href="/design-systems">
                    <Palette />
                    <span>Design Systems</span>
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
