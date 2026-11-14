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
import {
  relayCreateInvitation,
  relayGetInvitation,
  relayOwnerUpdate,
  relaySubmitRequest,
} from "@/services/sharing/share-relay";

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
  viewedAt?: string;
  /** Secret proving this browser created the invitation. Never shown or put in a URL. */
  ownerKey?: string;
  /** Whether the invitation is registered server-side, so other devices can open the link. */
  relay?: "registering" | "synced" | "local_only";
  relayMessage?: string;
  /** A patient decision saved here but not yet delivered to the server (retried on sync). */
  relayPending?: "approved" | "denied" | "revoked";
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

/** What the clinician's device sees: no owner key, and the snapshot only once approved. */
export type ClinicianInvitation = Pick<
  ShareInvitation,
  | "token"
  | "recordId"
  | "patientName"
  | "status"
  | "accessLevel"
  | "requesterName"
  | "requesterFacility"
  | "requesterRole"
  | "createdAt"
  | "requestedAt"
  | "approvedAt"
  | "deniedAt"
  | "revokedAt"
  | "viewedAt"
  | "assessmentSnapshot"
>;

/** Unclaimed invitations expire after 7 days (matches the SQL default). */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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
  | { type: "ANCHOR_UPDATED"; token: string }
  | { type: "RELAY_UPDATED"; token: string; recordId: string };

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
  const now = Date.now();
  return (
    invitations.find(
      (inv) =>
        inv.recordId === recordId &&
        ((inv.status === "pending_request" && now - Date.parse(inv.createdAt) < INVITE_TTL_MS) ||
          inv.status === "awaiting_approval" ||
          inv.status === "approved")
    ) || null
  );
}

function saveInvitations(invitations: ShareInvitation[]) {
  try {
    localStorage.setItem(STORAGE_KEY_INVITATIONS, JSON.stringify(invitations));
  } catch {
    // ignore storage quota
  }
}

/** Merges a patch into one stored invitation and returns the updated copy. */
function patchInvitation(token: string, patch: Partial<ShareInvitation>): ShareInvitation | null {
  if (typeof window === "undefined") return null;
  const invitations = getAllShareInvitations();
  const index = invitations.findIndex((inv) => inv.token === token);
  if (index === -1) return null;
  invitations[index] = { ...invitations[index], ...patch };
  saveInvitations(invitations);
  return invitations[index];
}

