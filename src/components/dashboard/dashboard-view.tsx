"use client";

import * as React from "react";
import {
  Activity,
  History,
  UserCheck,
  PhoneCall,
  LogIn,
  LogOut,
  User,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/authentication/context/auth-context";
import { AuthModal } from "@/features/authentication/components/auth-modal";
import { SymptomChat } from "@/features/triage/components/symptom-chat";
import { AssessmentHistoryView } from "@/features/triage/components/assessment-history-view";
import { HealthProfileForm } from "@/features/health-profile/components/health-profile-form";
import { EmergencyContactsManager } from "@/features/safety/components/emergency-contacts-manager";
import { HospitalMap } from "@/components/map/hospital-map";

type ActiveTab = "triage" | "hospitals" | "history" | "profile" | "contacts";

export function DashboardView() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("triage");
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col flex-1">
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Top Navigation & User State Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 mb-4 border-b border-border/50">
        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60 text-xs overflow-x-auto max-w-full">
          <Button
            size="sm"
            variant={activeTab === "triage" ? "default" : "ghost"}
            onClick={() => setActiveTab("triage")}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <Activity className="size-3.5" />
            Triage Chat
          </Button>

          <Button
            size="sm"
            variant={activeTab === "hospitals" ? "default" : "ghost"}
            onClick={() => setActiveTab("hospitals")}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <MapPin className="size-3.5" />
            Hospitals &amp; Clinics
          </Button>

          <Button
            size="sm"
            variant={activeTab === "history" ? "default" : "ghost"}
            onClick={() => setActiveTab("history")}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <History className="size-3.5" />
            History
          </Button>

          <Button
            size="sm"
            variant={activeTab === "profile" ? "default" : "ghost"}
            onClick={() => setActiveTab("profile")}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <UserCheck className="size-3.5" />
            Health Profile
          </Button>

          <Button
            size="sm"
            variant={activeTab === "contacts" ? "default" : "ghost"}
            onClick={() => setActiveTab("contacts")}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <PhoneCall className="size-3.5" />
            Contacts
          </Button>
        </nav>

        {/* User Account State Controls */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline-flex items-center gap-1">
                <User className="size-3" />
                {user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="h-8 text-xs gap-1.5"
                title="Sign out of account"
              >
                <LogOut className="size-3" />
                Sign Out
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAuthModalOpen(true)}
              className="h-8 text-xs gap-1.5"
            >
              <LogIn className="size-3" />
              Sign In / Register
            </Button>
          )}
        </div>
      </div>

      {/* Tab Content Rendering */}
      <div className="flex-1 w-full">
        {activeTab === "triage" && (
          <div className="space-y-4">
            <div className="text-center max-w-lg mx-auto mb-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Emergency Triage &amp; First-Aid
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Describe symptoms to receive an educational urgency assessment and supportive care steps.
              </p>
            </div>
            <SymptomChat onLocateFacilities={() => setActiveTab("hospitals")} />
          </div>
        )}

        {activeTab === "hospitals" && <HospitalMap />}
        {activeTab === "history" && <AssessmentHistoryView />}
        {activeTab === "profile" && <HealthProfileForm />}
        {activeTab === "contacts" && <EmergencyContactsManager />}
      </div>
    </div>
  );
}
