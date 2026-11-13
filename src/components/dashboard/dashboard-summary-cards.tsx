"use client";

import * as React from "react";
import {
  Activity,
  HeartPulse,
  PhoneCall,
  Clock,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { ActiveTab } from "./dashboard-view";
import { SeverityBadge } from "@/components/shared/severity-badge";

interface DashboardSummaryCardsProps {
  onSelectTab: (tab: ActiveTab) => void;
}

export function DashboardSummaryCards({
  onSelectTab,
}: DashboardSummaryCardsProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [assessmentCount, setAssessmentCount] = React.useState<number | null>(
    null
  );
  const [latestUrgency, setLatestUrgency] = React.useState<string | null>(null);
  const [hasProfile, setHasProfile] = React.useState<boolean | null>(null);
  const [contactCount, setContactCount] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;

    async function loadMetrics() {
      if (!user) {
        if (active) {
          setAssessmentCount(0);
          setLatestUrgency("Guest Session");
          setHasProfile(false);
          setContactCount(0);
          setIsLoading(false);
        }
        return;
      }

      try {
        // 1. Fetch Assessment Count & Latest Assessment
        const { data: assessments } = await supabase
          .from("assessments")
          .select("id, severity, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        // Fetch full count
        const { count } = await supabase
          .from("assessments")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        // 2. Fetch Profile status
        const { data: profile } = await supabase
          .from("health_profiles")
          .select("id, allow_ai_use")
          .eq("user_id", user.id)
          .maybeSingle();

        // 3. Fetch Contacts count
        const { count: contactsCount } = await supabase
          .from("emergency_contacts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (active) {
          setAssessmentCount(count ?? 0);
          if (assessments && assessments.length > 0) {
            setLatestUrgency(assessments[0].severity);
          } else {
            setLatestUrgency("None");
          }
          setHasProfile(!!profile);
          setContactCount(contactsCount ?? 0);
        }
      } catch (err) {
        console.warn("[DASHBOARD_METRICS_ERROR]", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadMetrics();
    return () => {
      active = false;
    };
  }, [user, supabase]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
      {/* Card 1: Assessments Completed */}
      <button
        type="button"
        onClick={() => onSelectTab("history")}
        className="rounded-xl border border-border-subtle bg-surface p-4 text-left hover:border-border-strong hover:shadow-card-hover transition-all duration-180 group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-semibold text-text-secondary">
            Assessments
          </span>
          <div className="size-7 rounded-md bg-secondary text-text-secondary flex items-center justify-center border border-border-subtle">
            <Activity className="size-3.5" />
          </div>
        </div>
        <div className="pt-3">
          <div className="text-2xl font-semibold tabular-nums text-foreground tracking-tight">
            {isLoading ? "—" : (assessmentCount ?? 0)}
          </div>
          <div className="text-xs text-text-secondary flex items-center gap-1 group-hover:text-foreground transition-colors mt-1">
            <span>Historical log</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

      {/* Card 2: Latest Urgency */}
      <button
        type="button"
        onClick={() => onSelectTab("history")}
        className="rounded-xl border border-border-subtle bg-surface p-4 text-left hover:border-border-strong hover:shadow-card-hover transition-all duration-180 group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-semibold text-text-secondary">
            Latest Urgency
          </span>
          <div className="size-7 rounded-md bg-secondary text-text-secondary flex items-center justify-center border border-border-subtle">
            <Clock className="size-3.5" />
          </div>
        </div>
        <div className="pt-3">
          <div className="text-sm font-medium truncate">
            {isLoading ? (
              "—"
            ) : latestUrgency && latestUrgency !== "None" && latestUrgency !== "Guest Session" ? (
              <SeverityBadge severity={latestUrgency} />
            ) : (
              <span className="text-xs text-text-secondary font-medium">
                {latestUrgency || "None"}
              </span>
            )}
          </div>
          <div className="text-xs text-text-secondary flex items-center gap-1 group-hover:text-foreground transition-colors mt-1.5">
            <span>Clinical status</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

      {/* Card 3: Health Profile */}
      <button
        type="button"
        onClick={() => onSelectTab("profile")}
        className="rounded-xl border border-border-subtle bg-surface p-4 text-left hover:border-border-strong hover:shadow-card-hover transition-all duration-180 group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-semibold text-text-secondary">
            Patient Bio
          </span>
          <div className="size-7 rounded-md bg-secondary text-text-secondary flex items-center justify-center border border-border-subtle">
            <HeartPulse className="size-3.5" />
          </div>
        </div>
        <div className="pt-3">
          <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
            {isLoading ? (
              "—"
            ) : hasProfile ? (
              <span className="text-success flex items-center gap-1 text-xs font-semibold">
                <ShieldCheck className="size-3.5 shrink-0" />
                Configured
              </span>
            ) : (
              <span className="text-text-secondary flex items-center gap-1 text-xs">
                <AlertTriangle className="size-3 text-warning-text shrink-0" />
                Setup Needed
              </span>
            )}
          </div>
          <div className="text-xs text-text-secondary flex items-center gap-1 group-hover:text-foreground transition-colors mt-1.5">
            <span>Medical context</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

      {/* Card 4: Emergency Contacts */}
      <button
        type="button"
        onClick={() => onSelectTab("contacts")}
        className="rounded-xl border border-border-subtle bg-surface p-4 text-left hover:border-border-strong hover:shadow-card-hover transition-all duration-180 group flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-semibold text-text-secondary">
            Emergency Contacts
          </span>
          <div className="size-7 rounded-md bg-secondary text-text-secondary flex items-center justify-center border border-border-subtle">
            <PhoneCall className="size-3.5" />
          </div>
        </div>
        <div className="pt-3">
          <div className="text-2xl font-semibold tabular-nums text-foreground tracking-tight">
            {isLoading ? "—" : (contactCount ?? 0)}
          </div>
          <div className="text-xs text-text-secondary flex items-center gap-1 group-hover:text-foreground transition-colors mt-1">
            <span>Quick-call responders</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>
    </div>
  );
}
