"use client";

import * as React from "react";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { Navbar, NavSection } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { EmergencyFloatingButton } from "@/components/emergency/emergency-floating-button";
import { DashboardView, ActiveTab } from "@/components/dashboard/dashboard-view";
import { HeroSection } from "@/components/landing/hero-section";
import { DashboardSummaryCards } from "@/components/dashboard/dashboard-summary-cards";

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
  const triageContainerRef = React.useRef<HTMLDivElement>(null);

  // URL Hash Routing & Browser History (Back / Forward button support)
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
    } else {
      setTimeout(() => {
        triageContainerRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  const handleStartAssessment = () => {
    handleNavSelect("triage");
  };

  const handleExploreFeatures = () => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Map NavSection to ActiveTab in DashboardView
  const currentTab: ActiveTab =
    activeSection === "home" ? "triage" : (activeSection as ActiveTab);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary">
      {/* 1. Persistent Medical Disclaimer Banner */}
      <DisclaimerBanner />

      {/* 2. Redesigned Sticky SaaS Navigation Bar (Unified 8-Item Nav) */}
      <Navbar activeSection={activeSection} onNavigate={handleNavSelect} />

      {/* 3. Main Content Container */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-6xl mx-auto space-y-10">
        {/* Landing Page Experience (Hero, Trust Section & How It Works) */}
        {activeSection === "home" && (
          <div className="w-full space-y-10 animate-in fade-in-50 duration-200">
            <HeroSection
              onStartAssessment={handleStartAssessment}
              onExploreFeatures={handleExploreFeatures}
            />

            {/* Live Metrics Overview Section on Landing Page */}
            <section className="w-full space-y-3 pt-4 border-t border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                    Live Session &amp; Health Records Summary
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Real-time clinical metrics, previous assessments, and emergency responder status.
                  </p>
                </div>
              </div>
              <DashboardSummaryCards onSelectTab={(tab) => handleNavSelect(tab as NavSection)} />
            </section>
          </div>
        )}

        {/* Core Product Experience (Triage Chat, Vision, Hospitals, History, Profile, Contacts) */}
        <div ref={triageContainerRef} className="w-full pt-2">
          <DashboardView
            activeTab={currentTab}
            onTabChange={(tab) => handleNavSelect(tab as NavSection)}
            showTabsHeader={activeSection !== "home"}
          />
        </div>
      </main>

      {/* 4. Rich Healthcare SaaS Footer */}
      <Footer onNavigate={handleNavSelect} />

      {/* 5. Persistent SOS Floating Button */}
      <EmergencyFloatingButton />
    </div>
  );
}
