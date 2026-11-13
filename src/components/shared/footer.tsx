"use client";

import * as React from "react";
import {
  PhoneCall,
  ShieldCheck,
  HeartPulse,
  MapPin,
  Camera,
  History,
  Activity,
  Lock,
} from "lucide-react";
import { OmnicuraLogo } from "./brand-logo";
import { NavSection } from "./navbar";

interface FooterProps {
  onNavigate?: (section: NavSection) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const emergencyNumber =
    process.env.NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER || "112";

  return (
    <footer className="w-full border-t border-border/60 bg-muted/25 dark:bg-card/40 mt-16 text-muted-foreground transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 lg:py-16 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <button
              type="button"
              onClick={() => onNavigate?.("home")}
              className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
              aria-label="Omnicura Home"
            >
              <OmnicuraLogo size="md" showWordmark />
            </button>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
              Clinical-grade intelligent clinical assessment and supportive first-aid guidance.
              Designed for rapid, deterministic symptom screening and immediate healthcare facility discovery.
            </p>
            <div className="flex items-center gap-3 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-500/20">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                Deterministic Red-Flags
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                <Lock className="size-3.5" />
                Zero-Knowledge Privacy
              </span>
            </div>
          </div>

          {/* Column 2: Clinical Capabilities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Clinical Services
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.("triage")}
                  className="hover:text-primary transition-colors flex items-center gap-1.5 text-left"
                >
                  <Activity className="size-3.5 text-primary" />
                  <span>Symptom Assessment</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.("vision")}
                  className="hover:text-primary transition-colors flex items-center gap-1.5 text-left"
                >
                  <Camera className="size-3.5 text-primary" />
                  <span>Symptom Vision Analysis</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.("hospitals")}
                  className="hover:text-primary transition-colors flex items-center gap-1.5 text-left"
                >
                  <MapPin className="size-3.5 text-primary" />
                  <span>Hospital &amp; Clinic Locator</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Patient Care Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Patient Records
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.("history")}
                  className="hover:text-primary transition-colors flex items-center gap-1.5 text-left"
                >
                  <History className="size-3.5 text-primary" />
                  <span>Assessment Timeline</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.("profile")}
                  className="hover:text-primary transition-colors flex items-center gap-1.5 text-left"
                >
                  <HeartPulse className="size-3.5 text-primary" />
                  <span>Patient Health Profile</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate?.("contacts")}
                  className="hover:text-primary transition-colors flex items-center gap-1.5 text-left"
                >
                  <PhoneCall className="size-3.5 text-primary" />
                  <span>Emergency Contacts</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Critical Hotlines */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <PhoneCall className="size-3.5" />
              <span>Emergency Hotlines</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/5 space-y-1">
                <span className="font-bold text-foreground block">Nigeria National Emergency:</span>
                <a
                  href={`tel:${emergencyNumber}`}
                  className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400 font-extrabold hover:underline"
                >
                  <span>Dial {emergencyNumber} (Toll-Free)</span>
                </a>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                In acute or life-threatening situations (severe chest pain, uncontrolled bleeding, loss of consciousness), call emergency services immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Medical & Legal Disclaimer Banner */}
        <div className="border-t border-border/50 pt-6 space-y-3 text-center sm:text-left">
          <div className="rounded-xl bg-card border border-border/70 p-4 text-xs leading-relaxed text-muted-foreground space-y-1">
            <span className="font-bold text-foreground">Important Medical Disclaimer: </span>
            <span>
              Omnicura provides educational guidance and preliminary urgency classification for general reference only.
              It does not formulate definitive diagnoses, prescribe medication, or replace evaluation by licensed physicians.
              Always consult qualified healthcare professionals for diagnosis and treatment.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-2 text-muted-foreground">
            <div>
              &copy; 2026 Omnicura Platform. Clinical Decision Support System.
            </div>
            <div className="flex items-center gap-4 text-xs">
              <button
                type="button"
                onClick={() => onNavigate?.("home")}
                className="hover:text-foreground transition-colors"
              >
                Overview
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onNavigate?.("hospitals")}
                className="hover:text-foreground transition-colors"
              >
                Find Hospitals
              </button>
              <span>•</span>
              <a
                href={`tel:${emergencyNumber}`}
                className="text-red-600 dark:text-red-400 font-bold hover:underline"
              >
                SOS {emergencyNumber}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
