"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useWizardStore } from "@/stores/wizard-store";
import { api } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { StepDiscord } from "./step-discord";
import { StepProviders } from "./step-providers";
import { StepSettings } from "./step-settings";
import { StepReview } from "./step-review";

const STEPS = [
  { title: "Discord Token", description: "Connect your Discord bot" },
  { title: "AI Providers", description: "Configure API keys" },
  { title: "Bot Settings", description: "Customize behavior" },
  { title: "Review", description: "Confirm your setup" },
];

const STEP_COMPONENTS = [StepDiscord, StepProviders, StepSettings, StepReview];

export function WizardShell() {
  const { data: session } = useSession();
  const { currentStep, setStep, data, updateData } = useWizardStore();
  const [initializing, setInitializing] = useState(true);

  const token = (session as { accessToken?: string })?.accessToken;

  // Initialize from backend on mount
  useEffect(() => {
    if (!token) return;

    api.getWizardStatus(token)
      .then((res) => {
        // Only override if backend has data and we are at step 0
        // Or if we want to strictly follow backend state
        if (res.data && Object.keys(res.data).length > 0) {
          // Flatten the step-based data from backend into our store format
          const backendData: any = {};
          Object.values(res.data).forEach((stepData: any) => {
            Object.assign(backendData, stepData);
          });
          
          if (Object.keys(backendData).length > 0) {
            updateData(backendData);
          }
          
          if (res.current_step !== undefined) {
            setStep(res.current_step);
          }
        }
      })
      .catch((err) => console.error("Failed to fetch wizard status:", err))
      .finally(() => setInitializing(false));
  }, [token]);

  // Sync current step and data to backend when they change
  useEffect(() => {
    if (!token || initializing) return;

    // We only save the data relevant to the current step to avoid massive payloads
    // and matching the backend's expected structure
    const stepDataMap: Record<number, any> = {
      0: { discordToken: data.discordToken },
      1: { providers: data.providers, primaryProvider: data.primaryProvider },
      2: { botPrefix: data.botPrefix, maxTokens: data.maxTokens, systemPrompt: data.systemPrompt }
    };

    const currentStepData = stepDataMap[currentStep];
    if (currentStepData) {
      api.updateWizardStep(token, currentStep, currentStepData)
        .catch(err => console.error("Failed to save wizard step:", err));
    }
  }, [currentStep, data, token, initializing]);

  if (initializing) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep].title}
          </span>
          <span className="text-muted-foreground">
            {STEPS[currentStep].description}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between">
          {STEPS.map((step, i) => (
            <button
              key={step.title}
              onClick={() => i < currentStep && setStep(i)}
              className={`text-xs transition-colors ${
                i === currentStep
                  ? "font-medium text-foreground"
                  : i < currentStep
                  ? "text-primary cursor-pointer hover:underline"
                  : "text-muted-foreground"
              }`}
              disabled={i > currentStep}
            >
              {step.title}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <StepComponent />

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setStep(currentStep - 1)}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        {currentStep < STEPS.length - 1 && (
          <Button onClick={() => setStep(currentStep + 1)}>
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}
