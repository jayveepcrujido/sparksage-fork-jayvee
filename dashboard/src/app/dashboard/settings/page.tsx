"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, RotateCcw, Save, Globe, Settings2, Copy } from "lucide-react";
import { api } from "@/lib/api";
import { useGuild } from "@/components/providers/guild-provider";
import { GuildSettings } from "@/components/dashboard/guild-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const settingsSchema = z.object({
  DISCORD_TOKEN: z.string().min(1, "Discord token is required"),
  AI_PROVIDER: z.string(),
  BOT_PREFIX: z.string().min(1).max(5),
  MAX_TOKENS: z.number().min(128).max(4096),
  SYSTEM_PROMPT: z.string().min(1),
  PRESENCE_ACTIVITY_TYPE: z.string(),
  PRESENCE_ACTIVITY_NAME: z.string(),
  GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string(),
  GROQ_API_KEY: z.string(),
  GROQ_MODEL: z.string(),
  OPENROUTER_API_KEY: z.string(),
  OPENROUTER_MODEL: z.string(),
  ANTHROPIC_API_KEY: z.string(),
  ANTHROPIC_MODEL: z.string(),
  OPENAI_API_KEY: z.string(),
  OPENAI_MODEL: z.string(),
  ADMIN_PASSWORD: z.string(),
  DISCORD_CLIENT_ID: z.string(),
  DISCORD_CLIENT_SECRET: z.string(),
  TRANSLATE_ENABLED: z.boolean(),
  AUTO_TRANSLATE_ENABLED: z.boolean(),
  RATE_LIMIT_USER: z.number().min(1).max(60),
  RATE_LIMIT_GUILD: z.number().min(1).max(200),
});

type SettingsForm = z.infer<typeof settingsSchema>;

const DEFAULTS: SettingsForm = {
  DISCORD_TOKEN: "",
  AI_PROVIDER: "gemini",
  BOT_PREFIX: "!",
  MAX_TOKENS: 1024,
  SYSTEM_PROMPT:
    "You are SparkSage, a helpful and friendly AI assistant in a Discord server. Be concise, helpful, and engaging.",
  PRESENCE_ACTIVITY_TYPE: "playing",
  PRESENCE_ACTIVITY_NAME: "with AI",
  GEMINI_API_KEY: "",
  GEMINI_MODEL: "gemini-2.5-flash",
  GROQ_API_KEY: "",
  GROQ_MODEL: "llama-3.3-70b-versatile",
  OPENROUTER_API_KEY: "",
  OPENROUTER_MODEL: "deepseek/deepseek-r1:free",
  ANTHROPIC_API_KEY: "",
  ANTHROPIC_MODEL: "claude-sonnet-4-6",
  OPENAI_API_KEY: "",
  OPENAI_MODEL: "gpt-4o-mini",
  ADMIN_PASSWORD: "",
  DISCORD_CLIENT_ID: "",
  DISCORD_CLIENT_SECRET: "",
  TRANSLATE_ENABLED: true,
  AUTO_TRANSLATE_ENABLED: false,
  RATE_LIMIT_USER: 5,
  RATE_LIMIT_GUILD: 20,
};

