"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Sparkles, Trash2, Plus, MessageSquare, Cpu, Hash, Globe } from "lucide-react"; // Add Globe
import { api, BotStatus, ChannelPrompt, ChannelProviderItem, DiscordChannel, ProvidersResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch"; // Add Switch
import { Input } from "@/components/ui/input"; // Add Input
import { toast } from "sonner";

export default function ChannelSettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [prompts, setPrompts] = useState<ChannelPrompt[]>([]);
  const [channelProviders, setChannelProviders] = useState<ChannelProviderItem[]>([]);
  const [providersData, setProvidersData] = useState<ProvidersResponse | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selectedGuild, setSelectedGuild] = useState<string>("");
  
  // Form states
  const [targetChannelId, setTargetChannelId] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [targetProvider, setTargetProvider] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-translate states
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [autoTranslateTargetLanguage, setAutoTranslateTargetLanguage] = useState("");
  const [currentAutoTranslateSetting, setCurrentAutoTranslateSetting] = useState<{ enabled: boolean, target_language: string | null } | null>(null);


  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token) return;
    
    Promise.all([
      api.getBotStatus(token),
      api.getChannels(token),
      api.getPrompts(token),
      api.getChannelProviders(token),
      api.getProviders(token)
    ]).then(([s, c, p, cp, provs]) => {
      setStatus(s);
      setChannels(c.channels);
      setPrompts(p.prompts);
      setChannelProviders(cp.channel_providers);
      setProvidersData(provs);
      
      if (s.guilds.length > 0) {
        setSelectedGuild(s.guilds[0].id);
      }
    })
    .catch(() => toast.error("Failed to load channel settings"))
    .finally(() => setLoading(false));
  }, [token]);

  // New useEffect to fetch auto-translate settings for the selected channel
  useEffect(() => {
    if (!token || !targetChannelId) return;

    // Reset previous auto-translate states when channel changes
    setAutoTranslateEnabled(false);
    setAutoTranslateTargetLanguage("");
    setCurrentAutoTranslateSetting(null);

    api.getChannelAutoTranslate(token, targetChannelId)
      .then((setting) => {
        if (setting) {
          setCurrentAutoTranslateSetting(setting);
          setAutoTranslateEnabled(setting.enabled);
          setAutoTranslateTargetLanguage(setting.target_language || "");
        } else {
          // Reset if no setting exists for the channel
          setCurrentAutoTranslateSetting(null);
          setAutoTranslateEnabled(false);
          setAutoTranslateTargetLanguage("");
        }
      })
      .catch(() => toast.error("Failed to load auto-translate settings for this channel."))
  }, [token, targetChannelId]);


  const refreshPrompts = async () => {
    if (!token) return;
    try {
      const p = await api.getPrompts(token, selectedGuild);
      setPrompts(p.prompts);
    } catch (err) {
      toast.error("Failed to refresh personalities");
    }
  };

  const refreshChannelProviders = async () => {
    if (!token) return;
    try {
      const cp = await api.getChannelProviders(token, selectedGuild);
      setChannelProviders(cp.channel_providers);
    } catch (err) {
      toast.error("Failed to refresh channel providers");
    }
  };

  const refreshAutoTranslateSetting = async () => {
    if (!token || !targetChannelId) return;
    try {
      const setting = await api.getChannelAutoTranslate(token, targetChannelId);
      if (setting) {
        setCurrentAutoTranslateSetting(setting);
        setAutoTranslateEnabled(setting.enabled);
        setAutoTranslateTargetLanguage(setting.target_language || "");
      } else {
        setCurrentAutoTranslateSetting(null);
        setAutoTranslateEnabled(false);
        setAutoTranslateTargetLanguage("");
      }
    } catch (err) {
      toast.error("Failed to refresh auto-translate settings.");
    }
  };


  async function handleSetPrompt() {
    if (!token || !selectedGuild || !targetChannelId || !newPrompt) {
      toast.error("Please select a channel and enter a prompt");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.setPrompt(token, {
        channel_id: targetChannelId,
        guild_id: selectedGuild,
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
    if (!token || !selectedGuild || !targetChannelId || !targetProvider) {
      toast.error("Please select a channel and a provider");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await api.setChannelProvider(token, {
        channel_id: targetChannelId,
        guild_id: selectedGuild,
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
    if (!token || !selectedGuild || !targetChannelId) {
      toast.error("Please select a channel.");
      return;
    }

    if (autoTranslateEnabled && !autoTranslateTargetLanguage) {
      toast.error("Please enter a target language for auto-translation.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (autoTranslateEnabled) {
        await api.setChannelAutoTranslate(token, {
          channel_id: targetChannelId,
          guild_id: selectedGuild,
          enabled: true,
          target_language: autoTranslateTargetLanguage
        });
        toast.success("Auto-translation enabled and saved.");
      } else {
        await api.deleteChannelAutoTranslate(token, targetChannelId);
        toast.success("Auto-translation disabled.");
      }
      refreshAutoTranslateSetting(); // Refresh current settings after saving
    } catch (err) {
      toast.error("Failed to save auto-translation settings.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentGuildChannels = channels.filter(c => c.guild_id === selectedGuild);
  const currentGuildPrompts = prompts.filter(p => p.guild_id === selectedGuild);
  const currentGuildProviders = channelProviders.filter(cp => cp.guild_id === selectedGuild);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Channel Tuning</h1>
          <p className="text-muted-foreground">Customize AI behavior and model selection for specific channels.</p>
        </div>
        <Hash className="h-8 w-8 text-primary/20" />
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

      <div className="grid gap-6 md:grid-cols-3">
        {/* Selection Sidebar (Always visible) */}
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
                {currentGuildChannels.map(ch => (
                  <option key={ch.id} value={ch.id}>#{ch.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Tabs */}
        <div className="md:col-span-2 space-y-6">
          <Tabs defaultValue="personalities" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto"> {/* Changed grid-cols-2 to grid-cols-3 */}
              <TabsTrigger value="personalities" className="py-2">
                <Sparkles className="mr-2 h-4 w-4" /> Personalities
              </TabsTrigger>
              <TabsTrigger value="providers" className="py-2">
                <Cpu className="mr-2 h-4 w-4" /> AI Models
              </TabsTrigger>
              <TabsTrigger value="autotranslate" className="py-2"> {/* New tab */}
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
                {currentGuildPrompts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">None configured.</p>
                ) : (
                  currentGuildPrompts.map(p => {
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
                {currentGuildProviders.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">None configured.</p>
                ) : (
                  currentGuildProviders.map(cp => {
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
                    disabled={isSubmitting || !targetChannelId || (autoTranslateEnabled && !autoTranslateTargetLanguage)}
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

