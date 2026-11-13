"use client";

import * as React from "react";
import { Sparkles, AlertOctagon, HeartPulse, ShieldAlert, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DemoScenario {
  id: string;
  title: string;
  category: "normal" | "emergency" | "urgent";
  prompt: string;
  icon: typeof HeartPulse;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "scenario-normal",
    title: "Mild Cold",
    category: "normal",
    prompt:
      "I have had a mild dry cough and slight scratchy throat for two days. No fever, no chest pain, breathing normally.",
    icon: Activity,
  },
  {
    id: "scenario-emergency",
    title: "Chest Pain",
    category: "emergency",
    prompt:
      "I have severe crushing chest pain radiating to my left arm and I can't breathe.",
    icon: AlertOctagon,
  },
  {
    id: "scenario-anaphylaxis",
    title: "Allergic Reaction",
    category: "emergency",
    prompt:
      "My throat is closing and my tongue is swelling after eating seafood.",
    icon: ShieldAlert,
  },
  {
    id: "scenario-urgent",
    title: "High Fever",
    category: "urgent",
    prompt:
      "I have had a high fever with severe throbbing ear pain and dizziness since yesterday.",
    icon: HeartPulse,
  },
];

interface DemoScenariosProps {
  onSelectScenario: (text: string) => void;
}

export function DemoScenarios({ onSelectScenario }: DemoScenariosProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="w-full space-y-1.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-foreground transition-colors cursor-pointer"
        >
          <Sparkles className="size-3 text-accent" />
          <span>{isOpen ? "Hide Scenarios" : "Demo Scenarios"}</span>
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 animate-in fade-in-50 duration-150">
          {DEMO_SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            const badgeClass = {
              normal: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
              emergency: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
              urgent: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
            }[sc.category];

            return (
              <Button
                key={sc.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectScenario(sc.prompt)}
                className="h-8 px-2.5 flex items-center justify-between text-xs font-medium bg-background hover:bg-muted border-border"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="size-3.5 text-accent shrink-0" />
                  <span className="truncate">{sc.title}</span>
                </div>
                <span className={`text-[9px] font-semibold uppercase px-1 py-0.2 rounded border ml-1 shrink-0 ${badgeClass}`}>
                  {sc.category === "normal" ? "Low" : sc.category}
                </span>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
