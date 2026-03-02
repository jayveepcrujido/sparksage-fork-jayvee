"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import type { ChannelItem, MessageItem } from "@/lib/api";
import { ChannelList } from "@/components/conversations/channel-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageList } from "@/components/conversations/message-list";

export default function ConversationsPage() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MessageItem[]>([]);
  const [searching, setSearching] = useState(false);

  const token = (session as { accessToken?: string })?.accessToken;

  async function load() {
    if (!token) return;
    try {
      const result = await api.getConversations(token);
      setChannels(result.channels);
    } catch {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function performSearch() {
    if (!token || !searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchConversations(token, searchQuery);
      setSearchResults(res.results);
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setSearching(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // show search results if query present
  if (searchQuery) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          Search Results for {`"${searchQuery}"`}
        </h1>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn" onClick={performSearch} disabled={searching}>
            {searching ? <Loader2 className="animate-spin h-4 w-4" /> : "Go"}
          </button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {searching ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <MessageList messages={searchResults} />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const codeReviewChannels = channels.filter((c) => c.has_code_review);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Conversations</h1>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button className="btn" onClick={performSearch} disabled={searching}>
          {searching ? <Loader2 className="animate-spin h-4 w-4" /> : "Go"}
        </button>
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
              <ChannelList channels={channels} onDelete={handleDelete} />
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
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
