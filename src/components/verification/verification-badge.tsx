"use client";

import * as React from "react";
import { ShieldCheck, ShieldAlert, ShieldQuestion, Fingerprint, ExternalLink, Check, Copy, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { useAnchorStatus } from "@/services/zcash/anchor-client";

export interface VerificationBadgeProps {
  /** Stored integrity status. Only "tampered" is taken at face value; anchoring is always checked on-chain. */
  status?: "verified" | "tampered" | "unverified" | "pending";
  recordHash?: string;
  zcashTxid?: string;
  zcashBlockHeight?: number;
  verifiedAt?: string;
  /** Local anchoring request state, for a record whose txid isn't known yet. */
  anchorState?: "requested" | "failed" | "unanchored";
  anchorMessage?: string;
  className?: string;
  compact?: boolean;
  onSimulateTamperToggle?: () => void;
  isTamperedSimulation?: boolean;
}

type DisplayState = "anchored" | "anchoring" | "fingerprinted" | "missing" | "tampered";

/** A broadcast tx should be indexed within minutes; after this, a missing txid is treated as not anchored. */
const NOT_FOUND_GRACE_MS = 30 * 60_000;

export function VerificationBadge({
  status = "unverified",
  recordHash,
  zcashTxid,
  verifiedAt,
  anchorState,
  anchorMessage,
  className = "",
  compact = false,
  onSimulateTamperToggle,
  isTamperedSimulation = false,
}: VerificationBadgeProps) {
  const [isCopied, setIsCopied] = React.useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  const chain = useAnchorStatus(zcashTxid, { poll: !compact });

  const now = React.useSyncExternalStore(
    () => () => {},
    () => Math.floor(Date.now() / 60_000) * 60_000,
    () => 0
  );
  const ageMs = verifiedAt && now ? now - new Date(verifiedAt).getTime() : 0;

  let state: DisplayState;
  if (isTamperedSimulation || status === "tampered") state = "tampered";
  else if (zcashTxid && chain?.status === "confirmed") state = "anchored";
  else if (zcashTxid && chain?.status === "not_found" && ageMs > NOT_FOUND_GRACE_MS) state = "missing";
  else if (zcashTxid || anchorState === "requested") state = "anchoring";
  else state = "fingerprinted";

  const explorerUrl = zcashTxid ? chain?.explorerUrl || `https://sochain.com/tx/ZECTEST/${zcashTxid}` : undefined;

  const handleCopyHash = () => {
    if (!recordHash) return;
    navigator.clipboard.writeText(recordHash);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const config = {
    anchored: {
      label: "Anchored on Zcash",
      sublabel: chain?.blockHeight ? `Block #${chain.blockHeight.toLocaleString()}` : "Confirmed",
      description: `Record fingerprint confirmed on the Zcash blockchain${chain?.confirmations ? ` (${chain.confirmations.toLocaleString()} confirmations)` : ""}.`,
      icon: ShieldCheck,
      badgeClass: "bg-success-muted text-success border-success/30",
      dotClass: "bg-success",
    },
    anchoring: {
      label: zcashTxid ? "Anchoring on Zcash" : "Anchoring requested",
      sublabel: zcashTxid ? (chain?.status === "pending" ? "In mempool" : "Awaiting confirmation") : "Sending to notary",
      description: zcashTxid
        ? "Transaction broadcast. Zcash blocks arrive about every 75 seconds; this updates automatically."
        : "The record fingerprint has been sent to the Zcash notary.",
      icon: Loader2,
      badgeClass: "bg-warning-muted text-warning-text border-warning/30",
      dotClass: "bg-warning",
    },
    fingerprinted: {
      label: "Fingerprinted",
      sublabel: anchorState === "failed" ? "Anchoring failed" : "Not yet anchored",
      description:
        anchorMessage ||
        "SHA-256 fingerprint registered for tamper detection. It has not been written to the Zcash blockchain.",
      icon: Fingerprint,
      badgeClass: "bg-muted text-text-secondary border-border-subtle",
      dotClass: "bg-text-tertiary",
    },
    missing: {
      label: "Anchor not found",
      sublabel: "Not on-chain",
      description: "The recorded transaction does not exist on the Zcash blockchain. This record is fingerprinted only.",
      icon: ShieldQuestion,
      badgeClass: "bg-muted text-text-secondary border-border-subtle",
      dotClass: "bg-text-tertiary",
    },
    tampered: {
      label: "Tampering Detected",
      sublabel: "Hash Mismatch",
      description: "The content of this clinical assessment no longer matches its registered fingerprint.",
      icon: ShieldAlert,
      badgeClass: "bg-danger-muted text-danger border-danger/40",
      dotClass: "bg-danger",
    },
  }[state];

  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors",
          config.badgeClass,
          className
        )}
        title={[config.description, recordHash ? `Hash: ${recordHash}` : "", zcashTxid ? `Tx: ${zcashTxid}` : ""].filter(Boolean).join("\n")}
      >
        <span className={cn("size-1.5 shrink-0 rounded-full", config.dotClass, state === "anchoring" && "animate-pulse")} />
        <span className="font-semibold">{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "space-y-2.5 rounded-xl border p-3 text-xs transition-all sm:p-3.5",
        state === "tampered" ? "border-danger/40 bg-danger-muted/30" : "border-border-subtle bg-surface",
        className
      )}
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg border", config.badgeClass)}>
            <Icon className={cn("size-4 stroke-[2]", state === "anchoring" && "animate-spin [animation-duration:2s]")} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-tight text-foreground sm:text-sm">{config.label}</span>
              <span className={cn("rounded border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider", config.badgeClass)}>
                {config.sublabel}
              </span>
            </div>
            <p className="text-[11px] text-text-tertiary">{config.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onSimulateTamperToggle && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onSimulateTamperToggle}
              className={cn(
                "h-7 gap-1 rounded-lg border px-2 text-[10px] font-medium",
                isTamperedSimulation
                  ? "border-success/40 text-success hover:bg-success-muted"
                  : "border-danger/30 text-danger hover:bg-danger-muted"
              )}
              title="Demonstrate cryptographic tamper detection"
            >
              <AlertTriangle className="size-3" />
              <span>{isTamperedSimulation ? "Restore Original Record" : "Simulate Tampering"}</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsDetailsOpen((prev) => !prev)}
            className="h-7 px-2 text-[11px] text-text-tertiary hover:text-foreground"
          >
            {isDetailsOpen ? "Hide Proof" : "View Proof"}
          </Button>
        </div>
      </div>

      {isDetailsOpen && (
        <div className="space-y-2 border-t border-border-subtle/80 pt-2 text-[11px] animate-in fade-in-50 duration-150">
          {recordHash && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-text-tertiary">
                <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
                  <Fingerprint className="size-3 text-accent" />
                  SHA-256 Digest (Canonical Fingerprint)
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyHash}
                  className="h-5 gap-1 px-1.5 text-[10px] text-text-tertiary hover:text-foreground"
                >
                  {isCopied ? <Check className="size-2.5 text-success" /> : <Copy className="size-2.5" />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
              <div className="break-all rounded-md border border-border-subtle bg-secondary/80 p-2 font-mono text-[10px] text-text-secondary select-all">
                {recordHash}
              </div>
            </div>
          )}

          {zcashTxid && explorerUrl && (
            <div className="flex items-center justify-between rounded-md border border-accent/20 bg-accent/5 p-2">
              <div className="min-w-0 space-y-0.5 pr-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-accent">
                  Zcash Testnet Transaction
                </span>
                <span className="block truncate font-mono text-[10px] text-text-secondary">{zcashTxid}</span>
              </div>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
              >
                <span>Explorer</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}

          <div className="flex items-center justify-between pt-0.5 text-[10px] text-text-tertiary">
            {verifiedAt && <span>Fingerprinted: {new Date(verifiedAt).toLocaleString()}</span>}
            {state === "anchored" && chain?.blockTime && <span>On-chain: {new Date(chain.blockTime).toLocaleString()}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
