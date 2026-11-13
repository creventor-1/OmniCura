"use client";

import * as React from "react";
import {
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Download,
  MapPin,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { compressImageFile } from "@/lib/image-utils";
import { ImageAnalysisResponse } from "@/schemas/vision";
import { checkRedFlags } from "@/lib/red-flags";
import { EmergencyAlertModal } from "@/features/safety/components/emergency-alert-modal";
import { RedFlagCheckResult } from "@/types";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";

// Preset sample images (base64 SVG data) for instant judge testing without needing a real injury photo
const SAMPLE_PRESETS = [
  {
    id: "sample-rash",
    title: "Sample 1: Mild Contact Rash",
    description: "Superficial red patch on forearm without systemic symptoms.",
    category: "non-urgent",
    notes: "Red bumpy rash appeared after gardening yesterday. Mild itchiness, no fever or trouble breathing.",
    // 64x64 SVG representation encoded as base64
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZGVlZTQiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyNSIgZmlsbD0iI2Y4NzE3MSIgb3BhY2l0eT0iMC42Ii8+PGNpcmNsZSBjeD0iNDUiIGN5PSI0NSIgcj0iNSIgZmlsbD0iI2RjMjYyNiIvPjxjaXJjbGUgY3g9IjU1IiBjeT0iNDgiIHI9IjQiIGZpbGw9IiNkYzI2MjYiLz48Y2lyY2xlIGN4PSI0OCIgY3k9IjU2IiByPSI2IiBmaWxsPSIjZGMyNjI2Ii8+PC9zdmc+",
    mimeType: "image/svg+xml",
  },
  {
    id: "sample-burn",
    title: "Sample 2: Minor First-Degree Burn",
    description: "Localized thermal redness without blistering or open skin.",
    category: "non-urgent",
    notes: "Accidentally touched hot baking pan. Red and stinging, skin is intact without blisters.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNmZGVlZTQiLz48cGF0aCBkPSJNMjUgNTBRMzUgMjUgNTAgMjVRNjUgMjUgNzUgNTBRNjUgNzUgNTAgNzVRMzUgNzUgMjUgNTBaIiBmaWxsPSIjZjhkN2RhIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMTUiIGZpbGw9IiNmZjhjOGMiLz48L3N2Zz4=",
    mimeType: "image/svg+xml",
  },
  {
    id: "sample-cut",
    title: "Sample 3: Superficial Scrape / Cut",
    description: "Minor epidermal scrape with minimal bleeding.",
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
  const supabase = createClient();

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <EmergencyAlertModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        result={emergencyResult}
        onLocateFacilities={onLocateFacilities}
      />

      {/* Header Info */}
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
          <ImageIcon className="size-6 text-primary" />
          <span>Multimodal Symptom Vision</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
          Upload or capture a photo of a visible symptom (rash, cut, burn, swelling, insect bite) for educational first-aid and urgency screening.
        </p>
      </div>

      {!analysisResult ? (
        <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-none">
          {/* Preset Buttons for Quick Testing */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5" />
              <span>One-Click Demo Test Cases:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2.5 text-left border border-border rounded-lg hover:bg-muted/60 transition-colors bg-background text-xs space-y-1"
                >
                  <div className="font-semibold text-foreground text-xs sm:text-sm">{preset.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Box or Image Preview */}
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedImage ? (
              <div className="relative rounded-xl border border-border bg-muted/20 p-3 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute top-2 right-2 size-7 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                  title="Remove image"
                >
                  <X className="size-4" />
                </button>

                <div className="w-full max-w-xs h-48 rounded-lg overflow-hidden border border-border bg-background flex items-center justify-center my-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImage.previewUrl}
                    alt="Symptom visual preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <span className="text-xs text-muted-foreground">Image ready for analysis</span>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-accent/60 rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20"
              >
                <div className="size-12 rounded-full bg-accent/10 text-accent flex items-center justify-center border border-accent/20">
                  <Upload className="size-5" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold">Click to upload photo or take picture</p>
                  <p className="text-xs text-muted-foreground">Supports JPEG, PNG, WebP up to 10MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Notes Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="symptom-vision-notes"
              className="text-sm font-semibold text-foreground cursor-pointer block"
            >
              Additional Context / Symptoms (Optional):
            </label>
            <textarea
              id="symptom-vision-notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Started 2 days ago, mild burning sensation, no fever..."
              rows={2}
              className="w-full text-sm p-3.5 rounded-xl border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs sm:text-sm font-medium flex items-center gap-2"
            >
              <AlertTriangle className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <Button
            type="button"
            disabled={!selectedImage || isLoading}
            onClick={handleAnalyze}
            className="w-full h-11 text-sm font-semibold gap-2 rounded-xl"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span>Running Multimodal Clinical Analysis...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Analyze Visible Symptoms</span>
              </>
            )}
          </Button>

          {/* Educational Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/40 text-xs sm:text-sm text-muted-foreground">
            <Info className="size-4 shrink-0 mt-0.5 text-primary" />
            <span>
              <strong>Educational Notice:</strong> Visual analysis cannot replace an in-person physical clinical examination. Images are compressed client-side before processing.
            </span>
          </div>
        </div>
      ) : (
        /* Results View */
        <div
          role="region"
          aria-live="polite"
          aria-label="Visual Symptom Assessment Results"
          className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-none animate-in fade-in-50 duration-200"
        >
          {/* Severity Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              analysisResult.severity === "emergency"
                ? "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                : analysisResult.severity === "urgent"
                ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {analysisResult.severity === "emergency" ? (
                <ShieldAlert className="size-5 text-destructive" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider">
                  Vision Urgency Classification
                </div>
                <div className="text-base sm:text-lg font-semibold capitalize">
                  {analysisResult.severity}
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs h-8 px-3 gap-1.5 rounded-lg bg-background"
            >
              <RotateCcw className="size-3.5" />
              Analyze Another
            </Button>
          </div>

          {/* Visual Observations */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-1">
            <div className="text-xs sm:text-sm font-bold text-foreground">Visual Observations:</div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {analysisResult.visualObservations}
            </p>
          </div>

          {/* Possible Conditions */}
          <div className="space-y-2">
            <div className="text-xs sm:text-sm font-bold text-foreground">Possible Explanations (Educational):</div>
            <div className="flex flex-wrap gap-1.5">
              {analysisResult.possibleConditions.map((cond, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20"
                >
                  {cond}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {analysisResult.severityReasoning}
            </p>
          </div>

          {/* First-Aid Care Checklist */}
          {analysisResult.firstAidSteps.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <div className="text-xs sm:text-sm font-bold text-foreground">Recommended First-Aid Guidance:</div>
              <ul className="space-y-1.5 text-xs sm:text-sm text-muted-foreground">
                {analysisResult.firstAidSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="size-5 shrink-0 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Escalation Warning Signs */}
          {analysisResult.warningSigns.length > 0 && (
            <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-destructive">
                <AlertTriangle className="size-3.5" />
                <span>Warning Signs Requiring Escalation:</span>
              </div>
              <ul className="list-disc list-inside text-xs sm:text-sm text-muted-foreground space-y-1">
                {analysisResult.warningSigns.map((sign, i) => (
                  <li key={i}>{sign}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleExportPdf}
              className="flex-1 h-11 text-xs sm:text-sm font-semibold gap-2 rounded-xl"
            >
              <Download className="size-4" />
              Download PDF Report
            </Button>

            {onLocateFacilities && (
              <Button
                type="button"
                onClick={onLocateFacilities}
                className="flex-1 h-11 text-xs sm:text-sm font-semibold gap-2 rounded-xl"
              >
                <MapPin className="size-4" />
                Find Nearby Hospitals
              </Button>
            )}
          </div>

          {/* Disclaimer Footer */}
          <div className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border text-center leading-relaxed">
            {analysisResult.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
