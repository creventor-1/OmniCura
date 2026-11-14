"use client";

/**
 * Browser-side helpers for Zcash anchoring. Talks only to this app's API —
 * never to the notary sidecar directly.
 */

import * as React from "react";

export interface AnchorRequestResponse {
  status: "pending" | "unanchored" | "failed";
  recordHash: string;
  memo?: string;
  txid?: string;
  explorerUrl?: string;
  reason?: string;
  message?: string;
}

export interface AnchorChainStatus {
  txid: string;
  status: "confirmed" | "pending" | "not_found" | "unknown";
  confirmations: number;
  blockHeight: number | null;
  blockTime: string | null;
  explorerUrl: string;
}

export const LOCAL_ASSESSMENTS_KEY = "omnicura_guest_assessments";

async function postAnchor(body: unknown): Promise<AnchorRequestResponse> {
  try {
    const res = await fetch("/api/records/anchor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<AnchorRequestResponse> & { error?: string };
    return {
      status: (data.status as AnchorRequestResponse["status"]) || "failed",
      recordHash: data.recordHash || "",
      memo: data.memo,
      txid: data.txid,
      explorerUrl: data.explorerUrl,
      reason: data.reason,
      message: data.message || data.error,
    };
  } catch {
    return { status: "failed", recordHash: "", reason: "network", message: "Could not reach the server to anchor this record." };
  }
}

/**
 * Sends are serialized by the notary, so a queued request can outlive the HTTP
 * timeout. Retrying is safe: the notary de-duplicates by hash and returns the
 * same txid instead of paying for a second transaction.
 */
async function postAnchorWithRetry(body: unknown, attempts = 3): Promise<AnchorRequestResponse> {
  let res = await postAnchor(body);
  for (let i = 1; i < attempts; i++) {
    if (res.status !== "failed" || (res.reason !== "send_timeout" && res.reason !== "rate_limited")) break;
    await new Promise((r) => setTimeout(r, res.reason === "rate_limited" ? 20_000 : 3_000));
    res = await postAnchor(body);
  }
  return res;
}

/** Ask the server to anchor a clinical record. Never throws. */
export function requestAnchor(record: {
  user_id?: string;
  symptoms: string;
  created_at: string;
  assessment_result: unknown;
}): Promise<AnchorRequestResponse> {
  return postAnchorWithRetry({ record });
}

/** Ask the server to anchor a consent event (grant, revoke, share, request, approve, deny). Never throws. */
export function requestConsentAnchor(consentEvent: {
  recordId: string;
  userId: string;
  granteeEntity: string;
  accessLevel: "read" | "emergency_only";
  action: "grant" | "revoke" | "share_invite" | "request" | "approve" | "deny";
  timestamp: string;
}): Promise<AnchorRequestResponse> {
  return postAnchorWithRetry({ consentEvent });
}

/** Persist anchor results onto the locally mirrored record (if present). */
export function updateLocalRecordAnchor(
  recordId: string,
  patch: { zcash_txid?: string; zcash_block_height?: number; verification_status?: string; verified_at?: string }
) {
  try {
    const raw = localStorage.getItem(LOCAL_ASSESSMENTS_KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as Array<Record<string, unknown>>;
    let changed = false;
    const next = list.map((r) => {
      if (r.id !== recordId) return r;
      changed = true;
      return { ...r, ...patch };
    });
    if (changed) localStorage.setItem(LOCAL_ASSESSMENTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

// --- chain status with a shared cache so many badges don't refetch the same txid ---
const cache = new Map<string, { at: number; value: AnchorChainStatus }>();
const inflight = new Map<string, Promise<AnchorChainStatus | null>>();

async function fetchAnchorStatus(txid: string, maxAgeMs: number): Promise<AnchorChainStatus | null> {
  const hit = cache.get(txid);
  if (hit && (hit.value.status === "confirmed" || Date.now() - hit.at < maxAgeMs)) return hit.value;
  const running = inflight.get(txid);
  if (running) return running;

  const p = fetch(`/api/records/anchor?txid=${txid}`, { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<AnchorChainStatus>) : null))
    .then((value) => {
      if (value) cache.set(txid, { at: Date.now(), value });
      return value;
    })
    .catch(() => null)
    .finally(() => inflight.delete(txid));
  inflight.set(txid, p);
  return p;
}

/**
 * Live on-chain status for a txid. Polls every `intervalMs` until the
 * transaction is confirmed (or `poll` is false, in which case it checks once).
 */
export function useAnchorStatus(txid: string | undefined, { poll = true, intervalMs = 20_000 } = {}) {
  const [status, setStatus] = React.useState<AnchorChainStatus | null>(() => (txid ? cache.get(txid)?.value ?? null : null));

  React.useEffect(() => {
    if (!txid || !/^[0-9a-f]{64}$/i.test(txid)) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      const value = await fetchAnchorStatus(txid, intervalMs - 1000);
      if (!active) return;
      if (value) setStatus(value);
      if (poll && value?.status !== "confirmed") timer = setTimeout(tick, intervalMs);
    };
    tick();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [txid, poll, intervalMs]);

  return txid ? status : null;
}
