const getApiUrl = () => {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  
  // Auto-upgrade to https if page is on https and url is http (and not localhost)
  if (typeof window !== "undefined" && 
      window.location.protocol === "https:" && 
      url.startsWith("http://") && 
      !url.includes("localhost")) {
    url = url.replace("http://", "https://");
  }
  
  return url;
};

const API_URL = getApiUrl();

interface FetchOptions extends RequestInit {
  token?: string;
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...((customHeaders as Record<string, string>) || {}),
  };

  if (!headers["Content-Type"] && !(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    headers,
    ...rest,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(
      body.detail || res.statusText || `API error: ${res.status}`,
    );
  }

  return res.json();
}

// Response types matching backend
export interface ProviderItem {
  name: string;
  display_name: string;
  model: string;
  free: boolean;
  configured: boolean;
  enabled: boolean;
  is_primary: boolean;
}

export interface ProvidersResponse {
  providers: ProviderItem[];
  fallback_order: string[];
}

export interface ChannelItem {
  channel_id: string;
  channel_name?: string | null;
  guild_id?: string;
  message_count: number;
  last_active: string;
  has_code_review: boolean;
}

export interface MessageItem {
  role: string;
  content: string;
  provider: string | null;
  category: string | null;
  created_at: string;
}

export interface DiscordGuild {
  id: string;
  name: string;
  member_count: number;
}

export interface BotStatus {
  online: boolean;
  username: string | null;
  latency_ms: number | null;
  guild_count: number;
  guilds: DiscordGuild[];
}

export interface BotStats {
  daily_messages: Array<{ day: string; count: number }>;
  provider_distribution: Array<{ name: string; value: number }>;
  total_messages: number;
  total_channels: number;
  total_guilds: number;
}

export interface DiscordChannel {
  id: string;
  name: string;
  guild_name: string;
  guild_id: string;
}

export interface TestProviderResult {
  success: boolean;
  message: string;
  latency_ms?: number;
}

export interface FAQItem {
  id: number;
  guild_id: string;
  question: string;
  answer: string;
  match_keywords: string;
  times_used: number;
  created_by: string | null;
  created_at: string;
}

export interface PermissionItem {
  command_name: string;
  guild_id: string;
  role_id: string;
}

export interface ChannelPrompt {
  channel_id: string;
  guild_id: string;
  system_prompt: string;
}

export interface ChannelProviderItem {
  channel_id: string;
  guild_id: string;
  provider: string;
}

export interface AutoTranslateSetting {
  channel_id: string;
  guild_id: string;
  enabled: boolean;
  target_language: string | null;
}

export interface AnalyticsSummary {
  daily_events: Array<{ day: string; count: number }>;
  provider_distribution: Array<{ name: string; value: number }>;
  top_channels: Array<{ id: string; count: number }>;
  latency_history: Array<{ day: string; latency: number }>;
  total_rate_limited: number;
  cost_by_provider: Record<string, number>;
  total_cost: number;
}

export interface AnalyticsEvent {
  id: number;
  event_type: string;
  guild_id: string | null;
  channel_id: string | null;
  user_id: string | null;
  provider: string | null;
  tokens_used: number | null;
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  created_at: string;
}

export interface PluginItem {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  cog: string;
  enabled: boolean;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: string;
}

export interface CommandsResponse {
  commands: string[];
}

export interface AutoResponse {
  id: number;
  guild_id: string;
  keyword: string;
  response: string;
  match_type: "exact" | "contains";
  is_case_sensitive: boolean;
  created_at: string;
}

