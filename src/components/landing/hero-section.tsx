"use client";

import * as React from "react";
import {
  ArrowRight,
  Activity,
  Camera,
  Pill,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Clock,
  HeartPulse,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavSection } from "@/components/shared/navbar";

interface HeroSectionProps {
  onStartAssessment: () => void;
  onExploreFeatures: () => void;
  onSelectTool?: (tool: NavSection) => void;
}

export function HeroSection({
  onStartAssessment,
  onExploreFeatures,
  onSelectTool,
}: HeroSectionProps) {
  const handleToolClick = (tool: NavSection) => {
    if (onSelectTool) {
      onSelectTool(tool);
    } else if (tool === "triage") {
      onStartAssessment();
    } else if (tool === "hospitals") {
      onExploreFeatures();
    }
  };

  return (
    <div className="w-full space-y-10">
      {/* 1. Main Hero Command Surface */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 lg:p-9 shadow-none">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Headlines & Call to Actions */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-accent/25 bg-accent/5 text-accent text-xs font-semibold">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              <span>Clinical Decision Support System</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-foreground leading-snug">
              Intelligent Symptom Triage &amp; Care Guidance
            </h1>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Screen symptoms, intercept emergency red flags client-side, and navigate to verified emergency healthcare facilities nearby.
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

            {/* Trust Points */}
            <div className="pt-3 border-t border-border grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <ShieldCheck className="size-3.5 text-accent shrink-0" />
                <span className="truncate">Deterministic Safety</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="size-3.5 text-accent shrink-0" />
                <span className="truncate">GPS Care Routing</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <HeartPulse className="size-3.5 text-accent shrink-0" />
                <span className="truncate">First-Aid Guidance</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Triage Protocol Match Card */}
          <div className="lg:col-span-5 space-y-2.5">
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 shadow-none">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground tracking-tight">
                    Triage Protocol Engine
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] text-text-secondary border-border font-medium">
                  Active
                </Badge>
              </div>

              {/* Acuity Tiers Glance */}
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg border border-danger/30 bg-danger-muted/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="size-4 text-danger shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground text-xs">Emergency Screen</div>
                      <div className="text-[11px] text-text-secondary">Chest pain, stroke, anaphylaxis</div>
                    </div>
                  </div>
                  <Badge variant="danger" className="text-[10px] shrink-0">Immediate</Badge>
                </div>

                <div className="p-2.5 rounded-lg border border-warning/30 bg-warning-muted/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-warning-text shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground text-xs">Urgent Evaluation</div>
                      <div className="text-[11px] text-text-secondary">High fever, acute abdominal pain</div>
                    </div>
                  </div>
                  <Badge variant="warning" className="text-[10px] shrink-0">12–24 Hours</Badge>
                </div>

                <div className="p-2.5 rounded-lg border border-success/30 bg-success-muted/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="size-4 text-success shrink-0" />
                    <div>
                      <div className="font-semibold text-foreground text-xs">Non-Urgent Care</div>
                      <div className="text-[11px] text-text-secondary">Mild cough, minor scrapes, rash</div>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px] shrink-0">Self-Care</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1 border-t border-border">
                <span>Standardized Acuity Protocol</span>
                <span className="font-mono text-accent">Client-Side First</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Specialized Clinical Capabilities Grid */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Clinical Capabilities
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Specialized assessment tools, computer vision, and facility navigation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <button
            type="button"
            onClick={() => handleToolClick("triage")}
            className="p-4 rounded-xl border border-border bg-card text-left transition-colors hover:border-accent/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Activity className="size-4.5 stroke-[1.75]" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Symptom Assessment</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                Conversational triage with clinical follow-ups and first-aid recommendations.
              </p>
            </div>
            <div className="text-xs text-accent font-medium flex items-center gap-1 mt-3 group-hover:translate-x-0.5 transition-transform">
              <span>Start Assessment</span>
              <ChevronRight className="size-3" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleToolClick("vision")}
            className="p-4 rounded-xl border border-border bg-card text-left transition-colors hover:border-accent/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Camera className="size-4.5 stroke-[1.75]" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Symptom Vision</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                Computer vision analysis of visible rashes, cuts, burns, or physical injuries.
              </p>
            </div>
            <div className="text-xs text-accent font-medium flex items-center gap-1 mt-3 group-hover:translate-x-0.5 transition-transform">
              <span>Analyze Photo</span>
              <ChevronRight className="size-3" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleToolClick("medication")}
            className="p-4 rounded-xl border border-border bg-card text-left transition-colors hover:border-accent/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <Pill className="size-4.5 stroke-[1.75]" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Medication Scanner</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                Scan packaging to extract active ingredients, dosing guidelines, and precautions.
              </p>
            </div>
            <div className="text-xs text-accent font-medium flex items-center gap-1 mt-3 group-hover:translate-x-0.5 transition-transform">
              <span>Scan Label</span>
              <ChevronRight className="size-3" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleToolClick("hospitals")}
            className="p-4 rounded-xl border border-border bg-card text-left transition-colors hover:border-accent/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <MapPin className="size-4.5 stroke-[1.75]" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Hospital Locator</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                Live GPS radius lookup for verified emergency departments and directions.
              </p>
            </div>
            <div className="text-xs text-accent font-medium flex items-center gap-1 mt-3 group-hover:translate-x-0.5 transition-transform">
              <span>View Map</span>
              <ChevronRight className="size-3" />
            </div>
          </button>
        </div>
      </section>

      {/* 3. Three-Step Clinical Guidance Workflow */}
      <section className="space-y-4 pt-2 border-t border-border">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Clinical Triage Protocol
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            How Omnicura screens symptoms, evaluates urgency, and connects you to care.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent font-mono uppercase tracking-wider">
                Step 01
              </span>
              <Activity className="size-3.5 text-text-tertiary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Intake &amp; Red-Flag Screen</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Describe symptoms or upload injury photos. Instant client-side check intercepts critical red flags.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent font-mono uppercase tracking-wider">
                Step 02
              </span>
              <Sparkles className="size-3.5 text-text-tertiary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Acuity Classification</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Evaluates clinical urgency into Non-Urgent, Urgent, or Emergency tiers with supportive first aid.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-accent font-mono uppercase tracking-wider">
                Step 03
              </span>
              <MapPin className="size-3.5 text-text-tertiary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Direct Facility Navigation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Finds the closest verified medical clinics with phone contact lines and driving directions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
