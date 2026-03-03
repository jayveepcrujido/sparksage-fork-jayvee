"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save, UserPlus, Info } from "lucide-react";
import { api, BotStatus } from "@/lib/api";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [selectedGuild, setSelectedGuild] = useState<string>("");

  const token = (session as { accessToken?: string })?.accessToken;

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: DEFAULTS,
  });

  // Fetch bot status to get guilds
  useEffect(() => {
    if (!token) return;
    api.getBotStatus(token)
      .then(s => {
        setStatus(s);
        if (s.guilds.length > 0 && !selectedGuild) {
          setSelectedGuild(s.guilds[0].id);
        } else if (s.guilds.length === 0) {
          setLoading(false);
        }
      })
      .catch(() => {
        toast.error("Failed to load bot status");
        setLoading(false);
      });
  }, [token]);

  // Fetch config for selected guild
  useEffect(() => {
    if (!token || !selectedGuild) {
      if (status && status.guilds.length === 0) setLoading(false);
      return;
    }
    
    setLoading(true);
    api.getGuildConfig(token, selectedGuild)
      .then(({ config }) => {
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
  }, [token, selectedGuild, status]);

  async function onSubmit(values: OnboardingForm) {
    if (!token || !selectedGuild) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const [key, val] of Object.entries(values)) {
        payload[key] = String(val);
      }
      await api.updateGuildConfig(token, selectedGuild, payload);
      toast.success("Onboarding settings saved");
    } catch (err) {
      toast.error("Failed to save onboarding settings");
    } finally {
      setSaving(false);
    }
  }

  if (!status && loading) {
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
          <p className="text-muted-foreground">Configure how SparkSage welcomes new members to each server.</p>
        </div>
        <UserPlus className="h-8 w-8 text-primary/20" />
      </div>

      {status && status.guilds.length > 1 && (
        <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
          <div className="flex gap-2">
            {status.guilds.map(guild => (
              <Button 
                key={guild.id}
                variant={selectedGuild === guild.id ? "default" : "outline"}
                onClick={() => setSelectedGuild(guild.id)}
                size="sm"
                className="whitespace-nowrap"
              >
                {guild.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {selectedGuild ? (
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
                      <Label htmlFor="welcome-on" className="font-normal text-xs">Enabled</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="welcome-off" />
                      <Label htmlFor="welcome-off" className="font-normal text-xs">Disabled</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="welcome-channel">Channel ID</Label>
                  <Input
                    id="welcome-channel"
                    {...form.register("WELCOME_CHANNEL_ID")}
                    placeholder="e.g. 123456789012345678"
                  />
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
                      <Label htmlFor="dm-on" className="font-normal text-xs">Enabled</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="dm-off" />
                      <Label htmlFor="dm-off" className="font-normal text-xs">Disabled</Label>
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
              Save Settings for {status?.guilds.find(g => g.id === selectedGuild)?.name}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No servers found. Invite SparkSage to a server to get started.</p>
        </div>
      )}
    </div>
  );
}