export const api = {
  // Auth
  login: (password: string) =>
    apiFetch<{ access_token: string; token_type: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  me: (token: string) =>
    apiFetch<{ username: string; role: string }>("/api/auth/me", { token }),

  // Config
  getConfig: (token: string) =>
    apiFetch<{ config: Record<string, string> }>("/api/config", { token }),

  updateConfig: (token: string, values: Record<string, string>) =>
    apiFetch<{ status: string }>("/api/config", {
      method: "PUT",
      body: JSON.stringify({ values }),
      token,
    }),

  // Providers
  getProviders: (token: string) =>
    apiFetch<ProvidersResponse>("/api/providers", { token }),

  testProvider: (token: string, provider: string) =>
    apiFetch<TestProviderResult>("/api/providers/test", {
      method: "POST",
      body: JSON.stringify({ provider }),
      token,
    }),

  toggleProvider: (token: string, provider: string, enabled: boolean) =>
    apiFetch<{ status: string; enabled: boolean }>("/api/providers/toggle", {
      method: "PUT",
      body: JSON.stringify({ provider, enabled }),
      token,
    }),

  setPrimaryProvider: (token: string, provider: string) =>
    apiFetch<{ status: string; primary: string }>("/api/providers/primary", {
      method: "PUT",
      body: JSON.stringify({ provider }),
      token,
    }),

  // Bot
  getBotStatus: (token: string) =>
    apiFetch<BotStatus>("/api/bot/status", { token }),

  getBotStats: (token: string) =>
    apiFetch<BotStats>("/api/bot/stats", { token }),
getChannels: (token: string) =>
  apiFetch<{ channels: DiscordChannel[] }>("/api/bot/channels", { token }),

getGuildChannels: (token: string, guildId: string) =>
  apiFetch<{ channels: DiscordChannel[] }>(`/api/guilds/${guildId}/channels`, { token }),

getGuildRoles: (token: string, guildId: string) =>
  apiFetch<{ roles: DiscordRole[] }>(`/api/guilds/${guildId}/roles`, { token }),

// Plugins
  // Conversations
  getConversations: (token: string, guildId?: string) =>
    apiFetch<{ channels: ChannelItem[] }>(
      "/api/conversations" + (guildId ? `?guild_id=${guildId}` : ""),
      { token },
    ),

  getConversation: (token: string, channelId: string) =>
    apiFetch<{
      channel_id: string;
      channel_name?: string | null;
      messages: MessageItem[];
    }>(`/api/conversations/${channelId}`, { token }),

  searchConversations: (
    token: string,
    q: string,
    guildId?: string,
    limit: number = 100,
  ) =>
    apiFetch<{ query: string; results: MessageItem[] }>(
      `/api/conversations/search?q=${encodeURIComponent(q)}` +
        (guildId ? `&guild_id=${encodeURIComponent(guildId)}` : "") +
        `&limit=${limit}`,
      { token },
    ),

  exportConversation: async (
    token: string,
    channelId: string,
    format: "json" | "pdf" = "json",
  ) => {
    // apiFetch assumes JSON responses, so handle PDF downloads manually
    const url = `${API_URL}/api/conversations/export/${channelId}?format=${format}`;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.detail || res.statusText || `API error: ${res.status}`,
      );
    }

    if (format === "json") {
      return res.json();
    }

    // return blob for PDF so caller can download it
    return res.blob();
  },

  tagConversation: (token: string, channelId: string) =>
    apiFetch<{ channel_id: string; topic: string; provider: string }>(
      `/api/conversations/tag/${channelId}`,
      { token, method: "POST" },
    ),

  deleteConversation: (token: string, channelId: string) =>
    apiFetch<{ status: string }>(`/api/conversations/${channelId}`, {
      method: "DELETE",
      token,
    }),

  // FAQs
  getFAQs: (token: string, guildId?: string) =>
    apiFetch<{ faqs: FAQItem[] }>(
      `/api/faqs${guildId ? `?guild_id=${guildId}` : ""}`,
      { token },
    ),

  createFAQ: (
    token: string,
    data: {
      guild_id: string;
      question: string;
      answer: string;
      match_keywords: string;
    },
  ) =>
    apiFetch<{ status: string }>("/api/faqs", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  deleteFAQ: (token: string, faqId: number) =>
    apiFetch<{ status: string }>(`/api/faqs/${faqId}`, {
      method: "DELETE",
      token,
    }),

  // Wizard
  getWizardStatus: (token: string) =>
    apiFetch<{
      completed: boolean;
      current_step: number;
      data: Record<string, any>;
    }>("/api/wizard/status", { token }),

  updateWizardStep: (token: string, step: number, data: any) =>
    apiFetch<{ status: string }>("/api/wizard/step", {
      method: "PUT",
      body: JSON.stringify({ step, data }),
      token,
    }),

  completeWizard: (token: string, data: Record<string, string>) =>
    apiFetch<{ status: string }>("/api/wizard/complete", {
      method: "POST",
      body: JSON.stringify({ config: data }),
      token,
    }),

  // Permissions
  getPermissions: (token: string, guildId?: string) =>
    apiFetch<{ permissions: PermissionItem[] }>(
      `/api/permissions${guildId ? `?guild_id=${guildId}` : ""}`,
      { token },
    ),

  createPermission: (token: string, data: PermissionItem) =>
    apiFetch<{ status: string }>("/api/permissions", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  deletePermission: (
    token: string,
    commandName: string,
    guildId: string,
    roleId: string,
  ) =>
    apiFetch<{ status: string }>(
      `/api/permissions/${commandName}/${guildId}/${roleId}`,
      {
        method: "DELETE",
        token,
      },
    ),

  getRoles: (token: string, guildId: string) =>
    apiFetch<{ roles: DiscordRole[] }>(`/api/permissions/roles/${guildId}`, {
      token,
    }),

  getCommands: (token: string) =>
    apiFetch<CommandsResponse>("/api/permissions/commands", { token }),

  // Prompts
  getPrompts: (token: string, guildId?: string) =>
    apiFetch<{ prompts: ChannelPrompt[] }>(
      `/api/prompts${guildId ? `?guild_id=${guildId}` : ""}`,
      { token },
    ),

  setPrompt: (token: string, data: ChannelPrompt) =>
    apiFetch<{ status: string }>("/api/prompts", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  deletePrompt: (token: string, channelId: string) =>
    apiFetch<{ status: string }>(`/api/prompts/${channelId}`, {
      method: "DELETE",
      token,
    }),

  // Channel Providers
  getChannelProviders: (token: string, guildId?: string) =>
    apiFetch<{ channel_providers: ChannelProviderItem[] }>(
      `/api/channel-providers${guildId ? `?guild_id=${guildId}` : ""}`,
      { token },
    ),

  setChannelProvider: (token: string, data: ChannelProviderItem) =>
    apiFetch<{ status: string }>("/api/channel-providers", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  deleteChannelProvider: (token: string, channelId: string) =>
    apiFetch<{ status: string }>(`/api/channel-providers/${channelId}`, {
      method: "DELETE",
      token,
    }),

  // Auto-Translation
  getChannelAutoTranslate: (token: string, channelId: string) => {
    if (!channelId) throw new Error("channelId is required");
    return apiFetch<AutoTranslateSetting>("/api/autotranslate/" + channelId, {
      token,
    });
  },

  setChannelAutoTranslate: (token: string, data: AutoTranslateSetting) =>
    apiFetch<{ status: string }>("/api/autotranslate", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  deleteChannelAutoTranslate: (token: string, channelId: string) => {
    if (!channelId) throw new Error("channelId is required");
    return apiFetch<{ status: string }>("/api/autotranslate/" + channelId, {
      method: "DELETE",
      token,
    });
  },

  // Analytics
  getAnalyticsSummary: (token: string, days: number = 7, guildId?: string) =>
    apiFetch<AnalyticsSummary>(
      `/api/analytics/summary?days=${days}${guildId ? `&guild_id=${guildId}` : ""}`,
      { token },
    ),

  getAnalyticsHistory: (token: string, limit: number = 100) =>
    apiFetch<{ history: AnalyticsEvent[] }>(
      `/api/analytics/history?limit=${limit}`,
      { token },
    ),

  getRateLimitAnalytics: (token: string, limit: number = 10) =>
    apiFetch<{ user_usage: any[]; guild_usage: any[] }>(
      `/api/analytics/rate-limits?limit=${limit}`,
      { token },
    ),

  // Plugins
  getPlugins: (token: string) =>
    apiFetch<{ plugins: PluginItem[] }>("/api/plugins", { token }),

  togglePlugin: (token: string, name: string, enabled: boolean) =>
    apiFetch<{ status: string }>("/api/plugins/toggle", {
      method: "POST",
      body: JSON.stringify({ name, enabled }),
      token,
    }),

  reloadPlugin: (token: string, name: string) =>
    apiFetch<{ status: string }>(`/api/plugins/reload/${name}`, {
      method: "POST",
      token,
    }),

  deletePlugin: (token: string, name: string) =>
    apiFetch<{ status: string }>(`/api/plugins/${name}`, {
      method: "DELETE",
      token,
    }),

  uploadPlugin: (token: string, file: File) => {

    apiFetch<{ status: string }>("/api/plugins/upload", {
      method: "POST",
      body: formData,
      token,
      headers: {}, // Explicitly set headers to empty object to prevent default Content-Type: application/json
    }),

  // Guild Config
  getGuildConfig: (token: string, guildId: string) =>
    apiFetch<{ config: Record<string, string> }>(
      `/api/guilds/${guildId}/config`,
      { token },
    ),

  updateGuildConfig: (
    token: string,
    guildId: string,
    values: Record<string, string>,
  ) =>
    apiFetch<{ status: string }>(`/api/guilds/${guildId}/config`, {
      method: "PUT",
      body: JSON.stringify({ values }),
      token,
    }),

  // Auto-Responses
  getAutoResponses: (token: string, guildId?: string) =>
    apiFetch<{ auto_responses: AutoResponse[] }>(
      `/api/auto-responses${guildId ? `?guild_id=${guildId}` : ""}`,
      { token },
    ),

  createAutoResponse: (
    token: string,
    data: {
      guild_id: string;
      keyword: string;
      response: string;
      match_type: string;
      is_case_sensitive: boolean;
    },
  ) =>
    apiFetch<{ status: string }>("/api/auto-responses", {
      method: "POST",
      body: JSON.stringify(data),
      token,
    }),

  updateAutoResponse: (
    token: string,
    id: number,
    data: {
      keyword: string;
      response: string;
      match_type: string;
      is_case_sensitive: boolean;
    },
  ) =>
    apiFetch<{ status: string }>(`/api/auto-responses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      token,
    }),

  deleteAutoResponse: (token: string, id: number, guildId?: string) =>
    apiFetch<{ status: string }>(
      `/api/auto-responses/${id}${guildId ? `?guild_id=${guildId}` : ""}`,
      {
        method: "DELETE",
        token,
      },
    ),
};
