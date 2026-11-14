"use client";

/**
 * Browser-side helpers for Zcash anchoring. Talks only to this app's API —
 * never to the notary sidecar directly.
 */

import * as React from "react";

export interface AnchorRequestResponse {
  /** "sending" only appears internally while polling; callers get a final state. */
  status: "pending" | "sending" | "unanchored" | "failed";
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

function toResponse(data: Partial<AnchorRequestResponse> & { error?: string }): AnchorRequestResponse {
  return {
    status: (data.status as AnchorRequestResponse["status"]) || "failed",
    recordHash: data.recordHash || "",
    memo: data.memo,
    txid: data.txid,
    explorerUrl: data.explorerUrl,
    reason: data.reason,
    message: data.message || data.error,
  };
}

async function postAnchor(body: unknown): Promise<AnchorRequestResponse> {
  try {
    const res = await fetch("/api/records/anchor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Partial<AnchorRequestResponse> & { error?: string };
    return toResponse(data);
  } catch {
    return { status: "failed", recordHash: "", reason: "network", message: "Could not reach the server to anchor this record." };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Transient failures worth retrying. Retrying is safe: the notary de-duplicates by hash. */
const RETRYABLE = new Set(["send_timeout", "rate_limited", "sidecar_unreachable", "network"]);

/** Backoff between attempts to start an anchor (about 1.5 minutes in total). */
const START_BACKOFF_MS = [5_000, 10_000, 15_000, 20_000, 30_000];

async function postAnchorWithRetry(body: unknown): Promise<AnchorRequestResponse> {
  let res = await postAnchor(body);
  for (const wait of START_BACKOFF_MS) {
    if (res.status !== "failed" || !RETRYABLE.has(res.reason || "")) break;
    await sleep(res.reason === "rate_limited" ? Math.max(wait, 20_000) : wait);
    res = await postAnchor(body);
  }
  return res;
}

async function getAnchorJob(recordHash: string): Promise<AnchorRequestResponse | "not_found" | null> {
  try {
    const res = await fetch(`/api/records/anchor?hash=${recordHash}`, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as Omit<Partial<AnchorRequestResponse>, "status"> & {
      status?: AnchorRequestResponse["status"] | "not_found";
    };
    if (data.status === "not_found") return "not_found";
    return res.ok ? toResponse({ ...data, status: data.status, recordHash }) : null;
  } catch {
    return null; // network blip: keep polling
  }
}

const POLL_INTERVAL_MS = 8_000;
// The notary sends one transaction at a time, so a busy queue can mean a long wait.
const POLL_DEADLINE_MS = 25 * 60_000;
// Give up on a lost connection only after about 5 minutes without any answer.
const MAX_CONSECUTIVE_TRANSIENT = 40;

/**
 * Starts the anchor, then polls until the notary has broadcast the transaction.
 * A send takes 1.5–5 minutes over the mixnet, which no single HTTP request on a
 * hosted deployment survives, so the server answers "sending" right away.
 */
async function anchorAndWait(body: unknown, knownHash?: string): Promise<AnchorRequestResponse> {
  // When resuming, first ask whether the notary already has this hash: only start a
  // send (and pay for one) when it has never seen it.
  let res: AnchorRequestResponse | null = null;
  if (knownHash) {
    const existing = await getAnchorJob(knownHash);
    if (existing && existing !== "not_found" && (existing.txid || existing.status === "sending")) res = existing;
  }
  if (!res) res = await postAnchorWithRetry(body);
  const deadline = Date.now() + POLL_DEADLINE_MS;
  let restarts = 2;
  let transientFailures = 0;

  while (res.status === "sending" && Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const polled = await getAnchorJob(res.recordHash);
    if (polled === null || (polled !== "not_found" && polled.status === "failed" && RETRYABLE.has(polled.reason || ""))) {
      // e.g. the tunnel is reconnecting; the notary keeps building the transaction meanwhile.
      if (++transientFailures >= MAX_CONSECUTIVE_TRANSIENT) {
        res = {
          ...res,
          status: "failed",
          reason: "sidecar_unreachable",
          message: "Lost contact with the notary; this anchor will be retried.",
        };
      }
      continue;
    }
    transientFailures = 0;
    if (polled === "not_found") {
      // The notary lost the job (restarted mid-send): start it again.
      if (restarts-- <= 0) break;
      res = await postAnchorWithRetry(body);
      continue;
    }
    res = polled.status === "sending" ? res : polled;
  }

  if (res.status === "sending") {
    return { ...res, status: "failed", reason: "send_timeout", message: "The notary is still working on this anchor; it will be retried." };
  }
  return res;
}

/**
 * Ask the server to anchor a clinical record. Never throws. Pass `knownHash` when
 * resuming an earlier attempt, so an already-anchored record is not paid for twice.
 */
export function requestAnchor(
  record: {
    user_id?: string;
    symptoms: string;
    created_at: string;
    assessment_result: unknown;
  },
  { knownHash }: { knownHash?: string } = {}
): Promise<AnchorRequestResponse> {
  return anchorAndWait({ record }, knownHash);
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
  return anchorAndWait({ consentEvent });
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

// --- memo check: does the transaction really carry this fingerprint? ---

export interface MemoCheckResponse {
  status: "match" | "mismatch" | "indexing" | "not_found" | "unavailable";
  txid: string;
  expectedHash: string;
  memo?: string;
  memoKind?: "assessment" | "consent";
  memoHash?: string;
  memoTimestamp?: string;
  walletStatus?: string;
  blockHeight?: number | null;
  message?: string;
}

/**
 * Asks the notary to decrypt the transaction's memo and compare the fingerprint in it
 * with `expectedHash`. The first check after a restart can take a minute or two while
 * the notary wallet decrypts its transactions, so this polls. Never throws.
 */
export async function checkAnchorMemo(txid: string, expectedHash: string): Promise<MemoCheckResponse> {
  const deadline = Date.now() + 4 * 60_000;
  let last: MemoCheckResponse = { status: "unavailable", txid, expectedHash, message: "Could not reach the server." };
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`/api/records/anchor?memo=${txid}&hash=${expectedHash}`, { cache: "no-store" });
      last = (await res.json()) as MemoCheckResponse;
      if (!res.ok) return { ...last, status: "unavailable", txid, expectedHash };
    } catch {
      last = { status: "unavailable", txid, expectedHash, message: "Could not reach the server." };
    }
    if (last.status !== "indexing") return last;
    await sleep(5_000);
  }
  return { ...last, status: "unavailable", message: "The notary is still decrypting; try again in a minute." };
}
