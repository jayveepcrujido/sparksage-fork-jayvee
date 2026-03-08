"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Zap } from "lucide-react";
import { useGuild } from "@/components/providers/guild-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function GuildSelector() {
  const { guilds, selectedGuildId, setSelectedGuildId, selectedGuild } = useGuild();

  if (guilds.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton disabled>
            <Zap className="mr-2 h-4 w-4" />
            <span>No Servers Found</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Zap className="h-4 w-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {selectedGuild?.name || "Select a server"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {guilds.length} Servers Available
                </span>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            {guilds.map((guild) => (
              <DropdownMenuItem
                key={guild.id}
                onClick={() => setSelectedGuildId(guild.id)}
                className="gap-2 p-2"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                  <Zap className="h-3 w-3" />
                </div>
                {guild.name}
                {selectedGuildId === guild.id && (
                  <Check className="ml-auto h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