function PasswordInput({ ...props }: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
        onClick={() => setShow(!show)}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const { selectedGuildId } = useGuild();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = (session as { accessToken?: string })?.accessToken;

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (!token) return;
    
    api.getConfig(token)
      .then(({ config }) => {
        const mapped: Partial<SettingsForm> = {};
        for (const key of Object.keys(DEFAULTS) as (keyof SettingsForm)[]) {
          if (config[key] !== undefined) {
            if (key === "MAX_TOKENS" || key === "RATE_LIMIT_USER" || key === "RATE_LIMIT_GUILD") {
              mapped[key] = Number(config[key]);
            } else if (key === "TRANSLATE_ENABLED" || key === "AUTO_TRANSLATE_ENABLED") {
              mapped[key] = config[key] === "true";
            } else {
              (mapped as any)[key] = config[key];
            }
          }
        }
        form.reset({ ...DEFAULTS, ...mapped });
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [token]);

  async function onSubmit(values: SettingsForm) {
    if (!token) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const [key, val] of Object.entries(values)) {
        const strVal = String(val);
        if (!strVal.startsWith("***")) {
          payload[key] = strVal;
        }
      }
      await api.updateConfig(token, payload);
      toast.success("Global settings saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    form.reset(DEFAULTS);
  }

  const copyBotUrl = () => {
    const url = "https://discord.com/oauth2/authorize?client_id=1473909186642317435&permissions=8515702726589504&integration_type=0&scope=bot+applications.commands";
    navigator.clipboard.writeText(url);
    toast.success("Bot Invite URL copied to clipboard!");
  };

  const maxTokens = form.watch("MAX_TOKENS");
  const systemPrompt = form.watch("SYSTEM_PROMPT");

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
        <h1 className="text-2xl font-bold">Settings</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1 h-3 w-3" /> Reset Global Defaults
          </Button>
        </div>
      </div>

      <Tabs defaultValue="server" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/50 scrollbar-hide">
          <TabsTrigger value="server" className="py-2">
            <Settings2 className="mr-2 h-4 w-4" /> Server Settings
          </TabsTrigger>
          <TabsTrigger value="global" className="py-2">
            <Globe className="mr-2 h-4 w-4" /> Global Bot Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="server" className="space-y-6 mt-4">
          {!selectedGuildId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Globe className="h-12 w-12 text-muted-foreground/20 mb-4" />
                <h3 className="text-lg font-medium">No Server Selected</h3>
                <p className="text-muted-foreground max-w-sm">
                  Please select a Discord server from the sidebar dropdown to manage its specific configurations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <GuildSettings />
          )}
        </TabsContent>

        <TabsContent value="global" className="space-y-6 mt-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="flex w-full overflow-x-auto h-auto p-1 bg-muted/20 scrollbar-hide justify-start md:grid md:grid-cols-4">
                <TabsTrigger value="general" className="py-2 px-4 whitespace-nowrap">General</TabsTrigger>
                <TabsTrigger value="providers" className="py-2 px-4 whitespace-nowrap">AI Models</TabsTrigger>
                <TabsTrigger value="translation" className="py-2 px-4 whitespace-nowrap">Translation</TabsTrigger>
                <TabsTrigger value="security" className="py-2 px-4 whitespace-nowrap">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6 mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">Bot Behavior</CardTitle>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={copyBotUrl}
                      className="h-8"
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" /> Generate Bot URL
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="ai-provider">Primary AI Provider</Label>
                      <RadioGroup
                        value={form.watch("AI_PROVIDER")}
                        onValueChange={(val) => form.setValue("AI_PROVIDER", val)}
                        className="grid grid-cols-2 sm:grid-cols-5 gap-2"
                      >
                        {[
                          ["gemini", "Gemini"],
                          ["groq", "Groq"],
                          ["openrouter", "OpenRouter"],
                          ["anthropic", "Anthropic"],
                          ["openai", "OpenAI"],
                        ].map(([id, label]) => (
                          <div key={id} className="flex items-center space-x-2 border rounded-md p-2 cursor-pointer hover:bg-muted/50">
                            <RadioGroupItem value={id} id={`provider-${id}`} />
                            <Label htmlFor={`provider-${id}`} className="font-normal cursor-pointer text-xs">{label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="prefix">Command Prefix</Label>
                        <Input
                          id="prefix"
                          {...form.register("BOT_PREFIX")}
                          className="w-24"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Max Tokens</Label>
                          <span className="text-sm font-mono tabular-nums text-muted-foreground">
                            {maxTokens}
                          </span>
                        </div>
                        <Slider
                          value={[maxTokens]}
                          onValueChange={([val]) => form.setValue("MAX_TOKENS", val)}
                          min={128}
                          max={4096}
                          step={64}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label>Global Rate Limiting (per minute)</Label>
                      <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">User Limit</span>
                            <span className="font-mono">{form.watch("RATE_LIMIT_USER")}</span>
                          </div>
                          <Slider
                            value={[form.watch("RATE_LIMIT_USER")]}
                            onValueChange={([val]) => form.setValue("RATE_LIMIT_USER", val)}
                            min={1}
                            max={60}
                            step={1}
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Server Limit</span>
                            <span className="font-mono">{form.watch("RATE_LIMIT_GUILD")}</span>
                          </div>
                          <Slider
                            value={[form.watch("RATE_LIMIT_GUILD")]}
                            onValueChange={([val]) => form.setValue("RATE_LIMIT_GUILD", val)}
                            min={1}
                            max={200}
                            step={5}
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="system-prompt">Default System Prompt</Label>
                        <span className="text-xs text-muted-foreground">
                          {systemPrompt?.length || 0} characters
                        </span>
                      </div>
                      <Textarea
                        id="system-prompt"
                        {...form.register("SYSTEM_PROMPT")}
                        rows={4}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label>Bot Presence (Branding)</Label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="presence-type">Activity Type</Label>
                          <select
                            id="presence-type"
                            value={form.watch("PRESENCE_ACTIVITY_TYPE")}
                            onChange={(e) => form.setValue("PRESENCE_ACTIVITY_TYPE", e.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="playing">Playing</option>
                            <option value="watching">Watching</option>
                            <option value="listening">Listening to</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="presence-name">Status Text</Label>
                          <Input
                            id="presence-name"
                            {...form.register("PRESENCE_ACTIVITY_NAME")}
                            placeholder="e.g. with AI or 500 users"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This update may take a few seconds to reflect in Discord.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="providers" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">AI Providers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-xs text-muted-foreground">
                      Configure your API keys and the specific models to use for each provider.
                    </p>
                    
                    <div className="grid gap-6 sm:grid-cols-2">
                      {(
                        [
                          ["GEMINI", "Google Gemini"],
                          ["GROQ", "Groq"],
                          ["OPENROUTER", "OpenRouter"],
                          ["ANTHROPIC", "Anthropic"],
                          ["OPENAI", "OpenAI"],
                        ] as const
                      ).map(([prefix, label]) => (
                        <div key={prefix} className="space-y-3 p-4 rounded-lg border bg-muted/30">
                          <h3 className="font-semibold text-sm">{label}</h3>
                          <div className="space-y-1">
                            <Label htmlFor={`${prefix}_API_KEY`} className="text-xs">API Key</Label>
                            <PasswordInput
                              id={`${prefix}_API_KEY`}
                              {...form.register(`${prefix}_API_KEY` as any)}
                              className="font-mono text-sm h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`${prefix}_MODEL`} className="text-xs">Model Name</Label>
                            <Input
                              id={`${prefix}_MODEL`}
                              {...form.register(`${prefix}_MODEL` as any)}
                              className="text-sm h-8"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="translation" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Multi-Language Translation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label>Enable Translation Command</Label>
                      <RadioGroup
                        value={form.watch("TRANSLATE_ENABLED") ? "true" : "false"}
                        onValueChange={(val) => form.setValue("TRANSLATE_ENABLED", val === "true")}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="translate-on" />
                          <Label htmlFor="translate-on" className="font-normal text-xs cursor-pointer">Enabled</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="translate-off" />
                          <Label htmlFor="translate-off" className="font-normal text-xs cursor-pointer">Disabled</Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <Label>Enable Global Auto-Translation</Label>
                      <RadioGroup
                        value={form.watch("AUTO_TRANSLATE_ENABLED") ? "true" : "false"}
                        onValueChange={(val) => form.setValue("AUTO_TRANSLATE_ENABLED", val === "true")}
                        className="flex gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="autotranslate-on" />
                          <Label htmlFor="autotranslate-on" className="font-normal text-xs cursor-pointer">Enabled</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="autotranslate-off" />
                          <Label htmlFor="autotranslate-off" className="font-normal text-xs cursor-pointer">Disabled</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dashboard & Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-password">Admin Password</Label>
                      <PasswordInput
                        id="admin-password"
                        {...form.register("ADMIN_PASSWORD")}
                      />
                    </div>

                    <Separator />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="discord-token">Bot Token</Label>
                        <PasswordInput
                          id="discord-token"
                          {...form.register("DISCORD_TOKEN")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-id">Discord Client ID</Label>
                        <Input
                          id="client-id"
                          {...form.register("DISCORD_CLIENT_ID")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="client-secret">Discord Client Secret</Label>
                        <PasswordInput
                          id="client-secret"
                          {...form.register("DISCORD_CLIENT_SECRET")}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Global Settings
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
