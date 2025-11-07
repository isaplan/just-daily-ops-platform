"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Package,
  Sparkles,
  FileText,
  Box,
  Truck,
  MapPin,
  UserCheck,
  BarChart3,
  TrendingUp,
  Clock,
  Wifi,
  Upload,
  Palette,
  Building2,
  Settings,
  Calendar,
  ChevronRight,
  ClipboardList,
  Database,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

// 0. Daily Ops items
const dailyOpsItems: MenuItem[] = [
  { title: "Labor", url: "/daily-ops/labor", icon: Users },
  { title: "Finance", url: "/daily-ops/finance", icon: DollarSign },
  { title: "Inventory", url: "/daily-ops/inventory", icon: Package },
  { title: "AI", url: "/daily-ops/ai", icon: Sparkles },
  { title: "Daily Reports & Automation", url: "/daily-ops/reports", icon: FileText },
];

// 2. Operations items
const operationsItems: MenuItem[] = [
  { title: "Products", url: "/operations/products", icon: Box },
  { title: "Suppliers", url: "/operations/suppliers", icon: Truck },
  { title: "Locations", url: "/operations/locations", icon: MapPin },
  { title: "Teams", url: "/operations/teams", icon: UserCheck },
];

// 3. Data section items
// 3.1 Finance
const dataFinanceItems: MenuItem[] = [
  { title: "PowerBI", url: "/data/finance/powerbi", icon: BarChart3 },
  { title: "Data View", url: "/data/finance/data-view", icon: Database },
];

// 3.2 Labor
const dataLaborItems: MenuItem[] = [
  { title: "Eitje Dashboard", url: "/data/labor", icon: BarChart3 },
  { title: "Data View Hours", url: "/view-data/eitje-data/hours", icon: Clock },
  { title: "Data View Finance", url: "/view-data/eitje-data/finance", icon: DollarSign },
  { title: "Data View Locations, Teams & Users", url: "/data/labor/locations-teams", icon: Building2 },
  { title: "Planning", url: "/data/labor/planning", icon: ClipboardList },
];

// 3.3 Sales
const dataSalesItems: MenuItem[] = [
  { title: "Bork Dashboard", url: "/data/sales/bork", icon: BarChart3 },
  { title: "Data View(s)", url: "/data/sales/data-view", icon: Database },
];

// 3.4 Reservations
const dataReservationsItems: MenuItem[] = [
  { title: "Formitable Dashboard", url: "/data/reservations", icon: BarChart3 },
  { title: "Data View(s)", url: "/data/reservations/data-view", icon: Database },
];

// 3.5 Inventory
const dataInventoryItems: MenuItem[] = [
  { title: "APICBASE Dashboard", url: "/data/inventory", icon: BarChart3 },
  { title: "Data View(s)", url: "/data/inventory/data-view", icon: Database },
  { title: "Orders", url: "/data/inventory/orders", icon: Package },
  { title: "Stock", url: "/data/inventory/stock", icon: Package },
];

const dataItems: MenuItem[] = [
  { 
    title: "Finance", 
    url: "/data/finance", 
    icon: DollarSign, 
    isCollapsible: true, 
    children: dataFinanceItems 
  },
  { 
    title: "Labor", 
    url: "/data/labor", 
    icon: Users, 
    isCollapsible: true, 
    children: dataLaborItems 
  },
  { 
    title: "Sales", 
    url: "/data/sales", 
    icon: TrendingUp, 
    isCollapsible: true, 
    children: dataSalesItems 
  },
  { 
    title: "Reservations", 
    url: "/data/reservations", 
    icon: Calendar, 
    isCollapsible: true, 
    children: dataReservationsItems 
  },
  { 
    title: "Inventory", 
    url: "/data/inventory", 
    icon: Package, 
    isCollapsible: true, 
    children: dataInventoryItems 
  },
];

// 4. Settings items
const settingsItems: MenuItem[] = [
  { title: "Data Import", url: "/settings/connections/data-import", icon: Upload },
  { title: "Eitje API", url: "/settings/eitje-api", icon: Wifi },
  { title: "Bork API", url: "/settings/bork-api", icon: Wifi },
  { title: "Themes", url: "/settings/themes", icon: Palette },
  { title: "Company Settings", url: "/settings/company", icon: Settings },
  { title: "Roadmap", url: "/roadmap", icon: FileText },
  { title: "Documentation", url: "/docs", icon: FileText },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const collapsed = state === "collapsed";

  const isActive = (path: string) => pathname === path || pathname === `${path}/`;
  
  // Check if any child route is active (for auto-expanding collapsible items)
  const isChildActive = (children: MenuItem[] | undefined) => {
    return children?.some((child) => pathname.startsWith(child.url)) || false;
  };
  
  // State for collapsible menus
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    dataFinance: false,
    dataLabor: false,
    dataSales: false,
    dataReservations: false,
    dataInventory: false,
  });
  
  // Auto-expand collapsible menus if any child route is active
  useEffect(() => {
    const newOpenMenus: Record<string, boolean> = {
      dataFinance: isChildActive(dataFinanceItems),
      dataLabor: isChildActive(dataLaborItems),
      dataSales: isChildActive(dataSalesItems),
      dataReservations: isChildActive(dataReservationsItems),
      dataInventory: isChildActive(dataInventoryItems),
    };
    setOpenMenus((prev) => ({ ...prev, ...newOpenMenus }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleMenu = (menuKey: string) => {
    setOpenMenus((prev) => ({ ...prev, [menuKey]: !prev[menuKey] }));
  };

  const renderMenuItem = (item: MenuItem, menuKey?: string) => {
    // Render collapsible item if it has children
    if (item.isCollapsible && item.children) {
      const menuStateKey = menuKey || item.title.toLowerCase().replace(/\s+/g, '');
      const isOpen = openMenus[menuStateKey] || false;
      const isParentActive = isActive(item.url) || isChildActive(item.children);
      
      return (
        <Collapsible 
          key={item.title} 
          open={isOpen} 
          onOpenChange={() => toggleMenu(menuStateKey)}
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
  };

  return (
    <Sidebar collapsible="icon" className="border-r-2 border-black bg-white">
      <SidebarContent className="flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {/* 0. Daily Ops - Homepage & KPIs */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Daily Ops
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/dashboard") || pathname === "/"}>
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      <span>Homepage & KPIs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {dailyOpsItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 2. Operations Section */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Operations
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {operationsItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 3. Data Section */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Data
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {dataItems.map((item) => renderMenuItem(item, 
                  item.title === "Finance" ? "dataFinance" :
                  item.title === "Labor" ? "dataLabor" :
                  item.title === "Sales" ? "dataSales" :
                  item.title === "Reservations" ? "dataReservations" :
                  item.title === "Inventory" ? "dataInventory" : undefined
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* 4. Settings Section */}
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
              Settings
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.map((item) => renderMenuItem(item))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
