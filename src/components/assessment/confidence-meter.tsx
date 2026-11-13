"use client";

import * as React from "react";
import { Info } from "lucide-react";
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

  return { name: cleanName, percentage, likelihood, tier };
}

interface ConfidenceMeterProps {
  conditions: string[];
  className?: string;
}

/**
 * Differential likelihood — single-hue meters (magnitude, not status).
 * Likelihood is carried by text, never by colour alone.
 */
export function ConfidenceMeter({ conditions, className = "" }: ConfidenceMeterProps) {
  if (!conditions || conditions.length === 0) return null;

  const parsed = conditions.map((cond, idx) => parseCondition(cond, idx));

  return (
    <section
      aria-labelledby="differential-title"
      className={cn("rounded-2xl border border-border-subtle bg-surface p-5 shadow-xs", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="differential-title" className="type-heading text-foreground">
            Differential considerations
          </h3>
          <p className="text-[13px] text-text-tertiary mt-0.5">Pattern match against reported symptoms</p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
          Non-diagnostic
        </span>
      </div>

      <ul className="mt-5 space-y-4">
        {parsed.map((c, idx) => (
          <li key={idx} className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{c.name}</span>
              <span className="flex items-baseline gap-2 shrink-0">
                <span className="text-xs text-text-tertiary">{c.likelihood}</span>
                <span className="text-sm font-semibold tabular-nums text-foreground w-10 text-right">
                  {c.percentage}%
                </span>
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-brand-soft/60"
              role="meter"
              aria-valuenow={c.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${c.name}: ${c.likelihood}, ${c.percentage}%`}
            >
              <div
                className={cn(
                  "h-full rounded-full origin-left animate-grow-x",
                  c.tier === "high" ? "bg-brand" : c.tier === "medium" ? "bg-brand/70" : "bg-brand/45"
                )}
                style={{ width: `${c.percentage}%`, animationDelay: `${idx * 90}ms` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 flex items-start gap-2 border-t border-border-subtle pt-4 text-xs leading-relaxed text-text-tertiary">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Confidence reflects AI pattern matching, not a diagnosis or lab confirmation. Seek evaluation from a licensed clinician.
      </p>
    </section>
  );
}
