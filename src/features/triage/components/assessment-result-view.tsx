"use client";

import * as React from "react";
import {
  RotateCcw,
  BookmarkPlus,
  CircleCheckBig,
  FileDown,
  MapPinned,
  Check,
  CloudCheck,
} from "lucide-react";
import { AssessmentResponse } from "@/schemas/triage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/context/auth-context";
import { AuthModal } from "@/features/authentication/components/auth-modal";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";
import { HospitalMap } from "@/components/map/hospital-map";
import { AIResultPanel } from "@/components/assessment/ai-result-panel";
import { SectionHeader } from "@/components/system/page-header";

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
  const [isExportingPdf, setIsExportingPdf] = React.useState(false);
  const [exportSuccess, setExportSuccess] = React.useState(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    setExportSuccess(false);
    try {
      generateTriagePdfReport({
        assessment,
        symptoms: "Reported patient symptom presentation",
        userEmail: user?.email,
      });
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("[PDF_EXPORT_ERROR]", err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Clinical Urgency and Care Assessment Results"
      className="w-full space-y-6 animate-rise"
    >
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="signup"
        promptMessage="Create an account to save this assessment, review history, and export PDF reports."
      />

      {/* Record status */}
      {!user ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-muted text-accent">
              <BookmarkPlus className="size-[18px]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Saved on this device</p>
              <p className="text-[13px] text-text-secondary">
                Create a free account to keep this record in your private history across devices.
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => setIsAuthModalOpen(true)} className="shrink-0">
            Save to account
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-2xl border border-success/20 bg-success-muted px-4 py-3 text-[13px] font-medium text-success">
          <CloudCheck className="size-4 shrink-0" aria-hidden="true" />
          Saved to your assessment history
          <Check className="size-3.5 ml-auto" aria-hidden="true" />
        </div>
      )}

      <AIResultPanel
        assessment={assessment}
        actions={
          <>
            <Button variant="outline" onClick={handleDownloadPdf} isLoading={isExportingPdf}>
              {exportSuccess ? (
                <>
                  <CircleCheckBig className="text-success" />
                  Downloaded
                </>
              ) : (
                <>
                  <FileDown className="text-text-tertiary" />
                  PDF report
                </>
              )}
            </Button>
            <Button onClick={onReset}>
              <RotateCcw />
              New assessment
            </Button>
          </>
        }
      />

      {/* Nearby care */}
      <section className="space-y-4 pt-2">
        <SectionHeader
          title="Nearby care"
          description="Verified facilities around you, with routing and direct dial"
          action={
            onLocateFacilities && (
              <Button variant="ghost" size="sm" onClick={onLocateFacilities}>
                <MapPinned />
                Open full map
              </Button>
            )
          }
        />
        <HospitalMap compact />
      </section>
    </div>
  );
}
