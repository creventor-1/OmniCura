/**
 * OmniCura Patient Data Ownership, Zero-Trust Sharing & Access Control Service
 * 
 * Implements patient-sovereign access control:
 * - Secure Invitation Tokens (QR / Link) that represent an invitation to REQUEST access, NOT a public report.
 * - Real-time synchronization across browser tabs (via BroadcastChannel) and multi-device storage events.
 * - Cryptographic audit trail for every state transition: creation, request, approval, denial, view, and revocation.
 * - Technical accuracy: revocation prevents future access and invalidates tokens, without claiming to erase offline copies.
 */

import { computeOwnershipEventHash, type OwnershipEventPayload } from "@/services/crypto/record-hasher";
import { RecordAccessGrant } from "@/types/database";
import { requestConsentAnchor } from "@/services/zcash/anchor-client";

export type { RecordAccessGrant };

export type OwnershipEventType =
  | "record_created"
  | "share_link_created"
  | "doctor_requested_access"
  | "patient_approved_access"
  | "patient_denied_access"
  | "report_viewed"
  | "permission_granted"
  | "permission_revoked"
  | "access_revoked"
  | "ownership_attested";

export interface OwnershipAuditEvent {
  id: string;
  recordId?: string;
  userId: string;
  eventType: OwnershipEventType;
  title: string;
  description: string;
  actor: string;
  targetEntity?: string;
  timestamp: string;
  eventHash: string;
  /** Real Zcash testnet txid once the event hash has been anchored on-chain. */
  zcashTxid?: string;
  status: "verified" | "pending";
  /** Anchoring progress before a txid exists. */
  anchorState?: "requested" | "failed" | "unanchored";
  anchorMessage?: string;
  /** The exact payload that was hashed, kept so an interrupted anchor can be resumed. */
  anchorPayload?: OwnershipEventPayload;
  anchorGrantId?: string;
}

export interface ShareInvitation {
  token: string;
  recordId: string;
  patientId: string;
  patientName?: string;
  status: "pending_request" | "awaiting_approval" | "approved" | "denied" | "revoked";
  requesterName?: string;
  requesterFacility?: string;
  requesterRole?: string;
  accessLevel: "read" | "emergency_only";
  createdAt: string;
  requestedAt?: string;
  approvedAt?: string;
  deniedAt?: string;
  revokedAt?: string;
  eventHash: string;
  zcashTxid?: string;
  assessmentSnapshot?: {
    symptoms: string;
    severity: string;
    assessmentResult: Record<string, unknown>;
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
  };
}

export const STORAGE_KEY_GRANTS = "omnicura_access_grants";
export const STORAGE_KEY_AUDIT = "omnicura_ownership_audit_events";
export const STORAGE_KEY_INVITATIONS = "omnicura_share_invitations";
export const STORAGE_KEY_ACTIVE_SYNC = "omnicura_sharing_sync_event";
export const SHARING_BROADCAST_CHANNEL = "omnicura_sharing_sync";

export type SharingSyncMessage =
  | { type: "INVITATION_CREATED"; token: string; recordId: string }
  | { type: "DOCTOR_REQUESTED"; token: string; requesterName: string; requesterFacility: string; requesterRole?: string }
  | { type: "PATIENT_APPROVED"; token: string; accessLevel: "read" | "emergency_only" }
  | { type: "PATIENT_DENIED"; token: string }
  | { type: "ACCESS_REVOKED"; token: string; recordId: string }
  | { type: "REPORT_VIEWED"; token: string }
  | { type: "ANCHOR_UPDATED"; token: string };

/**
 * Broadcasts sharing events across browser tabs in real time.
 */
export function broadcastSharingEvent(msg: SharingSyncMessage) {
  if (typeof window !== "undefined") {
    try {
      const channel = new BroadcastChannel(SHARING_BROADCAST_CHANNEL);
      channel.postMessage(msg);
      channel.close();
    } catch {
      // BroadcastChannel not available
    }

    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE_SYNC, JSON.stringify({ ...msg, ts: Date.now() }));
    } catch {
      // ignore storage quota
    }
  }
}

// No seeded sample data: every grant and audit event shown is one the patient created.
const DEFAULT_DEMO_GRANTS: RecordAccessGrant[] = [];
const DEFAULT_DEMO_AUDIT_EVENTS: OwnershipAuditEvent[] = [];

