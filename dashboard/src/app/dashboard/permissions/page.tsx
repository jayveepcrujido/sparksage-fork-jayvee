"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Shield, ShieldAlert, Plus, Trash2, RefreshCw, Search } from "lucide-react";
import { api, BotStatus, PermissionItem, RoleItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input"; // Import Input component

export default function PermissionsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [roles, setRoles] = useState<Record<string, RoleItem[]>>({});
  const [selectedGuild, setSelectedGuild] = useState<string>("");
  const [allCommands, setAllCommands] = useState<string[]>([]);
  const [commandFilter, setCommandFilter] = useState<string>(""); // For UI enhancement: search filter

  const token = (session as { accessToken?: string })?.accessToken;

  // Initial data fetch
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const botStatus = await api.getBotStatus(token);
      setStatus(botStatus);

      if (botStatus.online) {
        const [perms, commandsRes] = await Promise.all([
          api.getPermissions(token),
          api.getCommands(token),
        ]);

        setPermissions(perms.permissions);
        setAllCommands(commandsRes.commands.sort());

        if (botStatus.guilds.length > 0) {
          setSelectedGuild(botStatus.guilds[0].id);
        }
      }
    } catch (err) {
      if (err instanceof Error && !err.message.includes("Bot is not ready yet")) {
          toast.error("Failed to load initial data.");
          console.error("Error loading initial data:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedGuild) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    api.getRoles(token, selectedGuild)
      .then(r => {
        setRoles(prev => ({ ...prev, [selectedGuild]: r.roles }));
      })
      .catch(() => toast.error("Failed to load roles for guild"))
      .finally(() => setLoading(false));
  }, [token, selectedGuild]);

  const handleRefresh = () => fetchData();

  const refreshPermissions = () => {
    if (!token) return;
    api.getPermissions(token, selectedGuild)
      .then(p => setPermissions(p.permissions))
      .catch(() => toast.error("Failed to refresh permissions"));
  };

  async function handleAddPermission(command: string, roleId: string) {
    if (!token || !selectedGuild) return;
    try {
      await api.createPermission(token, {
        command_name: command,
        guild_id: selectedGuild,
        role_id: roleId
      });
      toast.success(`Permission added for /${command}`);
      refreshPermissions();
    } catch (err) {
      toast.error("Failed to add permission");
    }
  }

  async function handleRemovePermission(command: string, roleId: string) {
    if (!token || !selectedGuild) return;
    try {
      await api.deletePermission(token, command, selectedGuild, roleId);
      toast.success(`Permission removed for /${command}`);
      refreshPermissions();
    } catch (err) {
      toast.error("Failed to remove permission");
    }
  }

  if (!status && loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status && !status.online) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Bot is Offline</h2>
        <p className="mt-2 text-muted-foreground">
          The bot is not currently connected. Permissions cannot be managed.
        </p>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="mt-6">
            {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
            Retry Connection
        </Button>
      </div>
    );
  }

  const currentRoles = roles[selectedGuild] || [];
  const guildName = status?.guilds.find(g => g.id === selectedGuild)?.name || "Unknown Guild";

  const filteredCommands = allCommands.filter(command => 
    command.toLowerCase().includes(commandFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Command Permissions</h1>
          <p className="text-muted-foreground">Manage which roles can use specific SparkSage commands.</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
          Refresh All
        </Button>
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

      {/* Command Search/Filter */}
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
            const commandPermissions = permissions.filter(p => p.command_name === command && p.guild_id === selectedGuild);
            
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
                          const role = currentRoles.find(r => r.id === p.role_id);
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

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Add allowed role:</span>
                      <div className="flex flex-wrap gap-1">
                        {currentRoles
                          .filter(r => !commandPermissions.some(p => p.role_id === r.id))
                          .map(role => ( // Removed .slice(0, 10)
                            <Button 
                              key={role.id} 
                              variant="outline" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => handleAddPermission(command, role.id)}
                            >
                              <Plus className="mr-1 h-3 w-3" /> {role.name}
                            </Button>
                          ))
                        }
                        {currentRoles.length === 0 && !loading && (
                          <span className="text-xs text-destructive">No roles found. Ensure the bot has been invited to the server.</span>
                        )}
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="text-muted-foreground text-center py-8">No commands found or matching your filter.</p>
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
