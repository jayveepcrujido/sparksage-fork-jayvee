"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { GuildProvider } from "@/components/providers/guild-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <GuildProvider>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex-1">
            <header className="flex h-14 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm font-medium text-muted-foreground">
                SparkSage Dashboard
              </span>
            </header>
            <div className="p-6">{children}</div>
          </main>
        </SidebarProvider>
      </GuildProvider>
    </SessionProvider>
  );
}
