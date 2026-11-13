"use client";

import * as React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { NavSection } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
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
            onExploreFeatures={() => handleNavSelect("hospitals")}
            onSelectTool={handleNavSelect}
          />

          <section id="metrics-summary" className="w-full space-y-4 pt-4 border-t border-border">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Session Overview
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time metrics, patient profile context, and emergency contacts.
              </p>
            </div>

            <DashboardSummaryCards onSelectTab={(tab) => handleNavSelect(tab as NavSection)} />
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
