"use client";

import * as React from "react";
import {
  Pill,
  Upload,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { compressImageFile } from "@/lib/image-utils";
import { MedicationScanResponse } from "@/schemas/vision";

const MEDICATION_PRESETS = [
  {
    id: "sample-paracetamol",
    title: "Preset 1: Paracetamol 500mg",
    description: "Standard blister pack labeled Paracetamol 500mg tablets.",
    notes: "White tablet blister pack labeled Paracetamol 500mg. Taking for mild headache.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMmU4ZjAiLz48cmVjdCB4PSIyMCIgeT0iMzAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI0MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzBiNzkyZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iNTAiIHk9IjUyIiBmb250LXNpemU9IjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzFmMjkzNyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UEFSQUNFVEFNT0w8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjYzIiBmb250LXNpemU9IjYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmaWxsPSIjNDI3MTRkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj41MDBtZzwvdGV4dD48L3N2Zz4=",
    mimeType: "image/svg+xml",
  },
  {
    id: "sample-amoxicillin",
    title: "Preset 2: Amoxicillin 500mg",
    description: "Antibiotic capsule packaging marked Amoxicillin 500mg.",
    notes: "Yellow and maroon capsule box labeled Amoxicillin 500mg.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMmU4ZjAiLz48cmVjdCB4PSIyMCIgeT0iMjUiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1MCIgcng9IjQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2Q5NzcwNiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMjAiIHk9IjI1IiB3aWR0aD0iNjAiIGhlaWdodD0iMTUiIGZpbGw9IiNmM2I5MWMiLz48dGV4dCB4PSI1MCIgeT0iNTIiIGZvbnQtc2l6ZT0iNyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMWYyOTM3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BTU9YSUNJTExJTjwvdGV4dD48dGV4dCB4PSI1MCIgeT0iNjMiIGZvbnQtc2l6ZT0iNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZpbGw9IiM0MjcxNGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjUwMG1nIENhcHN1bGVzPC90ZXh0Pjwvc3ZnPg==",
    mimeType: "image/svg+xml",
  },
  {
    id: "sample-ibuprofen",
    title: "Preset 3: Ibuprofen 200mg",
    description: "NSAID pain reliever blister pack labeled Ibuprofen 200mg.",
    notes: "Orange blister strip labeled Ibuprofen 200mg for joint ache.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMmU4ZjAiLz48cmVjdCB4PSIyMCIgeT0iMzAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI0MCIgcng9IjYiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2VhNTgwYyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iNTAiIHk9IjUyIiBmb250LXNpemU9IjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzFmMjkzNyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+SUJVUFJPRkVOPC90ZXh0Pjx0ZXh0IHg9IjUwIiB5PSI2MyIgZm9udC1zaXplPSI2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZmlsbD0iIzQyNzE0ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+MjAwbWcgVGFibGV0czwvdGV4dD48L3N2Zz4=",
    mimeType: "image/svg+xml",
  },
];

export function MedicationScanner() {
  const [selectedImage, setSelectedImage] = React.useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);

  const [additionalNotes, setAdditionalNotes] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [scanResult, setScanResult] = React.useState<MedicationScanResponse | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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
      setScanResult(null);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to process medication image.");
    }
  };

  const handleSelectPreset = (preset: (typeof MEDICATION_PRESETS)[0]) => {
    setErrorMessage(null);
    setSelectedImage({
      base64: preset.base64,
      mimeType: preset.mimeType,
      previewUrl: `data:${preset.mimeType};base64,${preset.base64}`,
    });
    setAdditionalNotes(preset.notes);
    setScanResult(null);
  };

  const handleScan = async () => {
    if (!selectedImage) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/medication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedImage.base64,
          mimeType: selectedImage.mimeType,
          additionalNotes: additionalNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Medication scanner failed. Please try again.");
      }

      setScanResult(data.data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setAdditionalNotes("");
    setScanResult(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header Info */}
      <div className="text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
          <Pill className="size-6 text-primary" />
          <span>Educational Medication Scanner</span>
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
          Upload an image of a medication label, pill bottle, or blister pack to view educational information, precautions, and safety notices.
        </p>
      </div>

      {!scanResult ? (
        <div className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-none">
          {/* Quick Preset Buttons */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
              <Sparkles className="size-3.5" />
              <span>One-Click Test Presets:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {MEDICATION_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="p-2.5 text-left border border-border rounded-lg hover:bg-muted/60 transition-colors bg-background text-xs space-y-1"
                >
                  <div className="font-semibold text-foreground">{preset.title}</div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Upload Area */}
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
                    alt="Medication visual preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <span className="text-xs text-muted-foreground">Medication photo ready for analysis</span>
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
                  <p className="text-sm font-semibold">Click to upload medication photo or label</p>
                  <p className="text-xs text-muted-foreground">Supports JPEG, PNG, WebP up to 10MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Additional Notes Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="medication-scan-notes"
              className="text-sm font-semibold text-foreground cursor-pointer block"
            >
              Additional Details (Optional):
            </label>
            <textarea
              id="medication-scan-notes"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Any known markings, pill shape, or what you are taking it for..."
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
            onClick={handleScan}
            className="w-full h-11 text-sm font-semibold gap-2 rounded-xl"
          >
            {isLoading ? (
              <>
                <Spinner size="sm" />
                <span>Identifying Medication &amp; Safety Data...</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>Scan &amp; Identify Medication</span>
              </>
            )}
          </Button>

          {/* Educational Disclaimer */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border/40 text-xs sm:text-sm text-muted-foreground">
            <Info className="size-4 shrink-0 mt-0.5 text-primary" />
            <span>
              <strong>Crucial Safety Warning:</strong> Never ingest unidentified pills or change prescribed dosages based solely on automated image scanning. Always verify with a licensed pharmacist or physician.
            </span>
          </div>
        </div>
      ) : (
        /* Results View */
        <div
          role="region"
          aria-live="polite"
          aria-label="Medication Identification Results"
          className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-none animate-in fade-in-50 duration-200"
        >
          {/* Header Card */}
          <div className="p-4 sm:p-5 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Identified Medication
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-foreground mt-0.5">
                {scanResult.identifiedName}
              </h3>
              {scanResult.genericName && (
                <div className="text-xs sm:text-sm text-accent font-medium mt-0.5">
                  Generic: {scanResult.genericName}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full border ${
                  scanResult.confidence === "high"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : scanResult.confidence === "moderate"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                }`}
              >
                {scanResult.confidence} Confidence
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-xs h-8 px-3 gap-1.5 rounded-lg bg-background"
              >
                <RotateCcw className="size-3.5" />
                Scan Another
              </Button>
            </div>
          </div>

          {/* Primary Purpose */}
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-foreground">Therapeutic Indication / Purpose:</div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {scanResult.primaryPurpose}
            </p>
          </div>

          {/* Typical Uses */}
          {scanResult.typicalUses.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              <div className="text-xs font-bold text-foreground">Typical Uses:</div>
              <div className="flex flex-wrap gap-1.5">
                {scanResult.typicalUses.map((use, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-foreground border"
                  >
                    {use}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Safety Precautions */}
          {scanResult.safetyPrecautions.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                <span>Safety Precautions:</span>
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                {scanResult.safetyPrecautions.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Common Side Effects */}
          {scanResult.commonSideEffects.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <div className="text-xs font-bold text-foreground">Common Side Effects:</div>
              <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                {scanResult.commonSideEffects.map((effect, i) => (
                  <li key={i}>{effect}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Interactions Warning */}
          {scanResult.interactionsWarning && (
            <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-3.5" />
                <span>Interactions &amp; Contraindications:</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {scanResult.interactionsWarning}
              </p>
            </div>
          )}

          {/* Mandatory Pharmacist Notice */}
          <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <FileText className="size-3.5" />
              <span>Mandatory Pharmacist Verification Notice:</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {scanResult.pharmacistNotice}
            </p>
          </div>

          {/* Disclaimer Footer */}
          <div className="text-xs sm:text-sm text-muted-foreground bg-muted/30 p-3 rounded-xl border text-center leading-relaxed">
            {scanResult.disclaimer}
          </div>
        </div>
      )}
    </div>
  );
}
