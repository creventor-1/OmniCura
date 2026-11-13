"use client";

import * as React from "react";
import { SymptomChat } from "@/features/triage/components/symptom-chat";
import { AssessmentHistoryView } from "@/features/triage/components/assessment-history-view";
import { HealthProfileForm } from "@/features/health-profile/components/health-profile-form";
import { EmergencyContactsManager } from "@/features/safety/components/emergency-contacts-manager";
import { MapShell } from "@/components/map/map-shell";
import { ImageSymptomAnalyzer } from "@/features/vision/components/image-symptom-analyzer";
import { MedicationScanner } from "@/features/vision/components/medication-scanner";
import { PageHeader } from "@/components/system/page-header";
import { NAV_ITEMS } from "@/components/shell/nav-config";

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

const tabMeta: Record<ActiveTab, { eyebrow: string; title: string; subtitle: string }> = {
  triage: {
    eyebrow: "Clinical tools",
    title: "Symptom Assessment",
    subtitle: "A guided clinical conversation with real-time red-flag screening and an acuity recommendation.",
  },
  vision: {
    eyebrow: "Clinical tools",
    title: "Symptom Vision",
    subtitle: "Upload a photo of a visible symptom for an educational visual assessment and first-aid guidance.",
  },
  medication: {
    eyebrow: "Clinical tools",
    title: "Medication Scan",
    subtitle: "Identify medication packaging and review its purpose, cautions and interactions.",
  },
  hospitals: {
    eyebrow: "Care network",
    title: "Hospital Locator",
    subtitle: "Verified emergency departments and clinics near you, with routing and one-tap calling.",
  },
  history: {
    eyebrow: "Patient record",
    title: "Assessment History",
    subtitle: "Every completed consultation with its acuity, recommendation and exportable report.",
  },
  profile: {
    eyebrow: "Patient record",
    title: "Health Profile",
    subtitle: "Medical background Omnicura uses to personalise assessments and flag risks.",
  },
  contacts: {
    eyebrow: "Patient record",
    title: "Emergency Contacts",
    subtitle: "Trusted people and clinicians you can reach with one tap during an emergency.",
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

  const meta = tabMeta[activeTab] || tabMeta.triage;
  const icon = NAV_ITEMS[activeTab]?.icon;

  return (
    <div className="w-full flex flex-col flex-1 gap-7">
      <PageHeader eyebrow={meta.eyebrow} title={meta.title} description={meta.subtitle} icon={icon} />

      <div key={activeTab} className="flex-1 w-full">
        {activeTab === "triage" && (
          <SymptomChat
            onLocateFacilities={() => handleTabChange("hospitals")}
            onOpenVision={() => handleTabChange("vision")}
          />
        )}

        {activeTab === "vision" && (
          <ImageSymptomAnalyzer onLocateFacilities={() => handleTabChange("hospitals")} />
        )}

        {activeTab === "medication" && <MedicationScanner />}

        {activeTab === "hospitals" && <MapShell />}

        {activeTab === "history" && (
          <AssessmentHistoryView onStartAssessment={() => handleTabChange("triage")} />
        )}

        {activeTab === "profile" && <HealthProfileForm />}

        {activeTab === "contacts" && <EmergencyContactsManager />}
      </div>
    </div>
  );
}
