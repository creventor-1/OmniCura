/**
 * Public chain lookups (no wallet needed) via SoChain's v3 API.
 * Used to confirm that an anchor transaction really exists on-chain and how
 * many confirmations it has. Network failures degrade to "unknown", never to
 * a fabricated result.
 */

import type { ZcashNetwork } from "./config";

export type ChainTxState = "confirmed" | "mempool" | "not_found" | "unknown";

export interface ChainTxLookup {
  state: ChainTxState;
  confirmations: number;
  blockHeight: number | null;
  blockTime: string | null;
}

const SOCHAIN = "https://sochain.com/api/v3";
const coin = (network: ZcashNetwork) => (network === "testnet" ? "ZECTEST" : "ZEC");

async function getJson(url: string, timeoutMs = 10_000): Promise<{ status: number; body: unknown } | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  } catch {
    return null;
  }
}

export async function lookupTransaction(txid: string, network: ZcashNetwork): Promise<ChainTxLookup> {
  const unknown: ChainTxLookup = { state: "unknown", confirmations: 0, blockHeight: null, blockTime: null };
  if (!/^[0-9a-f]{64}$/i.test(txid)) return { ...unknown, state: "not_found" };

  const res = await getJson(`${SOCHAIN}/transaction/${coin(network)}/${txid}`);
  if (!res) return unknown;
  if (res.status === 404) return { ...unknown, state: "not_found" };
  if (res.status !== 200) return unknown;

  const data = (res.body as { data?: Record<string, unknown> } | null)?.data ?? {};
  const confirmations = typeof data.confirmations === "number" ? data.confirmations : 0;
  const blockHeight = typeof data.block_height === "number" ? data.block_height : null;
  const time = typeof data.time === "number" ? new Date(data.time * 1000).toISOString() : null;

  return {
    state: confirmations > 0 && blockHeight !== null ? "confirmed" : "mempool",
    confirmations,
    blockHeight,
    blockTime: time,
  };
}

export async function getChainHeight(network: ZcashNetwork): Promise<number | null> {
  const res = await getJson(`${SOCHAIN}/network_info/${coin(network)}`);
  const count = (res?.body as { data?: { block_count?: unknown } } | null)?.data?.block_count;
  return typeof count === "number" ? count : null;
}
