"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Sparkles, Trash2, Plus, MessageSquare, Cpu, Hash, Globe } from "lucide-react";
import { api, ChannelPrompt, ChannelProviderItem, DiscordChannel, ProvidersResponse } from "@/lib/api";
import { useGuild } from "@/components/providers/guild-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ChannelSettingsPage() {
  const { data: session } = useSession();
  const { selectedGuildId } = useGuild();
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState<ChannelPrompt[]>([]);
  const [channelProviders, setChannelProviders] = useState<ChannelProviderItem[]>([]);
  const [providersData, setProvidersData] = useState<ProvidersResponse | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  
  // Form states
  const [targetChannelId, setTargetChannelId] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [targetProvider, setTargetProvider] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-translate states
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [autoTranslateTargetLanguage, setAutoTranslateTargetLanguage] = useState("");

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token || !selectedGuildId) return;
    
    setLoading(true);
    Promise.all([
      api.getGuildChannels(token, selectedGuildId),
      api.getPrompts(token, selectedGuildId),
      api.getChannelProviders(token, selectedGuildId),
      api.getProviders(token)
    ]).then(([c, p, cp, provs]) => {
      setChannels(c.channels);
      setPrompts(p.prompts);
      setChannelProviders(cp.channel_providers);
      setProvidersData(provs);
      setTargetChannelId(""); // Reset selection on guild change
    })
    .catch(() => toast.error("Failed to load channel settings"))
    .finally(() => setLoading(false));
  }, [token, selectedGuildId]);

  useEffect(() => {
    if (!token || !targetChannelId) {
      setAutoTranslateEnabled(false);
      setAutoTranslateTargetLanguage("");
      return;
    }

    api.getChannelAutoTranslate(token, targetChannelId)
      .then((setting) => {
        if (setting) {
          setAutoTranslateEnabled(setting.enabled);
          setAutoTranslateTargetLanguage(setting.target_language || "");
        } else {
          setAutoTranslateEnabled(false);
          setAutoTranslateTargetLanguage("");
        }
      })
      .catch(() => {
        setAutoTranslateEnabled(false);
        setAutoTranslateTargetLanguage("");
      });
  }, [token, targetChannelId]);


  const refreshPrompts = async () => {
    if (!token || !selectedGuildId) return;
    try {
      const p = await api.getPrompts(token, selectedGuildId);
      setPrompts(p.prompts);
    } catch (err) {
      toast.error("Failed to refresh personalities");
    }
  };

  const refreshChannelProviders = async () => {
    if (!token || !selectedGuildId) return;
    try {
      const cp = await api.getChannelProviders(token, selectedGuildId);
      setChannelProviders(cp.channel_providers);
    } catch (err) {
      toast.error("Failed to refresh channel providers");
    }
  };

  async function handleSetPrompt() {
    if (!token || !selectedGuildId || !targetChannelId || !newPrompt) {
      toast.error("Please select a channel and enter a prompt");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.setPrompt(token, {
        channel_id: targetChannelId,
        guild_id: selectedGuildId,
        system_prompt: newPrompt
      });
      toast.success("Channel personality updated");
      setNewPrompt("");
      refreshPrompts();
    } catch (err) {
      toast.error("Failed to update personality");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetChannelProvider() {
    if (!token || !selectedGuildId || !targetChannelId || !targetProvider) {
      toast.error("Please select a channel and a provider");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.setChannelProvider(token, {
        channel_id: targetChannelId,
        guild_id: selectedGuildId,
        provider: targetProvider
      });
      toast.success("Channel AI provider updated");
      setTargetProvider("");
      refreshChannelProviders();
    } catch (err) {
      toast.error("Failed to update channel provider");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeletePrompt(channelId: string) {
    if (!token) return;
    try {
      await api.deletePrompt(token, channelId);
      toast.success("Channel personality reset");
      refreshPrompts();
    } catch (err) {
      toast.error("Failed to reset personality");
    }
  }

  async function handleDeleteChannelProvider(channelId: string) {
    if (!token) return;
    try {
      await api.deleteChannelProvider(token, channelId);
      toast.success("Channel AI provider reset");
      refreshChannelProviders();
    } catch (err) {
      toast.error("Failed to reset channel provider");
    }
  }

  async function handleSaveAutoTranslate() {
    if (!token || !selectedGuildId || !targetChannelId) {
      toast.error("Please select a channel.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (autoTranslateEnabled) {
        if (!autoTranslateTargetLanguage) {
          toast.error("Please enter a target language");
          setIsSubmitting(false);
          return;
        }
        await api.setChannelAutoTranslate(token, {
          channel_id: targetChannelId,
          guild_id: selectedGuildId,
          enabled: true,
          target_language: autoTranslateTargetLanguage
        });
        toast.success("Auto-translation enabled");
      } else {
        await api.deleteChannelAutoTranslate(token, targetChannelId);
        toast.success("Auto-translation disabled");
      }
    } catch (err) {
      toast.error("Failed to save auto-translation settings");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!selectedGuildId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Globe className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold">No Server Selected</h2>
        <p className="text-muted-foreground">Please select a server from the sidebar to configure its channels.</p>
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
          <h1 className="text-2xl font-bold">Channel Tuning</h1>
          <p className="text-muted-foreground">Customize AI behavior and model selection for specific channels.</p>
        </div>
        <Hash className="h-8 w-8 text-primary/20" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Selection Sidebar */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-base">Target Channel</CardTitle>
            <CardDescription>Select which channel to customize.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channel-select">Discord Channel</Label>
              <select
                id="channel-select"
                value={targetChannelId}
                onChange={(e) => setTargetChannelId(e.target.value)}
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

        {/* Configuration Tabs */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="personalities" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="personalities" className="py-2">
                <Sparkles className="mr-2 h-4 w-4" /> Personalities
              </TabsTrigger>
              <TabsTrigger value="providers" className="py-2">
                <Cpu className="mr-2 h-4 w-4" /> AI Models
              </TabsTrigger>
              <TabsTrigger value="autotranslate" className="py-2">
                <Globe className="mr-2 h-4 w-4" /> Auto-Translation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personalities" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Set Personality</CardTitle>
                  <CardDescription>Define how the AI should behave in this channel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="channel-prompt">System Prompt</Label>
                    <Textarea
                      id="channel-prompt"
                      placeholder="e.g. You are a professional support agent..."
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      rows={4}
                      disabled={!targetChannelId}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSetPrompt} 
                    disabled={isSubmitting || !targetChannelId || !newPrompt}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Update Personality
                  </Button>
                </CardContent>
              </Card>

              {/* Active list */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Active Personalities</h3>
                {prompts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">None configured.</p>
                ) : (
                  prompts.map(p => {
                    const ch = channels.find(c => c.id === p.channel_id);
                    return (
                      <div key={p.channel_id} className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm">
                        <div className="space-y-1">
                          <p className="text-sm font-bold">#{ch?.name || p.channel_id}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{p.system_prompt}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeletePrompt(p.channel_id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="providers" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Assign AI Model</CardTitle>
                  <CardDescription>Select a specific provider for this channel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider-select">AI Provider</Label>
                    <select
                      id="provider-select"
                      value={targetProvider}
                      onChange={(e) => setTargetProvider(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      disabled={!targetChannelId}
                    >
                      <option value="">Select a provider...</option>
                      {providersData?.providers.filter(p => p.configured).map(p => (
                        <option key={p.name} value={p.name}>{p.display_name} ({p.model})</option>
                      ))}
                    </select>
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleSetChannelProvider} 
                    disabled={isSubmitting || !targetChannelId || !targetProvider}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                    Assign Provider
                  </Button>
                </CardContent>
              </Card>

              {/* Active list */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Channel-Specific Models</h3>
                {channelProviders.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">None configured.</p>
                ) : (
                  channelProviders.map(cp => {
                    const ch = channels.find(c => c.id === cp.channel_id);
                    const prov = providersData?.providers.find(p => p.name === cp.provider);
                    return (
                      <div key={cp.channel_id} className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm">
                        <div className="space-y-1">
                          <p className="text-sm font-bold">#{ch?.name || cp.channel_id}</p>
                          <p className="text-xs text-muted-foreground uppercase">{prov?.display_name || cp.provider}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteChannelProvider(cp.channel_id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="autotranslate" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Auto-Translation Settings</CardTitle>
                  <CardDescription>Enable automatic translation for messages in this channel.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="auto-translate-toggle">Enable Auto-Translation</Label>
                    <Switch
                      id="auto-translate-toggle"
                      checked={autoTranslateEnabled}
                      onCheckedChange={setAutoTranslateEnabled}
                      disabled={!targetChannelId || isSubmitting}
                    />
                  </div>
                  {autoTranslateEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="target-language-input">Target Language</Label>
                      <Input
                        id="target-language-input"
                        placeholder="e.g. Spanish, Japanese"
                        value={autoTranslateTargetLanguage}
                        onChange={(e) => setAutoTranslateTargetLanguage(e.target.value)}
                        disabled={!targetChannelId || isSubmitting}
                      />
                    </div>
                  )}
                  <Button 
                    className="w-full" 
                    onClick={handleSaveAutoTranslate}
                    disabled={isSubmitting || !targetChannelId}
                  >
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Auto-Translation Settings
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
