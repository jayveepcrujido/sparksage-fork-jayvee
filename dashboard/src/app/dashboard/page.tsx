"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Activity, 
  Cpu, 
  Wifi, 
  WifiOff, 
  Server, 
  ArrowRight, 
  MessageSquare, 
  Hash,
  BarChart3
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { api } from "@/lib/api";
import type { BotStatus, ProviderItem, ProvidersResponse, BotStats } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DashboardOverview() {
  const { data: session } = useSession();
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [providersData, setProvidersData] = useState<ProvidersResponse | null>(null);
  const [stats, setStats] = useState<BotStats | null>(null);
  const [loading, setLoading] = useState(true);

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token) return;
    Promise.allSettled([
      api.getBotStatus(token),
      api.getProviders(token),
      api.getBotStats(token),
    ]).then(([botResult, provResult, statsResult]) => {
      if (botResult.status === "fulfilled") setBotStatus(botResult.value);
      if (provResult.status === "fulfilled") setProvidersData(provResult.value);
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      setLoading(false);
    });
  }, [token]);

  const primaryProvider = providersData?.providers.find((p) => p.is_primary);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overview</h1>
        {botStatus && (
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${botStatus.online ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-sm font-medium">{botStatus.online ? "Bot Active" : "Bot Offline"}</span>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_messages ?? "--"}</p>
            <p className="text-xs text-muted-foreground">Across all channels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Channels</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total_channels ?? "--"}</p>
            <p className="text-xs text-muted-foreground">Unique conversation IDs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Latency</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {botStatus?.latency_ms != null
                ? `${Math.round(botStatus.latency_ms)}ms`
                : "--"}
            </p>
            <p className="text-xs text-muted-foreground">Discord API response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Servers</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {botStatus?.guild_count && botStatus.guild_count > 0 
                ? botStatus.guild_count 
                : (stats?.total_guilds ?? "--")}
            </p>
            <p className="text-xs text-muted-foreground">Total Discord guilds</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        {/* Usage Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Message Volume</CardTitle>
            <CardDescription>Daily message count for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full pt-4">
              {stats?.daily_messages && stats.daily_messages.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.daily_messages}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'short' })}
                    />
                    <YAxis 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      strokeWidth={2} 
                      dot={{ r: 4, fill: '#3b82f6' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  No usage data available yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Provider Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Provider Usage</CardTitle>
            <CardDescription>Messages processed per AI provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {stats?.provider_distribution && stats.provider_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.provider_distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.provider_distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No provider data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Active Provider */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Primary AI Provider</CardTitle>
          </CardHeader>
          <CardContent>
            {primaryProvider ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Cpu className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{primaryProvider.display_name}</p>
                    <p className="text-sm font-mono text-muted-foreground">{primaryProvider.model}</p>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No primary provider set</p>
            )}
          </CardContent>
        </Card>

        {/* Fallback chain */}
        {providersData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fallback Sequence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {providersData.fallback_order.map((name, i) => {
                  const prov = providersData.providers.find((p) => p.name === name);
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 shadow-sm">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            prov?.configured ? "bg-green-500" : "bg-gray-300"
                          }`}
                        />
                        <span className="text-sm font-medium">{prov?.display_name || name}</span>
                        {prov?.is_primary && (
                          <Badge variant="outline" className="ml-1 h-5 text-[10px] uppercase tracking-wider">
                            Primary
                          </Badge>
                        )}
                      </div>
                      {i < providersData.fallback_order.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
