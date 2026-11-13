"use client"

import * as React from "react"
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Info,
  HeartPulse,
  Activity,
  AlertTriangle,
} from "lucide-react"
import { AssessmentResponse } from "@/schemas/triage"
import { SeverityBadge } from "@/components/shared/severity-badge"
import { Card } from "@/components/ui/card"
import { cn } from "cn"

export interface AIResultPanelProps {
  assessment: AssessmentResponse
  className?: string
}

export function AIResultPanel({ assessment, className = "" }: AIResultPanelProps) {
  const { severity } = assessment

  const severityDescription = {
    "non-urgent": "Symptoms may be monitored with appropriate self-care and supportive guidance. Consult a doctor if symptoms persist.",
    urgent: "Evaluation by a healthcare professional is advised within 12–24 hours.",
    emergency: "Immediate professional emergency medical attention is strongly advised. Do not delay.",
  }[severity]

  return (
    <div
      role="region"
      aria-label="Clinical Assessment Results"
      className={cn("w-full space-y-5 animate-in fade-in-50 duration-200 text-left", className)}
    >
      {/* 1. Header Metadata Bar (AI-Generated Marker) */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border-subtle text-xs font-semibold text-text-secondary select-none">
          <Sparkles className="size-3.5 text-accent" />
          <span>AI-Generated • Clinical Decision Support</span>
        </div>
        <span className="text-xs text-text-tertiary">Basis: Clinical Protocol Match</span>
      </div>

      {/* 2. Primary Urgency Classification Card (Solid Surface) */}
      <Card className="border border-border-subtle bg-surface shadow-xs">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
                Clinical Urgency Assessment
              </span>
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight capitalize">
                {severity} Classification
              </h2>
            </div>
            <SeverityBadge severity={severity} className="self-start sm:self-center text-xs py-1 px-3" />
          </div>

          <p className="text-xs sm:text-sm text-text-secondary font-medium leading-relaxed">
            {severityDescription}
          </p>

          {/* Basis for this result / Clinical Reasoning */}
          <div className="pt-3 border-t border-border-subtle space-y-1.5">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-accent" />
              <span>Basis for this Evaluation:</span>
            </span>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              {assessment.severityReasoning}
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Recommended Action Highlight Card */}
      <div className="rounded-xl border border-accent/40 bg-surface p-5 sm:p-6 space-y-2 text-left">
        <div className="flex items-center gap-2 text-accent font-semibold text-xs uppercase tracking-wider">
          <ArrowRight className="size-4" />
          <span>Recommended Clinical Next Step</span>
        </div>
        <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed pl-6">
          {assessment.recommendedAction}
        </p>
      </div>

      {/* 4. Actionable First-Aid Care Steps (Numbered List) */}
      {assessment.firstAidSteps && assessment.firstAidSteps.length > 0 && (
        <Card className="border border-border-subtle bg-surface">
          <div className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <HeartPulse className="size-4 text-accent" />
              <span>Supportive First-Aid Instructions</span>
            </h3>
            <ol className="space-y-2 pl-2">
              {assessment.firstAidSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                  <span className="size-5 rounded-full bg-secondary border border-border-subtle text-foreground flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      {/* 5. Warning Signs & Possible Considerations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Warning Signs */}
        {assessment.warningSigns && assessment.warningSigns.length > 0 && (
          <div className="rounded-xl border border-warning/30 bg-warning-muted p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-warning-text flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" />
              <span>Warning Signs Requiring Escalation</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-foreground/90 font-medium">
              {assessment.warningSigns.map((sign, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-warning-text font-bold shrink-0">•</span>
                  <span className="leading-relaxed">{sign}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Possible Conditions (Non-Diagnostic) */}
        {assessment.possibleConditions && assessment.possibleConditions.length > 0 && (
          <div className="rounded-xl border border-border-subtle bg-surface p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
              <Activity className="size-3.5 text-accent" />
              <span>Differential Considerations (Non-Diagnostic)</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-text-secondary">
              {assessment.possibleConditions.map((cond, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-accent font-bold shrink-0">•</span>
                  <span className="leading-relaxed">{cond}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 6. Non-Obstructive Educational Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg border border-border-subtle bg-secondary/50 text-[11px] text-text-secondary leading-relaxed">
        <ShieldAlert className="size-4 shrink-0 text-text-tertiary mt-0.5" />
        <span>
          {assessment.disclaimer ||
            "Educational decision support only. This is not a medical diagnosis. Always consult a licensed physician or emergency room for definitive diagnosis and treatment."}
        </span>
      </div>
    </div>
  )
}
