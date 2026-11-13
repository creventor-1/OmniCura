"use client";

import * as React from "react";
import {
  Clock,
  ShieldAlert,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileDown,
  Calendar,
  Activity,
  HeartPulse,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { StoredAssessment } from "@/types/database";
import { AssessmentResponse } from "@/schemas/triage";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";

interface AssessmentHistoryViewProps {
  onStartAssessment?: () => void;
}

export function AssessmentHistoryView({ onStartAssessment }: AssessmentHistoryViewProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [assessments, setAssessments] = React.useState<StoredAssessment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    async function fetchHistory() {
      if (!user) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("assessments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (active && !error && data) {
          setAssessments((data as StoredAssessment[]) || []);
        }
      } catch (err) {
        console.warn("[ASSESSMENT_HISTORY_EXCEPTION]", err);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchHistory();
    return () => {
      active = false;
    };
  }, [user, supabase]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment record?")) return;

    try {
      await supabase.from("assessments").delete().eq("id", id);
      setAssessments((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("Failed to delete assessment record:", e);
    }
  };

  const formatDateString = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
      };
    } catch {
      return { date: iso, time: "" };
    }
  };

  if (!user) {
    return (
      <EmptyState
        icon={Activity}
        title="Sign In to View Assessment History"
        description="Registered users can securely review their past symptom assessments, view clinical reasoning, and download verified PDF triage reports."
        actionLabel="Start New Assessment"
        onAction={onStartAssessment}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-border/70 p-4 space-y-3 bg-card">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-32 rounded-md" />
              </div>
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No Previous Assessments Found"
        description="You haven't completed a symptom assessment yet. Run a triage session to get educational first-aid steps and record history."
        actionLabel="Start Assessment"
        onAction={onStartAssessment}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <span>Clinical Assessment History</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Timeline of past triage sessions, urgency categorizations, and supportive care plans.
          </p>
        </div>

        <Badge variant="outline" className="text-xs font-semibold px-3 py-1 rounded-full self-start sm:self-auto">
          {assessments.length} {assessments.length === 1 ? "Record" : "Records"}
        </Badge>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-primary/40 before:via-border before:to-transparent">
        {assessments.map((item) => {
          const isExpanded = expandedId === item.id;
          const result = item.assessment_result as unknown as AssessmentResponse;
          const { date, time } = formatDateString(item.created_at);

          const badgeConfig = {
            "non-urgent": {
              style: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
              dot: "bg-emerald-500",
            },
            urgent: {
              style: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
              dot: "bg-amber-500",
            },
            emergency: {
              style: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
              dot: "bg-red-500 animate-ping",
            },
          }[item.severity] || {
            style: "bg-muted text-muted-foreground border-border",
            dot: "bg-primary",
          };

          return (
            <div key={item.id} className="relative group">
              {/* Timeline Marker Dot */}
              <div
                className={`absolute -left-6 sm:-left-8 top-4 size-4 sm:size-5 rounded-full border-2 border-background shadow-xs flex items-center justify-center transition-transform group-hover:scale-125 ${badgeConfig.dot}`}
              />

              {/* Assessment Timeline Card */}
              <Card className="rounded-2xl border border-border/80 bg-card overflow-hidden transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${badgeConfig.style}`}
                      >
                        {item.severity}
                      </Badge>

                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Calendar className="size-3" />
                        {date} • {time}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                      &ldquo;{item.symptoms}&rdquo;
                    </p>
                  </div>

                  {/* Actions & Expand Chevron */}
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateTriagePdfReport({
                          assessment: result,
                          symptoms: item.symptoms,
                          date: item.created_at,
                          userEmail: user?.email,
                        });
                      }}
                      className="h-8 text-xs gap-1.5 rounded-lg border-border/80 text-foreground hover:bg-primary/10 hover:text-primary"
                      title="Download PDF Summary Report"
                    >
                      <FileDown className="size-3.5" />
                      <span className="hidden sm:inline">PDF Report</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete record"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground"
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                    >
                      {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && result && (
                  <CardContent className="pt-3 pb-5 px-4 sm:px-5 border-t border-border/50 bg-muted/20 space-y-4 text-xs leading-relaxed animate-in fade-in-50 duration-150">
                    {/* Recommended Action (Highlighted First) */}
                    <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-primary font-bold">
                        <Sparkles className="size-3.5" />
                        <span>Recommended Clinical Action</span>
                      </div>
                      <p className="text-foreground text-xs leading-relaxed pl-5 font-medium">
                        {result.recommendedAction}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Clinical Rationale */}
                      <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                        <h5 className="font-bold text-foreground flex items-center gap-1.5">
                          <HeartPulse className="size-3.5 text-primary" />
                          <span>Triage Rationale</span>
                        </h5>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {result.severityReasoning}
                        </p>
                      </div>

                      {/* Possible Considerations */}
                      {result.possibleConditions && result.possibleConditions.length > 0 && (
                        <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                          <h5 className="font-bold text-foreground flex items-center gap-1.5">
                            <Activity className="size-3.5 text-primary" />
                            <span>Possible Considerations (Non-Diagnostic)</span>
                          </h5>
                          <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
                            {result.possibleConditions.map((cond, i) => (
                              <li key={i}>{cond}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Disclaimer Note */}
                    <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ShieldAlert className="size-3.5 shrink-0 text-amber-500" />
                      <span>{item.disclaimer || "Educational triage summary. Consult a certified medical doctor for diagnosis."}</span>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
