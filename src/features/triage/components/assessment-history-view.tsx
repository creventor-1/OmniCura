"use client";

import * as React from "react";
import {
  ClipboardList,
  Trash2,
  ChevronDown,
  FileDown,
  Search,
  Share2,
  Check,
  Eye,
  Plus,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
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
import { VerificationBadge } from "@/components/verification/verification-badge";
import { ShareWithDoctorButton } from "@/components/sharing/share-with-doctor-modal";
import { computeAssessmentHash } from "@/services/crypto/record-hasher";
import { SegmentedShare } from "@/components/system/charts";
import { ACUITY, ACUITY_ORDER, getAcuity } from "@/lib/acuity";
import { getDayGroup } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Re-hashes a stored record and compares it with its registered hash.
 * Legacy guest records were hashed with "anonymous-patient" while stored as
 * "guest", so both ids are accepted for guests.
 */
function checkRecordIntegrity(item: StoredAssessment): {
  recordHash: string | undefined;
  status: "tampered" | "pending" | "unverified";
} {
  const result = item.assessment_result as AssessmentResponse | null;
  if (!result) return { recordHash: item.record_hash, status: "unverified" };
  const hashFor = (patientId: string) =>
    computeAssessmentHash({ patientId, symptoms: item.symptoms, assessment: result, timestamp: item.created_at });
  if (!item.record_hash) return { recordHash: hashFor(item.user_id || "anonymous-patient"), status: "unverified" };
  const candidates = [item.user_id || "anonymous-patient"];
  if (item.user_id === "guest") candidates.push("anonymous-patient");
  const matches = candidates.some((pid) => {
    try {
      return hashFor(pid) === item.record_hash;
    } catch {
      return false;
    }
  });
  return { recordHash: item.record_hash, status: matches ? "pending" : "tampered" };
}

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

  const exportPdf = (item: StoredAssessment) => {
    const result = item.assessment_result as AssessmentResponse | null;
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
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-[132px] w-full rounded-[20px]" />
        <Skeleton className="h-12 w-full rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No assessments yet"
        description="Completed symptom consultations appear here with their acuity level, recommended next step and a downloadable clinical report."
        actionLabel="Start symptom assessment"
        onAction={onStartAssessment}
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2 text-left">
          {ACUITY_ORDER.map((id) => {
            const a = ACUITY[id];
            const Icon = a.icon;
            return (
              <div key={id} className="rounded-xl border border-border-subtle bg-subtle p-3">
                <Icon className={cn("size-4", a.text)} aria-hidden="true" />
                <div className="mt-2 text-xs font-semibold text-foreground">{a.label}</div>
                <div className="text-[11px] text-text-tertiary">{a.timeframe}</div>
              </div>
            );
          })}
        </div>
      </EmptyState>
    );
  }

  const targetItem = assessments.find((a) => a.id === deleteId);
  const counts = ACUITY_ORDER.map((id) => ({ id, value: assessments.filter((a) => a.severity === id).length }));

  // Group the visible page by day bucket, preserving order
  const groups: { label: string; items: StoredAssessment[] }[] = [];
  for (const item of displayedAssessments) {
    const label = getDayGroup(item.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  const filterTabs = [
    { id: "all", label: "All" },
    { id: "emergency", label: "Emergency" },
    { id: "urgent", label: "Urgent" },
    { id: "non-urgent", label: "Non-urgent" },
  ];

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleConfirmDelete}
        title="Delete this record?"
        description={
          targetItem
            ? `The assessment for "${targetItem.symptoms.slice(0, 60)}${targetItem.symptoms.length > 60 ? "…" : ""}" will be permanently removed. This cannot be undone.`
            : "This clinical assessment will be permanently removed from your records. This cannot be undone."
        }
        confirmLabel="Delete record"
      />

      {detailsAssessment && (
        <Dialog open={!!detailsAssessment} onOpenChange={(open) => !open && setDetailsAssessment(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader className="gap-1.5 pr-8">
              <p className="type-overline text-text-tertiary">Clinical encounter</p>
              <DialogTitle className="text-xl">{detailsAssessment.symptoms}</DialogTitle>
              <DialogDescription>
                Recorded {formatDateString(detailsAssessment.created_at).date} at {formatDateString(detailsAssessment.created_at).time}
              </DialogDescription>
            </DialogHeader>

            {detailsAssessment.assessment_result ? (
              <AIResultPanel
                assessment={detailsAssessment.assessment_result as AssessmentResponse}
                layout="stack"
                recordHash={checkRecordIntegrity(detailsAssessment).recordHash}
                integrityStatus={checkRecordIntegrity(detailsAssessment).status}
                zcashTxid={detailsAssessment.zcash_txid}
                zcashBlockHeight={detailsAssessment.zcash_block_height}
                verifiedAt={detailsAssessment.verified_at || detailsAssessment.created_at}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-subtle p-4">
                <SeverityBadge severity={detailsAssessment.severity} />
                <span className="text-sm text-text-secondary">No structured result stored for this record.</span>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2.5 border-t border-border-subtle pt-4 sm:flex-row sm:justify-end">
              {detailsAssessment.assessment_result && (
                <ShareWithDoctorButton
                  recordId={detailsAssessment.id}
                  symptoms={detailsAssessment.symptoms}
                  assessment={detailsAssessment.assessment_result as AssessmentResponse}
                  patientId={detailsAssessment.user_id}
                  recordHash={detailsAssessment.record_hash}
                  zcashTxid={detailsAssessment.zcash_txid}
                  zcashBlockHeight={detailsAssessment.zcash_block_height}
                  verifiedAt={detailsAssessment.verified_at || detailsAssessment.created_at}
                />
              )}
              <Button variant="outline" onClick={() => handleShare(detailsAssessment)}>
                {copiedId === detailsAssessment.id ? (
                  <>
                    <Check className="text-success" />
                    Summary copied
                  </>
                ) : (
                  <>
                    <Share2 className="text-text-tertiary" />
                    Copy summary
                  </>
                )}
              </Button>
              <Button onClick={() => exportPdf(detailsAssessment)}>
                <FileDown />
                Export PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Summary */}
      <section className="grid grid-cols-1 gap-5 rounded-[20px] border border-border-subtle bg-surface p-6 shadow-xs md:grid-cols-12 md:items-center">
        <div className="md:col-span-4">
          <p className="text-[13px] font-medium text-text-secondary">Total records</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-heading text-4xl font-semibold tracking-[-0.03em] text-foreground">{assessments.length}</span>
            <span className="text-[13px] text-text-tertiary">{user ? "synced to your account" : "on this device"}</span>
          </div>
        </div>
        <div className="md:col-span-8 md:border-l md:border-border-subtle md:pl-6">
          <SegmentedShare
            data={counts.map(({ id, value }) => ({
              key: id,
              label: ACUITY[id].label,
              value,
              colorClass: ACUITY[id].solid,
              icon: ACUITY[id].icon,
              iconClass: ACUITY[id].text,
            }))}
            className="[&_ul]:grid [&_ul]:grid-cols-1 [&_ul]:gap-x-6 xl:[&_ul]:grid-cols-3"
          />
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setDisplayCount(5);
            }}
            placeholder="Search symptoms, findings or dates…"
            aria-label="Search assessment history"
            className="h-10 w-full rounded-[10px] border border-border-subtle bg-surface pl-10 pr-9 text-sm text-foreground shadow-xs outline-none transition-[border-color,box-shadow] placeholder:text-text-tertiary hover:border-border-strong focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-text-tertiary hover:bg-muted hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center overflow-x-auto rounded-xl bg-muted p-1" role="group" aria-label="Filter by acuity">
            {filterTabs.map((tab) => {
              const count =
                tab.id === "all" ? assessments.length : assessments.filter((a) => a.severity === tab.id).length;
              const isSelected = selectedSeverity === tab.id;
              const acuity = getAcuity(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedSeverity(tab.id);
                    setDisplayCount(5);
                  }}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[13px] transition-all cursor-pointer",
                    isSelected ? "bg-surface font-semibold text-foreground shadow-sm" : "font-medium text-text-secondary hover:text-foreground"
                  )}
                >
                  {acuity && <span className={cn("size-2 rounded-full", acuity.solid)} aria-hidden="true" />}
                  {tab.label}
                  <span className="text-xs tabular-nums text-text-tertiary">{count}</span>
                </button>
              );
            })}
          </div>
          {onStartAssessment && (
            <Button onClick={onStartAssessment}>
              <Plus className="stroke-[2.5]" />
              New assessment
            </Button>
          )}
        </div>
      </div>

      {/* Filtered empty */}
      {filteredAssessments.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-border-strong/70 bg-surface p-10 text-center">
          <Search className="size-6 text-text-tertiary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">No matching records</p>
            <p className="mt-1 text-[13px] text-text-tertiary">Try a different search term or acuity filter.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSelectedSeverity("all");
            }}
          >
            Clear filters
          </Button>
        </div>
      )}

      {/* Grouped records */}
      <div className="space-y-7">
        {groups.map((group) => (
          <section key={group.label} aria-label={group.label} className="space-y-3">
            <h3 className="type-overline px-1 text-text-tertiary">{group.label}</h3>
            <ul className="overflow-hidden rounded-[20px] border border-border-subtle bg-surface shadow-xs divide-y divide-border-subtle">
              {group.items.map((item) => {
                const isExpanded = expandedId === item.id;
                const { date, time } = formatDateString(item.created_at);
                const result = item.assessment_result as AssessmentResponse | null;
                const acuity = getAcuity(item.severity);
                const Icon = acuity?.icon ?? ClipboardList;

                return (
                  <li key={item.id} className={cn("transition-colors", isExpanded && "bg-subtle")}>
                    <div className="flex flex-col gap-3 p-4 sm:px-5 lg:flex-row lg:items-center lg:gap-4">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        aria-expanded={isExpanded}
                        className="flex min-w-0 flex-1 items-center gap-4 text-left cursor-pointer"
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl border",
                            acuity ? [acuity.bg, acuity.text, acuity.border] : "bg-muted text-text-secondary"
                          )}
                          aria-hidden="true"
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">{item.symptoms}</span>
                          <span className="mt-0.5 block truncate text-[13px] text-text-tertiary">
                            {date} · {time}
                            {result?.recommendedAction ? ` · ${result.recommendedAction}` : ""}
                          </span>
                        </span>
                      </button>

                      <div className="flex shrink-0 items-center justify-between gap-2 pl-14 lg:justify-end lg:pl-0">
                        <VerificationBadge
                          compact
                          status={checkRecordIntegrity(item).status}
                          recordHash={checkRecordIntegrity(item).recordHash}
                          zcashTxid={item.zcash_txid}
                          zcashBlockHeight={item.zcash_block_height}
                          verifiedAt={item.verified_at || item.created_at}
                        />
                        <SeverityBadge severity={item.severity} />
                        <div className="flex items-center gap-0.5">
                          <IconAction label="View full details" onClick={() => setDetailsAssessment(item)}>
                            <Eye />
                          </IconAction>
                          <IconAction
                            label={copiedId === item.id ? "Copied" : "Copy summary to clipboard"}
                            onClick={() => handleShare(item)}
                          >
                            {copiedId === item.id ? <Check className="text-success" /> : <Share2 />}
                          </IconAction>
                          <IconAction label="Download PDF report" onClick={() => exportPdf(item)}>
                            <FileDown />
                          </IconAction>
                          <IconAction label="Delete record" tone="danger" onClick={() => setDeleteId(item.id)}>
                            <Trash2 />
                          </IconAction>
                          <IconAction
                            label={isExpanded ? "Collapse quick view" : "Expand quick view"}
                            onClick={() => setExpandedId(isExpanded ? null : item.id)}
                          >
                            <ChevronDown className={cn("transition-transform duration-200", isExpanded && "rotate-180")} />
                          </IconAction>
                        </div>
                      </div>
                    </div>

                    {isExpanded && result && (
                      <div className="grid grid-cols-1 gap-3 px-4 pb-5 sm:px-5 sm:pl-[76px] md:grid-cols-2 animate-rise">
                        <div className="rounded-2xl border border-brand/15 bg-brand-muted p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-accent-text">
                              <ArrowRight className="size-3.5" aria-hidden="true" />
                              Recommended next step
                            </div>
                            <ShareWithDoctorButton
                              recordId={item.id}
                              symptoms={item.symptoms}
                              assessment={result}
                              patientId={item.user_id}
                              recordHash={item.record_hash}
                              zcashTxid={item.zcash_txid}
                              zcashBlockHeight={item.zcash_block_height}
                              verifiedAt={item.verified_at || item.created_at}
                              size="sm"
                            />
                          </div>
                          <p className="text-sm font-medium leading-relaxed text-foreground">{result.recommendedAction}</p>
                        </div>
                        {result.severityReasoning && (
                          <div className="rounded-2xl border border-border-subtle bg-surface p-4">
                            <div className="text-xs font-semibold text-text-secondary">Evaluation basis</div>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary line-clamp-4">{result.severityReasoning}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {(hasMore || filteredAssessments.length > 0) && (
        <div className="flex flex-col items-center gap-3 pt-1">
          <span className="text-xs text-text-tertiary tabular-nums">
            Showing {Math.min(displayCount, filteredAssessments.length)} of {filteredAssessments.length}
          </span>
          {hasMore && (
            <Button variant="outline" onClick={() => setDisplayCount((prev) => prev + 5)}>
              Load more ({filteredAssessments.length - displayCount} remaining)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function IconAction({
  label,
  onClick,
  children,
  tone,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-9 items-center justify-center rounded-lg text-text-tertiary transition-colors cursor-pointer [&_svg]:size-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30",
        tone === "danger" ? "hover:bg-danger-muted hover:text-danger" : "hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
