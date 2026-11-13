"use client";

import * as React from "react";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { Navbar, NavSection } from "@/components/shared/navbar";
import { EmergencyFloatingButton } from "@/components/emergency/emergency-floating-button";
import { DashboardView, ActiveTab } from "@/components/dashboard/dashboard-view";
import { HeroSection } from "@/components/landing/hero-section";

export default function Home() {
  const [activeSection, setActiveSection] = React.useState<NavSection>("home");
  const triageContainerRef = React.useRef<HTMLDivElement>(null);

  const handleStartAssessment = () => {
    setActiveSection("triage");
    setTimeout(() => {
      triageContainerRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  const handleExploreFeatures = () => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleNavSelect = (section: NavSection) => {
    setActiveSection(section);
    if (section === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setTimeout(() => {
        triageContainerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  // Map NavSection to ActiveTab in DashboardView
  const currentTab: ActiveTab =
    activeSection === "home" ? "triage" : (activeSection as ActiveTab);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* 1. Persistent Medical Disclaimer Banner */}
      <DisclaimerBanner />

      {/* 2. Redesigned Sticky SaaS Navigation Bar */}
      <Navbar
        activeSection={activeSection}
        onNavigate={handleNavSelect}
      />

      {/* 3. Main Content Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-6xl mx-auto space-y-10">
        {/* Landing Page Experience (Hero, Trust Section & How It Works) */}
        {activeSection === "home" && (
          <HeroSection
            onStartAssessment={handleStartAssessment}
            onExploreFeatures={handleExploreFeatures}
          />
        )}

        {/* Core Product Experience (Triage Chat, Vision, Hospitals, History, Profile) */}
        <div ref={triageContainerRef} className="w-full pt-2">
          <DashboardView
            activeTab={currentTab}
            onTabChange={(tab) => setActiveSection(tab as NavSection)}
            showTabsHeader={activeSection !== "home"}
          />
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="w-full border-t border-border/50 bg-muted/20 py-8 px-4 text-center text-xs text-muted-foreground space-y-2 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-semibold text-foreground">
            TriageAI • Clinical Emergency &amp; Symptom Triage
          </div>
          <div className="text-[11px] text-muted-foreground">
            Educational Guidance Only • Always Consult a Healthcare Professional
          </div>
        </div>
      </footer>

      {/* 5. Persistent SOS Floating Button */}
      <EmergencyFloatingButton />
    </div>
  );
}
