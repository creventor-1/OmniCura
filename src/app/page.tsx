"use client";

import * as React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { NavSection } from "@/components/shared/navbar";
import { Footer } from "@/components/shared/footer";
import { DashboardView, ActiveTab } from "@/components/dashboard/dashboard-view";
import { Overview } from "@/components/dashboard/overview";

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
      window.scrollTo({ top: 0 });
    };

    window.addEventListener("popstate", handleHistoryChange);
    window.addEventListener("hashchange", handleHistoryChange);

    return () => {
      window.removeEventListener("popstate", handleHistoryChange);
      window.removeEventListener("hashchange", handleHistoryChange);
    };
  }, []);

  const handleNavSelect = React.useCallback((section: NavSection) => {
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

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <AppShell activeSection={activeSection} onNavigate={handleNavSelect}>
      <div key={activeSection} className="w-full animate-rise">
        {activeSection === "home" ? (
          <Overview onNavigate={handleNavSelect} />
        ) : (
          <DashboardView
            activeTab={activeSection as ActiveTab}
            onTabChange={(tab) => handleNavSelect(tab as NavSection)}
            showTabsHeader={false}
          />
        )}
        <Footer onNavigate={handleNavSelect} />
      </div>
    </AppShell>
  );
}
