"use client";

import * as React from "react";
import {
  ArrowRight,
  Activity,
  MapPin,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onStartAssessment: () => void;
  onExploreFeatures: () => void;
}

export function HeroSection({
  onStartAssessment,
  onExploreFeatures,
}: HeroSectionProps) {
  return (
    <div className="w-full space-y-8">
      {/* 1. Main Hero Command Surface */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 shadow-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-accent/25 bg-accent/5 text-accent text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              <span>Clinical Decision Support</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground leading-snug">
              Clinical Assessment &amp; Care Guidance
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              Evaluate symptoms, identify urgent red flags client-side, and find verified emergency care nearby.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Button
                size="lg"
                onClick={onStartAssessment}
                className="gap-2 text-sm font-semibold h-11 px-5 shadow-none"
              >
                <span>Start Assessment</span>
                <ArrowRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={onExploreFeatures}
                className="text-sm font-medium h-11 px-5"
              >
                <span>Find Hospitals</span>
              </Button>
            </div>
          </div>

          {/* Right Column: Real Quick-Access Capabilities (Replaces Mock Telemetry Artifact) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onStartAssessment}
              className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-accent/30 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer group"
            >
              <div className="size-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-2 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Activity className="size-4" />
              </div>
              <div className="text-xs font-semibold text-foreground">Symptom Assessment</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Interactive intake &amp; triage</div>
            </button>

            <button
              type="button"
              onClick={onExploreFeatures}
              className="p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-accent/30 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer group"
            >
              <div className="size-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-2 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <MapPin className="size-4" />
              </div>
              <div className="text-xs font-semibold text-foreground">Nearby Hospitals</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Verified emergency routes</div>
            </button>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-left">
              <div className="size-8 rounded-lg bg-secondary text-text-secondary flex items-center justify-center border border-border-subtle mb-2">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xs font-semibold text-foreground">Red-Flag Safety</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Instant client-side screen</div>
            </div>

            <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-left">
              <div className="size-8 rounded-lg bg-secondary text-text-secondary flex items-center justify-center border border-border-subtle mb-2">
                <Clock className="size-4 text-text-secondary" />
              </div>
              <div className="text-xs font-semibold text-foreground">Triage Priority</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Standard clinical tiers</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
