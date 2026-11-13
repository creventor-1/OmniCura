"use client";

import * as React from "react";
import { OmnicuraLogo } from "./brand-logo";
import { NavSection } from "./navbar";

interface FooterProps {
  onNavigate?: (section: NavSection) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const emergencyNumber =
    process.env.NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER || "112";

  return (
    <footer className="w-full border-t border-border/50 py-6 text-xs text-muted-foreground mt-12">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        {/* Brand & Consolidated Medical Disclaimer */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-4">
          <button
            type="button"
            onClick={() => onNavigate?.("home")}
            className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
            aria-label="Omnicura Home"
          >
            <OmnicuraLogo size="sm" showWordmark />
          </button>
          <span className="hidden sm:inline text-border">|</span>
          <p className="text-[11px] text-muted-foreground leading-normal max-w-md">
            Educational guidance only. Not a medical diagnosis. In life-threatening emergencies, dial {emergencyNumber}.
          </p>
        </div>

        {/* Essential Navigation Links */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => onNavigate?.("home")}
            className="hover:text-foreground transition-colors"
          >
            Home
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigate?.("hospitals")}
            className="hover:text-foreground transition-colors"
          >
            Hospitals
          </button>
          <span>•</span>
          <a
            href={`tel:${emergencyNumber}`}
            className="text-danger font-semibold hover:underline"
          >
            SOS {emergencyNumber}
          </a>
        </div>
      </div>
    </footer>
  );
}
