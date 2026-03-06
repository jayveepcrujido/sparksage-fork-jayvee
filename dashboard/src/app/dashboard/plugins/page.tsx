"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, Puzzle, RefreshCcw, ExternalLink } from "lucide-react";
import { api, PluginItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function PluginsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const token = (session as { accessToken?: string })?.accessToken;

  useEffect(() => {
    if (!token) return;
    fetchPlugins();
  }, [token]);

  const fetchPlugins = async () => {
    setLoading(true);
    try {
      const res = await api.getPlugins(token!);
      setPlugins(res.plugins);
    } catch (err) {
      toast.error("Failed to load plugins");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentlyEnabled: boolean) => {
    if (!token) return;
    setActionId(id);
    try {
      await api.togglePlugin(token, id, !currentlyEnabled);
      toast.success(`Plugin ${!currentlyEnabled ? 'enabled' : 'disabled'}`);
      fetchPlugins();
    } catch (err) {
      toast.error("Failed to toggle plugin");
    } finally {
      setActionId(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!token || !selectedFile) {
      toast.error("No file selected.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      await api.uploadPlugin(token, formData); // This API call needs to be defined
      toast.success("Plugin uploaded and installed successfully!");
      fetchPlugins();
    } catch (err) {
      toast.error("Failed to upload plugin.");
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const handleReload = async (id: string) => {
    if (!token) return;
    setActionId(id);
    try {
      await api.reloadPlugin(token, id);
      toast.success("Plugin reloaded successfully");
    } catch (err) {
      toast.error("Failed to reload plugin");
    } finally {
      setActionId(null);
    }
  };

  if (loading && plugins.length === 0) {
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
          <h1 className="text-2xl font-bold">Bot Plugins</h1>
          <p className="text-muted-foreground">Extend SparkSage with community-contributed features.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".zip"
            ref={(input) => {
              if (input) {
                // To allow re-uploading the same file after an error or successful upload
                input.onclick = null;
                input.onclick = () => (input.value = '');
              }
            }}
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="plugin-upload-input"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => document.getElementById("plugin-upload-input")?.click()}
            disabled={loading || isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Puzzle className="mr-2 h-4 w-4" />
            )}
            Upload Plugin
          </Button>
          {selectedFile && (
            <Button
              variant="default"
              size="sm"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <span className="mr-2">🚀</span>
              )}
              {selectedFile.name} Upload
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchPlugins} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Scan Directory
          </Button>
        </div>
      </div>

      {plugins.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Puzzle className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-medium">No Plugins Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Place plugin directories inside the <code>plugins/</code> folder on your server to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plugins.map((plugin) => (
            <Card key={plugin.id} className={plugin.enabled ? "border-primary/20 bg-primary/5" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{plugin.name}</CardTitle>
                    <CardDescription className="text-xs">v{plugin.version} by {plugin.author}</CardDescription>
                  </div>
                  <Badge variant={plugin.enabled ? "default" : "secondary"}>
                    {plugin.enabled ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground min-h-[40px]">
                  {plugin.description}
                </p>
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button 
                    className="flex-1" 
                    variant={plugin.enabled ? "outline" : "default"}
                    onClick={() => handleToggle(plugin.id, plugin.enabled)}
                    disabled={!!actionId}
                  >
                    {actionId === plugin.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    {plugin.enabled ? "Disable" : "Enable"}
                  </Button>
                  {plugin.enabled && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleReload(plugin.id)}
                      disabled={!!actionId}
                      title="Reload Plugin"
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-primary" /> How to install plugins?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed">
            1. Download a plugin directory.<br />
            2. Place it inside the <code>plugins/</code> folder in the bot's root directory.<br />
            3. Ensure it has a <code>plugin.json</code> manifest and a valid Python cog file.<br />
            4. Click "Scan Directory" above to detect it, then click "Enable".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
