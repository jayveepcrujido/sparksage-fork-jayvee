"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Save, Settings2, Bell, Shield, UserPlus } from "lucide-react";
import { api, DiscordChannel } from "@/lib/api";
import { useGuild } from "@/components/providers/guild-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function GuildSettings() {
  const { data: session } = useSession();
  const { selectedGuildId, selectedGuild } = useGuild();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  
  // Guild Config States
  const [config, setConfig] = useState<Record<string, string>>({
    MODERATION_ENABLED: "false",
    MOD_LOG_CHANNEL_ID: "",
    MODERATION_SENSITIVITY: "medium",
    DIGEST_ENABLED: "false",
    DIGEST_CHANNEL_ID: "",
    DIGEST_TIME: "09:00",
    ONBOARDING_ENABLED: "false",
    ONBOARDING_CHANNEL_ID: "",
  });

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token || !selectedGuildId) return;
    
    setLoading(true);
    Promise.all([
      api.getGuildChannels(token, selectedGuildId),
      api.getGuildConfig(token, selectedGuildId)
    ]).then(([chanRes, confRes]) => {
      setChannels(chanRes.channels);
      setConfig(prev => ({ ...prev, ...confRes.config }));
    })
    .catch(() => toast.error("Failed to load server settings"))
    .finally(() => setLoading(false));
  }, [token, selectedGuildId]);

  const handleUpdate = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!token || !selectedGuildId) return;
    setSaving(true);
    try {
      await api.updateGuildConfig(token, selectedGuildId, config);
      toast.success("Server settings saved successfully");
    } catch (err) {
      toast.error("Failed to save server settings");
    } finally {
      setSaving(false);
    }
  };

  if (!selectedGuildId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>
                Specific settings for <strong>{selectedGuild?.name}</strong>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Moderation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base">AI Moderation</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable AI message flagging and select a log channel.
                </p>
              </div>
              <Switch 
                checked={config.MODERATION_ENABLED === "true"}
                onCheckedChange={(checked) => handleUpdate("MODERATION_ENABLED", String(checked))}
              />
            </div>
            {config.MODERATION_ENABLED === "true" && (
              <div className="space-y-4 pl-6">
                <div className="grid gap-2">
                  <Label htmlFor="mod-log-select">Moderation Log Channel</Label>
                  <select
                    id="mod-log-select"
                    value={config.MOD_LOG_CHANNEL_ID}
                    onChange={(e) => handleUpdate("MOD_LOG_CHANNEL_ID", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select a channel...</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mod-sensitivity-select">Moderation Sensitivity</Label>
                  <select
                    id="mod-sensitivity-select"
                    value={config.MODERATION_SENSITIVITY}
                    onChange={(e) => handleUpdate("MODERATION_SENSITIVITY", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="low">Low (Extreme only)</option>
                    <option value="medium">Medium (Standard)</option>
                    <option value="high">High (Strict)</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher sensitivity flags more mild issues but may have more false positives.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Daily Digest */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base">Daily Digest</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Summarize daily activity in a specific channel.
                </p>
              </div>
              <Switch 
                checked={config.DIGEST_ENABLED === "true"}
                onCheckedChange={(checked) => handleUpdate("DIGEST_ENABLED", String(checked))}
              />
            </div>
            {config.DIGEST_ENABLED === "true" && (
              <div className="grid gap-4 pl-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="digest-channel-select">Digest Channel</Label>
                  <select
                    id="digest-channel-select"
                    value={config.DIGEST_CHANNEL_ID}
                    onChange={(e) => handleUpdate("DIGEST_CHANNEL_ID", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select a channel...</option>
                    {channels.map(ch => (
                      <option key={ch.id} value={ch.id}>#{ch.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="digest-time">Post Time (24h format)</Label>
                  <Input 
                    id="digest-time"
                    value={config.DIGEST_TIME}
                    onChange={(e) => handleUpdate("DIGEST_TIME", e.target.value)}
                    placeholder="09:00"
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Onboarding */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-base">AI Onboarding</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatically greet and guide new members.
                </p>
              </div>
              <Switch 
                checked={config.ONBOARDING_ENABLED === "true"}
                onCheckedChange={(checked) => handleUpdate("ONBOARDING_ENABLED", String(checked))}
              />
            </div>
            {config.ONBOARDING_ENABLED === "true" && (
              <div className="grid gap-2 pl-6">
                <Label htmlFor="onboarding-channel-select">Greeting Channel</Label>
                <select
                  id="onboarding-channel-select"
                  value={config.ONBOARDING_CHANNEL_ID}
                  onChange={(e) => handleUpdate("ONBOARDING_CHANNEL_ID", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a channel...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Button 
            className="w-full mt-6" 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Server Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