/** Earlier builds seeded fabricated grants/events into localStorage; drop them on read. */
const isLegacyDemo = (id: string) => /^(grant|event)-demo-/.test(id);

let eventCounter = 0;
function newEventId(prefix: string) {
  eventCounter += 1;
  return `${prefix}-${Date.now()}-${eventCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

function updateAuditEvent(eventId: string, patch: Partial<OwnershipAuditEvent>) {
  if (typeof window === "undefined") return;
  try {
    const events = getAuditEvents().map((e) => (e.id === eventId ? { ...e, ...patch } : e));
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(events));
  } catch {
    // ignore storage errors
  }
}

function updateGrant(grantId: string, patch: Partial<RecordAccessGrant>) {
  if (typeof window === "undefined") return;
  try {
    const grants = getAccessGrants().map((g) => (g.id === grantId ? { ...g, ...patch } : g));
    localStorage.setItem(STORAGE_KEY_GRANTS, JSON.stringify(grants));
  } catch {
    // ignore storage errors
  }
}

type ConsentAction = "grant" | "revoke" | "share_invite" | "request" | "approve" | "deny";
type ConsentPayload = OwnershipEventPayload & { action: ConsentAction };

/**
 * Anchors a consent event's hash on Zcash in the background (the server
 * recomputes the hash from the same payload). Updates the audit event — and
 * the matching grant — with the real txid when it is known.
 */
const anchorsInFlight = new Set<string>();

function anchorConsentEvent(eventId: string, payload: ConsentPayload, grantId?: string) {
  if (typeof window === "undefined" || anchorsInFlight.has(eventId)) return;
  anchorsInFlight.add(eventId);
  updateAuditEvent(eventId, { anchorPayload: payload, anchorGrantId: grantId });
  void requestConsentAnchor(payload).then((res) => {
    anchorsInFlight.delete(eventId);
    if (res.txid) {
      updateAuditEvent(eventId, { zcashTxid: res.txid, anchorState: undefined, anchorMessage: undefined });
      if (grantId) updateGrant(grantId, { zcash_txid: res.txid });
    } else {
      updateAuditEvent(eventId, {
        anchorState: res.status === "unanchored" ? "unanchored" : "failed",
        anchorMessage: res.message,
      });
    }
    broadcastSharingEvent({ type: "ANCHOR_UPDATED", token: eventId });
  });
}

const CONSENT_ACTIONS = new Set<string>(["grant", "revoke", "share_invite", "request", "approve", "deny"]);

/**
 * Re-sends consent anchors that were interrupted (tab closed or reloaded while
 * "requested") or that failed on a transient error. Safe to call repeatedly: the
 * notary returns the existing txid for a hash it already anchored (or joins the
 * send in progress) instead of paying twice.
 */
export function resumePendingConsentAnchors() {
  if (typeof window === "undefined") return;
  for (const e of getAuditEvents()) {
    const payload = e.anchorPayload;
    const retryable = e.anchorState === "requested" || e.anchorState === "failed";
    if (e.zcashTxid || !retryable || !payload || !CONSENT_ACTIONS.has(payload.action)) continue;
    anchorConsentEvent(e.id, payload as ConsentPayload, e.anchorGrantId);
  }
}

/** Logs a clinical record that has just been anchored on Zcash (called with the real txid). */
export function recordAssessmentAnchoredEvent(params: {
  recordId: string;
  recordHash: string;
  txid: string;
  userId?: string;
  timestamp?: string;
}) {
  if (typeof window === "undefined") return;
  appendAuditEvent({
    id: newEventId("event"),
    recordId: params.recordId,
    userId: params.userId || "patient-current",
    eventType: "record_created",
    title: "Clinical record anchored on Zcash",
    description: "The assessment's SHA-256 fingerprint was written to an encrypted memo of a shielded Zcash testnet transaction.",
    actor: "Omnicura Notary",
    timestamp: params.timestamp || new Date().toISOString(),
    eventHash: params.recordHash,
    zcashTxid: params.txid,
    status: "pending",
  });
  broadcastSharingEvent({ type: "ANCHOR_UPDATED", token: params.recordId });
}

/**
 * Loads current access grants from localStorage with fallback defaults.
 */
export function getAccessGrants(): RecordAccessGrant[] {
  if (typeof window === "undefined") return DEFAULT_DEMO_GRANTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GRANTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_GRANTS, JSON.stringify(DEFAULT_DEMO_GRANTS));
      return DEFAULT_DEMO_GRANTS;
    }
    return (JSON.parse(raw) as RecordAccessGrant[]).filter((g) => !isLegacyDemo(g.id));
  } catch {
    return DEFAULT_DEMO_GRANTS;
  }
}

/**
 * Loads all audit events from localStorage with fallback defaults.
 */
export function getAuditEvents(): OwnershipAuditEvent[] {
  if (typeof window === "undefined") return DEFAULT_DEMO_AUDIT_EVENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUDIT);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(DEFAULT_DEMO_AUDIT_EVENTS));
      return DEFAULT_DEMO_AUDIT_EVENTS;
    }
    return (JSON.parse(raw) as OwnershipAuditEvent[]).filter((e) => !isLegacyDemo(e.id));
  } catch {
    return DEFAULT_DEMO_AUDIT_EVENTS;
  }
}

/**
 * Appends a new audit event to localStorage and state.
 */
export function appendAuditEvent(event: OwnershipAuditEvent) {
  if (typeof window === "undefined") return;
  try {
    const existing = getAuditEvents();
    localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify([event, ...existing]));
  } catch (err) {
    console.warn("Could not append audit event:", err);
  }
}

/**
 * Loads all share invitations from localStorage.
 */
export function getAllShareInvitations(): ShareInvitation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_INVITATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Retrieves a share invitation by its token.
 */
export function getShareInvitation(token: string): ShareInvitation | null {
  const invitations = getAllShareInvitations();
  return invitations.find((inv) => inv.token === token) || null;
}

/**
 * Retrieves the most recent active or pending invitation for a specific record.
 */
export function getActiveInvitationForRecord(recordId: string): ShareInvitation | null {
  const invitations = getAllShareInvitations();
  return (
    invitations.find(
      (inv) =>
        inv.recordId === recordId &&
        (inv.status === "pending_request" ||
          inv.status === "awaiting_approval" ||
          inv.status === "approved")
    ) || null
  );
}

/**
 * Creates a secure Invitation Token & Share Link for an assessment.
 * The link/QR code is an invitation to REQUEST access, NOT a public report.
 */
export function createShareInvitation(params: {
  recordId: string;
  patientId?: string;
  patientName?: string;
  assessmentSnapshot?: ShareInvitation["assessmentSnapshot"];
}): { invitation: ShareInvitation; shareUrl: string } {
  const patientId = params.patientId || "patient-current";
  const now = new Date().toISOString();
  const token = `inv_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;

  const consentPayload: ConsentPayload = {
    recordId: params.recordId,
    userId: patientId,
    granteeEntity: "Pending Clinician Authorization",
    accessLevel: "read",
    action: "share_invite",
    timestamp: now,
  };
  const eventHash = computeOwnershipEventHash(consentPayload);

  const invitation: ShareInvitation = {
    token,
    recordId: params.recordId,
    patientId,
    patientName: params.patientName || "Patient",
    status: "pending_request",
    accessLevel: "read",
    createdAt: now,
    eventHash,
    assessmentSnapshot: params.assessmentSnapshot,
  };

  if (typeof window !== "undefined") {
    const existing = getAllShareInvitations();
    // Replace any previous unapproved invite for this record
    const updated = [invitation, ...existing.filter((inv) => inv.recordId !== params.recordId || inv.status === "approved")];
    localStorage.setItem(STORAGE_KEY_INVITATIONS, JSON.stringify(updated));

    // Audit log
    const auditEvent: OwnershipAuditEvent = {
      id: newEventId("event"),
      recordId: params.recordId,
      userId: patientId,
      eventType: "share_link_created",
      title: "Secure Access Invitation Created",
      description: "Secure QR invitation generated. Medical data remains locked until patient approves a clinician request.",
      actor: "Patient (Owner)",
      timestamp: now,
      eventHash,
      status: "pending",
      anchorState: "requested",
    };
    appendAuditEvent(auditEvent);
    anchorConsentEvent(auditEvent.id, consentPayload);
  }

  broadcastSharingEvent({
    type: "INVITATION_CREATED",
    token,
    recordId: params.recordId,
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = `${origin}/access/${token}`;

  return { invitation, shareUrl };
}

/**
 * Doctor submits an access request using the invitation token.
 */
export function submitDoctorAccessRequest(params: {
  token: string;
  requesterName: string;
  requesterFacility: string;
  requesterRole?: string;
}): { success: boolean; invitation?: ShareInvitation; error?: string } {
  const invitations = getAllShareInvitations();
  const index = invitations.findIndex((inv) => inv.token === params.token);

  if (index === -1) {
    return { success: false, error: "Invalid or expired invitation token." };
  }

  const inv = invitations[index];
  if (inv.status === "revoked") {
    return { success: false, error: "This share invitation has been revoked by the patient." };
  }

  const now = new Date().toISOString();
  const consentPayload: ConsentPayload = {
    recordId: inv.recordId,
    userId: inv.patientId,
    granteeEntity: `${params.requesterName} (${params.requesterFacility})`,
    accessLevel: inv.accessLevel,
    action: "request",
    timestamp: now,
  };
  const eventHash = computeOwnershipEventHash(consentPayload);

  const updatedInv: ShareInvitation = {
    ...inv,
    status: "awaiting_approval",
    requesterName: params.requesterName.trim(),
    requesterFacility: params.requesterFacility.trim(),
    requesterRole: params.requesterRole?.trim() || "Clinician",
    requestedAt: now,
    eventHash,
  };

  invitations[index] = updatedInv;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_INVITATIONS, JSON.stringify(invitations));

    const auditEntry: OwnershipAuditEvent = {
      id: newEventId("event"),
      recordId: inv.recordId,
      userId: inv.patientId,
      eventType: "doctor_requested_access",
      title: `Access Requested: ${updatedInv.requesterName}`,
      description: `${updatedInv.requesterName} (${updatedInv.requesterFacility}) scanned invitation and requested access.`,
      actor: `${updatedInv.requesterName} (Clinician)`,
      targetEntity: updatedInv.requesterFacility,
      timestamp: now,
      eventHash,
      status: "pending",
      anchorState: "requested",
    };
    appendAuditEvent(auditEntry);
    anchorConsentEvent(auditEntry.id, consentPayload);
  }

  broadcastSharingEvent({
    type: "DOCTOR_REQUESTED",
    token: inv.token,
    requesterName: updatedInv.requesterName || "Clinician",
    requesterFacility: updatedInv.requesterFacility || "Healthcare Facility",
    requesterRole: updatedInv.requesterRole,
  });

  return { success: true, invitation: updatedInv };
}

