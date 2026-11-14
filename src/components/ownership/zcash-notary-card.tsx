"use client";

import * as React from "react";
import { ShieldCheck, Copy, Check, ExternalLink, Coins, RefreshCw, AlertCircle, HelpCircle, Blocks } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

type NotaryState = "not_configured" | "offline" | "wallet_not_ready" | "needs_funds" | "confirming" | "ready" | "unknown_balance";

interface StatusResponse {
  config: { network: string; notaryAddress: string; isConfigured: boolean; faucets: string[] };
  wallet: {
    state: NotaryState;
    addressType: string;
    hasFunds: boolean;
    spendable: string | null;
    pendingZats: number | null;
    anchorAmountZats: number | null;
    anchorsSent: number | null;
    ownsNotaryAddress: boolean | "unknown";
    walletHeight: number | null;
    chainHeight: number | null;
    statusNote: string;
  };
}

const STATE_PILL: Record<NotaryState | "loading", { label: string; className: string; dot: string }> = {
  loading: { label: "Checking notary…", className: "bg-muted text-text-secondary border-border-subtle", dot: "bg-text-tertiary" },
  ready: { label: "Funded & anchoring", className: "bg-success-muted text-success border-success/30", dot: "bg-success animate-pulse" },
  unknown_balance: { label: "Online", className: "bg-success-muted text-success border-success/30", dot: "bg-success" },
  confirming: { label: "Funded · change confirming", className: "bg-success-muted text-success border-success/30", dot: "bg-success animate-pulse" },
  needs_funds: { label: "Awaiting testnet funds", className: "bg-warning-muted text-warning-text border-warning/30", dot: "bg-warning" },
  wallet_not_ready: { label: "Wallet syncing / not set up", className: "bg-warning-muted text-warning-text border-warning/30", dot: "bg-warning" },
  offline: { label: "Notary service offline", className: "bg-danger-muted text-danger border-danger/30", dot: "bg-danger" },
  not_configured: { label: "Not configured", className: "bg-muted text-text-secondary border-border-subtle", dot: "bg-text-tertiary" },
};

