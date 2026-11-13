"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";
import { NavSection } from "./navbar";

interface FooterProps {
  onNavigate?: (section: NavSection) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const emergencyNumber = process.env.NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER || "112";

  return (
    <footer className="mt-16 border-t border-border-subtle pt-6 text-xs text-text-tertiary">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 max-w-xl leading-relaxed">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden="true" />
          <span>
            Omnicura provides educational guidance only and does not diagnose. In a life-threatening
            emergency, call <a href={`tel:${emergencyNumber}`} className="font-semibold text-danger hover:underline">{emergencyNumber}</a> immediately.
          </span>
        </p>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => onNavigate?.("home")} className="hover:text-foreground transition-colors cursor-pointer">
            Overview
          </button>
          <button type="button" onClick={() => onNavigate?.("hospitals")} className="hover:text-foreground transition-colors cursor-pointer">
            Find care
          </button>
          <button type="button" onClick={() => onNavigate?.("profile")} className="hover:text-foreground transition-colors cursor-pointer">
            Health profile
          </button>
          <span className="text-text-tertiary/70">Omnicura v0.1</span>
        </div>
      </div>
    </footer>
  );
}
