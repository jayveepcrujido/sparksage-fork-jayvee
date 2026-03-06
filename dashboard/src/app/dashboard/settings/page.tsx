"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, RotateCcw, Save } from "lucide-react";
import { api } from "@/lib/api";
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
  DIGEST_ENABLED: z.boolean(),
  DIGEST_CHANNEL_ID: z.string(),
  DIGEST_TIME: z.string(),
  MODERATION_ENABLED: z.boolean(),
  MOD_LOG_CHANNEL_ID: z.string(),
  MODERATION_SENSITIVITY: z.string(),
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
  DIGEST_ENABLED: false,
  DIGEST_CHANNEL_ID: "",
  DIGEST_TIME: "09:00",
  MODERATION_ENABLED: false,
  MOD_LOG_CHANNEL_ID: "",
  MODERATION_SENSITIVITY: "medium",
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
            } else if (key === "DIGEST_ENABLED" || key === "MODERATION_ENABLED" || key === "TRANSLATE_ENABLED" || key === "AUTO_TRANSLATE_ENABLED") {
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
      // Convert to string values for the API, skip masked values (***...)
      const payload: Record<string, string> = {};
      for (const [key, val] of Object.entries(values)) {
        const strVal = String(val);
        if (!strVal.startsWith("***")) {
          payload[key] = strVal;
        }
      }
      await api.updateConfig(token, payload);
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    form.reset(DEFAULTS);
  }

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
            <RotateCcw className="mr-1 h-3 w-3" /> Reset to Defaults
          </Button>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex w-full overflow-x-auto h-auto p-1 bg-muted/50 scrollbar-hide justify-start md:grid md:grid-cols-6">
            <TabsTrigger value="general" className="py-2 px-4 whitespace-nowrap">General</TabsTrigger>
            <TabsTrigger value="providers" className="py-2 px-4 whitespace-nowrap">AI Models</TabsTrigger>
            <TabsTrigger value="moderation" className="py-2 px-4 whitespace-nowrap">Moderation</TabsTrigger>
            <TabsTrigger value="translation" className="py-2 px-4 whitespace-nowrap">Translation</TabsTrigger>
            <TabsTrigger value="digest" className="py-2 px-4 whitespace-nowrap">Digest</TabsTrigger>
            <TabsTrigger value="security" className="py-2 px-4 whitespace-nowrap">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-4">
            {/* ... (keep existing general content) */}
            {/* Discord */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Discord</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discord-token">Bot Token</Label>
                  <PasswordInput
                    id="discord-token"
                    {...form.register("DISCORD_TOKEN")}
                  />
                  {form.formState.errors.DISCORD_TOKEN && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.DISCORD_TOKEN.message}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bot Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bot Behavior</CardTitle>
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
                    {form.formState.errors.BOT_PREFIX && (
                      <p className="text-xs text-destructive">
                        {form.formState.errors.BOT_PREFIX.message}
                      </p>
                    )}
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
                  <Label>Rate Limiting (per minute)</Label>
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
                    <Label htmlFor="system-prompt">System Prompt</Label>
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-6 mt-4">
            {/* AI Keys & Models */}
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

          <TabsContent value="moderation" className="space-y-6 mt-4">
            {/* AI Moderation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Moderation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Enable Message Flagging</Label>
                  <RadioGroup
                    value={form.watch("MODERATION_ENABLED") ? "true" : "false"}
                    onValueChange={(val) => form.setValue("MODERATION_ENABLED", val === "true")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="mod-on" />
                      <Label htmlFor="mod-on" className="font-normal text-xs cursor-pointer">Enabled</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="mod-off" />
                      <Label htmlFor="mod-off" className="font-normal text-xs cursor-pointer">Disabled</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Uses AI to scan all messages for toxicity and spam. Flags issues for human review.
                  </p>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mod-log-channel">Mod Log Channel ID</Label>
                    <Input
                      id="mod-log-channel"
                      {...form.register("MOD_LOG_CHANNEL_ID")}
                      placeholder="e.g. 123456789012345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mod-sensitivity">Sensitivity Level</Label>
                    <select
                      id="mod-sensitivity"
                      {...form.register("MODERATION_SENSITIVITY")}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="low">Low (Only extreme cases)</option>
                      <option value="medium">Medium (Standard)</option>
                      <option value="high">High (Strict)</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="translation" className="space-y-6 mt-4">
            {/* Translation */}
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
                  <p className="text-xs text-muted-foreground">
                    Allows users to use the /translate command to translate text between languages using AI.
                  </p>
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
                  <p className="text-xs text-muted-foreground">
                    Enables the auto-translation engine bot-wide. Once enabled, you can configure target languages for specific channels in the "Channel Tuning" page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="digest" className="space-y-6 mt-4">
            {/* Daily Digest */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Digest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Enable Daily Digest</Label>
                  <RadioGroup
                    value={form.watch("DIGEST_ENABLED") ? "true" : "false"}
                    onValueChange={(val) => form.setValue("DIGEST_ENABLED", val === "true")}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id="digest-on" />
                      <Label htmlFor="digest-on" className="font-normal text-xs cursor-pointer">Enabled</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id="digest-off" />
                      <Label htmlFor="digest-off" className="font-normal text-xs cursor-pointer">Disabled</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-xs text-muted-foreground">
                    Automatically summarize daily activity and post it to a designated channel.
                  </p>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="digest-channel">Digest Channel ID</Label>
                    <Input
                      id="digest-channel"
                      {...form.register("DIGEST_CHANNEL_ID")}
                      placeholder="e.g. 123456789012345678"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="digest-time">Post Time (24h format)</Label>
                    <Input
                      id="digest-time"
                      {...form.register("DIGEST_TIME")}
                      placeholder="09:00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-4">
            {/* Dashboard & Security */}
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
                  <p className="text-xs text-muted-foreground">
                    The password used to log in to this dashboard.
                  </p>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2">
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
                <p className="text-xs text-muted-foreground">
                  Required for the OAuth2 setup wizard and advanced features.
                </p>
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
          Save Settings
        </Button>
      </form>
    </div>
  );
}
