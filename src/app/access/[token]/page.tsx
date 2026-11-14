"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Stethoscope,
  Building2,
  Clock,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  HeartPulse,
  Activity,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getShareInvitation,
  submitDoctorAccessRequest,
  recordReportViewed,
  SHARING_BROADCAST_CHANNEL,
  STORAGE_KEY_ACTIVE_SYNC,
  ShareInvitation,
  SharingSyncMessage,
} from "@/services/ownership/ownership-service";
import { VerificationBadge } from "@/components/verification/verification-badge";
import { SeverityBadge } from "@/components/shared/severity-badge";
import { OmnicuraLogo } from "@/components/shared/brand-logo";

export default function ClinicianAccessPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [invitation, setInvitation] = React.useState<ShareInvitation | null>(() =>
    typeof window !== "undefined" && token ? getShareInvitation(token) : null
  );
  const [doctorName, setDoctorName] = React.useState("");
  const [doctorFacility, setDoctorFacility] = React.useState("");
  const [doctorRole, setDoctorRole] = React.useState("Attending Clinician");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [requestError, setRequestError] = React.useState<string | null>(null);

  // Log one "report viewed" event per approval. (Logging broadcasts REPORT_VIEWED,
  // so without this guard the page's own listener would re-log it in a loop.)
  const viewLoggedRef = React.useRef(false);
  const logViewOnce = React.useCallback(
    (inv: ShareInvitation | null) => {
      if (inv?.status !== "approved") {
        viewLoggedRef.current = false;
        return;
      }
      if (viewLoggedRef.current || !token) return;
      viewLoggedRef.current = true;
      recordReportViewed(token);
    },
    [token]
  );

  // If initial load was approved, record report viewed
  React.useEffect(() => {
    if (!token) return;
    logViewOnce(getShareInvitation(token));
  }, [token, logViewOnce]);

  // Real-time synchronization: listen for Patient Approval or Revocation
  React.useEffect(() => {
    if (!token || typeof window === "undefined") return;

    const syncFromStorage = () => {
      const inv = getShareInvitation(token);
      setInvitation(inv);
      logViewOnce(inv);
    };

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(SHARING_BROADCAST_CHANNEL);
      channel.onmessage = (event: MessageEvent<SharingSyncMessage>) => {
        const msg = event.data;
        if (msg.token === token && msg.type !== "REPORT_VIEWED" && msg.type !== "ANCHOR_UPDATED") {
          syncFromStorage();
        }
      };
    } catch {
      // BroadcastChannel unsupported
    }

    // Storage event fallback for cross-window / cross-device sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_ACTIVE_SYNC) {
        syncFromStorage();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, [token, logViewOnce]);

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !doctorFacility.trim()) {
      setRequestError("Please provide your full name and clinical facility.");
      return;
    }

    setIsSubmitting(true);
    setRequestError(null);

    const res = submitDoctorAccessRequest({
      token,
      requesterName: doctorName.trim(),
      requesterFacility: doctorFacility.trim(),
      requesterRole: doctorRole.trim(),
    });

    setIsSubmitting(false);
    if (res.success && res.invitation) {
      setInvitation(res.invitation);
    } else {
      setRequestError(res.error || "Failed to submit access request.");
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // State 0: Invalid token
  if (!invitation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-border-subtle bg-surface p-7 text-center space-y-4 shadow-sm">
          <div className="size-12 rounded-2xl bg-danger-muted text-danger flex items-center justify-center mx-auto">
            <AlertCircle className="size-6" />
          </div>
          <h1 className="font-heading font-semibold text-xl text-foreground">
            Invalid or Expired Invitation
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            This access token does not exist or has expired. Please ask the patient to generate a new secure invitation link.
          </p>
        </div>
      </div>
    );
  }

  // State 1: Access Revoked (Technical Accuracy Caveat)
  if (invitation.status === "revoked") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full rounded-[24px] border border-danger/40 bg-surface p-7 sm:p-9 text-center space-y-5 shadow-md">
          <div className="size-14 rounded-2xl bg-danger-muted text-danger flex items-center justify-center mx-auto border border-danger/30 animate-pulse">
            <Lock className="size-7" />
          </div>

          <div className="space-y-1.5">
            <span className="type-overline text-danger">Patient Sovereignty Enforced</span>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Access Revoked by Patient
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              The owner of this health record actively revoked permission on{" "}
              <strong>{invitation.revokedAt ? new Date(invitation.revokedAt).toLocaleString() : "recently"}</strong>.
            </p>
          </div>

          {/* Technical Accuracy Notice Box */}
          <div className="p-4 rounded-xl border border-border-subtle bg-subtle text-left text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <ShieldAlert className="size-4 text-amber-500 shrink-0" />
              <span>Technical Enforcement & Scope Notice</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              This share token has been permanently invalidated. All future application views and API requests are blocked.
            </p>
            <p className="text-[10px] text-text-tertiary leading-relaxed border-t border-border-subtle/80 pt-2">
              Note: In accordance with standard data privacy principles, previously viewed or exported offline copies cannot be retracted, but all future access through this application is terminated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Access Denied
  if (invitation.status === "denied") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-border-subtle bg-surface p-7 text-center space-y-4 shadow-sm">
          <div className="size-12 rounded-2xl bg-danger-muted text-danger flex items-center justify-center mx-auto">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="font-heading font-semibold text-xl text-foreground">
            Access Request Denied
          </h1>
          <p className="text-xs text-text-secondary leading-relaxed">
            The patient has declined authorization for this clinical evaluation request. The record remains sovereign and private.
          </p>
        </div>
      </div>
    );
  }

  // State 3: Awaiting Patient Approval
  if (invitation.status === "awaiting_approval") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[24px] border border-accent/30 bg-surface p-7 sm:p-9 text-center space-y-5 shadow-sm">
          <div className="size-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto border border-accent/20 relative">
            <Clock className="size-7 animate-spin [animation-duration:4s]" />
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-accent animate-ping" />
          </div>

          <div className="space-y-1.5">
            <span className="type-overline text-accent">Authorization In Progress</span>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Request Sent to Patient
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              Access request submitted for <strong>{invitation.requesterName}</strong> ({invitation.requesterFacility}).
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border-subtle bg-subtle text-xs text-text-secondary space-y-2">
            <p className="font-semibold text-foreground">Next Step for the Patient:</p>
            <p className="text-[11px] leading-relaxed">
              Please ask the patient to tap <strong>&ldquo;Approve Access&rdquo;</strong> on their OmniCura dashboard. This page will unlock automatically once approved.
            </p>
          </div>

          <p className="text-[10px] text-text-tertiary">
            Real-time synchronization active • Listening for patient authorization
          </p>
        </div>
      </div>
    );
  }

  // State 4: Pending Request (Doctor enters credentials to request access)
  if (invitation.status === "pending_request") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-8">
        <header className="max-w-3xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border-subtle">
          <OmnicuraLogo size="md" showWordmark />
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <ShieldCheck className="size-3.5" />
            Zero-Trust Gatekeeper
          </span>
        </header>

        <main className="max-w-md w-full mx-auto my-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <KeyRound className="size-6" />
            </div>
            <h1 className="font-heading font-bold text-2xl text-foreground">
              Clinical Access Authorization
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              This medical record is sovereign and encrypted. To view this evaluation, please identify yourself to request access from the patient.
            </p>
          </div>

          <form
            onSubmit={handleRequestSubmit}
            className="rounded-[20px] border border-border-subtle bg-surface p-6 shadow-sm space-y-4"
          >
            {requestError && (
              <div className="p-3 rounded-xl bg-danger-muted text-danger text-xs font-medium border border-danger/30">
                {requestError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Stethoscope className="size-3.5 text-text-tertiary" />
                Clinician Full Name & Title
              </label>
              <Input
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g., Dr. Elena Rostova, MD"
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5 text-text-tertiary" />
                Hospital, Clinic, or Practice
              </label>
              <Input
                value={doctorFacility}
                onChange={(e) => setDoctorFacility(e.target.value)}
                placeholder="e.g., St. Jude Regional Hospital Emergency Dept"
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Clinical Role / Purpose of Care
              </label>
              <select
                value={doctorRole}
                onChange={(e) => setDoctorRole(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Attending Clinician">Attending Clinician - Consultation</option>
                <option value="Emergency Care Physician">Emergency Care Physician - Acute Triage</option>
                <option value="Specialist Physician">Specialist Physician - Second Opinion</option>
                <option value="Triage Nurse / EMT">Triage Nurse / EMT - Inpatient Handover</option>
              </select>
            </div>

            {/* Quick-pick presets for quick hackathon demo */}
            <div className="pt-1">
              <span className="text-[10px] text-text-tertiary block mb-1">Quick Demo Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: "Dr. Elena Rostova", facility: "Mercy Neurology" },
                  { name: "Dr. Marcus Vance", facility: "St. Jude Emergency Dept" },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      setDoctorName(preset.name);
                      setDoctorFacility(preset.facility);
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-muted text-text-secondary border border-border-subtle transition-colors cursor-pointer"
                  >
                    + {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full gap-2 mt-2">
              <span>Send Access Request to Patient</span>
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="p-3.5 rounded-xl border border-border-subtle bg-subtle text-[11px] text-text-secondary text-center leading-relaxed">
            🔒 Medical data is never exposed by possessing a link. The patient retains full authority to approve or deny access.
          </div>
        </main>

        <footer className="text-center text-[11px] text-text-tertiary py-4">
          OmniCura Sovereign Healthcare Protocol • Zero-Trust Patient Authorization
        </footer>
      </div>
    );
  }

  // State 5: Approved (Full Handover Report Visible)
  const snap = invitation.assessmentSnapshot;
  const assessmentResult = snap?.assessmentResult as {
    recommendedAction?: string;
    severityReasoning?: string;
    firstAidSteps?: string[];
    warningSigns?: string[];
    possibleConditions?: Array<{ condition: string; probability: string; confidenceScore?: number }>;
  } | undefined;

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Clinician Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            <OmnicuraLogo size="md" showWordmark />
            <span className="text-xs px-2 py-0.5 rounded-md bg-brand-muted text-accent font-semibold border border-brand/20">
              Clinician Handover View
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success-muted text-success border border-success/30">
              <CheckCircle2 className="size-3.5" />
              Patient Approved Access
            </span>
          </div>
        </header>

        {/* Doctor Authorization Banner */}
        <div className="rounded-2xl border border-success/30 bg-success-muted/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5 text-sm">
              <UserCheck className="size-4 text-success" />
              <span>Authorized Clinician: {invitation.requesterName}</span>
            </p>
            <p className="text-text-secondary">
              {invitation.requesterFacility} • Authorized on {invitation.approvedAt ? new Date(invitation.approvedAt).toLocaleString() : "recently"}
            </p>
          </div>
          <span className="text-[11px] font-medium text-text-tertiary">
            Scope: {invitation.accessLevel === "emergency_only" ? "Emergency Care Only" : "Full Clinical History"}
          </span>
        </div>

        {/* Zcash Verification Badge */}
        {snap?.recordHash && (
          <VerificationBadge
            status={snap.zcashTxid ? "pending" : "unverified"}
            recordHash={snap.recordHash}
            zcashTxid={snap.zcashTxid}
            zcashBlockHeight={snap.zcashBlockHeight}
            verifiedAt={snap.verifiedAt}
          />
        )}

        {/* Patient Clinical Profile Snapshot */}
        {snap?.patientProfile && (
          <section className="rounded-[20px] border border-border-subtle bg-surface p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <h3 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
                <HeartPulse className="size-4 text-accent" />
                <span>Patient Background & Vital Context</span>
              </h3>
              <span className="text-xs text-text-tertiary">Sovereign Profile</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-[10px] text-text-tertiary uppercase font-semibold">Age / Sex</span>
                <p className="font-bold text-foreground mt-0.5">
                  {snap.patientProfile.age ? `${snap.patientProfile.age} yrs` : "—"} / {snap.patientProfile.sex || "—"}
                </p>
              </div>

              <div className="p-2.5 rounded-xl bg-subtle border border-border-subtle">
                <span className="text-[10px] text-text-tertiary uppercase font-semibold">Blood Group</span>
                <p className="font-bold text-foreground mt-0.5">{snap.patientProfile.bloodGroup || "—"}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-subtle border border-border-subtle col-span-2">
                <span className="text-[10px] text-text-tertiary uppercase font-semibold">Known Allergies</span>
                <p className="font-bold text-danger mt-0.5 truncate">
                  {snap.patientProfile.allergies?.length ? snap.patientProfile.allergies.join(", ") : "No known allergies"}
                </p>
              </div>
            </div>

            {Boolean(snap.patientProfile.medications?.length) && (
              <div className="text-xs text-text-secondary pt-1">
                <span className="font-semibold text-foreground">Current Medications: </span>
                <span>{snap.patientProfile.medications?.join(", ")}</span>
              </div>
            )}
          </section>
        )}

        {/* AI Triage Synthesis */}
        <section className="rounded-[20px] border border-border-subtle bg-surface p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="size-4 text-accent" />
                <span className="type-overline text-text-tertiary">Clinical Triage Evaluation</span>
              </div>
              <h2 className="font-heading font-semibold text-lg text-foreground mt-1">
                Presentation: &ldquo;{snap?.symptoms}&rdquo;
              </h2>
            </div>
            {snap?.severity && <SeverityBadge severity={snap.severity as "urgent" | "non-urgent" | "emergency"} />}
          </div>

          {/* Recommended Action */}
          {assessmentResult?.recommendedAction && (
            <div className="rounded-xl border border-brand/20 bg-brand-muted p-4 space-y-1">
              <span className="text-[11px] font-bold text-accent-text uppercase tracking-wider">
                Recommended Care Pathway
              </span>
              <p className="text-sm font-semibold text-foreground">
                {assessmentResult.recommendedAction}
              </p>
            </div>
          )}

          {/* Severity Reasoning */}
          {assessmentResult?.severityReasoning && (
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-foreground">Clinical Reasoning:</span>
              <p className="text-text-secondary leading-relaxed text-[13px]">
                {assessmentResult.severityReasoning}
              </p>
            </div>
          )}

          {/* First Aid & Warning Signs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {Boolean(assessmentResult?.firstAidSteps?.length) && (
              <div className="p-4 rounded-xl border border-border-subtle bg-subtle space-y-2">
                <span className="text-xs font-semibold text-foreground block">
                  First Aid Measures:
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs text-text-secondary">
                  {assessmentResult?.firstAidSteps?.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            {Boolean(assessmentResult?.warningSigns?.length) && (
              <div className="p-4 rounded-xl border border-danger/20 bg-danger-muted/30 space-y-2">
                <span className="text-xs font-semibold text-danger block">
                  Red Flag Warning Signs:
                </span>
                <ul className="list-disc list-inside space-y-1 text-xs text-text-secondary">
                  {assessmentResult?.warningSigns?.map((sign, i) => (
                    <li key={i}>{sign}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-tertiary pt-4 border-t border-border-subtle">
          <span>OmniCura Sovereign Healthcare Protocol • Record #{invitation.recordId}</span>
          <span>Zero-Knowledge Protected via Zcash Testnet</span>
        </footer>
      </div>
    </div>
  );
}
