"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api, BotStatus, DiscordGuild } from "@/lib/api";

interface GuildContextType {
  guilds: DiscordGuild[];
  selectedGuildId: string | null;
  setSelectedGuildId: (id: string | null) => void;
  selectedGuild: DiscordGuild | null;
  loading: boolean;
  refreshGuilds: () => Promise<void>;
}

const GuildContext = createContext<GuildContextType | undefined>(undefined);

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [guilds, setGuilds] = useState<DiscordGuild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const token = (session as { accessToken?: string })?.accessToken;

  const fetchBotStatus = async () => {
    if (!token) return;
    try {
      const status = await api.getBotStatus(token);
      setGuilds(status.guilds || []);
      
      // Select first guild by default if none selected
      if (!selectedGuildId && status.guilds && status.guilds.length > 0) {
        // Try to get from localStorage first
        const saved = localStorage.getItem("selectedGuildId");
        if (saved && status.guilds.some(g => g.id === saved)) {
          setSelectedGuildId(saved);
        } else {
          setSelectedGuildId(status.guilds[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch guilds:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBotStatus();
  }, [token]);

  useEffect(() => {
    if (selectedGuildId) {
      localStorage.setItem("selectedGuildId", selectedGuildId);
    }
  }, [selectedGuildId]);

  const selectedGuild = guilds.find((g) => g.id === selectedGuildId) || null;

  return (
    <GuildContext.Provider
      value={{
        guilds,
        selectedGuildId,
        setSelectedGuildId,
        selectedGuild,
        loading,
        refreshGuilds: fetchBotStatus,
      }}
    >
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild() {
  const context = useContext(GuildContext);
  if (context === undefined) {
    throw new Error("useGuild must be used within a GuildProvider");
  }
  return context;
}