/**
 * Patient approves the doctor's access request.
 */
export function approveDoctorAccessRequest(params: {
  token: string;
  accessLevel?: "read" | "emergency_only";
  userId?: string;
}): { success: boolean; invitation?: ShareInvitation } {
  const invitations = getAllShareInvitations();
  const index = invitations.findIndex((inv) => inv.token === params.token);

  if (index === -1) return { success: false };

  const inv = invitations[index];
  const now = new Date().toISOString();
  const accessLevel = params.accessLevel || inv.accessLevel;
  const entityName = `${inv.requesterName || "Authorized Clinician"} (${inv.requesterFacility || "Clinical Care"})`;

  const consentPayload: ConsentPayload = {
    recordId: inv.recordId,
    userId: inv.patientId,
    granteeEntity: entityName,
    accessLevel,
    action: "approve",
    timestamp: now,
  };
  const eventHash = computeOwnershipEventHash(consentPayload);

  const updatedInv: ShareInvitation = {
    ...inv,
    status: "approved",
    accessLevel,
    approvedAt: now,
    eventHash,
  };

  invitations[index] = updatedInv;

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_INVITATIONS, JSON.stringify(invitations));

    // Also register in the permanent access grants table
    const existingGrants = getAccessGrants();
    const newGrant: RecordAccessGrant = {
      id: newEventId("grant"),
      user_id: inv.patientId,
      record_id: inv.recordId,
      grantee_entity: entityName,
      access_level: accessLevel,
      status: "granted",
      event_hash: eventHash,
      created_at: now,
    };
    localStorage.setItem(STORAGE_KEY_GRANTS, JSON.stringify([newGrant, ...existingGrants.filter((g) => g.grantee_entity !== entityName)]));

    const auditEntry: OwnershipAuditEvent = {
      id: newEventId("event"),
      recordId: inv.recordId,
      userId: inv.patientId,
      eventType: "patient_approved_access",
      title: `Access Approved: ${inv.requesterName || "Clinician"}`,
      description: `Patient approved ${accessLevel === "emergency_only" ? "Emergency-Only" : "Full Clinical"} access.`,
      actor: "Patient (Owner)",
      targetEntity: entityName,
      timestamp: now,
      eventHash,
      status: "pending",
      anchorState: "requested",
    };
    appendAuditEvent(auditEntry);
    anchorConsentEvent(auditEntry.id, consentPayload, newGrant.id);
  }

  broadcastSharingEvent({
    type: "PATIENT_APPROVED",
    token: inv.token,
    accessLevel,
  });

  return { success: true, invitation: updatedInv };
}

