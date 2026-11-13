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

interface DashboardSummaryCardsProps {
  onSelectTab: (tab: ActiveTab) => void;
}

export function DashboardSummaryCards({ onSelectTab }: DashboardSummaryCardsProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [assessmentCount, setAssessmentCount] = React.useState<number | null>(null);
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

  const urgencyPillStyles = {
    "non-urgent": "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30",
    urgent: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
    emergency: "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/30",
  }[latestUrgency?.toLowerCase() || ""] || "text-muted-foreground bg-muted border-border/50";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-5">
      {/* Card 1: Assessments Completed */}
      <button
        type="button"
        onClick={() => onSelectTab("history")}
        className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 text-left hover:border-primary/50 hover:shadow-xs transition-all group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Assessments
          </span>
          <div className="size-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Activity className="size-3.5" />
          </div>
        </div>
        <div className="pt-2">
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {isLoading ? "—" : (assessmentCount ?? 0)}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors mt-0.5">
            <span>Review past triage</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

      {/* Card 2: Latest Urgency */}
      <button
        type="button"
        onClick={() => onSelectTab("history")}
        className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 text-left hover:border-primary/50 hover:shadow-xs transition-all group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Latest Result
          </span>
          <div className="size-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="size-3.5" />
          </div>
        </div>
        <div className="pt-2">
          <div className="text-sm font-extrabold truncate">
            {isLoading ? (
              "—"
            ) : (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-bold uppercase ${urgencyPillStyles}`}
              >
                {latestUrgency || "None"}
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors mt-1">
            <span>Urgency status</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

      {/* Card 3: Health Profile */}
      <button
        type="button"
        onClick={() => onSelectTab("profile")}
        className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 text-left hover:border-primary/50 hover:shadow-xs transition-all group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Health Profile
          </span>
          <div className="size-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <HeartPulse className="size-3.5" />
          </div>
        </div>
        <div className="pt-2">
          <div className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
            {isLoading ? (
              "—"
            ) : hasProfile ? (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs sm:text-sm">
                <ShieldCheck className="size-4 shrink-0" />
                Configured
              </span>
            ) : (
              <span className="text-muted-foreground flex items-center gap-1 text-xs">
                <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                Setup Profile
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors mt-0.5">
            <span>Manage medical bio</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>

      {/* Card 4: Emergency Contacts */}
      <button
        type="button"
        onClick={() => onSelectTab("contacts")}
        className="rounded-2xl border border-border/70 bg-card p-3.5 sm:p-4 text-left hover:border-primary/50 hover:shadow-xs transition-all group flex flex-col justify-between"
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Emergency Contacts
          </span>
          <div className="size-7 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
            <PhoneCall className="size-3.5" />
          </div>
        </div>
        <div className="pt-2">
          <div className="text-xl sm:text-2xl font-black text-foreground">
            {isLoading ? "—" : (contactCount ?? 0)}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 group-hover:text-primary transition-colors mt-0.5">
            <span>Quick-call responders</span>
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </button>
    </div>
  );
}
