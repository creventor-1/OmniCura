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
  Cpu,
  Clock,
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
    <div className="w-full space-y-12">
      {/* 1. Main Hero Command Surface: Senior-Designer SaaS Presentation */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 lg:p-10 shadow-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-accent/25 bg-accent/5 text-accent text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              <span>Omnicura 2.0 • Autonomous Clinical Decision Support</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground leading-snug">
              Deterministic Clinical Assessment &amp; Emergency Care Intelligence
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Describe symptoms naturally or upload photos of visible injuries. Omnicura evaluates deterministic safety red-flags client-side, conducts targeted clinical follow-ups, and routes patients to verified nearby emergency departments.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Button
                size="lg"
                onClick={onStartAssessment}
                className="gap-2 text-sm font-semibold h-11 px-5 shadow-none"
              >
                <span>Start Symptom Assessment</span>
                <ArrowRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={onExploreFeatures}
                className="text-sm font-medium h-11 px-5"
              >
                <span>Clinical Protocol</span>
              </Button>
            </div>

            {/* Micro Trust Points */}
            <div className="pt-4 border-t border-border grid grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-accent shrink-0" />
                <span className="truncate">Deterministic Rules</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-accent shrink-0" />
                <span className="truncate">GPS Facility Routing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-accent shrink-0" />
                <span className="truncate">Exportable PDF EHR</span>
              </div>
            </div>
          </div>

          {/* Right Column: High-Density Clinical Telemetry Artifact */}
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 shadow-none">
              {/* Telemetry Header */}
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-foreground tracking-tight">
                    Encounter Session #4829
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium tabular-nums">
                  <Clock className="size-3 text-muted-foreground" />
                  <span>00:04:12</span>
                </div>
              </div>

              {/* Patient Chief Complaint Box */}
              <div className="bg-card rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="uppercase tracking-wider font-semibold">Chief Complaint</span>
                  <span className="text-accent font-medium">Adult / Age 34</span>
                </div>
                <p className="text-xs font-medium text-foreground leading-snug">
                  Sudden lower right quadrant pain with low-grade fever and nausea for 6 hours.
                </p>
              </div>

              {/* Red-Flag Deterministic Rule Bar */}
              <div className="rounded-lg border border-border bg-card p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[11px] font-medium text-foreground">
                    Deterministic Red-Flag Check
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                  Passed Client-Side
                </Badge>
              </div>

              {/* Clinical Classification Result */}
              <div className="rounded-lg border border-border border-l-3 border-l-amber-500 bg-card p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                    Clinical Urgency Classification
                  </span>
                  <Badge variant="warning" className="text-[10px]">Urgent Care</Badge>
                </div>
                <p className="text-xs text-foreground/90 font-medium">
                  Appendicitis cannot be ruled out. Clinical physical exam advised within 6 hours.
                </p>
              </div>

              {/* Destination Facility Dispatch Route */}
              <div className="rounded-lg border border-border bg-card p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-foreground truncate flex items-center gap-1">
                    <MapPin className="size-3 text-accent shrink-0" />
                    <span className="truncate">ESUT Teaching Hospital Parklane</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Enugu, Nigeria • Emergency 24/7</div>
                </div>
                <span className="text-xs font-semibold tabular-nums text-foreground bg-muted px-2 py-0.5 rounded border border-border shrink-0">
                  2.8 km
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
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-accent/40 transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border">
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
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-accent/40 transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border">
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
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-accent/40 transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border">
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
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-accent/40 transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border">
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
          <div className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-accent/40 transition-colors">
            <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center border border-border">
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
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workflow Architecture
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
              icon: Cpu,
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
                className="rounded-xl border border-border bg-card p-4 space-y-2 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="size-7 rounded-md bg-muted text-accent flex items-center justify-center border border-border">
                    <Icon className="size-3.5" />
                  </div>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
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
            <span>Begin Clinical Assessment</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
