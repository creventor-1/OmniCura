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
  description: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "scenario-normal",
    title: "Scenario 1: Mild Cold (Normal)",
    category: "normal",
    prompt:
      "I have had a mild dry cough and slight scratchy throat for two days. No fever, no chest pain, breathing normally.",
    icon: Activity,
    description: "Demonstrates adaptive AI follow-up questions & non-urgent guidance.",
  },
  {
    id: "scenario-emergency",
    title: "Scenario 2: Chest Pain (Emergency)",
    category: "emergency",
    prompt:
      "I have severe crushing chest pain radiating to my left arm and I can't breathe.",
    icon: AlertOctagon,
    description: "Demonstrates instant deterministic red-flag safety interception.",
  },
  {
    id: "scenario-anaphylaxis",
    title: "Scenario 3: Anaphylaxis (Safety)",
    category: "emergency",
    prompt:
      "My throat is closing and my tongue is swelling after eating seafood.",
    icon: ShieldAlert,
    description: "Demonstrates rapid allergic reaction detection and emergency hotline.",
  },
  {
    id: "scenario-urgent",
    title: "Scenario 4: High Fever & Ear Pain (Urgent)",
    category: "urgent",
    prompt:
      "I have had a high fever with severe throbbing ear pain and dizziness since yesterday.",
    icon: HeartPulse,
    description: "Demonstrates urgent severity classification with clinic referral.",
  },
];

interface DemoScenariosProps {
  onSelectScenario: (text: string) => void;
}

export function DemoScenarios({ onSelectScenario }: DemoScenariosProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition-all"
        >
          <Sparkles className="size-3.5" />
          <span>{isOpen ? "Hide Hackathon Demo Presets" : "Show Hackathon Demo Presets (One-Click Testing)"}</span>
        </button>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5 animate-in fade-in-50 duration-200">
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
                onClick={() => onSelectScenario(sc.prompt)}
                className="h-auto p-2.5 flex flex-col items-start text-left bg-background hover:bg-muted/60 transition-all border-border/80"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <Icon className="size-3.5 text-primary" />
                    <span>{sc.title}</span>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded border ${badgeClass}`}>
                    {sc.category}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                  {sc.description}
                </p>
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