/** URL-safe random string from the browser's CSPRNG. */
function randomToken(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Grantee label used in consent hashes and access grants for an invitation's clinician. */
function inviteEntity(inv: Pick<ShareInvitation, "requesterName" | "requesterFacility">): string {
  return `${inv.requesterName || "Authorized Clinician"} (${inv.requesterFacility || "Clinical Care"})`;
}

/** Emergency-only access shares severity, red flags and safety-critical background — nothing else. */
export function snapshotForAccessLevel(
  snap: ShareInvitation["assessmentSnapshot"],
  level: ShareInvitation["accessLevel"]
): ShareInvitation["assessmentSnapshot"] {
  if (!snap || level !== "emergency_only") return snap;
  const result = (snap.assessmentResult || {}) as Record<string, unknown>;
  const profile = snap.patientProfile;
  return {
    symptoms: snap.symptoms,
    severity: snap.severity,
    assessmentResult: { recommendedAction: result.recommendedAction, warningSigns: result.warningSigns },
    recordHash: snap.recordHash,
    zcashTxid: snap.zcashTxid,
    zcashBlockHeight: snap.zcashBlockHeight,
    verifiedAt: snap.verifiedAt,
    patientProfile: profile && {
      age: profile.age,
      sex: profile.sex,
      bloodGroup: profile.bloodGroup,
      allergies: profile.allergies,
      conditions: profile.conditions,
      medications: profile.medications,
    },
  };
}

/** The clinician's view of a locally stored invitation (used when the relay is unavailable). */
export function toClinicianView(inv: ShareInvitation): ClinicianInvitation {
  return {
    token: inv.token,
    recordId: inv.recordId,
    patientName: inv.patientName,
    status: inv.status,
    accessLevel: inv.accessLevel,
    requesterName: inv.requesterName,
    requesterFacility: inv.requesterFacility,
    requesterRole: inv.requesterRole,
    createdAt: inv.createdAt,
    requestedAt: inv.requestedAt,
    approvedAt: inv.approvedAt,
    deniedAt: inv.deniedAt,
    revokedAt: inv.revokedAt,
    viewedAt: inv.viewedAt,
    assessmentSnapshot:
      inv.status === "approved" ? snapshotForAccessLevel(inv.assessmentSnapshot, inv.accessLevel) : undefined,
  };
}

/** Appends an audit event unless one with the same hash already exists. Returns true if added. */
function appendAuditEventOnce(event: OwnershipAuditEvent): boolean {
  if (getAuditEvents().some((e) => e.eventHash === event.eventHash && e.eventType === event.eventType)) return false;
  appendAuditEvent(event);
  return true;
}

const registrationsInFlight = new Set<string>();

/** Registers a locally created invitation server-side so the QR code works on any device. */
async function registerInvitation(token: string) {
  const inv = getShareInvitation(token);
  if (!inv?.ownerKey || registrationsInFlight.has(token)) return;
  registrationsInFlight.add(token);
  try {
    const res = await relayCreateInvitation({
      token: inv.token,
      ownerKey: inv.ownerKey,
      recordId: inv.recordId,
      patientName: inv.patientName,
    });
    patchInvitation(
      token,
      res.ok ? { relay: "synced", relayMessage: undefined } : { relay: "local_only", relayMessage: res.message }
    );
  } finally {
    registrationsInFlight.delete(token);
  }
  broadcastSharingEvent({ type: "RELAY_UPDATED", token, recordId: inv.recordId });
}

/**
 * Makes sure a pending invitation is registered server-side: retries a failed or
 * interrupted registration, and upgrades invitations created before the relay existed.
 */
export function ensureInvitationShareable(token: string) {
  if (typeof window === "undefined" || registrationsInFlight.has(token)) return;
  const inv = getShareInvitation(token);
  if (!inv || inv.status !== "pending_request" || inv.relay === "synced") return;
  patchInvitation(token, { ownerKey: inv.ownerKey || randomToken(32), relay: "registering", relayMessage: undefined });
  void registerInvitation(token);
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
  // 128-bit random token: anyone holding it can request access, so it must be unguessable.
  const token = `inv_${randomToken(16)}`;

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
    ownerKey: randomToken(32),
    relay: "registering",
  };

  if (typeof window !== "undefined") {
    const existing = getAllShareInvitations();
    // Replace any previous unapproved invite for this record
    const updated = [invitation, ...existing.filter((inv) => inv.recordId !== params.recordId || inv.status === "approved")];
    saveInvitations(updated);
    void registerInvitation(token);

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
 * Records a clinician's access request on the patient's copy of the invitation:
 * updates it, logs the audit event and anchors its hash. The timestamp comes from
 * the server when the relay recorded it, so the doctor's and patient's devices
 * compute the same event hash (the notary de-duplicates by hash, so it is paid once).
 */
function applyDoctorRequest(
  token: string,
  req: { requesterName: string; requesterFacility: string; requesterRole?: string; requestedAt: string }
): ShareInvitation | null {
  const inv = getShareInvitation(token);
  if (!inv || inv.status !== "pending_request") return inv;

  const requester = {
    requesterName: req.requesterName.trim(),
    requesterFacility: req.requesterFacility.trim(),
    requesterRole: req.requesterRole?.trim() || "Clinician",
  };
  const consentPayload: ConsentPayload = {
    recordId: inv.recordId,
    userId: inv.patientId,
    granteeEntity: `${requester.requesterName} (${requester.requesterFacility})`,
    accessLevel: inv.accessLevel,
    action: "request",
    timestamp: req.requestedAt,
  };
  const eventHash = computeOwnershipEventHash(consentPayload);

  const updatedInv = patchInvitation(token, {
    status: "awaiting_approval",
    ...requester,
    requestedAt: req.requestedAt,
    eventHash,
  });

  const auditEntry: OwnershipAuditEvent = {
    id: newEventId("event"),
    recordId: inv.recordId,
    userId: inv.patientId,
    eventType: "doctor_requested_access",
    title: `Access Requested: ${requester.requesterName}`,
    description: `${requester.requesterName} (${requester.requesterFacility}) scanned invitation and requested access.`,
    actor: `${requester.requesterName} (Clinician)`,
    targetEntity: requester.requesterFacility,
    timestamp: req.requestedAt,
    eventHash,
    status: "pending",
    anchorState: "requested",
  };
  if (appendAuditEventOnce(auditEntry)) anchorConsentEvent(auditEntry.id, consentPayload);

  broadcastSharingEvent({
    type: "DOCTOR_REQUESTED",
    token,
    requesterName: requester.requesterName,
    requesterFacility: requester.requesterFacility,
    requesterRole: requester.requesterRole,
  });
  return updatedInv;
}

/**
 * Doctor submits an access request using the invitation token. Works from any
 * device: the request goes to the server-side relay, and is also applied locally
 * when this browser holds the patient's copy (same-device demo, or relay offline).
 */
export async function submitDoctorAccessRequest(params: {
  token: string;
  requesterName: string;
  requesterFacility: string;
  requesterRole?: string;
}): Promise<{ success: boolean; invitation?: ClinicianInvitation; error?: string }> {
  const requesterName = params.requesterName.trim();
  const requesterFacility = params.requesterFacility.trim();
  const requesterRole = params.requesterRole?.trim() || "Clinician";

  const remote = await relaySubmitRequest({ token: params.token, requesterName, requesterFacility, requesterRole });
  const local = getShareInvitation(params.token);

  if (remote.ok && remote.data) {
    const r = remote.data;
    if (r.status === "revoked") {
      return { success: false, error: "This share invitation has been revoked by the patient." };
    }
    const isOurs =
      r.status === "awaiting_approval" && (r.requesterName || "").toLowerCase() === requesterName.toLowerCase();
    if (!isOurs) {
      return {
        success: false,
        error: "This invitation has already been used by another clinician. Ask the patient for a new QR code.",
      };
    }
    applyDoctorRequest(params.token, {
      requesterName,
      requesterFacility,
      requesterRole,
      requestedAt: r.requestedAt || new Date().toISOString(),
    });
    return { success: true, invitation: r };
  }

  // Not on the server (or server unreachable): fall back to this browser's copy.
  if (!local) {
    if (!remote.ok && (remote.reason === "rejected" || remote.reason === "unavailable")) {
      return { success: false, error: remote.message };
    }
    return { success: false, error: "Invalid or expired invitation token." };
  }
  if (local.status === "revoked") {
    return { success: false, error: "This share invitation has been revoked by the patient." };
  }
  if (local.status !== "pending_request") {
    return { success: false, error: "This invitation has already been used. Ask the patient for a new QR code." };
  }

  const updated = applyDoctorRequest(params.token, {
    requesterName,
    requesterFacility,
    requesterRole,
    requestedAt: new Date().toISOString(),
  });
  return updated
    ? { success: true, invitation: toClinicianView(updated) }
    : { success: false, error: "Failed to submit access request." };
}

/**
 * Patient side: pulls clinician activity (requests, first view) for this browser's
 * invitations from the relay, and re-sends patient decisions that did not reach it.
 * Returns true when anything changed locally.
 */
let syncInFlight: Promise<boolean> | null = null;

export function syncInvitationsFromRelay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    let changed = false;
    const mine = getAllShareInvitations().filter(
      (inv) =>
        inv.ownerKey &&
        inv.relay === "synced" &&
        (inv.relayPending ||
          inv.status === "pending_request" ||
          inv.status === "awaiting_approval" ||
          (inv.status === "approved" && !inv.viewedAt))
    );

    for (const inv of mine) {
      if (inv.relayPending) {
        await pushDecision(inv.token);
        changed = true;
        continue;
      }

      const res = await relayGetInvitation(inv.token);
      if (!res.ok || !res.data) continue;
      const r = res.data;

      if (inv.status === "pending_request" && r.status === "awaiting_approval" && r.requestedAt) {
        applyDoctorRequest(inv.token, {
          requesterName: r.requesterName || "Clinician",
          requesterFacility: r.requesterFacility || "Healthcare Facility",
          requesterRole: r.requesterRole,
          requestedAt: r.requestedAt,
        });
        changed = true;
      } else if (inv.status === "approved" && r.status === "approved" && r.viewedAt && !inv.viewedAt) {
        logReportViewed(inv.token, r.viewedAt);
        changed = true;
      }
    }
    return changed;
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}

/** Sends the patient's latest decision (approve / deny / revoke) for one invitation to the relay. */
async function pushDecision(token: string) {
  const inv = getShareInvitation(token);
  if (!inv?.ownerKey || !inv.relayPending || inv.relay !== "synced") return;
  const status = inv.relayPending;
  const res = await relayOwnerUpdate({
    token,
    ownerKey: inv.ownerKey,
    status,
    accessLevel: inv.accessLevel,
    snapshot: status === "approved" ? snapshotForAccessLevel(inv.assessmentSnapshot, inv.accessLevel) : undefined,
  });
  // Clear only if no newer decision replaced this one while the request was in flight.
  if (getShareInvitation(token)?.relayPending === status) {
    patchInvitation(
      token,
      res.ok || res.reason === "rejected"
        ? { relayPending: undefined, relayMessage: res.ok ? undefined : res.message }
        : { relayMessage: "Saved on this device. It will reach the clinician's device once the connection returns." }
    );
  }
  broadcastSharingEvent({ type: "RELAY_UPDATED", token, recordId: inv.recordId });
}

/** Queues a patient decision for the relay and sends it right away. */
function queueDecision(token: string, status: NonNullable<ShareInvitation["relayPending"]>) {
  const inv = getShareInvitation(token);
  if (!inv?.ownerKey || inv.relay !== "synced") return;
  patchInvitation(token, { relayPending: status, relayMessage: undefined });
  void pushDecision(token);
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
  const entityName = inviteEntity(inv);

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
    // Deliver the approval (and the scoped snapshot) to the clinician's device.
    queueDecision(inv.token, "approved");
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
    queueDecision(inv.token, "denied");
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
    const grants = getAccessGrants();
    const targetGrant = grants.find((g) => g.id === tokenOrGrantId);

    // 1. Invitations: by token, by record, or — when a grant is revoked from the
    //    Data Ownership panel — the approved invitation that created that grant.
    const invitations = getAllShareInvitations();
    let foundEntity = targetGrant?.grantee_entity || "";
    let foundRecordId = targetGrant?.record_id || "";
    const revokedTokens: string[] = [];

    const updatedInvitations = invitations.map((inv) => {
      const matches =
        inv.token === tokenOrGrantId ||
        inv.recordId === tokenOrGrantId ||
        (targetGrant !== undefined &&
          inviteEntity(inv) === targetGrant.grantee_entity &&
          (!targetGrant.record_id || targetGrant.record_id === inv.recordId));
      if (!matches || inv.status === "revoked") return inv;
      if (!foundEntity) foundEntity = inviteEntity(inv);
      if (!foundRecordId) foundRecordId = inv.recordId;
      revokedTokens.push(inv.token);
      return {
        ...inv,
        status: "revoked" as const,
        revokedAt: now,
      };
    });

    saveInvitations(updatedInvitations);
    // Invalidate the links server-side too, so other devices lose access immediately.
    for (const t of revokedTokens) queueDecision(t, "revoked");

    // 2. Also update grants table
    const updatedGrants = grants.map((g) => {
      if (g.id === tokenOrGrantId || (foundEntity && g.grantee_entity === foundEntity)) {
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
 * Logs the first time an approved report was opened by the authorized doctor —
 * seen either on this device or, for another device, through the relay.
 */
function logReportViewed(token: string, now: string) {
  const inv = getShareInvitation(token);
  if (!inv || inv.status !== "approved" || inv.viewedAt) return;
  patchInvitation(token, { viewedAt: now });

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
    description: `Authorized report accessed and verified on ${new Date(now).toLocaleDateString()}.`,
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

/** Called by the clinician page when the approved report is shown in this browser. */
export function recordReportViewed(token: string) {
  logReportViewed(token, new Date().toISOString());
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
