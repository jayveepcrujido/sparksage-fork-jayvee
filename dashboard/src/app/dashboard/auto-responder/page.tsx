"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { 
  Loader2, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  MessageSquare, 
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Hash
} from "lucide-react";
import { api, AutoResponse } from "@/lib/api";
import { useGuild } from "@/components/providers/guild-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AutoResponderPage() {
  const { data: session } = useSession();
  const { selectedGuildId, selectedGuild } = useGuild();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<AutoResponse[]>([]);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<AutoResponse | null>(null);

  const [formData, setFormData] = useState({
    keyword: "",
    response: "",
    match_type: "contains" as "exact" | "contains",
    is_case_sensitive: false,
  });

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token || !selectedGuildId) return;
    loadResponses();
  }, [token, selectedGuildId]);

  async function loadResponses() {
    if (!token || !selectedGuildId) return;
    setLoading(true);
    try {
      const res = await api.getAutoResponses(token, selectedGuildId);
      setResponses(res.auto_responses);
    } catch (err) {
      toast.error("Failed to load auto-responses");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!token || !selectedGuildId) return;
    try {
      await api.createAutoResponse(token, {
        guild_id: selectedGuildId,
        ...formData,
      });
      toast.success("Auto-response created");
      setIsAddOpen(false);
      setFormData({ keyword: "", response: "", match_type: "contains", is_case_sensitive: false });
      loadResponses();
    } catch (err) {
      toast.error("Failed to create auto-response");
    }
  }

  async function handleEdit() {
    if (!token || !editingResponse) return;
    try {
      await api.updateAutoResponse(token, editingResponse.id, formData);
      toast.success("Auto-response updated");
      setIsEditOpen(false);
      setEditingResponse(null);
      loadResponses();
    } catch (err) {
      toast.error("Failed to update auto-response");
    }
  }

  async function handleDelete(id: number) {
    if (!token || !confirm("Are you sure you want to delete this auto-response?")) return;
    try {
      await api.deleteAutoResponse(token, id, selectedGuildId || undefined);
      toast.success("Auto-response deleted");
      loadResponses();
    } catch (err) {
      toast.error("Failed to delete auto-response");
    }
  }

  const filteredResponses = responses.filter(r => 
    r.keyword.toLowerCase().includes(search.toLowerCase()) ||
    r.response.toLowerCase().includes(search.toLowerCase())
  );

  if (!selectedGuildId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h3 className="text-lg font-medium">No Server Selected</h3>
        <p className="text-muted-foreground max-w-sm">
          Please select a Discord server from the sidebar to manage its auto-responses.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Auto-Responder</h1>
          <p className="text-sm text-muted-foreground">
            Configure automatic responses to specific keywords in <strong>{selectedGuild?.name}</strong>.
          </p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" /> Add Response
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Auto-Response</DialogTitle>
              <DialogDescription>
                Define a keyword and the response the bot should give.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="keyword">Keyword / Phrase</Label>
                <Input 
                  id="keyword" 
                  value={formData.keyword}
                  onChange={e => setFormData({...formData, keyword: e.target.value})}
                  placeholder="e.g., help, rules, !website"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="response">Bot Response</Label>
                <Textarea 
                  id="response" 
                  value={formData.response}
                  onChange={e => setFormData({...formData, response: e.target.value})}
                  placeholder="What should the bot say?"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="match_type">Match Type</Label>
                  <Select 
                    value={formData.match_type} 
                    onValueChange={(val: any) => setFormData({...formData, match_type: val})}
                  >
                    <SelectTrigger id="match_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="exact">Exact Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <Label htmlFor="is_case_sensitive">Case Sensitive</Label>
                  <div className="flex items-center space-x-2 h-10">
                    <Switch 
                      id="is_case_sensitive" 
                      checked={formData.is_case_sensitive}
                      onCheckedChange={checked => setFormData({...formData, is_case_sensitive: checked})}
                    />
                    <span className="text-xs text-muted-foreground">
                      {formData.is_case_sensitive ? "Strict" : "Flexible"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={!formData.keyword || !formData.response}>
                Create Response
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords or responses..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
            </div>
          ) : filteredResponses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/10 mb-4" />
              <h3 className="text-lg font-medium">No responses found</h3>
              <p className="text-muted-foreground">
                {search ? "No matches for your search." : "Start by adding your first auto-response."}
              </p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead className="w-[120px]">Type</TableHead>
                    <TableHead className="w-[100px]">Case</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          {r.keyword}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-muted-foreground">
                        {r.response}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {r.match_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.is_case_sensitive ? (
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground/30" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingResponse(r);
                              setFormData({
                                keyword: r.keyword,
                                response: r.response,
                                match_type: r.match_type,
                                is_case_sensitive: r.is_case_sensitive
                              });
                              setIsEditOpen(true);
                            }}>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Auto-Response</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-keyword">Keyword / Phrase</Label>
              <Input 
                id="edit-keyword" 
                value={formData.keyword}
                onChange={e => setFormData({...formData, keyword: e.target.value})}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-response">Bot Response</Label>
              <Textarea 
                id="edit-response" 
                value={formData.response}
                onChange={e => setFormData({...formData, response: e.target.value})}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-match_type">Match Type</Label>
                <Select 
                  value={formData.match_type} 
                  onValueChange={(val: any) => setFormData({...formData, match_type: val})}
                >
                  <SelectTrigger id="edit-match_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="exact">Exact Match</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col justify-center gap-2">
                <Label htmlFor="edit-is_case_sensitive">Case Sensitive</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch 
                    id="edit-is_case_sensitive" 
                    checked={formData.is_case_sensitive}
                    onCheckedChange={checked => setFormData({...formData, is_case_sensitive: checked})}
                  />
                  <span className="text-xs text-muted-foreground">
                    {formData.is_case_sensitive ? "Strict" : "Flexible"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={!formData.keyword || !formData.response}>
              Update Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
