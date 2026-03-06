"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Trash2, MessageCircle, Globe } from "lucide-react";
import { api, FAQItem } from "@/lib/api";
import { useGuild } from "@/components/providers/guild-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function FAQsPage() {
  const { data: session } = useSession();
  const { selectedGuildId, selectedGuild } = useGuild();
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  // New FAQ form state
  const [newFaq, setNewFaq] = useState({
    question: "",
    answer: "",
    match_keywords: "",
  });

  const token = (session as { accessToken?: string })?.accessToken;

  async function load() {
    if (!token || !selectedGuildId) return;
    setLoading(true);
    try {
      const result = await api.getFAQs(token, selectedGuildId);
      setFaqs(result.faqs);
    } catch {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token, selectedGuildId]);

  async function handleAdd() {
    if (!token || !selectedGuildId) return;
    if (!newFaq.question || !newFaq.answer || !newFaq.match_keywords) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await api.createFAQ(token, {
        ...newFaq,
        guild_id: selectedGuildId
      });
      toast.success("FAQ created successfully");
      setOpen(false);
      setNewFaq({ question: "", answer: "", match_keywords: "" });
      await load();
    } catch (err) {
      toast.error("Failed to create FAQ");
    }
  }

  async function handleDelete(id: number) {
    if (!token) return;
    try {
      await api.deleteFAQ(token, id);
      toast.success("FAQ deleted");
      await load();
    } catch {
      toast.error("Failed to delete FAQ");
    }
  }

  if (!selectedGuildId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Globe className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold">No Server Selected</h2>
        <p className="text-muted-foreground">Please select a server from the sidebar to manage its FAQs.</p>
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
          <h1 className="text-2xl font-bold text-foreground">FAQ Management</h1>
          <p className="text-muted-foreground">Server: {selectedGuild?.name}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add FAQ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New FAQ</DialogTitle>
              <DialogDescription>
                Create an automated response for common questions in {selectedGuild?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  placeholder="How do I...?"
                  value={newFaq.question}
                  onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  placeholder="help, tutorial, guide"
                  value={newFaq.match_keywords}
                  onChange={(e) => setNewFaq({ ...newFaq, match_keywords: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="answer">Answer</Label>
                <Textarea
                  id="answer"
                  placeholder="To do this, you need to..."
                  value={newFaq.answer}
                  onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Save FAQ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automated Responses</CardTitle>
          <CardDescription>
            These responses will trigger in {selectedGuild?.name} when keywords are detected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">No FAQs configured yet for this server.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell className="font-medium whitespace-nowrap">{faq.question}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 min-w-[150px]">
                          {faq.match_keywords.split(",").map((kw, i) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground whitespace-nowrap">
                              {kw.trim()}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{faq.times_used}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(faq.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
