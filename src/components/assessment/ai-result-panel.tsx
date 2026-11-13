"use client";

import * as React from "react";
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  HeartPulse,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import { AssessmentResponse } from "@/schemas/triage";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { Card } from "@/components/ui/card";
import { ConfidenceMeter } from "@/components/assessment/confidence-meter";
import { cn } from "cn";

export interface AIResultPanelProps {
  assessment: AssessmentResponse;
  className?: string;
}

export function AIResultPanel({ assessment, className = "" }: AIResultPanelProps) {
  const { severity } = assessment;

  const severityDescription = {
    "non-urgent": "Monitor with self-care. Consult a doctor if symptoms persist.",
    urgent: "Evaluation by a healthcare professional advised within 12–24 hours.",
    emergency: "Immediate emergency medical attention advised. Do not delay.",
  }[severity];

  const hasDisclosableDetails =
    Boolean(assessment.severityReasoning) ||
    Boolean(assessment.possibleConditions && assessment.possibleConditions.length > 0);

  return (
    <div
      role="region"
      aria-label="Clinical Assessment Results"
      className={cn("w-full space-y-4 animate-in fade-in-50 duration-200 text-left", className)}
    >
      {/* 1. Header Metadata Bar */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary border border-border-subtle text-[11px] font-semibold text-text-secondary select-none">
          <Sparkles className="size-3 text-accent" />
          <span>AI Clinical Decision Support</span>
        </div>
      </div>

      {/* 2. Primary Urgency Classification & Recommended Action (Always Visible) */}
      <Card className="border border-border-subtle bg-surface shadow-xs p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Triage Level
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight capitalize">
              {severity} Priority
            </h2>
          </div>
          <SeverityBadge severity={severity} className="self-start sm:self-center text-xs py-1 px-3" />
        </div>

        <p className="text-xs sm:text-sm text-text-secondary font-medium leading-relaxed">
          {severityDescription}
        </p>

        {/* Recommended Action Highlight */}
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-accent font-semibold text-xs uppercase tracking-wider">
            <ArrowRight className="size-3.5" />
            <span>Recommended Action</span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
            {assessment.recommendedAction}
          </p>
        </div>
      </Card>

      {/* 2.5 Multi-Condition Confidence Meter */}
      {assessment.possibleConditions && assessment.possibleConditions.length > 0 && (
        <ConfidenceMeter conditions={assessment.possibleConditions} />
      )}

      {/* 3. Actionable First-Aid Care Steps (Always Visible) */}
      {assessment.firstAidSteps && assessment.firstAidSteps.length > 0 && (
        <Card className="border border-border-subtle bg-surface p-4 sm:p-5 space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
            <HeartPulse className="size-3.5 text-accent" />
            <span>First-Aid Guidance</span>
          </h3>
          <ol className="space-y-1.5 pl-1">
            {assessment.firstAidSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-foreground">
                <span className="size-4.5 rounded-full bg-secondary border border-border-subtle text-foreground flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* 4. Warning Signs Requiring Immediate Escalation (Always Visible) */}
      {assessment.warningSigns && assessment.warningSigns.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning-muted p-3.5 space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-warning-text flex items-center gap-1.5">
            <AlertTriangle className="size-3.5" />
            <span>Warning Signs Requiring Escalation</span>
          </h4>
          <ul className="space-y-1 text-xs text-foreground/90 font-medium">
            {assessment.warningSigns.map((sign, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-warning-text font-bold shrink-0">•</span>
                <span className="leading-relaxed">{sign}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Progressive Disclosure: Clinical Reasoning & Considerations */}
      {hasDisclosableDetails && (
        <details className="rounded-xl border border-border-subtle bg-surface p-3.5 group text-xs">
          <summary className="font-semibold text-text-secondary cursor-pointer hover:text-foreground select-none list-none flex items-center justify-between">
            <span>Clinical Reasoning &amp; Differential Considerations</span>
            <ChevronDown className="size-4 text-text-tertiary group-open:rotate-180 transition-transform" />
          </summary>
          <div className="pt-3 space-y-3 border-t border-border-subtle mt-2.5">
            {assessment.severityReasoning && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-text-secondary uppercase">Evaluation Basis</span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {assessment.severityReasoning}
                </p>
              </div>
            )}

            {assessment.possibleConditions && assessment.possibleConditions.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-text-secondary uppercase">Differential Considerations (Non-Diagnostic)</span>
                <ul className="space-y-1 text-xs text-text-secondary">
                  {assessment.possibleConditions.map((cond, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-accent font-bold">•</span>
                      <span>{cond}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {/* 6. Consolidated Medical Disclaimer (Single Line) */}
      <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border-subtle bg-secondary/40 text-[11px] text-text-secondary">
        <ShieldAlert className="size-3.5 shrink-0 text-text-tertiary" />
        <span>Educational guidance only. Not a medical diagnosis. Consult a doctor for medical evaluation.</span>
      </div>
    </div>
  );
}
