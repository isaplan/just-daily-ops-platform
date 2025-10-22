"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Settings,
  BarChart3,
  FileText,
  Upload,
  Database
} from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Finance",
    href: "/finance",
    icon: DollarSign,
    children: [
      { name: "Overview", href: "/finance" },
      { name: "Bork API", href: "/finance/bork-api" },
      { name: "Imports", href: "/finance/imports" },
      { name: "P&L", href: "/finance/pnl" },
      { name: "Reports", href: "/finance/reports" },
    ],
  },
  {
    name: "Orders",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    name: "Stock",
    href: "/stock",
    icon: Package,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-white">Just Daily Ops</h1>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <div key={item.name}>
            <Link
              href={item.href}
              className={cn(
                "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                pathname === item.href
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              )}
            >
              <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
            {item.children && pathname.startsWith(item.href) && (
              <div className="ml-6 space-y-1">
                {item.children.map((child) => (
                  <Link
                    key={child.name}
                    href={child.href}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      pathname === child.href
                        ? "bg-gray-800 text-white"
                        : "text-gray-400 hover:bg-gray-700 hover:text-white"
                    )}
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-700 p-4">
        <Button variant="ghost" className="w-full justify-start text-gray-300 hover:text-white">
          <Settings className="mr-3 h-4 w-4" />
          Settings
        </Button>
      </div>
    </div>
  )
}
