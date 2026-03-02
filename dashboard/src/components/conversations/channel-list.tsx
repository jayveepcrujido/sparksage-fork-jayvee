"use client";

import Link from "next/link";
import { Trash2, Download, FileText } from "lucide-react";
import type { ChannelItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ChannelListProps {
  channels: ChannelItem[];
  onDelete: (channelId: string) => void;
  onExport?: (channelId: string, format: "json" | "pdf") => void;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "Z");
  return date.toLocaleString();
}

export function ChannelList({
  channels,
  onDelete,
  onExport,
}: ChannelListProps) {
  if (channels.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No conversations yet. Messages will appear here when users interact with
        the bot.
      </p>
    );
  }

  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Channel ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Messages</TableHead>
            <TableHead>Last Activity</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {channels.map((ch) => (
            <TableRow key={ch.channel_id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/conversations/${ch.channel_id}`}
                    className="font-mono text-sm text-primary hover:underline"
                  >
                    #{ch.channel_id}
                  </Link>
                  {ch.has_code_review && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-none whitespace-nowrap"
                    >
                      Code Review
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>{ch.channel_name || "—"}</TableCell>
              <TableCell className="text-right">{ch.message_count}</TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {formatDate(ch.last_active)}
              </TableCell>
              <TableCell className="flex gap-1 justify-end">
                {onExport && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExport(ch.channel_id, "json")}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                      title="Export JSON"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onExport(ch.channel_id, "pdf")}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                      title="Export PDF"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(ch.channel_id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
