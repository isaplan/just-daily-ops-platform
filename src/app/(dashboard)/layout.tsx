"use client";

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Providers } from "@/components/providers"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LayoutDashboard, Plus, User } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <div className="flex h-screen">
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between border-b-2 border-black bg-white px-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-1" />
              <div className="flex items-center gap-3">
                <Image 
                  src="/logo.svg" 
                  alt="Just Daily Ops Logo" 
                  width={30} 
                  height={30}
                />
                <span className="font-semibold text-lg">Just Daily Ops</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/finance">
                <Button variant="ghost" size="sm" className="gap-2 shadow-none">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Button size="sm" className="gap-2 shadow-none">
                <Plus className="h-4 w-4" />
                Create
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  U
                </AvatarFallback>
              </Avatar>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </Providers>
  )
}
