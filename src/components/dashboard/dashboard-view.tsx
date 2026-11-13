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
    title: "Clinical Symptom Assessment",
    subtitle:
      "Interactive symptom consultation with deterministic safety screening and supportive care guidance.",
  },
  vision: {
    title: "Symptom Vision Analysis",
    subtitle:
      "Inspect visible injuries, rashes, cuts, and burns with multimodal clinical vision models.",
  },
  medication: {
    title: "Medication & Prescription Scan",
    subtitle:
      "Extract active ingredients, standard dosing guidelines, and safety precautions from medication labels.",
  },
  hospitals: {
    title: "Nearby Healthcare Facilities",
    subtitle:
      "Coordinate-based hospital locator with verified emergency departments and turn-by-turn routing.",
  },
  history: {
    title: "Assessment History Timeline",
    subtitle:
      "Confidential historical clinical records with diagnostic reasoning summaries and PDF exports.",
  },
  profile: {
    title: "Patient Health Profile",
    subtitle:
      "Confidential medical context, pre-existing conditions, and AI personalization consent.",
  },
  contacts: {
    title: "Designated Emergency Contacts",
    subtitle:
      "Rapid one-tap calling contacts surfaced during critical and red-flag emergency screening.",
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
