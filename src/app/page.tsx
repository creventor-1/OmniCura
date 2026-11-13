"use client";

import * as React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { NavSection } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { DashboardView, ActiveTab } from "@/components/dashboard/dashboard-view";
import { HeroSection } from "@/components/landing/hero-section";
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards";
import { Activity, Camera, Pill, MapPin } from "lucide-react";

const VALID_SECTIONS: NavSection[] = [
  "home",
  "triage",
  "vision",
  "medication",
  "hospitals",
  "history",
  "profile",
  "contacts",
];

function getSectionFromHash(): NavSection {
  if (typeof window === "undefined") return "home";
  const hash = window.location.hash.replace("#", "").toLowerCase() as NavSection;
  return VALID_SECTIONS.includes(hash) ? hash : "home";
}

export default function Home() {
  const [activeSection, setActiveSection] = React.useState<NavSection>(() =>
    getSectionFromHash()
  );

  React.useEffect(() => {
    const handleHistoryChange = () => {
      const section = getSectionFromHash();
      setActiveSection(section);
      if (section === "home") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("popstate", handleHistoryChange);
    window.addEventListener("hashchange", handleHistoryChange);

    return () => {
      window.removeEventListener("popstate", handleHistoryChange);
      window.removeEventListener("hashchange", handleHistoryChange);
    };
  }, []);

  const handleNavSelect = (section: NavSection) => {
    setActiveSection(section);
    const targetHash = section === "home" ? "" : `#${section}`;
    const currentHash = window.location.hash;

    if (currentHash !== targetHash) {
      window.history.pushState(
        { section },
        "",
        targetHash || window.location.pathname
      );
    }

    if (section === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const currentTab: ActiveTab =
    activeSection === "home" ? "triage" : (activeSection as ActiveTab);

  return (
    <AppShell activeSection={activeSection} onNavigate={handleNavSelect}>
      {activeSection === "home" ? (
        <div className="w-full space-y-12 animate-in fade-in-50 duration-180">
          <HeroSection
            onStartAssessment={() => handleNavSelect("triage")}
            onExploreFeatures={() => {
              const el = document.getElementById("metrics-summary");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          <section id="metrics-summary" className="w-full space-y-4 pt-6 border-t border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  Clinical Workspace Overview
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Real-time session status, red-flag safety screening, and nearby healthcare facilities.
                </p>
              </div>
            </div>

            <DashboardSummaryCards onSelectTab={(tab) => handleNavSelect(tab as NavSection)} />
          </section>

          {/* Rapid Clinical Workflows */}
          <section className="w-full space-y-4 pt-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                Rapid Clinical Workflows
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Direct access to specialized assessment tools and healthcare records.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                type="button"
                onClick={() => handleNavSelect("triage")}
                className="p-4 rounded-xl border border-border bg-card text-left transition-colors hover:border-accent/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer"
              >
                <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <Activity className="size-4.5 stroke-[1.75]" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Symptom Assessment</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Interactive consultation with deterministic safety rules and clinical guidance.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleNavSelect("vision")}
                className="p-4 rounded-xl border border-border bg-card text-left transition-colors hover:border-accent/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer"
              >
                <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <Camera className="size-4.5 stroke-[1.75]" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Symptom Vision</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Multimodal visual analysis for visible rashes, cuts, burns, or injuries.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleNavSelect("medication")}
                className="p-4 rounded-xl border border-border bg-card text-left transition-colors hover:border-accent/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer"
              >
                <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <Pill className="size-4.5 stroke-[1.75]" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Medication Scan</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Extract ingredients, safety warnings, and standard dosage indications.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleNavSelect("hospitals")}
                className="p-4 rounded-xl border border-border bg-card text-left transition-colors hover:border-accent/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group cursor-pointer"
              >
                <div className="size-9 rounded-lg bg-accent/10 text-accent flex items-center justify-center border border-accent/20 mb-3 group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                  <MapPin className="size-4.5 stroke-[1.75]" />
                </div>
                <h4 className="text-sm font-semibold text-foreground">Hospital Locator</h4>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  Live coordinates-based map with verified emergency care and directions.
                </p>
              </button>
            </div>
          </section>

          <Footer onNavigate={handleNavSelect} />
        </div>
      ) : (
        <div className="w-full space-y-8 animate-in fade-in-50 duration-180">
          <DashboardView
            activeTab={currentTab}
            onTabChange={(tab) => handleNavSelect(tab as NavSection)}
            showTabsHeader={false}
          />
          <Footer onNavigate={handleNavSelect} />
        </div>
      )}
    </AppShell>
  );
}
