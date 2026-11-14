"use client";

import * as React from "react";
import { AlertTriangle, CircleDashed, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "cn";
import { useAnchorStatus } from "@/services/zcash/anchor-client";

export interface AnchorChipProps {
  /** Real Zcash txid, once the notary has broadcast the transaction. */
  txid?: string;
  /** Progress before a txid exists. */
  anchorState?: "requested" | "failed" | "unanchored";
  anchorMessage?: string;
  className?: string;
}

/**
 * Compact on-chain status for one anchored hash. Every state is derived from
 * the chain (via /api/records/anchor) — never assumed.
 */
export function AnchorChip({ txid, anchorState, anchorMessage, className }: AnchorChipProps) {
  const chain = useAnchorStatus(txid);

  const base =
    "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none whitespace-nowrap";

  if (txid) {
    const confirmed = chain?.status === "confirmed";
    const href = chain?.explorerUrl || `https://sochain.com/tx/ZECTEST/${txid}`;
    const label = confirmed
      ? `Block #${chain?.blockHeight?.toLocaleString() ?? "?"}`
      : chain?.status === "pending"
        ? "In mempool"
        : "Broadcast";
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        title={`Zcash testnet transaction ${txid}${confirmed ? ` · ${chain?.confirmations} confirmations` : " · awaiting confirmation"}`}
        className={cn(
          base,
          "hover:underline",
          confirmed ? "border-success/30 bg-success-muted text-success" : "border-accent/20 bg-accent/5 text-accent",
          className
        )}
      >
        {confirmed ? <ShieldCheck className="size-2.5" /> : <Loader2 className="size-2.5 animate-spin [animation-duration:2s]" />}
        <span>
          {label} · tx:{txid.slice(0, 8)}
        </span>
        <ExternalLink className="size-2.5" />
      </a>
    );
  }

  if (anchorState === "requested") {
    return (
      <span className={cn(base, "border-accent/20 bg-accent/5 text-accent", className)} title="The notary is building the shielded transaction (1–3 min).">
        <Loader2 className="size-2.5 animate-spin [animation-duration:2s]" />
        <span>Anchoring on Zcash…</span>
      </span>
    );
  }

  if (anchorState === "failed") {
    return (
      <span className={cn(base, "border-warning/30 bg-warning-muted text-warning-text", className)} title={anchorMessage || "Anchoring failed."}>
        <AlertTriangle className="size-2.5" />
        <span>Anchor failed</span>
      </span>
    );
  }

  return (
    <span
      className={cn(base, "border-border-subtle bg-secondary/80 text-text-tertiary", className)}
      title={anchorMessage || "This event's hash has not been anchored on Zcash."}
    >
      <CircleDashed className="size-2.5" />
      <span>Not anchored</span>
    </span>
  );
}
