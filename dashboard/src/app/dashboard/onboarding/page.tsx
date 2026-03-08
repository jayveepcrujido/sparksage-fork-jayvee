"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, UserPlus, Info, Globe } from "lucide-react";
import { api, DiscordChannel } from "@/lib/api";
import { useGuild } from "@/components/providers/guild-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const onboardingSchema = z.object({
  WELCOME_ENABLED: z.boolean(),
  WELCOME_DM_ENABLED: z.boolean(),
  WELCOME_CHANNEL_ID: z.string(),
  WELCOME_MESSAGE: z.string().min(1),
  WELCOME_RULES: z.string(),
  WELCOME_LINKS: z.string(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

const DEFAULTS: OnboardingForm = {
  WELCOME_ENABLED: false,
  WELCOME_DM_ENABLED: false,
  WELCOME_CHANNEL_ID: "",
  WELCOME_MESSAGE: "Welcome {user} to {server}! We're glad to have you here.",
  WELCOME_RULES: "",
  WELCOME_LINKS: "",
};

export default function OnboardingPage() {
  const { data: session } = useSession();
  const { selectedGuildId, selectedGuild } = useGuild();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);

  const token = (session as { accessToken?: string })?.accessToken;

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: DEFAULTS,
  });

  // Fetch config and channels for selected guild
  useEffect(() => {
    if (!token || !selectedGuildId) return;
    
    setLoading(true);
    Promise.all([
      api.getGuildConfig(token, selectedGuildId),
      api.getGuildChannels(token, selectedGuildId)
    ])
      .then(([{ config }, chanRes]) => {
        setChannels(chanRes.channels);
        const mapped: Partial<OnboardingForm> = {};
        for (const key of Object.keys(DEFAULTS) as (keyof OnboardingForm)[]) {
          if (config[key] !== undefined) {
            if (key === "WELCOME_ENABLED" || key === "WELCOME_DM_ENABLED") {
              mapped[key] = config[key] === "true";
            } else {
              (mapped as any)[key] = config[key];
            }
          }
        }
        form.reset({ ...DEFAULTS, ...mapped });
      })
      .catch(() => toast.error("Failed to load onboarding settings"))
      .finally(() => setLoading(false));
  }, [token, selectedGuildId]);

  async function onSubmit(values: OnboardingForm) {
    if (!token || !selectedGuildId) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const [key, val] of Object.entries(values)) {
        payload[key] = String(val);
      }
      await api.updateGuildConfig(token, selectedGuildId, payload);
      toast.success("Onboarding settings saved");
    } catch (err) {
      toast.error("Failed to save onboarding settings");
    } finally {
      setSaving(false);
    }
  }

  if (!selectedGuildId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Globe className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold">No Server Selected</h2>
        <p className="text-muted-foreground">Please select a server from the sidebar to configure its onboarding.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Member Onboarding</h1>
          <p className="text-muted-foreground">Configure how SparkSage welcomes new members to {selectedGuild?.name}.</p>
        </div>
        <UserPlus className="h-8 w-8 text-primary/20" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Welcome Channel Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Public Welcome</CardTitle>
              <CardDescription>Post a welcome message in a public channel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Enable Channel Message</Label>
                <RadioGroup
                  value={form.watch("WELCOME_ENABLED") ? "true" : "false"}
                  onValueChange={(val) => form.setValue("WELCOME_ENABLED", val === "true")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="welcome-on" />
                    <Label htmlFor="welcome-on" className="font-normal text-xs cursor-pointer">Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="welcome-off" />
                    <Label htmlFor="welcome-off" className="font-normal text-xs cursor-pointer">Disabled</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="welcome-channel">Target Channel</Label>
                <select
                  id="welcome-channel"
                  value={form.watch("WELCOME_CHANNEL_ID")}
                  onChange={(e) => form.setValue("WELCOME_CHANNEL_ID", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Select a channel...</option>
                  {channels.map(ch => (
                    <option key={ch.id} value={ch.id}>#{ch.name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Welcome DM Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Direct Message</CardTitle>
              <CardDescription>Send a private welcome message to new members.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Enable DM Message</Label>
                <RadioGroup
                  value={form.watch("WELCOME_DM_ENABLED") ? "true" : "false"}
                  onValueChange={(val) => form.setValue("WELCOME_DM_ENABLED", val === "true")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="dm-on" />
                    <Label htmlFor="dm-on" className="font-normal text-xs cursor-pointer">Enabled</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="dm-off" />
                    <Label htmlFor="dm-off" className="font-normal text-xs cursor-pointer">Disabled</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="p-3 bg-muted/50 rounded-md flex gap-2 items-start">
                <Info className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Note: DMs may fail if the member has "Allow direct messages from server members" turned off.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Message Content</CardTitle>
            <CardDescription>Customize the content of the welcome embed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="welcome-message">Greeting Message</Label>
              <Textarea
                id="welcome-message"
                {...form.register("WELCOME_MESSAGE")}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Placeholders: <code className="bg-muted px-1 rounded">{"{user}"}</code> (mention), <code className="bg-muted px-1 rounded">{"{server}"}</code> (name).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-rules">Server Rules Summary</Label>
              <Textarea
                id="welcome-rules"
                {...form.register("WELCOME_RULES")}
                placeholder="1. Be respectful&#10;2. No spam..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-links">Key Channel Links</Label>
              <Textarea
                id="welcome-links"
                {...form.register("WELCOME_LINKS")}
                placeholder="Rules: <#id>&#10;Announcements: <#id>"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Tip: Copy a channel ID and wrap it in <code className="bg-muted px-1 rounded">{"<#id>"}</code> to create a clickable link.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="w-full md:w-auto px-8">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Onboarding Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
