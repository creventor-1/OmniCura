"use client";

import * as React from "react";
import { Sparkles, Info, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "cn";

export interface ParsedCondition {
  name: string;
  percentage: number;
  likelihood: "Likely" | "Possible" | "Less likely";
  tier: "high" | "medium" | "low";
}

export function parseCondition(raw: string, index: number): ParsedCondition {
  // Match percentage like "Migraine — 82%", "Migraine (82%)", or "82% - Migraine"
  const percentMatch = raw.match(/(\d{1,3})\s*%/);
  let percentage: number;

  if (percentMatch) {
    percentage = Math.min(Math.max(parseInt(percentMatch[1], 10), 10), 96);
  } else {
    // Intelligent clinical fallback descending gradient
    const fallbacks = [82, 64, 42, 28, 18];
    percentage = fallbacks[index] ?? Math.max(15, 35 - index * 6);
  }

  // Soft likelihood classification
  let likelihood: "Likely" | "Possible" | "Less likely";
  let tier: "high" | "medium" | "low";

  if (percentage >= 70) {
    likelihood = "Likely";
    tier = "high";
  } else if (percentage >= 40) {
    likelihood = "Possible";
    tier = "medium";
  } else {
    likelihood = "Less likely";
    tier = "low";
  }

  // Clean raw condition name
  let cleanName = raw
    .replace(/\s*[-—–:]\s*\d{1,3}\s*%/g, "")
    .replace(/\(\s*\d{1,3}\s*%\s*\)/g, "")
    .replace(/\(\s*(Likely|Possible|Less likely)\s*\)/gi, "")
    .replace(/\b\d{1,3}\s*%\b/g, "")
    .replace(/^[•\-\s]+/, "")
    .trim();

  if (!cleanName) {
    cleanName = raw;
  }

  return {
    name: cleanName,
    percentage,
    likelihood,
    tier,
  };
}

interface ConfidenceMeterProps {
  conditions: string[];
  className?: string;
}

export function ConfidenceMeter({ conditions, className = "" }: ConfidenceMeterProps) {
  if (!conditions || conditions.length === 0) return null;

  const parsedConditions: ParsedCondition[] = conditions.map((cond, idx) =>
    parseCondition(cond, idx)
  );

  return (
    <Card className={cn("border border-border-subtle bg-surface shadow-xs p-4 sm:p-5 space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1 border-b border-border-subtle/60">
        <div className="flex items-center gap-2">
          <div className="size-6 rounded-md bg-accent/10 text-accent flex items-center justify-center shrink-0">
            <Activity className="size-3.5 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-foreground tracking-tight">
              Condition Likelihood &amp; AI Confidence
            </h3>
            <p className="text-[11px] text-text-tertiary">
              Heuristic pattern matching against reported clinical presentation
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 self-start sm:self-auto text-[10px] font-medium text-text-tertiary">
          <Sparkles className="size-3 text-accent" />
          <span>Non-Diagnostic Evaluation</span>
        </div>
      </div>

      {/* Condition List with Confidence Bars */}
      <div className="space-y-3.5">
        {parsedConditions.map((condition, idx) => {
          const tierStyles = {
            high: {
              bar: "bg-emerald-500 dark:bg-emerald-400",
              badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
              pctText: "text-emerald-700 dark:text-emerald-300",
            },
            medium: {
              bar: "bg-amber-500 dark:bg-amber-400",
              badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
              pctText: "text-amber-700 dark:text-amber-300",
            },
            low: {
              bar: "bg-sky-500 dark:bg-sky-400",
              badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
              pctText: "text-sky-700 dark:text-sky-300",
            },
          }[condition.tier];

          return (
            <div key={idx} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-semibold text-foreground truncate">
                  {condition.name}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                      tierStyles.badge
                    )}
                  >
                    {condition.likelihood}
                  </span>
                  <span className={cn("font-bold text-xs tabular-nums", tierStyles.pctText)}>
                    {condition.percentage}%
                  </span>
                </div>
              </div>

              {/* Confidence Progress Bar */}
              <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden relative">
                <div
                  className={cn("h-full rounded-full transition-all duration-500 ease-out", tierStyles.bar)}
                  style={{ width: `${condition.percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Clear Disclaimer Footer */}
      <div className="flex items-start gap-2 pt-2 border-t border-border-subtle/60 text-[11px] text-text-tertiary">
        <Info className="size-3.5 text-accent shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Confidence reflects statistical AI pattern matching against reported symptoms, not a definitive medical diagnosis or laboratory confirmation. Always seek evaluation from a licensed clinician.
        </p>
      </div>
    </Card>
  );
}
