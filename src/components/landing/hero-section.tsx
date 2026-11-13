"use client";

import * as React from "react";
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  MapPin,
  Lock,
  AlertOctagon,
  HeartPulse,
  FileText,
  CheckCircle2,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HeroSectionProps {
  onStartAssessment: () => void;
  onExploreFeatures: () => void;
}

export function HeroSection({
  onStartAssessment,
  onExploreFeatures,
}: HeroSectionProps) {
  return (
    <div className="w-full space-y-10">
      {/* 1. Main Hero Block: Restrained, Linear/Stripe-Calm Clinical Presentation */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent/30 bg-accent/5 text-accent text-xs font-medium">
              <span className="size-1.5 rounded-full bg-accent" />
              <span>Clinical Decision Support System</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground leading-snug">
              AI-Assisted Emergency Triage &amp; Supportive First-Aid Guidance
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Describe symptoms naturally or upload photos of visible injuries. Receive deterministic safety screening, adaptive clinical follow-ups, and evidence-based supportive first-aid before reaching professional care.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
              <Button
                size="lg"
                onClick={onStartAssessment}
                className="gap-2"
              >
                <span>Start Symptom Assessment</span>
                <ArrowRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={onExploreFeatures}
              >
                <span>Clinical Protocol</span>
              </Button>
            </div>

            {/* Micro Trust Points */}
            <div className="pt-4 border-t border-border grid grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Deterministic Safety</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">GPS Facility Locator</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">PDF Medical Export</span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Interface Previews */}
          <div className="lg:col-span-5 space-y-3">
            {/* Mockup Card 1: Clinical AI Assessment Output */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-md bg-muted text-accent flex items-center justify-center border border-border/80">
                    <Activity className="size-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    Triage Assessment
                  </span>
                </div>
                <Badge variant="success">Non-Urgent</Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="text-muted-foreground font-medium">Recommended Action:</div>
                <p className="text-foreground leading-relaxed bg-card p-2.5 rounded-lg border border-border/70 text-xs font-normal">
                  Monitor symptoms with supportive hydration and oral rest. Seek evaluation if fever persists beyond 72 hours.
                </p>
              </div>
            </div>

            {/* Mockup Card 2: Nearby Hospital Coordinate Result */}
            <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5 truncate">
                  <MapPin className="size-3.5 text-accent shrink-0" />
                  <span className="truncate">ESUT Teaching Hospital Parklane</span>
                </span>
                <span className="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
                  5.0 km
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                <span>Enugu, Nigeria</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px]">
                  Emergency 24/7
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trust Section (Confidence & Clinical Safety) */}
      <section className="space-y-4">
        <div className="text-left space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Clinical Safety &amp; Responsibility Safeguards
          </h2>
          <p className="text-xs text-muted-foreground max-w-xl">
            Engineered with deterministic red-flag screens, zero-knowledge privacy principles, and physician-oriented summaries.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Trust Card 1 */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-border-strong transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border/60">
              <Activity className="size-4 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Educational Guidance
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Provides structured supportive guidance and urgency screening without formulating definitive medical diagnoses.
            </p>
          </div>

          {/* Trust Card 2 */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-border-strong transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border/60">
              <Lock className="size-4 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Privacy Architecture
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Guest sessions operate in transient memory. Patient profiles are protected under RLS and shared with AI only with explicit consent.
            </p>
          </div>

          {/* Trust Card 3 */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-border-strong transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border/60">
              <AlertOctagon className="size-4 text-destructive" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Deterministic Red-Flags
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Critical conditions trigger emergency escalation protocols client-side before any AI API call can execute.
            </p>
          </div>

          {/* Trust Card 4 */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-border-strong transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border/60">
              <Compass className="size-4 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Facility Discovery
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              GPS coordinate-based radius lookup surfaces verified clinics, emergency departments, and driving directions.
            </p>
          </div>

          {/* Trust Card 5 */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-border-strong transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border/60">
              <FileText className="size-4 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Verified PDF Reports
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Export comprehensive clinical encounter records with clear disclaimer stamps for physician review.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Clinical Protocol Steps */}
      <section id="how-it-works" className="space-y-4 pt-4 border-t border-border">
        <div className="text-left space-y-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow Structure
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Six-Stage Clinical Guidance Protocol
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            {
              step: "01",
              title: "Symptom Intake",
              desc: "Patient describes symptoms naturally or uploads visible injury/burn photographs.",
              icon: Activity,
            },
            {
              step: "02",
              title: "Deterministic Rule Screening",
              desc: "Instant client-side screen evaluates chest pain, anaphylaxis, and stroke indicators.",
              icon: ShieldCheck,
            },
            {
              step: "03",
              title: "Adaptive Clinical Follow-Ups",
              desc: "Targeted follow-up queries clarify duration, onset, and specific risk factors.",
              icon: Activity,
            },
            {
              step: "04",
              title: "Urgency Classification",
              desc: "Categorizes clinical priority into Non-Urgent, Urgent, or Emergency tiers.",
              icon: HeartPulse,
            },
            {
              step: "05",
              title: "Supportive First-Aid Actions",
              desc: "Safe supportive measures to execute immediately while monitoring symptoms.",
              icon: CheckCircle2,
            },
            {
              step: "06",
              title: "Local Care Directions",
              desc: "Verified nearest medical clinics with phone contact and turn-by-turn routing.",
              icon: MapPin,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-border-strong transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="size-7 rounded-md bg-muted text-accent flex items-center justify-center border border-border/60">
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    Stage {item.step}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground pt-1">
                  {item.title}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="pt-2">
          <Button
            size="default"
            onClick={onStartAssessment}
            className="gap-2"
          >
            <span>Proceed to Triage Assessment</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
