"use client";

import * as React from "react";
import {
  ShieldCheck,
  KeyRound,
  FileText,
  UserX,
  Fingerprint,
  Check,
  Copy,
  Clock,
  Eye,
  Send,
  XCircle,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { OwnershipAuditEvent } from "@/services/ownership/ownership-service";
import { AnchorChip } from "@/components/verification/anchor-chip";

export interface AuditTimelineProps {
  events: OwnershipAuditEvent[];
  className?: string;
}

export function AuditTimeline({ events, className = "" }: AuditTimelineProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyHash = (id: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const eventTypeConfig = {
    record_created: {
      icon: FileText,
      iconClass: "bg-accent/10 text-accent border-accent/20",
      badgeClass: "bg-accent/10 text-accent border-accent/20",
      label: "Record Created",
    },
    share_link_created: {
      icon: KeyRound,
      iconClass: "bg-primary/10 text-primary border-primary/20",
      badgeClass: "bg-primary/10 text-primary border-primary/20",
      label: "Invitation Created",
    },
    doctor_requested_access: {
      icon: Send,
      iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      label: "Access Requested",
    },
    patient_approved_access: {
      icon: ShieldCheck,
      iconClass: "bg-success-muted text-success border-success/30",
      badgeClass: "bg-success-muted text-success border-success/30",
      label: "Access Approved",
    },
    patient_denied_access: {
      icon: XCircle,
      iconClass: "bg-danger-muted text-danger border-danger/30",
      badgeClass: "bg-danger-muted text-danger border-danger/30",
      label: "Request Denied",
    },
    report_viewed: {
      icon: Eye,
      iconClass: "bg-brand-muted text-accent border-brand/20",
      badgeClass: "bg-brand-muted text-accent border-brand/20",
      label: "Report Viewed",
    },
    permission_granted: {
      icon: KeyRound,
      iconClass: "bg-success-muted text-success border-success/30",
      badgeClass: "bg-success-muted text-success border-success/30",
      label: "Access Granted",
    },
    permission_revoked: {
      icon: UserX,
      iconClass: "bg-danger-muted text-danger border-danger/30",
      badgeClass: "bg-danger-muted text-danger border-danger/30",
      label: "Access Revoked",
    },
    access_revoked: {
      icon: UserX,
      iconClass: "bg-danger-muted text-danger border-danger/30",
      badgeClass: "bg-danger-muted text-danger border-danger/30",
      label: "Access Revoked",
    },
    ownership_attested: {
      icon: ShieldCheck,
      iconClass: "bg-accent/10 text-accent border-accent/20",
      badgeClass: "bg-accent/10 text-accent border-accent/20",
      label: "Ownership Attested",
    },
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between pb-1 border-b border-border-subtle/80">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-accent" />
          <h3 className="font-heading font-semibold text-sm text-foreground">
            Verifiable Access &amp; Audit Trail
          </h3>
        </div>
        <span className="text-[11px] text-text-tertiary tabular-nums">
          {events.length} {events.length === 1 ? "event" : "events"} ·{" "}
          {events.filter((e) => e.zcashTxid).length} anchored on Zcash
        </span>
      </div>

      {events.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-subtle bg-subtle px-4 py-6 text-center text-xs text-text-secondary">
          No events yet. Completing an assessment, granting or revoking access, and approving a clinician
          each add an entry here, with its SHA-256 hash anchored in a Zcash testnet transaction.
        </div>
      )}

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border-subtle">
        {events.map((event) => {
          const config = eventTypeConfig[event.eventType] || eventTypeConfig.record_created;
          const Icon = config.icon;
          const isCopied = copiedId === event.id;

          return (
            <div key={event.id} className="relative group">
              {/* Timeline Node Icon */}
              <div
                className={cn(
                  "absolute -left-6 top-0.5 size-5 rounded-full border flex items-center justify-center shrink-0 bg-surface shadow-xs",
                  config.iconClass
                )}
              >
                <Icon className="size-2.5" />
              </div>

              {/* Event Card Content */}
              <div className="rounded-xl border border-border-subtle bg-surface p-3.5 space-y-2 text-xs shadow-xs transition-colors hover:border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">
                      {event.title}
                    </span>
                    <span
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                        config.badgeClass
                      )}
                    >
                      {config.label}
                    </span>
                  </div>

                  <span className="text-[11px] text-text-tertiary tabular-nums">
                    {new Date(event.timestamp).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <p className="text-text-secondary leading-relaxed text-[12px]">
                  {event.description}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border-subtle/70 text-[11px] text-text-tertiary">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-text-secondary">Actor:</span>
                    <span className="truncate">{event.actor}</span>
                  </div>

                  {/* Event Hash Display with Copy & Zcash Explorer */}
                  <div className="flex flex-wrap items-center gap-2">
                    <AnchorChip
                      txid={event.zcashTxid}
                      anchorState={event.anchorState}
                      anchorMessage={event.anchorMessage}
                    />

                    <div className="flex items-center gap-1.5 font-mono text-[10px] bg-secondary/80 px-2 py-0.5 rounded border border-border-subtle max-w-full truncate">
                      <Fingerprint className="size-3 text-accent shrink-0" />
                      <span className="truncate select-all" title={event.eventHash}>
                        {event.eventHash.slice(0, 16)}...{event.eventHash.slice(-8)}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyHash(event.id, event.eventHash)}
                        className="h-4 w-4 p-0 ml-1 text-text-tertiary hover:text-foreground shrink-0"
                        title="Copy full cryptographic event hash"
                      >
                        {isCopied ? <Check className="size-2.5 text-success" /> : <Copy className="size-2.5" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
