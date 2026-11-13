"use client";

import * as React from "react";
import {
  Activity,
  History,
  UserCheck,
  PhoneCall,
  MapPin,
  Camera,
  Pill,
  ChevronRight,
} from "lucide-react";
import { SymptomChat } from "@/features/triage/components/symptom-chat";
import { AssessmentHistoryView } from "@/features/triage/components/assessment-history-view";
import { HealthProfileForm } from "@/features/health-profile/components/health-profile-form";
import { EmergencyContactsManager } from "@/features/safety/components/emergency-contacts-manager";
import { HospitalMap } from "@/components/map/hospital-map";
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
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  triage: {
    title: "Clinical Emergency Triage",
    subtitle:
      "Interactive assessment with deterministic red-flag screening and supportive care guidance.",
    icon: Activity,
  },
  vision: {
    title: "Symptom Vision Analysis",
    subtitle:
      "Inspect visible injuries, rashes, cuts, and burns with computer vision models.",
    icon: Camera,
  },
  medication: {
    title: "Medication & Prescription Scan",
    subtitle:
      "Extract active ingredients, standard dosing guidelines, and safety precautions from medication labels.",
    icon: Pill,
  },
  hospitals: {
    title: "Nearby Healthcare Facilities",
    subtitle:
      "Coordinate-based hospital locator with verified emergency departments and turn-by-turn routing.",
    icon: MapPin,
  },
  history: {
    title: "Assessment History Timeline",
    subtitle:
      "Confidential historical triage records with clinical reasoning summaries and PDF exports.",
    icon: History,
  },
  profile: {
    title: "Patient Health Profile",
    subtitle:
      "Confidential medical context, pre-existing conditions, and AI personalization consent.",
    icon: UserCheck,
  },
  contacts: {
    title: "Designated Emergency Contacts",
    subtitle:
      "Rapid one-tap calling contacts surfaced during critical and red-flag emergency screening.",
    icon: PhoneCall,
  },
};

export function DashboardView({
  activeTab: controlledTab,
  onTabChange,
  showTabsHeader = false,
}: DashboardViewProps) {
  const [internalTab, setInternalTab] = React.useState<ActiveTab>("triage");

  const activeTab = controlledTab ?? internalTab;
  const handleTabChange = (tab: ActiveTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  const currentMeta = tabMeta[activeTab] || tabMeta.triage;
  const CurrentIcon = currentMeta.icon;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col flex-1">
      {/* Clean Contextual Section Header (Replaces the duplicate secondary navbar) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-border/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>TriageAI Workspace</span>
            <ChevronRight className="size-3" />
            <span className="text-primary font-bold flex items-center gap-1.5">
              <CurrentIcon className="size-3.5" />
              <span>{currentMeta.title}</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
            {currentMeta.title}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {currentMeta.subtitle}
          </p>
        </div>

        {/* Quick View Switcher Pills (Secondary fast jump without duplicate nav row) */}
        {showTabsHeader && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/50 self-start sm:self-auto overflow-x-auto max-w-full text-xs">
            <button
              type="button"
              onClick={() => handleTabChange("triage")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeTab === "triage"
                  ? "bg-background text-primary shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("vision")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeTab === "vision"
                  ? "bg-background text-primary shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Vision
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("hospitals")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeTab === "hospitals"
                  ? "bg-background text-primary shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Hospitals
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("history")}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                activeTab === "history"
                  ? "bg-background text-primary shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History
            </button>
          </div>
        )}
      </div>

      {/* Tab Content Rendering with Smooth Page Transition */}
      <div
        key={activeTab}
        className="flex-1 w-full animate-in fade-in-50 duration-200 slide-in-from-bottom-2 motion-reduce:animate-none"
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

        {activeTab === "hospitals" && <HospitalMap />}

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
