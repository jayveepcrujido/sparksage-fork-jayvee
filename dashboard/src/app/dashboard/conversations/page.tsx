"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Search, X, Zap, Hash, MessageSquare, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { ChannelItem, MessageItem } from "@/lib/api";
import { useGuild } from "@/components/providers/guild-provider";
import { ChannelList } from "@/components/conversations/channel-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageList } from "@/components/conversations/message-list";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ConversationsPage() {
  const { data: session } = useSession();
  const { selectedGuildId, selectedGuild } = useGuild();
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const token = (session as { accessToken?: string })?.accessToken;

  async function load() {
    if (!token || !selectedGuildId) return;
    setLoading(true);
    try {
      const result = await api.getConversations(token, selectedGuildId);
      setChannels(result.channels);
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token, selectedGuildId]);

  async function performSearch() {
    if (!token || !searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await api.searchConversations(token, searchQuery, selectedGuildId || undefined);
      setSearchResults(res.results);
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults([]);
    setHasSearched(false);
  }

  function handleSearchKeyPress(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      performSearch();
    }
  }

  async function handleDelete(channelId: string) {
    if (!token) return;
    try {
      await api.deleteConversation(token, channelId);
      toast.success(`Cleared conversation for #${channelId}`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  async function handleExport(channelId: string, format: "json" | "pdf") {
    if (!token) return;
    try {
      const result = await api.exportConversation(token, channelId, format);
      if (format === "json") {
        const blob = new Blob([JSON.stringify(result, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversation-${channelId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const blob = result as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `conversation-${channelId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
  }

  if (!selectedGuildId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Zap className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold">No Server Selected</h2>
        <p className="text-muted-foreground">Please select a server from the sidebar to view its conversations.</p>
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

  // Group search results by channel
  const groupedResults = searchResults.reduce((acc, msg) => {
    if (!acc[msg.channel_id]) {
      acc[msg.channel_id] = {
        channel_id: msg.channel_id,
        channel_name: msg.channel_name,
        channel_topic: msg.channel_topic,
        messages: []
      };
    }
    acc[msg.channel_id].messages.push(msg);
    return acc;
  }, {} as Record<string, { channel_id: string, channel_name: string | null | undefined, channel_topic: string | null | undefined, messages: MessageItem[] }>);

  // show search results if search has been performed
  if (hasSearched) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Search Results
            </h1>
            <p className="text-muted-foreground">Query: {`"${searchQuery}"`} in {selectedGuild?.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="pl-10"
              disabled={searching}
            />
          </div>
          <Button
            onClick={performSearch}
            disabled={searching || !searchQuery.trim()}
            className="gap-2"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </Button>
        </div>

        {searching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        ) : Object.keys(groupedResults).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/10 mb-4" />
            <h3 className="text-lg font-medium">No matches found</h3>
            <p className="text-muted-foreground">Try different keywords or check another server.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(groupedResults).map((group) => (
              <Card key={group.channel_id} className="overflow-hidden border-primary/10">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">
                          {group.channel_name || `Channel ${group.channel_id}`}
                        </CardTitle>
                      </div>
                      {group.channel_topic && (
                        <CardDescription className="flex items-center gap-1.5 italic">
                          Topic: {group.channel_topic}
                        </CardDescription>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-8 gap-1.5">
                      <Link href={`/dashboard/conversations/${group.channel_id}`}>
                        View Thread <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group.messages.length} matching message{group.messages.length > 1 ? 's' : ''}
                    </p>
                    <MessageList messages={group.messages} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const codeReviewChannels = channels.filter((c) => c.has_code_review);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-muted-foreground">Server: {selectedGuild?.name}</p>
      </div>
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            className="pl-10"
            disabled={searching}
          />
        </div>
        <Button
          onClick={performSearch}
          disabled={searching || !searchQuery.trim()}
          className="gap-2"
        >
          {searching ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              Search
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Channels</TabsTrigger>
          <TabsTrigger value="reviews">Code Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Channels</CardTitle>
            </CardHeader>
            <CardContent>
              <ChannelList
                channels={channels}
                onDelete={handleDelete}
                onExport={token ? handleExport : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Code Review Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <ChannelList
                channels={codeReviewChannels}
                onDelete={handleDelete}
                onExport={token ? handleExport : undefined}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
