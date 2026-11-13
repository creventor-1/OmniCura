"use client";

import * as React from "react";
import { ImageUp, X, RefreshCw } from "lucide-react";
import { cn } from "cn";

interface ImageDropzoneProps {
  previewUrl: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  isScanning?: boolean;
  title: string;
  hint?: string;
  previewAlt: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function ImageDropzone({
  previewUrl,
  onFile,
  onClear,
  isScanning = false,
  title,
  hint = "JPEG, PNG or WebP · up to 10 MB",
  previewAlt,
  inputRef,
}: ImageDropzoneProps) {
  const localRef = React.useRef<HTMLInputElement | null>(null);
  const ref = inputRef ?? localRef;
  const [isDragging, setIsDragging] = React.useState(false);

  const openPicker = () => ref.current?.click();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  };

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-subtle">
          <div className="relative flex h-64 items-center justify-center bg-grid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt={previewAlt} className="max-h-full max-w-full object-contain p-4 drop-shadow-sm" />
            {isScanning && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute inset-0 bg-brand/5" />
                <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-brand/25 to-transparent animate-[scan_1.8s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
          {!isScanning && (
            <div className="absolute right-3 top-3 flex gap-1.5">
              <button
                type="button"
                onClick={openPicker}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-surface/95 px-2.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:bg-surface cursor-pointer"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Replace
              </button>
              <button
                type="button"
                onClick={onClear}
                className="flex size-8 items-center justify-center rounded-lg border border-border-subtle bg-surface/95 text-text-secondary shadow-sm backdrop-blur transition-colors hover:text-foreground cursor-pointer"
                aria-label="Remove image"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "group flex h-64 w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 text-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
            isDragging
              ? "border-brand bg-brand-muted scale-[1.01]"
              : "border-border-strong/80 bg-subtle hover:border-brand/50 hover:bg-brand-muted/50"
          )}
        >
          <span className="flex size-14 items-center justify-center rounded-2xl border border-border-subtle bg-surface text-accent shadow-sm transition-transform group-hover:-translate-y-0.5">
            <ImageUp className="size-6" aria-hidden="true" />
          </span>
          <span className="space-y-1">
            <span className="block text-[15px] font-semibold text-foreground">{title}</span>
            <span className="block text-[13px] text-text-secondary">
              Drag and drop, or <span className="font-semibold text-accent-text">browse files</span>
            </span>
            <span className="block text-xs text-text-tertiary">{hint}</span>
          </span>
        </button>
      )}
    </div>
  );
}