/**
 * Patient denies the doctor's access request.
 */
export function denyDoctorAccessRequest(params: {
  token: string;
  userId?: string;
}): { success: boolean; invitation?: ShareInvitation } {
  const invitations = getAllShareInvitations();
  const index = invitations.findIndex((inv) => inv.token === params.token);

  if (index === -1) return { success: false };

  const inv = invitations[index];
  const now = new Date().toISOString();
  const entityName = `${inv.requesterName || "Clinician"} (${inv.requesterFacility || "Facility"})`;

  const consentPayload: ConsentPayload = {
    recordId: inv.recordId,
    userId: inv.patientId,
    granteeEntity: entityName,
    accessLevel: inv.accessLevel,
    action: "deny",
    timestamp: now,
  };
  const eventHash = computeOwnershipEventHash(consentPayload);

  const updatedInv: ShareInvitation = {
    ...inv,
    status: "denied",
    deniedAt: now,
    eventHash,
  };

  invitations[index] = updatedInv;

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_INVITATIONS, JSON.stringify(invitations));

    const auditEntry: OwnershipAuditEvent = {
      id: newEventId("event"),
      recordId: inv.recordId,
      userId: inv.patientId,
      eventType: "patient_denied_access",
      title: `Access Request Denied`,
      description: `Patient rejected access request from ${entityName}. Record locked.`,
      actor: "Patient (Owner)",
      targetEntity: entityName,
      timestamp: now,
      eventHash,
      status: "pending",
      anchorState: "requested",
    };
    appendAuditEvent(auditEntry);
    anchorConsentEvent(auditEntry.id, consentPayload);
  }

  broadcastSharingEvent({
    type: "PATIENT_DENIED",
    token: inv.token,
  });

  return { success: true, invitation: updatedInv };
}

