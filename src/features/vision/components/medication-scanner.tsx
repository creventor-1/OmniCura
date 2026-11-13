"use client";

import * as React from "react";
import {
  Pill,
  TriangleAlert,
  RotateCcw,
  Sparkles,
  Info,
  ShieldCheck,
  Stethoscope,
  Lock,
  CircleCheckBig,
  Activity,
  FlaskConical,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { compressImageFile } from "@/lib/image-utils";
import { MedicationScanResponse } from "@/schemas/vision";
import { ImageDropzone } from "@/components/system/image-dropzone";

const CONFIDENCE_LEVELS = {
  high: { label: "High confidence", bars: 4 },
  moderate: { label: "Moderate confidence", bars: 3 },
  low: { label: "Low confidence", bars: 2 },
  unidentified: { label: "Not identified", bars: 1 },
} as const;

function ConfidenceSignal({ level }: { level: keyof typeof CONFIDENCE_LEVELS }) {
  const conf = CONFIDENCE_LEVELS[level] ?? CONFIDENCE_LEVELS.low;
  return (
    <div className="flex items-center gap-2.5" aria-label={conf.label}>
      <div className="flex items-end gap-[3px]" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("w-1.5 rounded-sm", i < conf.bars ? "bg-brand" : "bg-brand-soft")}
            style={{ height: 6 + i * 4 }}
          />
        ))}
      </div>
      <span className="text-[13px] font-semibold text-foreground">{conf.label}</span>
    </div>
  );
}

