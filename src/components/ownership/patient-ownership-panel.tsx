"use client";

import * as React from "react";
import {
  ShieldCheck,
  KeyRound,
  UserCheck,
  UserX,
  Plus,
  Lock,
  Stethoscope,
  Siren,
  Check,
  Clock,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getAccessGrants,
  getAuditEvents,
  getAllShareInvitations,
  grantAccess,
  revokeAccess,
  restoreAccess,
  approveDoctorAccessRequest,
  denyDoctorAccessRequest,
  resumePendingConsentAnchors,
  SHARING_BROADCAST_CHANNEL,
  STORAGE_KEY_ACTIVE_SYNC,
  RecordAccessGrant,
  OwnershipAuditEvent,
  ShareInvitation,
} from "@/services/ownership/ownership-service";
import { AuditTimeline } from "@/components/ownership/audit-timeline";
import { ZcashNotaryCard } from "@/components/ownership/zcash-notary-card";
import { AnchorChip } from "@/components/verification/anchor-chip";
import { useAuth } from "@/features/authentication/context/auth-context";

export function PatientOwnershipPanel() {
  const { user } = useAuth();
  const [grants, setGrants] = React.useState<RecordAccessGrant[]>(() =>
    typeof window !== "undefined" ? getAccessGrants() : []
  );
  const [auditEvents, setAuditEvents] = React.useState<OwnershipAuditEvent[]>(() =>
    typeof window !== "undefined" ? getAuditEvents() : []
  );
  const [invitations, setInvitations] = React.useState<ShareInvitation[]>(() =>
    typeof window !== "undefined" ? getAllShareInvitations() : []
  );
  const [isGrantDialogOpen, setIsGrantDialogOpen] = React.useState(false);
  const [providerName, setProviderName] = React.useState("");
  const [accessLevel, setAccessLevel] = React.useState<"read" | "emergency_only">("read");
  const [actionNotice, setActionNotice] = React.useState<string | null>(null);

  const refreshState = React.useCallback(() => {
    setGrants(getAccessGrants());
    setAuditEvents(getAuditEvents());
    setInvitations(getAllShareInvitations());
  }, []);

  // Finish any consent anchors interrupted by a closed or reloaded tab.
  React.useEffect(() => {
    resumePendingConsentAnchors();
  }, []);

  // Real-time synchronization: listen for live doctor requests or revocations
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SHARING_BROADCAST_CHANNEL);
      channel.onmessage = () => {
        refreshState();
      };
    } catch {
      // BroadcastChannel unsupported
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_ACTIVE_SYNC) {
        refreshState();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshState]);

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim()) return;

    const { grant, auditEvent } = grantAccess({
      userId: user?.id,
      granteeEntity: providerName.trim(),
      accessLevel,
    });

    setGrants((prev) => [grant, ...prev.filter((g) => g.id !== grant.id)]);
    setAuditEvents((prev) => [auditEvent, ...prev]);
    setProviderName("");
    setIsGrantDialogOpen(false);

    setActionNotice(`Access granted to ${grant.grantee_entity}. Consent hash is being anchored on Zcash.`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleRevoke = (grantId: string, entityName: string) => {
    const { grant, auditEvent } = revokeAccess(grantId, user?.id);
    if (grant && auditEvent) {
      setGrants((prev) => prev.map((g) => (g.id === grantId ? grant : g)));
      setAuditEvents((prev) => [auditEvent, ...prev]);
      setInvitations(getAllShareInvitations());

      setActionNotice(`Access revoked from ${entityName}. Revocation is being anchored on Zcash.`);
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleRestore = (grantId: string, entityName: string) => {
    const { grant, auditEvent } = restoreAccess(grantId, user?.id);
    if (grant && auditEvent) {
      setGrants((prev) => prev.map((g) => (g.id === grantId ? grant : g)));
      setAuditEvents((prev) => [auditEvent, ...prev]);
      setInvitations(getAllShareInvitations());

      setActionNotice(`Access restored to ${entityName}. Consent hash is being anchored on Zcash.`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleApproveInvitation = (token: string, level: "read" | "emergency_only" = "read") => {
    const res = approveDoctorAccessRequest({ token, accessLevel: level, userId: user?.id });
    if (res.success) {
      refreshState();
      setActionNotice("Clinician access approved. The approval is being anchored on Zcash.");
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleDenyInvitation = (token: string) => {
    const res = denyDoctorAccessRequest({ token, userId: user?.id });
    if (res.success) {
      refreshState();
      setActionNotice("Clinician access request denied. Record remains locked.");
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const pendingRequests = invitations.filter((inv) => inv.status === "awaiting_approval");
  const activeCount = grants.filter((g) => g.status === "granted").length;
  const revokedCount = grants.filter((g) => g.status === "revoked").length;
  const anchoredCount = auditEvents.filter((e) => e.zcashTxid).length;

  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-200">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl border border-success/30 bg-success-muted text-success text-xs font-semibold animate-in fade-in-50">
          <Check className="size-4 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Real-time Incoming Clinician Access Requests */}
      {pendingRequests.length > 0 && (
        <div className="rounded-[20px] border border-accent/40 bg-accent/5 p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-accent animate-ping" />
              <h3 className="font-heading font-semibold text-base sm:text-lg text-foreground flex items-center gap-2">
                <Clock className="size-5 text-accent" />
                <span>Incoming Clinician Access Requests</span>
              </h3>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-accent/10 text-accent border border-accent/20">
              {pendingRequests.length} Pending Approval
            </span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            A doctor or healthcare facility has scanned your sovereign QR invitation and is requesting permission to view this clinical evaluation.
          </p>

          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.token}
                className="p-4 rounded-xl border border-border-subtle bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {req.requesterName || "Attending Physician"}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-brand-muted text-accent">
                      {req.requesterRole || "Clinician"}
                    </span>
                  </div>
                  <p className="text-text-secondary">
                    {req.requesterFacility} • Requested on {new Date(req.requestedAt || req.createdAt).toLocaleTimeString()}
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    Encrypted Token: <code className="font-mono">{req.token.slice(0, 16)}...</code>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => handleApproveInvitation(req.token, "read")}
                    className="h-8 text-xs bg-success text-white hover:bg-success/90 gap-1.5"
                  >
                    <Check className="size-3.5" />
                    <span>Approve Full</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproveInvitation(req.token, "emergency_only")}
                    className="h-8 text-xs text-foreground border-border-subtle gap-1.5"
                  >
                    <span>Emergency Only</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDenyInvitation(req.token)}
                    className="h-8 text-xs text-danger hover:bg-danger-muted border-danger/30 gap-1"
                  >
                    <XCircle className="size-3.5" />
                    <span>Deny</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Ownership Header Card */}
      <div className="rounded-[20px] border border-border-subtle bg-surface p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="type-overline text-text-tertiary">Patient Data Sovereignty</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20">
                <ShieldCheck className="size-3" />
                Zero-Knowledge Proof Protected
              </span>
            </div>
            <h2 className="font-heading font-semibold text-xl sm:text-2xl text-foreground">
              Health Record Ownership & Access Controls
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
              You own your clinical data. Healthcare providers and clinics can only view your medical history when you explicitly authorize access through a secure request.
            </p>
          </div>

          <Button
            onClick={() => setIsGrantDialogOpen(true)}
            variant="outline"
            className="shrink-0 gap-1.5 self-start sm:self-auto text-xs"
          >
            <Plus className="size-3.5" />
            <span>Direct Entity Grant</span>
          </Button>
        </div>

        {/* Ownership Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl border border-border-subtle bg-subtle space-y-1">
            <span className="text-[11px] text-text-tertiary uppercase font-semibold">Record Owner</span>
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5 truncate">
              <UserCheck className="size-4 text-accent shrink-0" />
              <span className="truncate">{user?.email || "Patient (You)"}</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-subtle space-y-1">
            <span className="text-[11px] text-text-tertiary uppercase font-semibold">Active Grants</span>
            <p className="text-lg font-bold text-success tabular-nums">
              {activeCount} <span className="text-xs font-normal text-text-tertiary">authorized</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-subtle space-y-1">
            <span className="text-[11px] text-text-tertiary uppercase font-semibold">Revoked Access</span>
            <p className="text-lg font-bold text-danger tabular-nums">
              {revokedCount} <span className="text-xs font-normal text-text-tertiary">blocked</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-subtle space-y-1">
            <span className="text-[11px] text-text-tertiary uppercase font-semibold">Anchored Events</span>
            <p className="text-lg font-bold text-foreground tabular-nums flex items-center gap-1.5">
              <Lock className="size-3.5 text-accent" />
              {anchoredCount}{" "}
              <span className="text-xs font-normal text-text-tertiary">of {auditEvents.length} on Zcash</span>
            </p>
          </div>
        </div>
      </div>

      {/* Authorized Entities & Access Permissions */}
      <div className="rounded-[20px] border border-border-subtle bg-surface p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
          <div>
            <h3 className="font-heading font-semibold text-sm sm:text-base text-foreground">
              Authorized Healthcare Entities & Active Shares
            </h3>
            <p className="text-xs text-text-tertiary">
              Manage live access permissions to your AI consultations and health profile
            </p>
          </div>
          <span className="text-xs font-medium text-text-tertiary tabular-nums">
            {grants.length} registered entities
          </span>
        </div>

        {/* Technical Accuracy Notice Box */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl border border-border-subtle bg-subtle text-[11px] text-text-secondary leading-relaxed">
          <ShieldAlert className="size-4 text-accent shrink-0 mt-0.5" />
          <span>
            <strong>Access Management Notice:</strong> Revoking access permanently invalidates share tokens and blocks all future API calls and application views. In accordance with data security principles, previously viewed or exported offline summaries cannot be retracted.
          </span>
        </div>

        {grants.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-subtle bg-subtle px-4 py-6 text-center text-xs text-text-secondary">
            No one has access to your records. Use <strong>Direct Entity Grant</strong>, or share an assessment with a
            clinician and approve their request.
          </div>
        )}

        <div className="divide-y divide-border-subtle">
          {grants.map((grant) => {
            const latestEvent = auditEvents.find((e) => e.eventHash === grant.event_hash);
            const isGranted = grant.status === "granted";
            const isEmergencyOnly = grant.access_level === "emergency_only";

            return (
              <div
                key={grant.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs first:pt-2 last:pb-2"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={cn(
                      "size-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5",
                      isGranted
                        ? "bg-success-muted text-success border-success/30"
                        : "bg-muted text-text-tertiary border-border"
                    )}
                  >
                    {isEmergencyOnly ? (
                      <Siren className="size-4" />
                    ) : (
                      <Stethoscope className="size-4" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm truncate">
                        {grant.grantee_entity}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                          isGranted
                            ? "bg-success-muted text-success border-success/30"
                            : "bg-danger-muted text-danger border-danger/30"
                        )}
                      >
                        {isGranted ? "Authorized" : "Access Blocked"}
                      </span>
                      <span className="text-[10px] text-text-tertiary">
                        ({isEmergencyOnly ? "Emergency Care Only" : "Full Clinical History"})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] text-text-secondary font-mono truncate">
                        Event Hash: {grant.event_hash ? `${grant.event_hash.slice(0, 16)}...` : "—"}
                      </p>
                      <AnchorChip
                        txid={grant.zcash_txid || latestEvent?.zcashTxid}
                        anchorState={latestEvent?.anchorState}
                        anchorMessage={latestEvent?.anchorMessage}
                      />
                    </div>

                    <p className="text-[10px] text-text-tertiary">
                      {isGranted
                        ? `Authorized on ${new Date(grant.created_at).toLocaleDateString()}`
                        : `Revoked on ${grant.revoked_at ? new Date(grant.revoked_at).toLocaleDateString() : "Earlier"}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  {isGranted ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevoke(grant.id, grant.grantee_entity)}
                      className="h-8 text-xs text-danger hover:bg-danger-muted hover:text-danger border-danger/30 gap-1.5"
                    >
                      <UserX className="size-3.5" />
                      <span>Revoke Future Access</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(grant.id, grant.grantee_entity)}
                      className="h-8 text-xs text-success hover:bg-success-muted hover:text-success border-success/30 gap-1.5"
                    >
                      <UserCheck className="size-3.5" />
                      <span>Re-Authorize Access</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Zcash Notary Attestation Status */}
      <ZcashNotaryCard />

      {/* Embedded Verifiable Audit Trail */}
      <div className="rounded-[20px] border border-border-subtle bg-surface p-5 sm:p-6 shadow-xs">
        <AuditTimeline events={auditEvents} />
      </div>

      {/* Direct Grant Access Modal Dialog */}
      <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-accent" />
              <span>Direct Entity Access Grant</span>
            </DialogTitle>
            <DialogDescription>
              Explicitly grant a licensed physician or emergency facility permission to view your verified health records.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGrantSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Healthcare Provider or Facility Name
              </label>
              <Input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g., Dr. Elena Rostova (Neurology), Mercy Clinic..."
                required
                className="text-sm h-9.5"
              />

              {/* Quick Pick Presets */}
              <div className="pt-1 flex flex-wrap gap-1.5">
                {[
                  "Dr. Elena Rostova (Neurology)",
                  "Memorial Urgent Care ER",
                  "City Emergency Dispatch",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setProviderName(preset)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-muted text-text-secondary border border-border-subtle transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Access Scope</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAccessLevel("read")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-colors cursor-pointer",
                    accessLevel === "read"
                      ? "border-accent bg-accent/10 font-semibold text-foreground"
                      : "border-border-subtle bg-subtle text-text-secondary"
                  )}
                >
                  <div className="font-bold text-xs">Full Clinical</div>
                  <div className="text-[10px] text-text-tertiary">All symptoms & history</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAccessLevel("emergency_only")}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-colors cursor-pointer",
                    accessLevel === "emergency_only"
                      ? "border-accent bg-accent/10 font-semibold text-foreground"
                      : "border-border-subtle bg-subtle text-text-secondary"
                  )}
                >
                  <div className="font-bold text-xs">Emergency Only</div>
                  <div className="text-[10px] text-text-tertiary">Allergies & red flags</div>
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full mt-2">
              Confirm Authorization & Generate Event Hash
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
