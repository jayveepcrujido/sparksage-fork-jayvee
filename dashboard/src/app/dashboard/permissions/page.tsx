"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Shield, ShieldAlert, Plus, Trash2, RefreshCw, Search, Globe } from "lucide-react";
import { api, PermissionItem, RoleItem } from "@/lib/api";
import { useGuild } from "@/components/providers/guild-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function PermissionsPage() {
  const { data: session } = useSession();
  const { selectedGuildId, selectedGuild } = useGuild();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allCommands, setAllCommands] = useState<string[]>([]);
  const [commandFilter, setCommandFilter] = useState<string>("");

  const token = (session as { accessToken?: string })?.accessToken;

  const fetchData = async () => {
    if (!token || !selectedGuildId) return;
    setLoading(true);
    try {
      const [perms, commandsRes, rolesRes] = await Promise.all([
        api.getPermissions(token, selectedGuildId),
        api.getCommands(token),
        api.getRoles(token, selectedGuildId)
      ]);

      setPermissions(perms.permissions);
      setAllCommands(commandsRes.commands.sort());
      setRoles(rolesRes.roles);
    } catch (err) {
      toast.error("Failed to load permissions data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, selectedGuildId]);

  const handleRefresh = () => fetchData();

  async function handleAddPermission(command: string, roleId: string) {
    if (!token || !selectedGuildId) return;
    try {
      await api.createPermission(token, {
        command_name: command,
        guild_id: selectedGuildId,
        role_id: roleId
      });
      toast.success(`Permission added for /${command}`);
      // Refresh local permissions state
      const perms = await api.getPermissions(token, selectedGuildId);
      setPermissions(perms.permissions);
    } catch (err) {
      toast.error("Failed to add permission");
    }
  }

  async function handleRemovePermission(command: string, roleId: string) {
    if (!token || !selectedGuildId) return;
    try {
      await api.deletePermission(token, command, selectedGuildId, roleId);
      toast.success(`Permission removed for /${command}`);
      // Refresh local permissions state
      const perms = await api.getPermissions(token, selectedGuildId);
      setPermissions(perms.permissions);
    } catch (err) {
      toast.error("Failed to remove permission");
    }
  }

  if (!selectedGuildId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Globe className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold">No Server Selected</h2>
        <p className="text-muted-foreground">Please select a server from the sidebar to manage its permissions.</p>
      </div>
    );
  }

  if (loading && allCommands.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filteredCommands = allCommands.filter(command => 
    command.toLowerCase().includes(commandFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Command Permissions</h1>
          <p className="text-muted-foreground">Manage role access for {selectedGuild?.name}.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
          Refresh
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter commands..."
          value={commandFilter}
          onChange={(e) => setCommandFilter(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="grid gap-6">
        {filteredCommands.length > 0 ? (
          filteredCommands.map(command => {
            const commandPermissions = permissions.filter(p => p.command_name === command && p.guild_id === selectedGuildId);
            
            return (
              <Card key={command}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">/{command}</CardTitle>
                      <CardDescription>
                        {commandPermissions.length === 0 
                          ? "Public: Accessible to everyone (and Administrators)." 
                          : `Restricted to ${commandPermissions.length} role(s).`}
                      </CardDescription>
                    </div>
                    <Shield className={`h-5 w-5 ${commandPermissions.length > 0 ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {commandPermissions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {commandPermissions.map(p => {
                          const role = roles.find(r => r.id === p.role_id);
                          return (
                            <Badge key={p.role_id} variant="secondary" className="pl-2 pr-1 py-1 gap-1">
                              {role?.name || p.role_id}
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleRemovePermission(command, p.role_id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t overflow-x-auto pb-2 scrollbar-hide">
                      <span className="text-sm text-muted-foreground whitespace-nowrap mr-2">Add allowed role:</span>
                      <div className="flex gap-1">
                        {roles
                          .filter(r => !commandPermissions.some(p => p.role_id === r.id))
                          .map(role => (
                            <Button 
                              key={role.id} 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs whitespace-nowrap"
                              onClick={() => handleAddPermission(command, role.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" /> {role.name}
                            </Button>
                          ))
                        }
                        {roles.length === 0 && !loading && (
                          <span className="text-xs text-destructive">No roles found.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-muted-foreground text-center py-8">No commands matching your filter.</p>
        )}
      </div>

      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <CardTitle className="text-base">Security Note</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Users with the <strong>Administrator</strong> permission in Discord always bypass these role restrictions. 
            If no roles are added for a command, it is considered <strong>public</strong> and available to everyone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
