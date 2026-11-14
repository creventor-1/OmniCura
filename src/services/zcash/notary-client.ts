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

export function sendAnchorTransaction(recordHash: string, memo: string): Promise<{ txid: string; memo: string; duplicate?: boolean }> {
  // zingo-cli opens a Nym mixnet session, syncs and builds a zero-knowledge proof per send (typically 1–3 min).
  return call("/anchor", {
    method: "POST",
    body: JSON.stringify({ recordHash, memo }),
    timeoutMs: 420_000,
  });
}

export async function getSidecarLedgerEntry(txid: string): Promise<{ txid: string; recordHash: string; memo: string; createdAt: string } | null> {
  try {
    return await call(`/anchor/${txid}`, { timeoutMs: 5_000 });
  } catch {
    return null;
  }
}
