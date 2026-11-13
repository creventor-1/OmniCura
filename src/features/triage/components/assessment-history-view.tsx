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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { StoredAssessment } from "@/types/database";
import { AssessmentResponse } from "@/schemas/triage";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";

interface AssessmentHistoryViewProps {
  onStartAssessment?: () => void;
}

export function AssessmentHistoryView({
  onStartAssessment,
}: AssessmentHistoryViewProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [assessments, setAssessments] = React.useState<StoredAssessment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

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

  const handleConfirmDelete = async () => {
    if (!deleteId) return;

    try {
      await supabase.from("assessments").delete().eq("id", deleteId);
      setAssessments((prev) => prev.filter((a) => a.id !== deleteId));
    } catch (e) {
      console.error("Failed to delete assessment record:", e);
    } finally {
      setDeleteId(null);
    }
  };

  const formatDateString = (iso: string) => {
    try {
      const d = new Date(iso);
      return {
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        time: d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
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
          <Skeleton className="h-6 w-48 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border p-4 space-y-3 bg-card"
            >
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
        title="No Past Assessments Found"
        description="Your historical triage assessments, clinical severity evaluations, and generated PDF reports will appear here."
        actionLabel="Start Triage Assessment"
        onAction={onStartAssessment}
      />
    );
  }

  const severityBadgeConfig = {
    "non-urgent":
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    urgent:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    emergency:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Accessible Confirmation Modal (Replaces browser confirm) */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Assessment Record"
        description="Are you sure you want to permanently delete this clinical assessment from your records? This action cannot be undone."
        confirmLabel="Delete Record"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            <span>Assessment History Timeline</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Private log of your previous clinical assessments and exported physician summaries.
          </p>
        </div>

        {onStartAssessment && (
          <Button
            size="sm"
            onClick={onStartAssessment}
            className="rounded-xl text-xs sm:text-sm font-semibold h-10 px-4 self-start sm:self-auto"
          >
            New Assessment
          </Button>
        )}
      </div>

      {/* Vertical Timeline Card List */}
      <div className="space-y-4">
        {assessments.map((item) => {
          const isExpanded = expandedId === item.id;
          const { date, time } = formatDateString(item.created_at);
          const result = item.assessment_result as AssessmentResponse | null;

          return (
            <div key={item.id} className="relative pl-6 sm:pl-8 group">
              {/* Timeline Connector Line */}
              <div className="absolute left-2.5 sm:left-3 top-6 bottom-0 w-0.5 bg-border/70 group-last:hidden" />

              {/* Timeline Node Dot */}
              <div className="absolute left-1 sm:left-1.5 top-4 size-3.5 rounded-full border-2 border-background bg-accent" />

              <Card className="rounded-xl border border-border shadow-none hover:border-accent/40 transition-colors overflow-hidden bg-card">
                <div
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          severityBadgeConfig[item.severity] || ""
                        }`}
                      >
                        {item.severity}
                      </Badge>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                        <Calendar className="size-3 text-muted-foreground" />
                        <span>{date}</span>
                        <span>•</span>
                        <span>{time}</span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-foreground line-clamp-2">
                      {item.symptoms}
                    </p>
                  </div>

                  {/* Actions & Expand Chevron */}
                  <div
                    className="flex items-center gap-2 shrink-0 self-end sm:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateTriagePdfReport({
                          assessment: result ?? {
                            severity: item.severity,
                            severityReasoning: "Historical triage record",
                            recommendedAction: "Consult physician.",
                            possibleConditions: [],
                            firstAidSteps: [],
                            warningSigns: [],
                            disclaimer: item.disclaimer || "",
                          },
                          symptoms: item.symptoms,
                          userEmail: user.email,
                        });
                      }}
                      className="h-9 text-xs sm:text-sm gap-1.5 rounded-xl border-border/80 text-foreground hover:bg-primary/10 hover:text-primary px-3"
                      title="Download PDF Summary Report"
                    >
                      <FileDown className="size-4" />
                      <span className="hidden sm:inline">PDF Report</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(item.id);
                      }}
                      className="size-9 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete record"
                      aria-label="Delete assessment record"
                    >
                      <Trash2 className="size-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="size-9 rounded-xl text-muted-foreground"
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && result && (
                  <CardContent className="pt-3 pb-5 px-4 sm:px-5 border-t border-border/50 bg-muted/20 space-y-4 text-xs sm:text-sm leading-relaxed animate-in fade-in-50 duration-150">
                    {/* Recommended Action (Highlighted First) */}
                    <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                      <div className="flex items-center gap-1.5 text-primary font-bold text-xs sm:text-sm">
                        <Sparkles className="size-4" />
                        <span>Recommended Clinical Action</span>
                      </div>
                      <p className="text-foreground text-xs sm:text-sm leading-relaxed pl-5 font-medium">
                        {result.recommendedAction}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Clinical Rationale */}
                      <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                        <h5 className="font-bold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
                          <HeartPulse className="size-4 text-primary" />
                          <span>Triage Rationale</span>
                        </h5>
                        <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                          {result.severityReasoning}
                        </p>
                      </div>

                      {/* Possible Considerations */}
                      {result.possibleConditions &&
                        result.possibleConditions.length > 0 && (
                          <div className="p-3 rounded-xl bg-card border border-border/60 space-y-1">
                            <h5 className="font-bold text-foreground flex items-center gap-1.5 text-xs sm:text-sm">
                              <Activity className="size-4 text-primary" />
                              <span>Possible Considerations (Non-Diagnostic)</span>
                            </h5>
                            <ul className="list-disc list-inside text-muted-foreground text-xs sm:text-sm space-y-0.5">
                              {result.possibleConditions.map((cond, i) => (
                                <li key={i}>{cond}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>

                    {/* Disclaimer Note */}
                    <div className="pt-2 border-t border-border/40 text-xs text-muted-foreground flex items-center gap-1.5">
                      <ShieldAlert className="size-4 shrink-0 text-amber-500" />
                      <span>
                        {item.disclaimer ||
                          "Educational triage summary. Consult a certified medical doctor for diagnosis."}
                      </span>
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
