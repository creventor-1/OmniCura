"use client";

import * as React from "react";
import { SymptomChat } from "@/features/triage/components/symptom-chat";
import { AssessmentHistoryView } from "@/features/triage/components/assessment-history-view";
import { HealthProfileForm } from "@/features/health-profile/components/health-profile-form";
import { EmergencyContactsManager } from "@/features/safety/components/emergency-contacts-manager";
import { MapShell } from "@/components/map/map-shell";
import { ImageSymptomAnalyzer } from "@/features/vision/components/image-symptom-analyzer";
import { MedicationScanner } from "@/features/vision/components/medication-scanner";

export type ActiveTab =
  | "triage"
  | "vision"
  | "medication"
  | "hospitals"
  | "history"
  | "profile"
  | "contacts";

export interface DashboardViewProps {
  activeTab?: ActiveTab;
  onTabChange?: (tab: ActiveTab) => void;
  showTabsHeader?: boolean;
}

const tabMeta: Record<
  ActiveTab,
  {
    title: string;
    subtitle: string;
  }
> = {
  triage: {
    title: "Symptom Assessment",
    subtitle: "Interactive evaluation with safety screening and care guidance.",
  },
  vision: {
    title: "Symptom Vision",
    subtitle: "Analyze visible rashes, cuts, and burns with clinical vision.",
  },
  medication: {
    title: "Medication Scanner",
    subtitle: "Extract active ingredients, indications, and safety warnings.",
  },
  hospitals: {
    title: "Nearby Hospitals",
    subtitle: "Verified emergency facilities, direct phone lines, and routes.",
  },
  history: {
    title: "Assessment History",
    subtitle: "Past clinical consultations, triage records, and PDF exports.",
  },
  profile: {
    title: "Health Profile",
    subtitle: "Medical background, allergies, and conditions for tailored care.",
  },
  contacts: {
    title: "Emergency Contacts",
    subtitle: "Designated contacts notified during emergency situations.",
  },
};

export function DashboardView({
  activeTab: controlledTab,
  onTabChange,
}: DashboardViewProps) {
  const [internalTab, setInternalTab] = React.useState<ActiveTab>("triage");

  const activeTab = controlledTab ?? internalTab;
  const handleTabChange = (tab: ActiveTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const currentMeta = tabMeta[activeTab] || tabMeta.triage;

  return (
    <div className="w-full flex flex-col flex-1 space-y-6">
      {/* Clean Page Header per Spec (Title 24-32px semibold, Subtitle 14px regular) */}
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {currentMeta.title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {currentMeta.subtitle}
        </p>
      </div>

      {/* Tab Content Rendering with 180ms ease-out entrance */}
      <div
        key={activeTab}
        className="flex-1 w-full animate-in fade-in-50 duration-180 motion-reduce:animate-none"
      >
        {activeTab === "triage" && (
          <SymptomChat
            onLocateFacilities={() => handleTabChange("hospitals")}
            onOpenVision={() => handleTabChange("vision")}
          />
        )}

        {activeTab === "vision" && (
          <ImageSymptomAnalyzer
            onLocateFacilities={() => handleTabChange("hospitals")}
          />
        )}

        {activeTab === "medication" && <MedicationScanner />}

        {activeTab === "hospitals" && <MapShell />}

        {activeTab === "history" && (
          <AssessmentHistoryView
            onStartAssessment={() => handleTabChange("triage")}
          />
        )}

        {activeTab === "profile" && <HealthProfileForm />}

        {activeTab === "contacts" && <EmergencyContactsManager />}
      </div>
    </div>
  );
}
