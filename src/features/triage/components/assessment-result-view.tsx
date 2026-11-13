"use client";

import * as React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  Info,
  MapPin,
  RotateCcw,
  BookmarkPlus,
  Check,
  FileDown,
} from "lucide-react";
import { AssessmentResponse } from "@/schemas/triage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/authentication/context/auth-context";
import { AuthModal } from "@/features/authentication/components/auth-modal";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";

interface AssessmentResultViewProps {
  assessment: AssessmentResponse;
  onReset: () => void;
  onLocateFacilities?: () => void;
}

export function AssessmentResultView({
  assessment,
  onReset,
  onLocateFacilities,
}: AssessmentResultViewProps) {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  const { severity } = assessment;

  const severityConfig = {
    "non-urgent": {
      label: "Non-Urgent Guidance",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      borderClass: "border-emerald-500/30",
      icon: CheckCircle2,
      subtitle: "Symptoms may be monitored with appropriate self-care and supportive guidance.",
    },
    urgent: {
      label: "Urgent Medical Attention Recommended",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      borderClass: "border-amber-500/30",
      icon: Clock,
      subtitle: "Evaluation by a healthcare professional is advised within 12–24 hours.",
    },
    emergency: {
      label: "Immediate Emergency Care Required",
      badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
      borderClass: "border-red-500/30",
      icon: AlertTriangle,
      subtitle: "Immediate emergency medical attention is strongly advised. Do not delay.",
    },
  }[severity];

  const SeverityIcon = severityConfig.icon;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 animate-in fade-in-50 duration-500 pb-12">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="signup"
        promptMessage="Create an account to save this assessment, review history, and export PDF reports."
      />

      {/* Guest Save Banner */}
      {!user ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-primary/30 bg-primary/10">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
              <BookmarkPlus className="size-4 text-primary" />
              Save this Assessment
            </h4>
            <p className="text-xs text-muted-foreground">
              Sign up or log in to preserve this triage record in your private assessment history.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAuthModalOpen(true)}
            className="shrink-0 text-xs h-9 font-medium"
          >
            Save Assessment
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
          <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Saved to your personal account assessment history.</span>
        </div>
      )}

      {/* Urgency Summary Banner */}
      <Card className={`border-2 ${severityConfig.borderClass} shadow-md overflow-hidden`}>
        <div className={`p-6 bg-muted/30 border-b ${severityConfig.borderClass}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full ${severityConfig.badgeClass}`}>
              <SeverityIcon className="size-7" />
            </div>
            <div className="space-y-1">
              <Badge
                variant="outline"
                className={`px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${severityConfig.badgeClass}`}
              >
                {severity}
              </Badge>
              <h2 className="text-xl font-bold tracking-tight">{severityConfig.label}</h2>
              <p className="text-sm text-muted-foreground">{severityConfig.subtitle}</p>
            </div>
          </div>
        </div>

        <CardContent className="pt-5 space-y-4 text-sm">
          <div>
            <h4 className="font-semibold text-foreground mb-1 flex items-center gap-1.5">
              <Info className="size-4 text-primary" />
              Triage Rationale
            </h4>
            <p className="text-muted-foreground leading-relaxed">{assessment.severityReasoning}</p>
          </div>

          <div className="rounded-lg bg-primary/5 p-4 border border-primary/10">
            <h4 className="font-semibold text-primary mb-1">Recommended Action</h4>
            <p className="font-medium text-foreground">{assessment.recommendedAction}</p>
          </div>
        </CardContent>
      </Card>

      {/* Possible Considerations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="size-4 text-primary" />
            Possible Considerations
          </CardTitle>
          <CardDescription className="text-xs">
            These are educational possibilities based on reported symptoms, not a clinical diagnosis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {assessment.possibleConditions.map((condition, idx) => (
              <li
                key={idx}
                className="flex items-center gap-2.5 p-2.5 rounded-md bg-muted/40 border border-border/60 text-sm font-medium"
              >
                <div className="size-1.5 rounded-full bg-primary" />
                <span>{condition}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* First Aid & Supportive Steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            Safe First-Aid &amp; Home Care Steps
          </CardTitle>
          <CardDescription className="text-xs">
            Safe supportive actions you can take while monitoring or waiting for medical care.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {assessment.firstAidSteps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold mt-0.5">
                  {idx + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Warning Signs & Red Flags */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400" />
            Warning Signs (When to Escalate Immediately)
          </CardTitle>
          <CardDescription className="text-xs text-amber-800/80 dark:text-amber-300/80">
            Seek emergency medical care immediately if any of these symptoms develop:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-amber-950 dark:text-amber-100">
            {assessment.warningSigns.map((sign, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 dark:text-amber-400 font-bold">•</span>
                <span>{sign}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={() =>
            generateTriagePdfReport({
              assessment,
              symptoms: "Reported patient symptom context",
              userEmail: user?.email,
            })
          }
          variant="outline"
          className="gap-2 py-5 text-xs font-semibold border-primary/30 hover:bg-primary/5"
        >
          <FileDown className="size-4 text-primary" />
          Export Medical PDF Report
        </Button>

        {onLocateFacilities && (
          <Button onClick={onLocateFacilities} className="flex-1 gap-2 py-5 text-xs font-semibold">
            <MapPin className="size-4" />
            Find Nearby Facilities
          </Button>
        )}
        <Button onClick={onReset} variant="outline" className="gap-2 py-5 text-xs font-semibold">
          <RotateCcw className="size-4" />
          New Triage
        </Button>
      </div>

      {/* Mandatory Disclaimer Footer */}
      <p className="text-center text-xs text-muted-foreground leading-relaxed px-4 pt-2">
        {assessment.disclaimer}
      </p>
    </div>
  );
}
