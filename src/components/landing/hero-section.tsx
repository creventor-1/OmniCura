"use client";

import * as React from "react";
import {
  ArrowRight,
  ShieldCheck,
  Activity,
  MapPin,
  Lock,
  AlertOctagon,
  Sparkles,
  HeartPulse,
  FileText,
  CheckCircle2,
  Bot,
  User,
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
    <div className="w-full space-y-16 py-6 sm:py-10">
      {/* 1. Main Hero Block */}
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card/90 to-muted/20 p-6 sm:p-10 lg:p-12 shadow-sm">
        {/* Soft Background Radial Light */}
        <div className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-500/5" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-teal-500/10 blur-3xl dark:bg-teal-500/5" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs font-semibold animate-in fade-in-50">
              <Sparkles className="size-3.5" />
              <span>Next-Gen Healthcare Intelligence</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
              Intelligent Emergency Triage &amp;{" "}
              <span className="bg-gradient-to-r from-sky-600 via-teal-600 to-emerald-600 dark:from-sky-400 dark:via-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                First-Aid Guidance
              </span>
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
              Describe symptoms naturally or upload photos of visible injuries. Receive instant deterministic safety screening, adaptive clinical follow-ups, and evidence-based supportive first-aid before reaching professional care.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button
                size="lg"
                onClick={onStartAssessment}
                className="h-12 px-6 rounded-xl font-bold text-sm gap-2 shadow-md hover:shadow-lg transition-all duration-200"
              >
                <span>Start Symptom Assessment</span>
                <ArrowRight className="size-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={onExploreFeatures}
                className="h-12 px-6 rounded-xl text-sm font-semibold border-border/80 hover:bg-muted/60 transition-colors"
              >
                <span>How It Works</span>
              </Button>
            </div>

            {/* Micro Trust Points */}
            <div className="pt-4 border-t border-border/40 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Deterministic Safety</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Offline Hospital Map</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">PDF Medical Export</span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Floating Application Previews */}
          <div className="lg:col-span-5 relative space-y-3.5">
            {/* Mockup Card 1: AI Chat Bubble */}
            <div className="rounded-2xl border border-border/80 bg-background/95 p-4 shadow-md backdrop-blur-sm space-y-2.5 transition-transform hover:-translate-y-1 duration-200">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <Bot className="size-3.5" />
                  </div>
                  <span className="text-xs font-bold text-foreground">TriageAI Assistant</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-300 border-emerald-500/30 bg-emerald-500/10">
                  Adaptive AI
                </Badge>
              </div>

              <div className="space-y-2 text-xs leading-relaxed">
                <div className="flex items-start gap-2 justify-end">
                  <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-xl rounded-tr-xs text-[11px]">
                    Mild persistent cough and slight fever for 2 days.
                  </div>
                  <div className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center shrink-0">
                    <User className="size-3" />
                  </div>
                </div>

                <div className="flex items-start gap-2 justify-start">
                  <div className="size-5 rounded-full bg-primary/10 text-primary text-[10px] flex items-center justify-center shrink-0">
                    <Bot className="size-3" />
                  </div>
                  <div className="bg-muted px-3 py-1.5 rounded-xl rounded-tl-xs text-[11px] text-foreground">
                    Are you experiencing any shortness of breath or pain when inhaling?
                  </div>
                </div>
              </div>
            </div>

            {/* Mockup Card 2: Urgency Classification Result */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 shadow-sm space-y-1.5 transition-transform hover:-translate-y-1 duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <HeartPulse className="size-3 text-emerald-600" />
                  Urgency Assessment
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  NON-URGENT
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Mild symptoms localized to upper airways. Supportive hydration &amp; rest recommended.
              </p>
            </div>

            {/* Mockup Card 3: Nearby Hospital Preview */}
            <div className="rounded-2xl border border-border/80 bg-background/95 p-3.5 shadow-sm space-y-1.5 transition-transform hover:-translate-y-1 duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Enugu State University Teaching Hospital</span>
                </span>
                <span className="text-[11px] font-bold text-primary">5.0 km</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Parklane, GRA, Enugu</span>
                <span className="text-emerald-600 font-semibold">Open 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trust Section (5 Cohesive Confidence Cards) */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Built on Safety, Transparency &amp; Medical Responsibility
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Clinical-grade safeguards engineered to provide helpful educational guidance without false promises.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Trust Card 1 */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 hover:border-primary/40 transition-colors shadow-xs">
            <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Activity className="size-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Educational Guidance</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Provides educational supportive care and clinical urgency screening without offering definitive medical diagnoses.
            </p>
          </div>

          {/* Trust Card 2 */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 hover:border-primary/40 transition-colors shadow-xs">
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Lock className="size-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Privacy-First Architecture</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Guest triage is processed in memory. Account profiles are encrypted and shared with AI strictly with explicit user consent.
            </p>
          </div>

          {/* Trust Card 3 */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 hover:border-primary/40 transition-colors shadow-xs">
            <div className="size-8 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center">
              <AlertOctagon className="size-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Deterministic Red-Flags</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Critical symptoms immediately trigger the emergency hotline modal before any AI API call can execute.
            </p>
          </div>

          {/* Trust Card 4 */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 hover:border-primary/40 transition-colors shadow-xs">
            <div className="size-8 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
              <Compass className="size-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Dynamic Hospital Locator</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Auto-detects GPS coordinates to surface verified nearby medical clinics, emergency rooms, and driving directions.
            </p>
          </div>

          {/* Trust Card 5 */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2 hover:border-primary/40 transition-colors shadow-xs">
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <FileText className="size-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground">Verifiable PDF Reports</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Export comprehensive first-aid and symptom summaries for physician review with clear medical disclaimer notices.
            </p>
          </div>
        </div>
      </section>

      {/* 3. How It Works Timeline */}
      <section id="how-it-works" className="space-y-6 pt-4 border-t border-border/50">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Step-by-Step Experience
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            How TriageAI Guides Your Care
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            From the first symptom description to hospital directions in six seamless steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            {
              step: "01",
              title: "Describe Symptoms",
              desc: "Type naturally, speak via voice input, or upload photos of visible rashes, cuts, or burns.",
              icon: Activity,
            },
            {
              step: "02",
              title: "Deterministic Safety Screening",
              desc: "Rule-based screening checks for chest pain, anaphylaxis, or stroke red flags before calling AI.",
              icon: ShieldCheck,
            },
            {
              step: "03",
              title: "Adaptive Clinical Follow-Ups",
              desc: "AI asks targeted, concise questions with one-click choice chips to clarify duration and severity.",
              icon: Bot,
            },
            {
              step: "04",
              title: "Urgency Classification",
              desc: "Categorizes urgency into Non-Urgent, Urgent, or Emergency with clinical reasoning.",
              icon: HeartPulse,
            },
            {
              step: "05",
              title: "Supportive First-Aid Checklist",
              desc: "Clear step-by-step actions you can take right now, plus warning signs that require urgent escalation.",
              icon: CheckCircle2,
            },
            {
              step: "06",
              title: "Nearby Healthcare Locator",
              desc: "OpenStreetMap map surfaces verified hospitals with distance calculations and instant directions.",
              icon: MapPin,
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="relative rounded-2xl border border-border/60 bg-card p-5 space-y-2 hover:border-primary/50 transition-all shadow-xs group"
              >
                <div className="flex items-center justify-between">
                  <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Icon className="size-4" />
                  </div>
                  <span className="text-xs font-black text-muted-foreground/50 tracking-wider">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-foreground pt-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <Button
            size="lg"
            onClick={onStartAssessment}
            className="h-11 px-6 rounded-xl font-bold text-xs sm:text-sm gap-2"
          >
            <span>Begin Your Assessment Now</span>
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </section>
    </div>
  );
}
