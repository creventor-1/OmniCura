"use client";

import * as React from "react";
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Lock,
  UserCheck,
  Clock,
  XCircle,
  KeyRound,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  createShareInvitation,
  getActiveInvitationForRecord,
  approveDoctorAccessRequest,
  denyDoctorAccessRequest,
  revokeShareAccess,
  SHARING_BROADCAST_CHANNEL,
  STORAGE_KEY_ACTIVE_SYNC,
  ShareInvitation,
  SharingSyncMessage,
} from "@/services/ownership/ownership-service";
import { QrDisplay } from "./qr-display";
import { AssessmentResponse } from "@/schemas/triage";

export interface ShareWithDoctorProps {
  recordId: string;
  symptoms: string;
  assessment: AssessmentResponse;
  patientId?: string;
  patientName?: string;
  recordHash?: string;
  zcashTxid?: string;
  zcashBlockHeight?: number;
  verifiedAt?: string;
  patientProfile?: {
    fullName?: string;
    age?: number;
    sex?: string;
    bloodGroup?: string;
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
  };
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ShareWithDoctorButton(props: ShareWithDoctorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [invitation, setInvitation] = React.useState<ShareInvitation | null>(() =>
    typeof window !== "undefined" ? getActiveInvitationForRecord(props.recordId) : null
  );
  const [copied, setCopied] = React.useState(false);
  const [selectedAccessLevel, setSelectedAccessLevel] = React.useState<"read" | "emergency_only">("read");

  const syncState = React.useCallback(() => {
    const active = getActiveInvitationForRecord(props.recordId);
    setInvitation(active);
  }, [props.recordId]);

  // Real-time synchronization: listen for Doctor Requests, Approvals, or Revocations
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SHARING_BROADCAST_CHANNEL);
      channel.onmessage = (event: MessageEvent<SharingSyncMessage>) => {
        const msg = event.data;
        if (("recordId" in msg && msg.recordId === props.recordId) || msg.token === invitation?.token) {
          syncState();
        }
      };
    } catch {
      // BroadcastChannel fallback
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_ACTIVE_SYNC) {
        syncState();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [props.recordId, invitation?.token, syncState]);

  const handleOpen = () => {
    let current = getActiveInvitationForRecord(props.recordId);
    if (!current) {
      // Create new secure invitation token
      const created = createShareInvitation({
        recordId: props.recordId,
        patientId: props.patientId,
        patientName: props.patientName,
        assessmentSnapshot: {
          symptoms: props.symptoms,
          severity: props.assessment.severity,
          assessmentResult: props.assessment as unknown as Record<string, unknown>,
          recordHash: props.recordHash,
          zcashTxid: props.zcashTxid,
          zcashBlockHeight: props.zcashBlockHeight,
          verifiedAt: props.verifiedAt,
          patientProfile: props.patientProfile,
        },
      });
      current = created.invitation;
      setInvitation(current);
    }
    setIsOpen(true);
  };

  const shareUrl = typeof window !== "undefined" && invitation ? `${window.location.origin}/access/${invitation.token}` : "";

  const handleCopyLink = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard && shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApprove = () => {
    if (!invitation) return;
    const res = approveDoctorAccessRequest({
      token: invitation.token,
      accessLevel: selectedAccessLevel,
      userId: props.patientId,
    });
    if (res.success && res.invitation) {
      setInvitation(res.invitation);
    }
  };

  const handleDeny = () => {
    if (!invitation) return;
    const res = denyDoctorAccessRequest({
      token: invitation.token,
      userId: props.patientId,
    });
    if (res.success && res.invitation) {
      setInvitation(res.invitation);
    }
  };

  const handleRevoke = () => {
    if (!invitation) return;
    revokeShareAccess(invitation.token, props.patientId);
    setInvitation(null);
  };

  const isShared = Boolean(
    invitation && (invitation.status === "approved" || invitation.status === "awaiting_approval")
  );

  return (
    <>
      <Button
        variant={props.variant || (isShared ? "secondary" : "default")}
        size={props.size || "sm"}
        onClick={handleOpen}
        className={cn("gap-1.5 shrink-0", props.className)}
      >
        {isShared ? (
          <>
            <ShieldCheck className="size-3.5 text-accent" />
            <span>Manage Sharing</span>
          </>
        ) : (
          <>
            <Share2 className="size-3.5" />
            <span>Share with Doctor</span>
          </>
        )}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-accent" />
              <span>{isShared ? "Manage Doctor Access" : "Zero-Trust Clinician Sharing"}</span>
            </DialogTitle>
            <DialogDescription>
              {isShared
                ? "Manage authorized healthcare providers and review live permission status."
                : "Generate a secure invitation to request access. Your medical data is never public; you approve every clinician."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Condition 1: Awaiting Doctor Approval */}
            {invitation?.status === "awaiting_approval" && (
              <div className="p-4 rounded-2xl border border-accent/30 bg-accent/5 space-y-3 animate-in fade-in-50">
                <div className="flex items-center gap-2 text-accent font-semibold text-xs">
                  <Clock className="size-4 animate-spin [animation-duration:4s]" />
                  <span>Incoming Clinician Access Request</span>
                </div>

                <div className="p-3 rounded-xl bg-background border border-border-subtle text-xs space-y-1">
                  <p className="font-bold text-foreground text-sm">
                    {invitation.requesterName || "Attending Physician"}
                  </p>
                  <p className="text-text-secondary">
                    {invitation.requesterFacility} • {invitation.requesterRole || "Clinician"}
                  </p>
                  <p className="text-[10px] text-text-tertiary pt-1">
                    Requested on {invitation.requestedAt ? new Date(invitation.requestedAt).toLocaleTimeString() : "recently"}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-semibold text-text-secondary">
                    Select Authorization Scope:
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedAccessLevel("read")}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-colors cursor-pointer",
                        selectedAccessLevel === "read"
                          ? "border-accent bg-accent/10 font-semibold text-foreground"
                          : "border-border-subtle bg-surface text-text-secondary"
                      )}
                    >
                      <div className="font-bold text-xs">Full Clinical</div>
                      <div className="text-[10px] text-text-tertiary">All symptoms & history</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAccessLevel("emergency_only")}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-colors cursor-pointer",
                        selectedAccessLevel === "emergency_only"
                          ? "border-accent bg-accent/10 font-semibold text-foreground"
                          : "border-border-subtle bg-surface text-text-secondary"
                      )}
                    >
                      <div className="font-bold text-xs">Emergency Only</div>
                      <div className="text-[10px] text-text-tertiary">Allergies & red flags</div>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button onClick={handleApprove} className="flex-1 gap-1.5 bg-success text-white hover:bg-success/90">
                    <Check className="size-4" />
                    <span>Approve Access</span>
                  </Button>
                  <Button onClick={handleDeny} variant="outline" className="text-danger hover:bg-danger-muted border-danger/30">
                    <XCircle className="size-4" />
                    <span>Deny</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Condition 2: Active Access Approved */}
            {invitation?.status === "approved" && (
              <div className="p-4 rounded-2xl border border-success/30 bg-success-muted/20 space-y-3 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-success font-semibold text-xs">
                    <UserCheck className="size-4" />
                    <span>Active Clinician Access Granted</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-success px-2 py-0.5 rounded-full bg-success-muted border border-success/30">
                    {invitation.accessLevel === "emergency_only" ? "Emergency Only" : "Full Clinical"}
                  </span>
                </div>

                <div className="text-xs text-text-secondary">
                  <p className="font-semibold text-foreground">
                    {invitation.requesterName} ({invitation.requesterFacility})
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    Authorized on {invitation.approvedAt ? new Date(invitation.approvedAt).toLocaleString() : "recently"}
                  </p>
                </div>

                {/* Revoke Action with Technical Notice */}
                <div className="pt-2 border-t border-border-subtle space-y-2">
                  <Button
                    onClick={handleRevoke}
                    variant="outline"
                    className="w-full text-danger hover:bg-danger-muted border-danger/30 gap-1.5 text-xs h-9"
                  >
                    <Lock className="size-3.5" />
                    <span>Revoke Clinician Access</span>
                  </Button>
                  <p className="text-[10px] text-text-tertiary leading-relaxed">
                    Note: Revoking permanently invalidates this share token and blocks all future API views. In accordance with data security standards, previously viewed or exported offline copies cannot be retracted.
                  </p>
                </div>
              </div>
            )}

            {/* Condition 3: Invitation Token & QR Code (Pending Request) */}
            {invitation && (invitation.status === "pending_request" || invitation.status === "awaiting_approval") && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-border-subtle bg-subtle">
                  <QrDisplay value={shareUrl} size={150} className="shrink-0" />

                  <div className="space-y-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="type-overline text-accent">Zero-Trust QR Pass</span>
                      <p className="font-semibold text-foreground">Doctor Scans to Request Access</p>
                      <p className="text-[11px] text-text-secondary leading-relaxed">
                        Clinicians scan this code to submit their credentials. No medical records are shown until you approve.
                      </p>
                    </div>

                    <a
                      href={shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-accent font-semibold hover:underline pt-1"
                    >
                      <span>Preview Doctor Request Screen</span>
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                {/* Copy Link Input */}
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-[11px] bg-background px-3 py-2 rounded-lg border border-border-subtle truncate text-foreground select-all">
                    {shareUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={handleCopyLink} className="h-9 gap-1 text-xs shrink-0">
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-success" />
                        <span className="text-success">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20 text-[11px] text-text-secondary leading-relaxed">
                  <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Each step (invitation, request, approval, revocation) is hashed and anchored in its own Zcash
                    testnet transaction; see the audit trail under Data Ownership. You remain in complete custody of
                    this clinical encounter.
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
