"use client";

import * as React from "react";
import {
  TriangleAlert,
  FileDown,
  MapPinned,
  RotateCcw,
  Sparkles,
  Eye,
  Lightbulb,
  Sun,
  Focus,
  Ruler,
  Lock,
  Info,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { compressImageFile } from "@/lib/image-utils";
import { ImageAnalysisResponse } from "@/schemas/vision";
import { checkRedFlags } from "@/lib/red-flags";
import { EmergencyAlertModal } from "@/features/safety/components/emergency-alert-modal";
import { RedFlagCheckResult } from "@/types";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";
import { ImageDropzone } from "@/components/system/image-dropzone";
import { AcuityHero, FirstAidSteps, WarningSigns } from "@/components/assessment/ai-result-panel";

// Preset sample images (base64 SVG data) for instant testing
const SAMPLE_PRESETS = [
  {
    id: "sample-rash",
    title: "Contact Rash",
    description: "Red patch on forearm without fever.",
    category: "non-urgent",
    notes: "Red bumpy rash appeared yesterday. Mild itchiness, no fever or trouble breathing.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZGVlZTQiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyNSIgZmlsbD0iI2Y4NzE3MSIgb3BhY2l0eT0iMC42Ii8+PGNpcmNsZSBjeD0iNDUiIGN5PSI0NSIgcj0iNSIgZmlsbD0iI2RjMjYyNiIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iNDgiIHI9IjQiIGZpbGw9IiNkYzI2MjYiLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjU2IiByPSI2IiBmaWxsPSIjZGMyNjI2Ii8+PC9zdmc+",
    mimeType: "image/svg+xml",
  },
  {
    id: "sample-burn",
    title: "First-Degree Burn",
    description: "Localized thermal redness, skin intact.",
    category: "non-urgent",
    notes: "Accidentally touched hot baking pan. Red and stinging, skin is intact without blisters.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZGVlZTQiLz48cGF0aCBkPSJNMjUgNTBRMzUgMjUgNTAgMjVRNjUgMjUgNzUgNTBRNjUgNzUgNTAgNzVRMzUgNzUgMjUgNTBaIiBmaWxsPSIjZjhkN2RhIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMTUiIGZpbGw9IiNmZjhjOGMiLz48L3N2Zz4=",
    mimeType: "image/svg+xml",
  },
  {
    id: "sample-cut",
    title: "Superficial Scrape",
    description: "Minor epidermal scrape, bleeding stopped.",
    category: "non-urgent",
    notes: "Scraped knee on pavement while jogging. Minor bleeding stopped after gentle pressure.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZGVlZTQiLz48bGluZSB4MT0iMjUiIHkxPSI3NSIgeDI9Ijc1IiB5Mj0iMjUiIHN0cm9rZT0iI2I5MWMxYyIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=",
    mimeType: "image/svg+xml",
  },
];

interface ImageSymptomAnalyzerProps {
  onLocateFacilities?: () => void;
}

export function ImageSymptomAnalyzer({ onLocateFacilities }: ImageSymptomAnalyzerProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [selectedImage, setSelectedImage] = React.useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);

  const [additionalNotes, setAdditionalNotes] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<ImageAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Emergency safety modal state
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = React.useState(false);
  const [emergencyResult, setEmergencyResult] = React.useState<RedFlagCheckResult | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {

    setErrorMessage(null);
    try {
      const processed = await compressImageFile(file);
      const previewUrl = `data:${processed.mimeType};base64,${processed.base64}`;
      setSelectedImage({
        base64: processed.base64,
        mimeType: processed.mimeType,
        previewUrl,
      });
      setAnalysisResult(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to process image file.");
    }
  };

  const handleSelectPreset = (preset: (typeof SAMPLE_PRESETS)[0]) => {
    setErrorMessage(null);
    setSelectedImage({
      base64: preset.base64,
      mimeType: preset.mimeType,
      previewUrl: `data:${preset.mimeType};base64,${preset.base64}`,
    });
    setAdditionalNotes(preset.notes);
    setAnalysisResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setErrorMessage(null);

    // 1. MANDATORY DETERMINISTIC RED-FLAG CLIENT SCREENING on any accompanying notes
    if (additionalNotes.trim()) {
      const redFlag = checkRedFlags(additionalNotes);
      if (redFlag.isEmergency) {
        setEmergencyResult(redFlag);
        setIsEmergencyModalOpen(true);
        return;
      }
    }

    setIsLoading(true);

    try {
      // Load health profile context if consented
      let healthProfilePayload = undefined;
      if (user) {
        try {
          const { data: profile } = await supabase
            .from("health_profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (profile && profile.allow_ai_use) {
            healthProfilePayload = {
              age: profile.age,
              sex: profile.sex,
              allergies: profile.allergies,
              chronicConditions: profile.chronic_conditions,
            };
          }
        } catch (e) {
          console.warn("Could not load health profile for image analysis:", e);
        }
      }

      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedImage.base64,
          mimeType: selectedImage.mimeType,
          additionalNotes: additionalNotes.trim() || undefined,
          healthProfile: healthProfilePayload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Image symptom analysis failed. Please try again.");
      }

      if (data.isEmergency && data.emergencyResult) {
        setEmergencyResult(data.emergencyResult);
        setIsEmergencyModalOpen(true);
        return;
      }

      setAnalysisResult(data.data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setAdditionalNotes("");
    setAnalysisResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExportPdf = () => {
    if (!analysisResult) return;

    generateTriagePdfReport({
      assessment: {
        possibleConditions: analysisResult.possibleConditions,
        severity: analysisResult.severity,
        severityReasoning: `${analysisResult.visualObservations} — ${analysisResult.severityReasoning}`,
        firstAidSteps: analysisResult.firstAidSteps,
        warningSigns: analysisResult.warningSigns,
        recommendedAction: analysisResult.recommendedAction,
        disclaimer: analysisResult.disclaimer,
      },
      symptoms: additionalNotes || "Image-based visual symptom analysis.",
      userEmail: user?.email,
    });
  };

  const tips = [
    { icon: Sun, text: "Use bright, even, natural light" },
    { icon: Focus, text: "Keep the affected area in sharp focus" },
    { icon: Ruler, text: "Include a coin or ruler for scale" },
  ];

  return (
    <div className="w-full">
      <EmergencyAlertModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        result={emergencyResult}
        onLocateFacilities={onLocateFacilities}
      />

      {!analysisResult ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Capture */}
          <section className="space-y-5 rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs sm:p-6 lg:col-span-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="type-heading text-foreground">Upload a photo</h2>
                <p className="mt-0.5 text-[13px] text-text-tertiary">Rashes, burns, cuts, bites or swelling</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-text-secondary">
                <Lock className="size-3" aria-hidden="true" />
                Compressed on-device
              </span>
            </div>

            <ImageDropzone
              inputRef={fileInputRef}
              previewUrl={selectedImage?.previewUrl ?? null}
              onFile={handleFile}
              onClear={handleReset}
              isScanning={isLoading}
              title="Add a photo of the affected area"
              previewAlt="Symptom visual preview"
            />

            <Textarea
              id="symptom-vision-notes"
              label="Additional context (optional)"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Started 2 days ago, mild burning sensation, no fever…"
              rows={3}
              helperText="Notes are screened for emergency red flags before analysis."
            />

            {errorMessage && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-xl border border-danger/20 bg-danger-muted p-3.5 text-[13px] font-medium text-danger"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              type="button"
              size="lg"
              disabled={!selectedImage}
              isLoading={isLoading}
              onClick={handleAnalyze}
              className="w-full"
            >
              {isLoading ? (
                "Analyzing visible symptoms…"
              ) : (
                <>
                  <Sparkles />
                  Analyze photo
                </>
              )}
            </Button>
          </section>

          {/* Guidance rail */}
          <aside className="space-y-5 lg:col-span-5">
            <section className="rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs">
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Sample cases</h2>
                <span className="text-xs text-text-tertiary">For demonstration</span>
              </div>
              <ul className="space-y-2">
                {SAMPLE_PRESETS.map((preset) => {
                  const isSelected = selectedImage?.base64 === preset.base64;
                  return (
                    <li key={preset.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        aria-pressed={isSelected}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-brand/40 bg-brand-muted ring-2 ring-brand/15"
                            : "border-border-subtle bg-surface hover:border-border-strong hover:shadow-sm"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={"data:" + preset.mimeType + ";base64," + preset.base64}
                          alt=""
                          className="size-12 shrink-0 rounded-lg border border-border-subtle object-cover"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold text-foreground">{preset.title}</span>
                          <span className="block truncate text-xs text-text-tertiary">{preset.description}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs">
              <div className="mb-3.5 flex items-center gap-2">
                <Lightbulb className="size-4 text-accent" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">For the best result</h2>
              </div>
              <ul className="space-y-2.5">
                {tips.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-center gap-3 text-[13px] text-text-secondary">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-text-secondary">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </section>

            <p className="flex items-start gap-2.5 rounded-2xl border border-border-subtle bg-subtle p-4 text-xs leading-relaxed text-text-tertiary">
              <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
              Visual analysis can&apos;t replace an in-person examination. Seek care if symptoms spread, worsen or are accompanied by fever.
            </p>
          </aside>
        </div>
      ) : (
        <div
          role="region"
          aria-live="polite"
          aria-label="Visual Symptom Assessment Results"
          className="space-y-6 animate-rise"
        >
          <AcuityHero
            severity={analysisResult.severity}
            recommendedAction={analysisResult.recommendedAction}
            actions={
              <>
                <Button variant="outline" onClick={handleExportPdf}>
                  <FileDown className="text-text-tertiary" />
                  PDF report
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="text-text-tertiary" />
                  Analyze another
                </Button>
              </>
            }
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-accent">
                    <Eye className="size-4" aria-hidden="true" />
                  </span>
                  <h3 className="type-heading text-foreground">Visual observations</h3>
                </div>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                  {selectedImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedImage.previewUrl}
                      alt="Analyzed symptom"
                      className="h-32 w-full shrink-0 rounded-xl border border-border-subtle bg-subtle object-contain sm:w-32"
                    />
                  )}
                  <p className="text-sm leading-relaxed text-text-secondary">{analysisResult.visualObservations}</p>
                </div>
              </section>
              <FirstAidSteps steps={analysisResult.firstAidSteps} />
              <WarningSigns signs={analysisResult.warningSigns} />
            </div>

            <div className="space-y-5 lg:col-span-5">
              <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-xs">
                <h3 className="type-heading text-foreground">Possible explanations</h3>
                <p className="mt-0.5 text-[13px] text-text-tertiary">Educational, non-diagnostic</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {analysisResult.possibleConditions.map((cond, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-brand/15 bg-brand-muted px-3 py-1.5 text-[13px] font-medium text-accent-text"
                    >
                      {cond}
                    </span>
                  ))}
                </div>
                {analysisResult.severityReasoning && (
                  <p className="mt-4 border-t border-border-subtle pt-4 text-[13px] leading-relaxed text-text-secondary">
                    {analysisResult.severityReasoning}
                  </p>
                )}
              </section>

              {analysisResult.uncertaintyNotes && (
                <section className="rounded-2xl border border-info/20 bg-info-muted p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Info className="size-4 text-info" aria-hidden="true" />
                    Limits of this analysis
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">{analysisResult.uncertaintyNotes}</p>
                </section>
              )}

              {onLocateFacilities && (
                <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground">Need to be seen?</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                    Find verified clinics and emergency departments near you.
                  </p>
                  <Button className="mt-4 w-full" onClick={onLocateFacilities}>
                    <MapPinned />
                    Find nearby care
                  </Button>
                </section>
              )}

              <p className="rounded-2xl border border-border-subtle bg-subtle p-4 text-xs leading-relaxed text-text-tertiary">
                {analysisResult.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