const MEDICATION_PRESETS = [
  {
    id: "sample-paracetamol",
    title: "Paracetamol 500mg",
    description: "Analgesic blister pack tablets.",
    notes: "White tablet blister pack labeled Paracetamol 500mg. Taking for mild headache.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMmU4ZjAiLz48cmVjdCB4PSIyMCIgeT0iMzAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI0MCIgcng9IjgiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iIzBiNzkyZSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iNTAiIHk9IjUyIiBmb250LXNpemU9IjgiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0iIzFmMjkzNyIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UEFSQUNFVEFNT0w8L3RleHQ+PHRleHQgeD0iNTAiIHk9IjYzIiBmb250LXNpemU9IjYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmaWxsPSIjNDI3MTRkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj41MDBtZzwvdGV4dD48L3N2Zz4=",
    mimeType: "image/svg+xml",
  },
  {
    id: "sample-amoxicillin",
    title: "Amoxicillin 500mg",
    description: "Antibiotic capsule packaging.",
    notes: "Yellow and maroon capsule box labeled Amoxicillin 500mg.",
    base64:
      "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIGZpbGw9IiNlMmU4ZjAiLz48cmVjdCB4PSIyMCIgeT0iMjUiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1MCIgcng9IjQiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZT0iI2Q5NzcwNiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMjAiIHk9IjI1IiB3aWR0aD0iNjAiIGhlaWdodD0iMTUiIGZpbGw9IiNmM2I5MWMiLz48dGV4dCB4PSI1MCIgeT0iNTIiIGZvbnQtc2l6ZT0iNyIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMWYyOTM3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5BTU9YSUNJTExJTjwvdGV4dD48dGV4dCB4PSI1MCIgeT0iNjMiIGZvbnQtc2l6ZT0iNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZpbGw9IiM0MjcxNGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiPjUwMG1nIENhcHN1bGVzPC90ZXh0Pjwvc3ZnPg==",
    mimeType: "image/svg+xml",
  },
  {
    id: "sample-ibuprofen",
    title: "Ibuprofen 200mg",
    description: "NSAID pain reliever blister pack.",
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
    <div className="w-full">
      {!scanResult ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="space-y-5 rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs sm:p-6 lg:col-span-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="type-heading text-foreground">Scan packaging or label</h2>
                <p className="mt-0.5 text-[13px] text-text-tertiary">Pill bottles, blister packs or boxes</p>
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
              title="Add a photo of the medication label"
              previewAlt="Medication visual preview"
            />

            <Textarea
              id="medication-scan-notes"
              label="Additional details (optional)"
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Markings on the pill, shape, or what you're taking it for…"
              rows={3}
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
              onClick={handleScan}
              className="w-full"
            >
              {isLoading ? (
                "Identifying medication…"
              ) : (
                <>
                  <Sparkles />
                  Identify medication
                </>
              )}
            </Button>
          </section>

          <aside className="space-y-5 lg:col-span-5">
            <section className="rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs">
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Sample labels</h2>
                <span className="text-xs text-text-tertiary">For demonstration</span>
              </div>
              <ul className="space-y-2">
                {MEDICATION_PRESETS.map((preset) => {
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

            <section className="rounded-[20px] border border-warning/30 bg-warning-muted p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <TriangleAlert className="size-4 text-warning-text" aria-hidden="true" />
                Safety first
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                Never take unidentified pills or change a prescribed dose based on an automated scan. Always confirm
                with a licensed pharmacist or physician.
              </p>
            </section>
          </aside>
        </div>
      ) : (
        <div
          role="region"
          aria-live="polite"
          aria-label="Medication Identification Results"
          className="space-y-6 animate-rise"
        >
          {/* Identity header */}
          <section className="relative overflow-hidden rounded-[20px] border border-border-subtle bg-surface p-6 shadow-xs sm:p-7">
            <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[radial-gradient(closest-side,var(--brand-soft),transparent)]" aria-hidden="true" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                {selectedImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedImage.previewUrl}
                    alt="Scanned medication"
                    className="size-16 shrink-0 rounded-2xl border border-border-subtle bg-subtle object-contain"
                  />
                ) : (
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-muted text-accent">
                    <Pill className="size-7" aria-hidden="true" />
                  </span>
                )}
                <div className="space-y-1.5">
                  <p className="type-overline text-text-tertiary">Identified medication</p>
                  <h2 className="font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground">
                    {scanResult.identifiedName}
                  </h2>
                  {scanResult.genericName && (
                    <p className="text-[13px] text-text-secondary">
                      Generic: <span className="font-semibold text-foreground">{scanResult.genericName}</span>
                    </p>
                  )}
                  {scanResult.brandNames && scanResult.brandNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {scanResult.brandNames.map((b) => (
                        <span key={b} className="rounded-md border border-border-subtle bg-subtle px-2 py-0.5 text-xs font-medium text-text-secondary">
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <ConfidenceSignal level={scanResult.confidence} />
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="text-text-tertiary" />
                  Scan another
                </Button>
              </div>
            </div>

            <div className="relative mt-6 rounded-2xl border border-brand/15 bg-brand-muted p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent-text">
                <Activity className="size-3.5" aria-hidden="true" />
                Therapeutic purpose
              </div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-foreground">{scanResult.primaryPurpose}</p>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="space-y-5 lg:col-span-7">
              {scanResult.safetyPrecautions.length > 0 && (
                <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-accent">
                      <ShieldCheck className="size-4" aria-hidden="true" />
                    </span>
                    <h3 className="type-heading text-foreground">Safety precautions</h3>
                  </div>
                  <ul className="mt-4 space-y-2.5">
                    {scanResult.safetyPrecautions.map((item, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
                        <CircleCheckBig className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {scanResult.interactionsWarning && (
                <section className="rounded-2xl border border-warning/30 bg-warning-muted p-5">
                  <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                    <TriangleAlert className="size-[18px] text-warning-text" aria-hidden="true" />
                    Interactions &amp; contraindications
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/90">{scanResult.interactionsWarning}</p>
                </section>
              )}
              <section className="rounded-2xl border border-info/20 bg-info-muted p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Stethoscope className="size-4 text-info" aria-hidden="true" />
                  Verify with a pharmacist
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
                  {scanResult.pharmacistNotice ||
                    "Always confirm correct dosage, potential drug interactions, and expiration dates with a certified pharmacist before taking any medication."}
                </p>
              </section>

            </div>

            <div className="space-y-5 lg:col-span-5">
              {scanResult.typicalUses.length > 0 && (
                <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-xs">
                  <h3 className="text-sm font-semibold text-foreground">Typical uses</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scanResult.typicalUses.map((use, i) => (
                      <span key={i} className="rounded-lg border border-border-subtle bg-subtle px-2.5 py-1 text-[13px] font-medium text-foreground">
                        {use}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {scanResult.commonSideEffects.length > 0 && (
                <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-xs">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="size-4 text-text-tertiary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-foreground">Common side effects</h3>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {scanResult.commonSideEffects.map((effect, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-text-secondary">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-border-strong" aria-hidden="true" />
                        {effect}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="flex items-start gap-2.5 rounded-2xl border border-border-subtle bg-subtle p-4 text-xs leading-relaxed text-text-tertiary">
                <Info className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                {scanResult.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
