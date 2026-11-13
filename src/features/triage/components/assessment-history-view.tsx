"use client";

import * as React from "react";
import {
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileDown,
  Calendar,
  Activity,
  Sparkles,
  Search,
  Share2,
  Check,
  Eye,
  Filter,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuth } from "@/features/authentication/context/auth-context";
import { createClient } from "@/services/database/supabase/client";
import { StoredAssessment } from "@/types/database";
import { AssessmentResponse } from "@/schemas/triage";
import { generateTriagePdfReport } from "@/services/pdf/generate-report";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { AIResultPanel } from "@/components/assessment/ai-result-panel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssessmentHistoryViewProps {
  onStartAssessment?: () => void;
}

export const GUEST_ASSESSMENTS_KEY = "omnicura_guest_assessments";

export function AssessmentHistoryView({
  onStartAssessment,
}: AssessmentHistoryViewProps) {
  const { user } = useAuth();
  const supabase = React.useMemo(() => createClient(), []);

  const [assessments, setAssessments] = React.useState<StoredAssessment[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedSeverity, setSelectedSeverity] = React.useState<string>("all");

  // View Details Dialog modal
  const [detailsAssessment, setDetailsAssessment] = React.useState<StoredAssessment | null>(null);

  // Share feedback state
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Pagination state
  const [displayCount, setDisplayCount] = React.useState(5);

  React.useEffect(() => {
    let active = true;

    async function fetchHistory() {
      // 1. Check local guest storage first
      let localRecords: StoredAssessment[] = [];
      try {
        const stored = localStorage.getItem(GUEST_ASSESSMENTS_KEY);
        if (stored) {
          localRecords = JSON.parse(stored);
        }
      } catch {
        // ignore
      }

      if (!user) {
        if (active) {
          setAssessments(localRecords);
          setIsLoading(false);
        }
        return;
      }

      // 2. Load from Supabase if logged in
      try {
        const { data, error } = await supabase
          .from("assessments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (active) {
          if (!error && data) {
            // Combine with local records if any
            const combined = [...(data as StoredAssessment[]), ...localRecords.filter(l => !data.some(d => d.id === l.id))];
            setAssessments(combined);
          } else {
            setAssessments(localRecords);
          }
        }
      } catch (err) {
        console.warn("[ASSESSMENT_HISTORY_EXCEPTION]", err);
        if (active) setAssessments(localRecords);
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
      if (user && !deleteId.startsWith("guest-")) {
        await supabase.from("assessments").delete().eq("id", deleteId);
      }
      // Also delete from local guest storage if present
      try {
        const stored = localStorage.getItem(GUEST_ASSESSMENTS_KEY);
        if (stored) {
          const list: StoredAssessment[] = JSON.parse(stored);
          const filtered = list.filter((a) => a.id !== deleteId);
          localStorage.setItem(GUEST_ASSESSMENTS_KEY, JSON.stringify(filtered));
        }
      } catch {
        // ignore
      }

      setAssessments((prev) => prev.filter((a) => a.id !== deleteId));
    } catch (e) {
      console.error("Failed to delete assessment record:", e);
    } finally {
      setDeleteId(null);
    }
  };

  const handleShare = async (item: StoredAssessment) => {
    const result = item.assessment_result as AssessmentResponse | null;
    const { date, time } = formatDateString(item.created_at);

    const shareText = `Omnicura Clinical Assessment Record (${date} at ${time})
Symptoms: ${item.symptoms}
Severity: ${item.severity.toUpperCase()}
Recommended Action: ${result?.recommendedAction || "Consult physician."}
Educational summary provided by Omnicura Decision Support.`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      // ignore
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

  // Filtered and searched assessments
  const filteredAssessments = React.useMemo(() => {
    return assessments.filter((item) => {
      // Severity filter
      if (selectedSeverity !== "all" && item.severity !== selectedSeverity) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const symptomsMatch = item.symptoms.toLowerCase().includes(query);
        const result = item.assessment_result as AssessmentResponse | null;
        const actionMatch = result?.recommendedAction?.toLowerCase().includes(query);
        const reasoningMatch = result?.severityReasoning?.toLowerCase().includes(query);
        const dateMatch = item.created_at.toLowerCase().includes(query);

        return symptomsMatch || actionMatch || reasoningMatch || dateMatch;
      }

      return true;
    });
  }, [assessments, selectedSeverity, searchQuery]);

  const displayedAssessments = filteredAssessments.slice(0, displayCount);
  const hasMore = displayCount < filteredAssessments.length;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
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
        description="Your historical symptom consultations, clinical acuity evaluations, and generated health reports will appear here automatically."
        actionLabel="Start Symptom Assessment"
        onAction={onStartAssessment}
      />
    );
  }

  const targetItem = assessments.find((a) => a.id === deleteId);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Accessible Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Assessment Record"
        description={
          targetItem
            ? `Are you sure you want to permanently delete the clinical assessment record for "${targetItem.symptoms.slice(0, 45)}..."? This action cannot be undone.`
            : "Are you sure you want to permanently delete this clinical assessment from your records? This action cannot be undone."
        }
        confirmLabel="Delete Record"
      />

      {/* Full Details Modal Dialog */}
      {detailsAssessment && (
        <Dialog
          open={!!detailsAssessment}
          onOpenChange={(open) => !open && setDetailsAssessment(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-5 sm:p-6">
            <DialogHeader className="pb-3 border-b border-border">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <Activity className="size-4.5 text-accent" />
                  <span>Clinical Encounter Details</span>
                </DialogTitle>
                <SeverityBadge severity={detailsAssessment.severity} />
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Recorded on {formatDateString(detailsAssessment.created_at).date} at {formatDateString(detailsAssessment.created_at).time}
              </div>
            </DialogHeader>

            <div className="space-y-4 pt-3">
              {/* Primary Symptoms */}
              <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Chief Symptoms Reported
                </span>
                <p className="text-xs sm:text-sm text-foreground font-medium">
                  {detailsAssessment.symptoms}
                </p>
              </div>

              {/* Assessment Readout */}
              {detailsAssessment.assessment_result && (
                <AIResultPanel
                  assessment={detailsAssessment.assessment_result as AssessmentResponse}
                />
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(detailsAssessment)}
                  className="text-xs gap-1.5 h-8"
                >
                  {copiedId === detailsAssessment.id ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" />
                      <span>Copied Summary</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="size-3.5" />
                      <span>Share Record</span>
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    generateTriagePdfReport({
                      assessment: detailsAssessment.assessment_result as AssessmentResponse,
                      symptoms: detailsAssessment.symptoms,
                      userEmail: user?.email,
                    });
                  }}
                  className="text-xs gap-1.5 h-8"
                >
                  <FileDown className="size-3.5" />
                  <span>Export PDF</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Top Search & Filter Control Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayCount(5); // Reset pagination on search
              }}
              placeholder="Search symptoms, findings, or dates..."
              className="pl-9 h-9 text-xs sm:text-sm rounded-lg"
            />
          </div>

          {onStartAssessment && (
            <Button
              size="sm"
              onClick={onStartAssessment}
              className="rounded-lg text-xs font-semibold h-9 px-3.5 shrink-0 gap-1.5"
            >
              <Sparkles className="size-3.5" />
              <span>New Assessment</span>
            </Button>
          )}
        </div>

        {/* Acuity Filter Pills */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium mr-1 flex items-center gap-1">
              <Filter className="size-3 text-accent" />
              <span>Acuity:</span>
            </span>
            {[
              { id: "all", label: "All" },
              { id: "emergency", label: "Emergency" },
              { id: "urgent", label: "Urgent" },
              { id: "non-urgent", label: "Non-Urgent" },
            ].map((tab) => {
              const count =
                tab.id === "all"
                  ? assessments.length
                  : assessments.filter((a) => a.severity === tab.id).length;

              const isSelected = selectedSeverity === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedSeverity(tab.id);
                    setDisplayCount(5);
                  }}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1.5 font-medium cursor-pointer ${
                    isSelected
                      ? "bg-accent/10 border-accent/40 text-accent font-semibold"
                      : "bg-muted/30 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="text-[10px] tabular-nums opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          <span className="text-xs text-muted-foreground">
            Showing {Math.min(displayCount, filteredAssessments.length)} of {filteredAssessments.length}
          </span>
        </div>
      </div>

      {/* Filtered Empty State */}
      {filteredAssessments.length === 0 && (
        <div className="p-8 text-center rounded-xl border border-border bg-card space-y-2">
          <p className="text-sm font-semibold text-foreground">No matching assessments found</p>
          <p className="text-xs text-muted-foreground">
            Try adjusting your search query or switching the acuity filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedSeverity("all");
            }}
            className="text-xs mt-2"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Vertical Timeline Card List */}
      <div className="space-y-3.5">
        {displayedAssessments.map((item) => {
          const isExpanded = expandedId === item.id;
          const { date, time } = formatDateString(item.created_at);
          const result = item.assessment_result as AssessmentResponse | null;

          return (
            <div key={item.id} className="relative pl-6 sm:pl-7 group">
              {/* Timeline Connector Line */}
              <div className="absolute left-2.5 sm:left-3 top-6 bottom-0 w-0.5 bg-border/70 group-last:hidden" />

              {/* Timeline Node Dot */}
              <div className="absolute left-1 sm:left-1.5 top-4 size-3 rounded-full border-2 border-background bg-accent" />

              <Card className="rounded-xl border border-border shadow-none hover:border-accent/40 transition-colors overflow-hidden bg-card">
                <div
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={item.severity} />

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

                  {/* Actions Bar */}
                  <div
                    className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* View Details Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailsAssessment(item);
                      }}
                      className="h-8 text-xs gap-1 rounded-lg border-border px-2.5"
                      title="View Full Encounter Details"
                    >
                      <Eye className="size-3.5 text-accent" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>

                    {/* Share Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(item);
                      }}
                      className="h-8 text-xs gap-1 rounded-lg border-border px-2.5"
                      title="Copy assessment summary to clipboard"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="size-3.5 text-emerald-600" />
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="size-3.5" />
                          <span className="hidden sm:inline">Share</span>
                        </>
                      )}
                    </Button>

                    {/* PDF Export */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateTriagePdfReport({
                          assessment: result ?? {
                            severity: item.severity,
                            severityReasoning: "Historical clinical assessment record",
                            recommendedAction: "Consult physician.",
                            possibleConditions: [],
                            firstAidSteps: [],
                            warningSigns: [],
                            disclaimer: item.disclaimer || "",
                          },
                          symptoms: item.symptoms,
                          userEmail: user?.email,
                        });
                      }}
                      className="h-8 text-xs gap-1 rounded-lg border-border px-2.5"
                      title="Download PDF Summary Report"
                    >
                      <FileDown className="size-3.5" />
                      <span className="hidden sm:inline">PDF</span>
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(item.id);
                      }}
                      className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete record"
                      aria-label="Delete assessment record"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>

                    {/* Expand Chevron */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="size-8 rounded-lg text-muted-foreground"
                      aria-label={isExpanded ? "Collapse quick view" : "Expand quick view"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="size-3.5" />
                      ) : (
                        <ChevronDown className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Inline Quick Preview */}
                {isExpanded && result && (
                  <CardContent className="pt-2.5 pb-4 px-4 sm:px-5 border-t border-border bg-muted/15 space-y-3 text-xs leading-relaxed animate-in fade-in-50 duration-150">
                    <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-accent font-semibold text-xs">
                        <ArrowRight className="size-3.5" />
                        <span>Recommended Clinical Next Step:</span>
                      </div>
                      <p className="text-foreground font-medium pl-5 text-xs sm:text-sm">
                        {result.recommendedAction}
                      </p>
                    </div>

                    {result.severityReasoning && (
                      <div className="space-y-1">
                        <span className="font-semibold text-text-secondary uppercase text-[10px]">Evaluation Basis:</span>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {result.severityReasoning}
                        </p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Pagination: Load More */}
      {hasMore && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDisplayCount((prev) => prev + 5)}
            className="text-xs h-9 px-5 rounded-lg"
          >
            Load More Records ({filteredAssessments.length - displayCount} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
