"use client";

import type { MessageItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

interface MessageListProps {
  messages: MessageItem[];
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr + "Z");
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "Z");
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-center text-sm text-muted-foreground">
          No messages found.
        </p>
        <p className="text-center text-xs text-muted-foreground/60 mt-1">
          Try adjusting your search terms.
        </p>
      </div>
    );
  }

  // Group messages by date
  const messagesByDate: { [key: string]: MessageItem[] } = {};
  messages.forEach((msg) => {
    const date = formatDate(msg.created_at);
    if (!messagesByDate[date]) {
      messagesByDate[date] = [];
    }
    messagesByDate[date].push(msg);
  });

  return (
    <div className="space-y-6">
      {Object.entries(messagesByDate).map(([date, dateMessages]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs font-medium text-muted-foreground px-2">
              {date}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            {dateMessages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={i}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-3 transition-colors ${
                      isUser
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    <div
                      className={`mt-2 flex items-center gap-2 text-xs ${
                        isUser
                          ? "opacity-70"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>{formatTime(msg.created_at)}</span>
                      {msg.provider && !isUser && (
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0"
                        >
                          {msg.provider}
                        </Badge>
                      )}
                      {msg.category === "code_review" && (
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-none"
                        >
                          Code Review
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
