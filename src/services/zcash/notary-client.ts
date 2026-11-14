/**
 * Server-side client for the Zcash notary sidecar (scripts/zcash-notary-sidecar.mjs).
 * Never import this from client components — it carries the sidecar token.
 */

import { getZcashConfig } from "./config";

export type NotaryErrorCode =
  | "not_configured"
  | "sidecar_unreachable"
  | "wallet_not_ready"
  | "insufficient_funds"
  | "funds_confirming"
  | "indexer_unreachable"
  | "send_timeout"
  | "send_failed"
  | "invalid_anchor_request"
  | "unauthorised";

export class NotaryError extends Error {
  constructor(public code: NotaryErrorCode, message?: string) {
    super(message || code);
  }
}

export interface SidecarHealth {
  ok: boolean;
  ready: boolean;
  chain: string;
  notaryAddress: string;
  ownsNotaryAddress: boolean | "unknown";
  reason: string;
}

export interface SidecarWalletStatus {
  ready: boolean;
  ownsNotaryAddress: boolean | "unknown";
  spendableZats: number | null;
  /** Change from recent sends that is still awaiting confirmations. */
  pendingZats?: number | null;
  balanceText: string;
  walletHeight: number | null;
  anchorAmountZats: number;
  anchorsSent: number;
}

async function call<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const c = getZcashConfig();
  if (!c.sidecarUrl || !c.sidecarToken) throw new NotaryError("not_configured");

  let res: Response;
  try {
    res = await fetch(`${c.sidecarUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${c.sidecarToken}`,
        ...(init.headers || {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(init.timeoutMs ?? 15_000),
    });
  } catch (err) {
    // A timeout means the sidecar is still working (sends take minutes); a retry
    // returns the same txid because the sidecar de-duplicates by hash.
    const causeCode = (err as { cause?: { code?: string } })?.cause?.code || "";
    const timedOut =
      (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) ||
      causeCode === "UND_ERR_HEADERS_TIMEOUT" ||
      causeCode === "UND_ERR_BODY_TIMEOUT";
    throw new NotaryError(timedOut ? "send_timeout" : "sidecar_unreachable");
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = (typeof body.error === "string" ? body.error : "send_failed") as NotaryErrorCode;
    throw new NotaryError(code, typeof body.reason === "string" ? body.reason : undefined);
  }
  return body as T;
}

export function getSidecarHealth(): Promise<SidecarHealth> {
  return call<SidecarHealth>("/health", { timeoutMs: 5_000 });
}

export function getSidecarWalletStatus(): Promise<SidecarWalletStatus> {
  // The sidecar answers from a background-refreshed cache.
  return call<SidecarWalletStatus>("/status", { timeoutMs: 15_000 });
}

export type AnchorJobState =
  | { state: "sent"; txid: string; memo: string }
  | { state: "sending" }
  | { state: "failed"; error: NotaryErrorCode }
  | { state: "not_found" };

/**
 * Starts (or joins) the send for a record hash and returns at once. zingo-cli opens a
 * Nym mixnet session, syncs and builds a zero-knowledge proof per send (1.5–5 min),
 * which is longer than serverless functions and tunnels hold a request open, so the
 * caller polls getAnchorJob() for the txid. Already-anchored hashes return the txid.
 */
export async function startAnchorTransaction(recordHash: string, memo: string): Promise<AnchorJobState> {
  const body = await call<{ txid?: string; memo?: string }>("/anchor", {
    method: "POST",
    body: JSON.stringify({ recordHash, memo, wait: false }),
    timeoutMs: 20_000,
  });
  return body.txid ? { state: "sent", txid: body.txid, memo: body.memo || memo } : { state: "sending" };
}

export async function getAnchorJob(recordHash: string): Promise<AnchorJobState> {
  try {
    const body = await call<{ status?: string; txid?: string; memo?: string; error?: NotaryErrorCode }>(
      `/anchor/hash/${recordHash}`,
      { timeoutMs: 10_000 }
    );
    if (body.status === "sent" && body.txid) return { state: "sent", txid: body.txid, memo: body.memo || "" };
    if (body.status === "failed") return { state: "failed", error: body.error || "send_failed" };
    return { state: "sending" };
  } catch (err) {
    if (err instanceof NotaryError && (err.code as string) === "not_found") return { state: "not_found" };
    throw err;
  }
}

export type MemoLookup =
  | { state: "found"; memo: string; walletStatus: string; blockHeight: number | null }
  | { state: "indexing" }
  | { state: "not_found" };

/** The memo the notary wallet decrypted from one of its transactions (zingo-cli `messages`). */
export async function getTransactionMemo(txid: string): Promise<MemoLookup> {
  try {
    const body = await call<{ status?: string; memo?: string; walletStatus?: string; blockHeight?: number | null }>(
      `/memo/${txid}`,
      { timeoutMs: 15_000 }
    );
    if (body.status === "found" && body.memo) {
      return { state: "found", memo: body.memo, walletStatus: body.walletStatus || "unknown", blockHeight: body.blockHeight ?? null };
    }
    return { state: "indexing" };
  } catch (err) {
    if (err instanceof NotaryError && (err.code as string) === "not_found") return { state: "not_found" };
    throw err;
  }
}

export async function getSidecarLedgerEntry(txid: string): Promise<{ txid: string; recordHash: string; memo: string; createdAt: string } | null> {
  try {
    return await call(`/anchor/${txid}`, { timeoutMs: 5_000 });
  } catch {
    return null;
  }
}
