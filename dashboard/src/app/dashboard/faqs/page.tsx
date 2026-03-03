"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Plus, Trash2, MessageCircle } from "lucide-react";
import { api, FAQItem } from "@/lib/api";
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
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  
  // New FAQ form state
  const [newFaq, setNewFaq] = useState({
    guild_id: "",
    question: "",
    answer: "",
    match_keywords: "",
  });

  const token = (session as { accessToken?: string })?.accessToken;

  async function load() {
    if (!token) return;
    try {
      const result = await api.getFAQs(token);
      setFaqs(result.faqs);
    } catch {
      toast.error("Failed to load FAQs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  async function handleAdd() {
    if (!token) return;
    if (!newFaq.guild_id || !newFaq.question || !newFaq.answer || !newFaq.match_keywords) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await api.createFAQ(token, newFaq);
      toast.success("FAQ created successfully");
      setOpen(false);
      setNewFaq({ guild_id: "", question: "", answer: "", match_keywords: "" });
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
        <h1 className="text-2xl font-bold text-foreground">FAQ Management</h1>
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
                Create an automated response for common questions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="guild_id">Guild ID</Label>
                <Input
                  id="guild_id"
                  placeholder="e.g. 1234567890"
                  value={newFaq.guild_id}
                  onChange={(e) => setNewFaq({ ...newFaq, guild_id: e.target.value })}
                />
              </div>
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
          <CardTitle>Global FAQ List</CardTitle>
          <CardDescription>
            These automated responses will trigger when keywords are detected in messages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">No FAQs configured yet.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guild ID</TableHead>
                    <TableHead>Question</TableHead>
                    <TableHead>Keywords</TableHead>
                    <TableHead className="text-right">Used</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq.id}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{faq.guild_id}</TableCell>
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
