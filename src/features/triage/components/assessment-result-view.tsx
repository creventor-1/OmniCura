"use client";

import * as React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  Info,
  RotateCcw,
  BookmarkPlus,
  Check,
  FileDown,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { AssessmentResponse } from "@/schemas/triage";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/authentication/context/auth-context";
import { AuthModal } from "@/features/authentication/components/auth-modal";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";
import { HospitalMap } from "@/components/map/hospital-map";

interface AssessmentResultViewProps {
  assessment: AssessmentResponse;
  onReset: () => void;
  onLocateFacilities?: () => void;
}

export function AssessmentResultView({
  assessment,
  onReset,
}: AssessmentResultViewProps) {
  const { user } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  const { severity } = assessment;

  const severityConfig = {
    "non-urgent": {
      label: "Non-Urgent Guidance",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
      accentBorder: "border-emerald-500/40",
      bannerBg: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      icon: CheckCircle2,
      subtitle: "Symptoms may be monitored with appropriate self-care and supportive guidance.",
    },
    urgent: {
      label: "Urgent Medical Attention Recommended",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
      accentBorder: "border-amber-500/40",
      bannerBg: "from-amber-500/10 via-amber-500/5 to-transparent",
      icon: Clock,
      subtitle: "Evaluation by a healthcare professional is advised within 12–24 hours.",
    },
    emergency: {
      label: "Immediate Emergency Care Required",
      badgeClass: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
      accentBorder: "border-red-500/40",
      bannerBg: "from-red-500/10 via-red-500/5 to-transparent",
      icon: AlertTriangle,
      subtitle: "Immediate professional emergency medical attention is strongly advised. Do not delay.",
    },
  }[severity];

  const SeverityIcon = severityConfig.icon;

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Clinical Urgency and Care Assessment Results"
      className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-500 pb-16"
    >
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="signup"
        promptMessage="Create an account to save this assessment, review history, and export PDF reports."
      />

      {/* Guest Save / Account Banner */}
      {!user ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
              <BookmarkPlus className="size-4 text-accent" />
              <span>Save this Clinical Assessment</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Sign up or log in to preserve this clinical record in your private assessment history.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAuthModalOpen(true)}
            className="shrink-0 text-xs h-8 px-3 rounded-lg"
          >
            Save to Account
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20 text-xs text-foreground font-medium">
          <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Saved to your personal account assessment history.</span>
        </div>
      )}

      {/* 1. SEVERITY CLASSIFICATION CARD (Visual Anchor) */}
      <Card className={`border border-border border-l-4 ${severityConfig.accentBorder} bg-card rounded-xl shadow-none overflow-hidden`}>
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg border ${severityConfig.badgeClass}`}>
                <SeverityIcon className="size-6 stroke-[1.75]" />
              </div>
              <div>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
                  Clinical Urgency Classification
                </span>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
                  {severityConfig.label}
                </h2>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`self-start sm:self-center px-3 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full ${severityConfig.badgeClass}`}
            >
              {severity}
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-foreground/85 font-medium leading-relaxed">
            {severityConfig.subtitle}
          </p>

          <div className="pt-3 border-t border-border/60 text-xs sm:text-sm space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-accent" />
              <span>Clinical Evaluation Reasoning:</span>
            </span>
            <p className="text-muted-foreground leading-relaxed">
              {assessment.severityReasoning}
            </p>
          </div>
        </div>
      </Card>

      {/* 2. RECOMMENDED ACTION CARD (Prominently Highlighted Centerpiece) */}
      <div className="rounded-xl border border-border border-l-4 border-l-accent bg-card p-5 sm:p-6 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="size-6 rounded-md bg-accent/10 text-accent flex items-center justify-center font-bold text-xs border border-accent/20">
            <ArrowRight className="size-3.5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              Immediate Primary Takeaway
            </span>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              What Should You Do Next?
            </h3>
          </div>
        </div>

        <p className="text-sm sm:text-base font-medium text-foreground leading-relaxed pl-8.5">
          {assessment.recommendedAction}
        </p>
      </div>

      {/* 3. TWO-COLUMN GRID: Possible Conditions & Safe First-Aid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Possible Considerations */}
        <Card className="border border-border bg-card rounded-xl shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HeartPulse className="size-4 text-accent" />
              <span>Possible Explanations (Educational)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              These are educational possibilities based on reported symptoms, not a definitive diagnosis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="space-y-2">
              {assessment.possibleConditions.map((condition, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/40 border border-border text-xs font-medium text-foreground"
                >
                  <span className="size-1.5 rounded-full bg-accent shrink-0" />
                  <span>{condition}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* First Aid & Supportive Steps */}
        <Card className="border border-border bg-card rounded-xl shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span>Safe Supportive Care Checklist</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Actionable, safe supportive steps you can follow while monitoring symptoms.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {assessment.firstAidSteps.map((step, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold text-xs mt-0.5 tabular-nums border border-emerald-500/20">
                    {idx + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 4. WARNING SIGNS & ESCALATION RED-FLAGS */}
      <Card className="border border-amber-500/30 bg-amber-500/5 rounded-xl shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <ShieldAlert className="size-4.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Escalation Warning Signs (Seek Immediate Medical Care)</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-amber-800/80 dark:text-amber-300/80">
            If you or the patient experience any of the following symptoms, escalate immediately to emergency services or an urgent care center:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-amber-950 dark:text-amber-100 font-medium">
            {assessment.warningSigns.map((sign, idx) => (
              <li key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                <span>{sign}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* 5. ACTION CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Button
          onClick={() =>
            generateTriagePdfReport({
              assessment,
              symptoms: "Reported patient symptom context",
              userEmail: user?.email,
            })
          }
          variant="outline"
          className="flex-1 h-10 text-xs sm:text-sm font-medium gap-2 rounded-lg"
        >
          <FileDown className="size-4 text-accent" />
          <span>Download PDF Medical Report</span>
        </Button>

        <Button
          onClick={onReset}
          className="flex-1 h-10 text-xs sm:text-sm font-semibold gap-2 rounded-lg"
        >
          <RotateCcw className="size-4" />
          <span>Start New Assessment</span>
        </Button>
      </div>

      {/* 6. EMBEDDED NEARBY HEALTHCARE LOCATOR (Per Redesign Spec) */}
      <div className="space-y-3 pt-4 border-t border-border">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
            <MapPin className="size-4 text-accent" />
            <span>Nearby Healthcare Facilities</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Interactive map centered on active coordinates with verified hospitals, clinics, and emergency contact details.
          </p>
        </div>

        {/* Embedded Live Leaflet Map */}
        <div className="rounded-xl overflow-hidden border border-border">
          <HospitalMap />
        </div>
      </div>

      {/* 7. MANDATORY DISCLAIMER FOOTER */}
      <div className="text-xs text-muted-foreground bg-muted/20 p-3.5 rounded-xl border border-border text-center leading-relaxed">
        {assessment.disclaimer}
      </div>
    </div>
  );
}
