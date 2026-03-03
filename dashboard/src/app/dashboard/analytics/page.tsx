"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from "recharts";
import { Loader2, TrendingUp, Cpu, Hash, Activity, Clock, List, ShieldAlert, DollarSign, CreditCard } from "lucide-react";
import { api, AnalyticsSummary, AnalyticsEvent, DiscordChannel } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [history, setHistory] = useState<AnalyticsEvent[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [days, setDays] = useState(7);

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token) return;
    
    setLoading(true);
    Promise.all([
      api.getAnalyticsSummary(token, days),
      api.getAnalyticsHistory(token, 50),
      api.getChannels(token).catch(() => ({ channels: [] }))
    ])
      .then(([s, h, c]) => {
        setSummary(s);
        setHistory(h.history);
        setChannels(c.channels);
      })
      .catch((err) => {
        console.error("Analytics fetch error:", err);
        toast.error("Failed to load analytics. Ensure the bot is running.");
      })
      .finally(() => setLoading(false));
  }, [token, days]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  // Map channel IDs to names for the bar chart
  const topChannelsData = summary?.top_channels.map(item => ({
    name: channels.find(c => c.id === item.id)?.name || `ID: ${item.id.slice(-4)}`,
    count: item.count
  })) || [];

  const hasData = summary && summary.daily_events.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm">Detailed metrics on bot performance and usage.</p>
        </div>
        <div className="flex gap-2 bg-muted p-1 rounded-lg w-fit">
          {[7, 30, 90].map(d => (
            <Button 
              key={d} 
              variant={days === d ? "default" : "ghost"} 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setDays(d)}
            >
              {d}D
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="history">Event History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {!hasData ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium">No Data Available Yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Analytics events will appear here once users interact with SparkSage in your Discord server.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Activity</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary?.daily_events.reduce((acc, curr) => acc + curr.count, 0) || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Events in last {days} days</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {summary?.latency_history.length 
                        ? Math.round(summary.latency_history.reduce((acc, curr) => acc + curr.latency, 0) / summary.latency_history.length) 
                        : 0}ms
                    </div>
                                <p className="text-xs text-muted-foreground">System response time</p>
                              </CardContent>
                            </Card>
                    
                            <Card>
                              <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Rate Limited</CardTitle>
                                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold">{summary?.total_rate_limited || 0}</div>
                                            <p className="text-xs text-muted-foreground">Requests blocked by quota</p>
                                          </CardContent>
                                        </Card>
                                
                                        <Card>
                                          <CardHeader className="flex flex-row items-center justify-between pb-2">
                                            <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                          </CardHeader>
                                          <CardContent>
                                            <div className="text-2xl font-bold">${(summary?.total_cost ?? 0).toFixed(4)}</div>
                                            <p className="text-xs text-muted-foreground">Approximate API spend</p>
                                          </CardContent>
                                        </Card>
                                      </div>
                                
                                  <div className="grid gap-6 md:grid-cols-2">
                {/* Activity Line Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" /> Activity Trend
                    </CardTitle>
                    <CardDescription>Daily event volume over time</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={summary?.daily_events}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" fontSize={12} tickFormatter={(val) => val.split('-').slice(1).join('/')} axisLine={false} tickLine={false} />
                        <YAxis fontSize={12} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Provider Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Cpu className="h-4 w-4 text-purple-500" /> Provider Mix
                    </CardTitle>
                    <CardDescription>Distribution of AI processing</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summary?.provider_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {summary?.provider_distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top Channels Bar Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Hash className="h-4 w-4 text-orange-500" /> Active Channels
                    </CardTitle>
                    <CardDescription>Top 5 channels by activity volume</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topChannelsData} layout="vertical" margin={{ left: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" fontSize={12} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" fontSize={12} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Latency History Line Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" /> Latency Performance
                    </CardTitle>
                    <CardDescription>Average response speed in milliseconds</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[300px] pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={summary?.latency_history}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" fontSize={12} tickFormatter={(val) => val.split('-').slice(1).join('/')} axisLine={false} tickLine={false} />
                        <YAxis fontSize={12} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="costs" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-500" /> Cost by Provider
                </CardTitle>
                <CardDescription>Estimated spend per AI service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary && Object.entries(summary.cost_by_provider ?? {}).length > 0 ? (
                    Object.entries(summary.cost_by_provider ?? {}).sort((a, b) => b[1] - a[1]).map(([name, cost]) => (
                      <div key={name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span className="text-sm font-medium uppercase">{name}</span>
                        </div>
                        <span className="text-sm font-mono">${cost.toFixed(4)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No cost data for this period.</p>
                  )}
                  <div className="h-px bg-border my-2" />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm font-bold">Total Estimated Spend</span>
                    <span className="text-sm font-bold font-mono text-emerald-600">${(summary?.total_cost ?? 0).toFixed(4)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" /> Spending Projection
                </CardTitle>
                <CardDescription>Projected costs based on current usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Daily Average</p>
                    <p className="text-lg font-bold font-mono">${((summary?.total_cost || 0) / days).toFixed(4)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Monthly Projection</p>
                    <p className="text-lg font-bold font-mono text-blue-600">${(((summary?.total_cost || 0) / days) * 30).toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800 font-medium mb-1">💡 Optimization Tip</p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Switching high-volume channels to <strong>Groq</strong> or <strong>Gemini Flash</strong> can significantly reduce your monthly spend while maintaining performance.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <List className="h-4 w-4" /> Recent Events
              </CardTitle>
              <CardDescription>The last 50 tracked bot interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded-md border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Time</th>
                      <th className="px-4 py-3 font-medium">Event</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium">Tokens</th>
                      <th className="px-4 py-3 font-medium">Latency</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">No events recorded yet.</td>
                      </tr>
                    ) : (
                      history.map((event) => (
                        <tr key={event.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(event.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              {event.event_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs uppercase">{event.provider || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{event.tokens_used || "—"}</td>
                          <td className="px-4 py-3 font-medium">{event.latency_ms ? `${event.latency_ms}ms` : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
