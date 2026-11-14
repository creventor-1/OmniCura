"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, ScanSearch, XCircle } from "lucide-react";
import { cn } from "cn";
import { checkAnchorMemo, type MemoCheckResponse } from "@/services/zcash/anchor-client";

export interface MemoCheckProps {
  txid: string;
  /** The fingerprint this transaction should carry, recomputed from the record or event where possible. */
  expectedHash: string;
  /** One-line variant for lists such as the audit trail. */
  compact?: boolean;
  className?: string;
}

/**
 * Closes the loop between a record and the chain: the notary's wallet decrypts the
 * shielded memo of the anchoring transaction, and the fingerprint inside it is
 * compared with the record's own fingerprint. (The explorer alone can only show that
 * the transaction exists — the memo is encrypted.)
 */
export function MemoCheck({ txid, expectedHash, compact = false, className }: MemoCheckProps) {
  const [checking, setChecking] = React.useState(false);
  const [result, setResult] = React.useState<MemoCheckResponse | null>(null);

  const run = async () => {
    setChecking(true);
    setResult(null);
    setResult(await checkAnchorMemo(txid, expectedHash));
    setChecking(false);
  };

  const failedTx = result?.walletStatus === "failed";
  const verified = result?.status === "match" && !failedTx;
  const where = result?.blockHeight
    ? `block #${result.blockHeight.toLocaleString()}`
    : result?.walletStatus && result.walletStatus !== "confirmed"
      ? `${result.walletStatus}, not yet in a block`
      : "the transaction";

  if (!result && !checking) {
    return (
      <button
        type="button"
        onClick={run}
        className={cn(
          "inline-flex items-center gap-1 font-semibold text-accent hover:underline cursor-pointer",
          compact ? "text-[10px]" : "text-[11px]",
          className
        )}
        title="Decrypt this transaction's memo with the notary wallet and compare the fingerprint inside it"
      >
        <ScanSearch className={compact ? "size-3" : "size-3.5"} />
        <span>{compact ? "Verify memo" : "Check the memo inside this transaction"}</span>
      </button>
    );
  }

  if (checking) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-text-tertiary", compact ? "text-[10px]" : "text-[11px]", className)}>
        <Loader2 className="size-3 animate-spin" />
        <span>Decrypting the memo with the notary wallet…</span>
      </span>
    );
  }

  const r = result as MemoCheckResponse;

  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[10px] font-medium",
          verified ? "text-success" : r.status === "mismatch" || failedTx ? "text-danger" : "text-warning-text",
          className
        )}
        title={r.memo ? `Memo: ${r.memo}` : r.message}
      >
        {verified ? <CheckCircle2 className="size-3" /> : r.status === "mismatch" || failedTx ? <XCircle className="size-3" /> : <AlertTriangle className="size-3" />}
        <span>
          {verified
            ? `Memo in ${where} matches this hash`
            : r.status === "mismatch"
              ? "Memo carries a different hash"
              : failedTx
                ? "Transaction failed on-chain"
                : r.message || "Could not check the memo"}
        </span>
        {!verified && r.status !== "mismatch" && (
          <button type="button" onClick={run} className="ml-1 underline cursor-pointer">
            retry
          </button>
        )}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "space-y-1.5 rounded-md border p-2 text-[11px]",
        verified
          ? "border-success/30 bg-success-muted/40"
          : r.status === "mismatch" || failedTx
            ? "border-danger/30 bg-danger-muted/40"
            : "border-warning/30 bg-warning-muted/40",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1.5 font-semibold",
          verified ? "text-success" : r.status === "mismatch" || failedTx ? "text-danger" : "text-warning-text"
        )}
      >
        {verified ? <CheckCircle2 className="size-3.5" /> : r.status === "mismatch" || failedTx ? <XCircle className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
        <span>
          {verified
            ? `The memo in ${where} carries exactly this fingerprint`
            : r.status === "mismatch"
              ? "The memo carries a different fingerprint"
              : failedTx
                ? "The memo matches, but the notary wallet marks this transaction as failed"
                : r.message || "Could not check the memo"}
        </span>
      </div>

      {r.memo && (
        <div className="space-y-0.5">
          <span className="block text-[10px] uppercase tracking-wider text-text-tertiary">Decrypted memo</span>
          <code className="block break-all rounded border border-border-subtle bg-background/70 p-1.5 font-mono text-[10px] text-text-secondary select-all">
            {r.memo}
          </code>
        </div>
      )}

      {r.status === "mismatch" && (
        <p className="text-[10px] text-text-secondary">
          Expected <span className="font-mono">{r.expectedHash.slice(0, 16)}…</span>, found{" "}
          <span className="font-mono">{r.memoHash?.slice(0, 16)}…</span>.
        </p>
      )}

      {verified && (
        <p className="text-[10px] text-text-tertiary leading-relaxed">
          Decrypted by the notary&apos;s wallet. Anyone given the notary&apos;s viewing key can decrypt the same memo independently.
        </p>
      )}

      {(r.status === "unavailable" || r.status === "not_found") && (
        <button type="button" onClick={run} className="text-[10px] font-semibold text-accent hover:underline cursor-pointer">
          Try again
        </button>
      )}
    </div>
  );
}