/**
 * Patient revokes access for an existing share token or grant.
 * TECHNICAL ACCURACY CAVEAT:
 * Revoking invalidates all future app & API access and marks token as revoked.
 * Offline downloaded PDFs or previously seen screens cannot be erased,
 * but all future access through this token is permanently blocked.
 */
export function revokeShareAccess(
  tokenOrGrantId: string,
  userId?: string,
  { log = true }: { log?: boolean } = {}
): { success: boolean } {
  const now = new Date().toISOString();
  const currentUserId = userId || "patient-current";

  if (typeof window !== "undefined") {
    // 1. Update invitations matching token or grant
    const invitations = getAllShareInvitations();
    let foundEntity = "";
    let foundRecordId = "";

    const updatedInvitations = invitations.map((inv) => {
      if (inv.token === tokenOrGrantId || inv.recordId === tokenOrGrantId) {
        foundEntity = `${inv.requesterName || "Clinician"} (${inv.requesterFacility || "Clinical Facility"})`;
        foundRecordId = inv.recordId;
        return {
          ...inv,
          status: "revoked" as const,
          revokedAt: now,
        };
      }
      return inv;
    });

    localStorage.setItem(STORAGE_KEY_INVITATIONS, JSON.stringify(updatedInvitations));

    // 2. Also update grants table
    const grants = getAccessGrants();
    const updatedGrants = grants.map((g) => {
      if (g.id === tokenOrGrantId || g.grantee_entity === foundEntity) {
        if (!foundEntity) foundEntity = g.grantee_entity;
        return {
          ...g,
          status: "revoked" as const,
          revoked_at: now,
        };
      }
      return g;
    });
    localStorage.setItem(STORAGE_KEY_GRANTS, JSON.stringify(updatedGrants));

    // 3. Log + anchor the revocation (skipped when the caller already logged it)
    if (log) {
      const consentPayload: ConsentPayload = {
        recordId: foundRecordId || "record-share",
        userId: currentUserId,
        granteeEntity: foundEntity || "All Clinicians",
        accessLevel: "read",
        action: "revoke",
        timestamp: now,
      };
      const eventHash = computeOwnershipEventHash(consentPayload);

      const auditEntry: OwnershipAuditEvent = {
        id: newEventId("event"),
        recordId: foundRecordId,
        userId: currentUserId,
        eventType: "access_revoked",
        title: `Access Revoked: ${foundEntity || "Clinician Access"}`,
        description: "Patient revoked future access. Share tokens invalidated; future API requests blocked.",
        actor: "Patient (Owner)",
        targetEntity: foundEntity || "Clinician Access",
        timestamp: now,
        eventHash,
        status: "pending",
        anchorState: "requested",
      };
      appendAuditEvent(auditEntry);
      anchorConsentEvent(auditEntry.id, consentPayload);
    }

    broadcastSharingEvent({
      type: "ACCESS_REVOKED",
      token: tokenOrGrantId,
      recordId: foundRecordId,
    });
  }

  return { success: true };
}

