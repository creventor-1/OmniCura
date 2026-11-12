import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { EmergencyFloatingButton } from "@/components/emergency/emergency-floating-button";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { HeartPulse } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Persistent Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Main App Navigation / Header */}
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <HeartPulse className="size-5" />
            </div>
            <span>TriageAI</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 w-full max-w-5xl mx-auto">
        <DashboardView />
      </main>

      {/* Persistent SOS Emergency Button */}
      <EmergencyFloatingButton />
    </div>
  );
}
