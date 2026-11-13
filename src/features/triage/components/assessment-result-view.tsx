"use client";

import * as React from "react";
import {
  RotateCcw,
  BookmarkPlus,
  Check,
  FileDown,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { AssessmentResponse } from "@/schemas/triage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/context/auth-context";
import { AuthModal } from "@/features/authentication/components/auth-modal";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";
import { HospitalMap } from "@/components/map/hospital-map";
import { AIResultPanel } from "@/components/assessment/ai-result-panel";

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
      className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in-50 duration-200 pb-16"
    >
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultMode="signup"
        promptMessage="Create an account to save this assessment, review history, and export PDF reports."
      />

      {/* Guest Save / Account Banner */}
      {!user ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-border-subtle bg-surface text-left">
          <div className="space-y-0.5 text-center sm:text-left">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 justify-center sm:justify-start">
              <BookmarkPlus className="size-4 text-accent" />
              <span>Save this Clinical Assessment</span>
            </h4>
            <p className="text-xs text-text-secondary">
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
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border-subtle bg-secondary/50 text-xs text-foreground font-medium">
          <Check className="size-4 text-success shrink-0" />
          <span>Saved to your personal account assessment history.</span>
        </div>
      )}

      {/* Primary AI Structured Results Panel (Solid Surface, Structured Sections) */}
      <AIResultPanel assessment={assessment} />

      {/* Primary Action Controls (Export PDF, Reset Consultation) */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <Button
          onClick={handleDownloadPdf}
          isLoading={isExportingPdf}
          variant="outline"
          className="w-full sm:flex-1 h-11 text-xs sm:text-sm font-medium gap-2 rounded-lg"
        >
          {exportSuccess ? (
            <>
              <CheckCircle2 className="size-4 text-success" />
              <span>Report Downloaded</span>
            </>
          ) : (
            <>
              <FileDown className="size-4 text-accent" />
              <span>Download PDF Clinical Report</span>
            </>
          )}
        </Button>

        <Button
          onClick={onReset}
          className="w-full sm:flex-1 h-11 text-xs sm:text-sm font-semibold gap-2 rounded-lg"
        >
          <RotateCcw className="size-4" />
          <span>Start New Consultation</span>
        </Button>
      </div>

      {/* Embedded Nearby Facility Discovery Section */}
      <div className="space-y-3 pt-4 border-t border-border-subtle text-left">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm sm:text-base">
            <MapPin className="size-4 text-accent" />
            <span>Nearby Healthcare Facilities</span>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary">
            Coordinate-driven facility locator with verified emergency departments and turn-by-turn routing.
          </p>
        </div>

        {/* Embedded Live Leaflet Map */}
        <div className="rounded-xl overflow-hidden border border-border-subtle">
          <HospitalMap />
        </div>
      </div>
    </div>
  );
}