/**
 * Logs that an approved report was viewed by the authorized doctor.
 */
export function recordReportViewed(token: string) {
  const inv = getShareInvitation(token);
  if (!inv || inv.status !== "approved") return;

  const now = new Date().toISOString();
  const viewPayload: OwnershipEventPayload = {
    recordId: inv.recordId,
    userId: inv.patientId,
    granteeEntity: `${inv.requesterName} (${inv.requesterFacility})`,
    accessLevel: inv.accessLevel,
    action: "view",
    timestamp: now,
  };
  const eventHash = computeOwnershipEventHash(viewPayload);

  appendAuditEvent({
    id: newEventId("event"),
    recordId: inv.recordId,
    userId: inv.patientId,
    eventType: "report_viewed",
    title: `Clinical Report Viewed: ${inv.requesterName || "Clinician"}`,
    description: `Authorized report accessed and verified on ${new Date().toLocaleDateString()}.`,
    actor: `${inv.requesterName || "Doctor"} (Clinician)`,
    targetEntity: inv.requesterFacility,
    timestamp: now,
    eventHash,
    status: "pending",
    anchorState: "unanchored",
    anchorMessage: "Report views are hashed and logged locally; only consent changes are anchored on Zcash.",
  });

  broadcastSharingEvent({
    type: "REPORT_VIEWED",
    token,
  });
}

/**
 * Grants access to a new healthcare provider or entity (direct sovereign grant).
 */
export function grantAccess(params: {
  userId?: string;
  granteeEntity: string;
  accessLevel: "read" | "emergency_only";
  recordId?: string;
}): { grant: RecordAccessGrant; auditEvent: OwnershipAuditEvent } {
  const userId = params.userId || "patient-current";
  const now = new Date().toISOString();

  const consentPayload: ConsentPayload = {
    recordId: params.recordId || "all-records",
    userId,
    granteeEntity: params.granteeEntity,
    accessLevel: params.accessLevel,
    action: "grant",
    timestamp: now,
  };
  const eventHash = computeOwnershipEventHash(consentPayload);

  const newGrant: RecordAccessGrant = {
    id: newEventId("grant"),
    user_id: userId,
    record_id: params.recordId,
    grantee_entity: params.granteeEntity.trim(),
    access_level: params.accessLevel,
    status: "granted",
    event_hash: eventHash,
    created_at: now,
  };

  const auditEvent: OwnershipAuditEvent = {
    id: newEventId("event"),
    recordId: params.recordId,
    userId,
    eventType: "permission_granted",
    title: `Access Granted: ${newGrant.grantee_entity}`,
    description: `Access permission (${newGrant.access_level === "emergency_only" ? "Emergency Care Only" : "Full Clinical History"}) granted by patient.`,
    actor: "Patient (Owner)",
    targetEntity: newGrant.grantee_entity,
    timestamp: now,
    eventHash,
    status: "pending",
    anchorState: "requested",
  };

  if (typeof window !== "undefined") {
    try {
      const existingGrants = getAccessGrants();
      const filtered = existingGrants.filter(
        (g) => g.grantee_entity.toLowerCase() !== newGrant.grantee_entity.toLowerCase()
      );
      localStorage.setItem(STORAGE_KEY_GRANTS, JSON.stringify([newGrant, ...filtered]));

      const existingAudit = getAuditEvents();
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify([auditEvent, ...existingAudit]));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
    anchorConsentEvent(auditEvent.id, consentPayload, newGrant.id);
  }

  return { grant: newGrant, auditEvent };
}

