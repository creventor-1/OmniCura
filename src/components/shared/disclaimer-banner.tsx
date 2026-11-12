import * as React from "react";
import { ShieldAlert } from "lucide-react";
import { BRIEF_DISCLAIMER_TEXT } from "@/lib/constants";

export function DisclaimerBanner() {
  return (
    <aside
      aria-label="Medical Disclaimer Banner"
      className="w-full border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-900 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-2 text-center">
        <ShieldAlert className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>{BRIEF_DISCLAIMER_TEXT}</span>
      </div>
    </aside>
  );
}
