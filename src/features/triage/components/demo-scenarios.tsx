"use client";

import * as React from "react";
import { Sparkles, OctagonAlert, HeartPulse, ShieldAlert, Activity, ChevronDown, ArrowUpRight } from "lucide-react";
import { cn } from "cn";
import { getAcuity } from "@/lib/acuity";

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
    icon: OctagonAlert,
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

const categoryToAcuity = { normal: "non-urgent", urgent: "urgent", emergency: "emergency" } as const;

interface DemoScenariosProps {
  onSelectScenario: (text: string) => void;
  variant?: "collapsible" | "list";
  disabled?: boolean;
}

export function DemoScenarios({ onSelectScenario, variant = "collapsible", disabled }: DemoScenariosProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const list = (
    <ul className={cn("grid gap-2", variant === "collapsible" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
      {DEMO_SCENARIOS.map((sc) => {
        const acuity = getAcuity(categoryToAcuity[sc.category]);
        return (
          <li key={sc.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelectScenario(sc.prompt)}
              className="group flex w-full items-start gap-3 rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-left transition-all hover:border-border-strong hover:shadow-sm disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              title={sc.prompt}
              aria-label={`${sc.title} scenario (${acuity?.label}): ${sc.prompt}`}
            >
              <span className={cn("mt-1 size-2 shrink-0 rounded-full", acuity?.solid)} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-foreground">{sc.title}</span>
                  <span className={cn("text-[11px] font-semibold", acuity?.text)}>{acuity?.label}</span>
                </span>
                {variant === "collapsible" && (
                  <span className="mt-0.5 text-xs leading-snug text-text-tertiary line-clamp-2">{sc.prompt}</span>
                )}
              </span>
              <ArrowUpRight className="size-3.5 shrink-0 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "list") return list;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-semibold text-text-secondary transition-colors hover:text-foreground cursor-pointer"
      >
        <Sparkles className="size-3.5 text-accent" />
        Demo scenarios
        <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>
      {isOpen && <div className="pt-2 animate-rise">{list}</div>}
    </div>
  );
}
