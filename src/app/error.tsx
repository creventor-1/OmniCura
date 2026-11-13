"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div
        role="alert"
        className="w-full max-w-md rounded-2xl border border-danger/30 bg-surface p-6 sm:p-8 text-center space-y-4 shadow-overlay animate-in fade-in-50 duration-200"
      >
        <div className="size-12 rounded-xl bg-danger-muted border border-danger/30 text-danger flex items-center justify-center mx-auto">
          <AlertTriangle className="size-6 stroke-[1.75]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            Unable to Display Clinical Interface
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            An unexpected error occurred while loading this healthcare screen. Your private clinical data has not been modified.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <Button
            size="default"
            variant="default"
            onClick={() => reset()}
            className="w-full sm:w-auto gap-1.5 h-10 px-4 text-xs font-semibold"
          >
            <RotateCcw className="size-3.5" />
            <span>Reload View</span>
          </Button>

          <Link href="/">
            <Button
              size="default"
              variant="outline"
              className="w-full sm:w-auto gap-1.5 h-10 px-4 text-xs font-medium"
            >
              <Home className="size-3.5 text-accent" />
              <span>Return to Workspace</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
