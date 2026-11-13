"use client";

import * as React from "react";
import {
  ArrowRight,
  HeartPulse,
  TriangleAlert,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Brain,
} from "lucide-react";
import { AssessmentResponse } from "@/schemas/triage";
import { ConfidenceMeter } from "@/components/assessment/confidence-meter";
import { getAcuity, ACUITY } from "@/lib/acuity";
import { cn } from "cn";

export interface AIResultPanelProps {
  assessment: AssessmentResponse;
  className?: string;
  /** "split" = two-column on large screens (results page); "stack" = single column (dialogs) */
  layout?: "split" | "stack";
  actions?: React.ReactNode;
}

export function AcuityHero({
  severity,
  recommendedAction,
  actions,
  compact = false,
}: {
  severity: string;
  recommendedAction?: string;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  const acuity = getAcuity(severity) ?? ACUITY["non-urgent"];
  const Icon = acuity.icon;

  return (
    <section
      aria-label="Triage outcome"
      className={cn(
        "relative overflow-hidden rounded-[20px] border bg-surface shadow-xs",
        acuity.border
      )}
    >
      <div className={cn("absolute inset-x-0 top-0 h-1", acuity.solid)} aria-hidden="true" />
      <div className={cn("flex flex-col gap-5", compact ? "p-5" : "p-6 sm:p-7")}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-2xl border",
                acuity.bg,
                acuity.text,
                acuity.border,
                compact ? "size-11" : "size-14"
              )}
            >
              <Icon className={cn("stroke-[2]", compact ? "size-5" : "size-6")} aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <p className="type-overline text-text-tertiary">Triage outcome</p>
              <h2 className={cn("font-heading font-semibold tracking-[-0.02em] text-foreground", compact ? "text-xl" : "text-2xl")}>
                {acuity.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span
                  className={cn(
                    "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold",
                    acuity.bg,
                    acuity.text,
                    acuity.border
                  )}
                >
                  {acuity.label}
                </span>
                <span className="text-[13px] text-text-secondary">{acuity.timeframe}</span>
              </div>
            </div>
          </div>
          {actions && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{actions}</div>
          )}
        </div>

        {recommendedAction && (
          <div className="rounded-2xl border border-brand/15 bg-brand-muted p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-text">
              <ArrowRight className="size-3.5" aria-hidden="true" />
              Recommended next step
            </div>
            <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-foreground">
              {recommendedAction}
            </p>
          </div>
        )}

        <p className="text-[13px] leading-relaxed text-text-secondary">{acuity.guidance}</p>
      </div>
    </section>
  );
}

export function FirstAidSteps({ steps, title = "First-aid guidance" }: { steps: string[]; title?: string }) {
  if (!steps?.length) return null;
  return (
    <section aria-labelledby="first-aid-title" className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-accent">
          <HeartPulse className="size-4" aria-hidden="true" />
        </span>
        <h3 id="first-aid-title" className="type-heading text-foreground">{title}</h3>
      </div>
      <ol className="relative mt-5 space-y-4">
        {steps.map((step, idx) => (
          <li key={idx} className="relative flex gap-3.5">
            {idx < steps.length - 1 && (
              <span className="absolute left-[13px] top-8 bottom-[-12px] w-px bg-border-subtle" aria-hidden="true" />
            )}
            <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface text-xs font-bold tabular-nums text-foreground shadow-xs">
              {idx + 1}
            </span>
            <p className="pt-1 text-sm leading-relaxed text-foreground">{step}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function WarningSigns({ signs }: { signs: string[] }) {
  if (!signs?.length) return null;
  return (
    <section
      aria-labelledby="warning-signs-title"
      className="rounded-2xl border border-warning/30 bg-warning-muted p-5"
    >
      <div className="flex items-center gap-2.5">
        <TriangleAlert className="size-[18px] text-warning-text" aria-hidden="true" />
        <h3 id="warning-signs-title" className="text-sm font-semibold text-foreground">
          Seek urgent care if you notice
        </h3>
      </div>
      <ul className="mt-3 space-y-2">
        {signs.map((sign, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
            <span>{sign}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function AIResultPanel({ assessment, className = "", layout = "split", actions }: AIResultPanelProps) {
  const hasConditions = Boolean(assessment.possibleConditions && assessment.possibleConditions.length > 0);
  const isSplit = layout === "split";

  return (
    <div
      role="region"
      aria-label="Clinical Assessment Results"
      className={cn("w-full space-y-5 text-left", className)}
    >
      <AcuityHero
        severity={assessment.severity}
        recommendedAction={assessment.recommendedAction}
        actions={actions}
        compact={!isSplit}
      />

      <div className={cn("grid grid-cols-1 gap-5", isSplit && "lg:grid-cols-12")}>
        <div className={cn("space-y-5", isSplit && "lg:col-span-7")}>
          <FirstAidSteps steps={assessment.firstAidSteps} />
          <WarningSigns signs={assessment.warningSigns} />
        </div>

        <div className={cn("space-y-5", isSplit && "lg:col-span-5")}>
          {hasConditions && <ConfidenceMeter conditions={assessment.possibleConditions} />}

          {assessment.severityReasoning && (
            <details className="group rounded-2xl border border-border-subtle bg-surface shadow-xs [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 p-5 text-sm font-semibold text-foreground">
                <span className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-text-secondary">
                    <Brain className="size-4" aria-hidden="true" />
                  </span>
                  Clinical reasoning
                </span>
                <ChevronDown className="size-4 text-text-tertiary transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="border-t border-border-subtle px-5 pb-5 pt-4 text-sm leading-relaxed text-text-secondary">
                {assessment.severityReasoning}
              </div>
            </details>
          )}

          <div className="flex items-start gap-2.5 rounded-2xl border border-border-subtle bg-subtle p-4 text-xs leading-relaxed text-text-tertiary">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
            <span>
              Educational guidance only — not a medical diagnosis. Consult a licensed clinician for evaluation.
              <span className="mt-1 flex items-center gap-1 text-text-tertiary/90">
                <Sparkles className="size-3" aria-hidden="true" /> Generated by Omnicura clinical decision support
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