export function ZcashNotaryCard() {
  const [copied, setCopied] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [data, setData] = React.useState<StatusResponse | null>(null);
  const [error, setError] = React.useState(false);
  const [showFaucetHelp, setShowFaucetHelp] = React.useState(false);

  const fetchStatus = React.useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/zcash/status", { cache: "no-store", signal });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as StatusResponse);
      setError(false);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError(true);
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => fetchStatus(controller.signal), 0);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [fetchStatus]);

  const address = data?.config.notaryAddress || "";
  const state: NotaryState | "loading" = isLoading && !data ? "loading" : data?.wallet.state ?? "offline";
  const pill = STATE_PILL[state];

  const handleCopy = () => {
    if (!address || typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 rounded-[20px] border border-border-subtle bg-surface p-5 shadow-xs sm:p-6">
      <div className="flex flex-col justify-between gap-3 border-b border-border-subtle pb-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="type-overline text-text-tertiary">Cryptographic Trust Layer</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <ShieldCheck className="size-3" />
              Zcash {data?.config.network === "mainnet" ? "Mainnet" : "Testnet"} Notary
            </span>
          </div>
          <h3 className="font-heading text-base font-semibold text-foreground sm:text-lg">Blockchain Notary Service</h3>
          <p className="text-xs leading-relaxed text-text-secondary">
            Each assessment&apos;s SHA-256 fingerprint is written into an encrypted memo of a shielded Zcash
            transaction. No health data ever goes on-chain.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => fetchStatus()} disabled={isLoading} className="h-8 gap-1.5 text-xs">
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </Button>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", pill.className)}>
            <span className={cn("size-2 rounded-full", pill.dot)} />
            {pill.label}
          </span>
        </div>
      </div>

      {error && !data && (
        <p className="rounded-xl border border-danger/20 bg-danger-muted p-3 text-xs text-danger">
          Couldn&apos;t load notary status from the server.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-border-subtle bg-subtle p-3.5 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-text-tertiary">
              {address.startsWith("utest1") || address.startsWith("u1")
                ? "Notary unified address (shielded)"
                : "Notary address"}
            </span>
            {data?.wallet.ownsNotaryAddress === false && (
              <span className="text-[10px] font-semibold text-warning-text">Not owned by the connected wallet</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-border-subtle bg-background/80 px-2.5 py-1.5 font-mono text-xs text-foreground select-all sm:text-[13px]">
              {address || (isLoading ? "Loading…" : "ZCASH_NOTARY_ADDRESS not set")}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!address} className="h-8 shrink-0 gap-1 text-xs" title="Copy notary address">
              {copied ? (
                <>
                  <Check className="size-3.5 text-success" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
          {data?.wallet.statusNote && <p className="text-[11px] leading-relaxed text-text-tertiary">{data.wallet.statusNote}</p>}
        </div>

        <div className="space-y-1 rounded-xl border border-border-subtle bg-subtle p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-text-tertiary">Spendable balance</span>
            <Coins className="size-3.5 text-text-tertiary" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="font-mono text-lg font-bold text-foreground sm:text-xl">{data?.wallet.spendable ?? "—"}</span>
            <span className="text-xs font-semibold text-text-tertiary">TAZ</span>
          </div>
          <p className="flex items-center gap-1 text-[10px] text-text-tertiary">
            <Blocks className="size-3" />
            {data?.wallet.chainHeight ? `Chain height ${data.wallet.chainHeight.toLocaleString()}` : "Chain height unavailable"}
            {typeof data?.wallet.anchorsSent === "number"
              ? ` · ${data.wallet.anchorsSent} anchor${data.wallet.anchorsSent === 1 ? "" : "s"} sent`
              : ""}
          </p>
          {!!data?.wallet.pendingZats && (
            <p className="font-mono text-[10px] text-text-secondary">
              + {(data.wallet.pendingZats / 1e8).toFixed(8)} TAZ confirming
            </p>
          )}
          {data?.wallet.spendable === null && data.wallet.state !== "ready" && (
            <p className="text-[10px] text-text-tertiary">Shielded balances are only visible to the wallet that holds the keys.</p>
          )}
        </div>
      </div>

      <div className="space-y-2.5 rounded-xl border border-border-subtle bg-subtle/60 p-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <AlertCircle className="size-3.5 text-accent" />
            <span>Fund the notary with free testnet TAZ</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFaucetHelp((prev) => !prev)}
            className="flex cursor-pointer items-center gap-1 text-[11px] text-accent hover:underline"
          >
            <HelpCircle className="size-3" />
            <span>{showFaucetHelp ? "Hide guide" : "Step-by-step guide"}</span>
          </button>
        </div>

        <p className="text-xs leading-relaxed text-text-secondary">
          Each anchor is a shielded self-transfer costing the network fee (about 0.0001 TAZ). Testnet TAZ has no
          monetary value.
        </p>

        {showFaucetHelp && (
          <ol className="list-inside list-decimal space-y-1 border-t border-border-subtle pt-2 text-[11px] leading-relaxed text-text-secondary animate-in fade-in-50">
            <li>Copy the notary address above.</li>
            <li>Request TAZ from a testnet faucet that supports shielded (unified) addresses.</li>
            <li>Make sure the notary service is running (<code className="font-mono">npm run notary:sidecar</code>).</li>
            <li>Click <strong>Refresh</strong> once the faucet transaction has a confirmation (about 75 seconds per block).</li>
          </ol>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-medium text-text-tertiary">Faucets:</span>
          {(data?.config.faucets ?? []).map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-border-subtle bg-surface px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-surface/80"
            >
              <span>{new URL(url).hostname}</span>
              <ExternalLink className="size-2.5 text-text-tertiary" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
