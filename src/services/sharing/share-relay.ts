/**
 * Server-side relay for "Share with Doctor" invitations.
 *
 * Invitations are created in the patient's browser, but the clinician usually opens
 * the QR code on another device. This module registers each invitation in Supabase
 * (table `share_invitations`, reachable only through the RPC functions defined in
 * supabase/migrations/20261115_share_invitations.sql) so any device holding the
 * link can find it, submit a request, and see the report once the patient approves.
 *
 * Every call degrades gracefully: when Supabase is not configured, the migration
 * has not been run, or the network fails, callers get `{ ok: false }` and fall back
 * to the browser-local flow.
 */

import { createClient } from "@/services/database/supabase/client";
import type { ClinicianInvitation, ShareInvitation } from "@/services/ownership/ownership-service";

export type RelayFailure = "not_configured" | "unavailable" | "rejected";
export type RelayResult<T> = { ok: true; data: T } | { ok: false; reason: RelayFailure; message: string };

const MIGRATION_FILE = "supabase/migrations/20261115_share_invitations.sql";
const TIMEOUT_MS = 8000;

const isConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

interface RpcError {
  code?: string;
  message?: string;
}

function failure(error: RpcError | null | undefined, fallback: string): RelayResult<never> {
  const code = error?.code || "";
  const message = error?.message || fallback;
  // PGRST202: function not in the schema cache → migration not applied yet.
  if (code === "PGRST202" || code === "42883" || code === "42P01") {
    return {
      ok: false,
      reason: "not_configured",
      message: `Cross-device sharing is not set up yet (run ${MIGRATION_FILE} in Supabase).`,
    };
  }
  if (code === "42501" || code === "22023" || code === "23514") {
    return { ok: false, reason: "rejected", message };
  }
  return { ok: false, reason: "unavailable", message: "Could not reach the sharing service. Check your connection." };
}

const iso = (v: unknown) => (typeof v === "string" && v ? new Date(v).toISOString() : undefined);
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** Converts the JSON returned by the SQL functions into the app's invitation shape. */
function toInvitation(raw: unknown): ClinicianInvitation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const status = r.status as ClinicianInvitation["status"];
  if (typeof r.token !== "string" || !status) return null;
  return {
    token: r.token,
    recordId: String(r.recordId ?? ""),
    patientName: str(r.patientName),
    status,
    accessLevel: r.accessLevel === "emergency_only" ? "emergency_only" : "read",
    requesterName: str(r.requesterName),
    requesterFacility: str(r.requesterFacility),
    requesterRole: str(r.requesterRole),
    createdAt: iso(r.createdAt) || new Date().toISOString(),
    requestedAt: iso(r.requestedAt),
    approvedAt: iso(r.approvedAt),
    deniedAt: iso(r.deniedAt),
    revokedAt: iso(r.revokedAt),
    viewedAt: iso(r.viewedAt),
    assessmentSnapshot:
      r.assessmentSnapshot && typeof r.assessmentSnapshot === "object"
        ? (r.assessmentSnapshot as ShareInvitation["assessmentSnapshot"])
        : undefined,
  };
}

async function call(fn: string, args: Record<string, unknown>): Promise<RelayResult<unknown>> {
  if (!isConfigured()) {
    return { ok: false, reason: "not_configured", message: "Cross-device sharing needs Supabase to be configured." };
  }
  try {
    const { data, error } = await createClient()
      .rpc(fn, args)
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    if (error) return failure(error, "The sharing service rejected the request.");
    return { ok: true, data };
  } catch {
    return failure(null, "");
  }
}

function asInvitation(res: RelayResult<unknown>): RelayResult<ClinicianInvitation | null> {
  return res.ok ? { ok: true, data: toInvitation(res.data) } : res;
}

export async function relayCreateInvitation(params: {
  token: string;
  ownerKey: string;
  recordId: string;
  patientName?: string;
}): Promise<RelayResult<ClinicianInvitation | null>> {
  return asInvitation(
    await call("share_invite_create", {
      p_token: params.token,
      p_owner_key: params.ownerKey,
      p_record_id: params.recordId,
      p_patient_name: params.patientName ?? null,
    })
  );
}

/** `data: null` means the token is unknown or the invitation expired. */
export async function relayGetInvitation(token: string): Promise<RelayResult<ClinicianInvitation | null>> {
  return asInvitation(await call("share_invite_get", { p_token: token }));
}

export async function relaySubmitRequest(params: {
  token: string;
  requesterName: string;
  requesterFacility: string;
  requesterRole?: string;
}): Promise<RelayResult<ClinicianInvitation | null>> {
  return asInvitation(
    await call("share_invite_request", {
      p_token: params.token,
      p_requester_name: params.requesterName,
      p_requester_facility: params.requesterFacility,
      p_requester_role: params.requesterRole ?? null,
    })
  );
}

export async function relayOwnerUpdate(params: {
  token: string;
  ownerKey: string;
  status: "approved" | "denied" | "revoked";
  accessLevel?: "read" | "emergency_only";
  snapshot?: ShareInvitation["assessmentSnapshot"];
}): Promise<RelayResult<ClinicianInvitation | null>> {
  return asInvitation(
    await call("share_invite_owner_update", {
      p_token: params.token,
      p_owner_key: params.ownerKey,
      p_status: params.status,
      p_access_level: params.accessLevel ?? null,
      p_snapshot: params.snapshot ?? null,
    })
  );
}

export async function relayMarkViewed(token: string): Promise<RelayResult<unknown>> {
  return call("share_invite_mark_viewed", { p_token: token });
}
