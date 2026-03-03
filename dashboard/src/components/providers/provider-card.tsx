"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, Star } from "lucide-react";
import type { ProviderItem, TestProviderResult } from "@/lib/api";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProviderCardProps {
  provider: ProviderItem;
  token: string;
  onSetPrimary: (name: string) => void;
  onToggle: (name: string, enabled: boolean) => void;
}

export function ProviderCard({ provider, token, onSetPrimary, onToggle }: ProviderCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestProviderResult | null>(null);
  const [toggling, setToggling] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testProvider(token, provider.name);
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : "Test failed",
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleToggle() {
    setToggling(true);
    try {
      await onToggle(provider.name, !provider.enabled);
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card className={`${provider.is_primary ? "border-primary" : ""} ${!provider.enabled ? "opacity-60 bg-muted/30" : ""}`}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            {provider.display_name}
            {provider.is_primary && (
              <Badge>
                <Star className="mr-1 h-3 w-3" /> Primary
              </Badge>
            )}
            {!provider.enabled && (
              <Badge variant="destructive" className="text-[10px] h-4">Disabled</Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{provider.model}</p>
        </div>
        <Badge variant={provider.free ? "secondary" : "outline"}>
          {provider.free ? "Free" : "Paid"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                provider.configured ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="text-sm">
              {provider.configured ? "Configured" : "Not configured"}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 px-2 text-[10px] uppercase font-bold tracking-wider ${provider.enabled ? "text-destructive hover:text-destructive" : "text-primary hover:text-primary"}`}
            onClick={handleToggle}
            disabled={toggling || provider.is_primary}
          >
            {toggling ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {provider.enabled ? "Disable" : "Enable"}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!provider.configured || testing || !provider.enabled}
          >
            {testing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : null}
            Test Key
          </Button>
          {!provider.is_primary && provider.configured && provider.enabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetPrimary(provider.name)}
            >
              Set as Primary
            </Button>
          )}
        </div>

        {testResult && (
          <div
            className={`flex items-center gap-1.5 text-xs ${
              testResult.success ? "text-green-600" : "text-destructive"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            {testResult.message}
            {testResult.latency_ms != null && ` (${testResult.latency_ms}ms)`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