/**
 * Revokes access from an existing entity grant.
 */
export function revokeAccess(
  grantId: string,
  userId?: string
): { grant: RecordAccessGrant | null; auditEvent: OwnershipAuditEvent | null } {
  const currentUserId = userId || "patient-current";
  const now = new Date().toISOString();
  const grants = getAccessGrants();
  const target = grants.find((g) => g.id === grantId);

  if (!target) return { grant: null, auditEvent: null };

  const consentPayload: ConsentPayload = {
    recordId: target.record_id || "all-records",
    userId: currentUserId,
    granteeEntity: target.grantee_entity,
    accessLevel: target.access_level,
    action: "revoke",
    timestamp: now,
  };
  const eventHash = computeOwnershipEventHash(consentPayload);

  const updatedGrant: RecordAccessGrant = {
    ...target,
    status: "revoked",
    revoked_at: now,
    event_hash: eventHash,
    zcash_txid: undefined,
  };

  const auditEvent: OwnershipAuditEvent = {
    id: newEventId("event"),
    recordId: target.record_id,
    userId: currentUserId,
    eventType: "access_revoked",
    title: `Access Revoked: ${target.grantee_entity}`,
    description: "Permission actively revoked by patient. Future access tokens blocked.",
    actor: "Patient (Owner)",
    targetEntity: target.grantee_entity,
    timestamp: now,
    eventHash,
    status: "pending",
    anchorState: "requested",
  };

  if (typeof window !== "undefined") {
    try {
      const updatedGrants = grants.map((g) => (g.id === grantId ? updatedGrant : g));
      localStorage.setItem(STORAGE_KEY_GRANTS, JSON.stringify(updatedGrants));

      const existingAudit = getAuditEvents();
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify([auditEvent, ...existingAudit]));
    } catch (e) {
      console.warn("Could not update grants in localStorage:", e);
    }
    anchorConsentEvent(auditEvent.id, consentPayload, grantId);
  }

  // Also revoke any matching invitations
  revokeShareAccess(grantId, userId, { log: false });

  return { grant: updatedGrant, auditEvent };
}

/**
 * Restores previously revoked access.
 */
export function restoreAccess(
  grantId: string,
  userId?: string
): { grant: RecordAccessGrant | null; auditEvent: OwnershipAuditEvent | null } {
  const currentUserId = userId || "patient-current";
  const now = new Date().toISOString();
  const grants = getAccessGrants();
  const target = grants.find((g) => g.id === grantId);

  if (!target) return { grant: null, auditEvent: null };

  const consentPayload: ConsentPayload = {
    recordId: target.record_id || "all-records",
    userId: currentUserId,
    granteeEntity: target.grantee_entity,
    accessLevel: target.access_level,
    action: "grant",
    timestamp: now,
  };
  const eventHash = computeOwnershipEventHash(consentPayload);

  const updatedGrant: RecordAccessGrant = {
    ...target,
    status: "granted",
    revoked_at: undefined,
    event_hash: eventHash,
    zcash_txid: undefined,
  };

  const auditEvent: OwnershipAuditEvent = {
    id: newEventId("event"),
    recordId: target.record_id,
    userId: currentUserId,
    eventType: "permission_granted",
    title: `Access Restored: ${target.grantee_entity}`,
    description: "Patient re-authorized clinical record access.",
    actor: "Patient (Owner)",
    targetEntity: target.grantee_entity,
    timestamp: now,
    eventHash,
    status: "pending",
    anchorState: "requested",
  };

  if (typeof window !== "undefined") {
    try {
      const updatedGrants = grants.map((g) => (g.id === grantId ? updatedGrant : g));
      localStorage.setItem(STORAGE_KEY_GRANTS, JSON.stringify(updatedGrants));

      const existingAudit = getAuditEvents();
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify([auditEvent, ...existingAudit]));
    } catch (e) {
      console.warn("Could not update grants in localStorage:", e);
    }
    anchorConsentEvent(auditEvent.id, consentPayload, grantId);
  }

  return { grant: updatedGrant, auditEvent };
}
