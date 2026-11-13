"use client";

import * as React from "react";
import Link from "next/link";
import { TriangleAlert, RotateCcw, ArrowLeft, PhoneCall } from "lucide-react";
import { DEFAULT_EMERGENCY_NUMBER } from "@/lib/constants";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[APPLICATION_RUNTIME_ERROR]", error);
  }, [error]);

  return (
    <div className="flex min-h-[80dvh] items-center justify-center bg-app p-6">
      <div role="alert" className="w-full max-w-md rounded-[22px] border border-border-subtle bg-surface p-8 text-center shadow-md animate-rise">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-danger/20 bg-danger-muted text-danger">
          <TriangleAlert className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 type-title text-foreground">Something went wrong</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          This screen couldn&apos;t be displayed. Your private clinical data has not been modified.
        </p>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-brand-hover cursor-pointer"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-subtle"
          >
            <ArrowLeft className="size-4 text-text-tertiary" aria-hidden="true" />
            Back to workspace
          </Link>
        </div>

        <a
          href={`tel:${DEFAULT_EMERGENCY_NUMBER}`}
          className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-danger hover:underline"
        >
          <PhoneCall className="size-3.5" aria-hidden="true" />
          Emergency? Call {DEFAULT_EMERGENCY_NUMBER}
        </a>
      </div>
    </div>
  );
}
