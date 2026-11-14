/**
 * Notary wallet status for the UI. Shielded balances cannot be read from a
 * public explorer by design, so the balance comes from the notary sidecar
 * (which holds the wallet). When the sidecar is unreachable we report that
 * honestly instead of assuming the wallet is funded.
 */

import { getZcashConfig, isNotaryConfigured } from "./config";
import { getChainHeight } from "./chain";
import { NotaryError, getSidecarHealth, getSidecarWalletStatus } from "./notary-client";

export type NotaryState =
  | "not_configured" // app has no sidecar URL/token
  | "offline" // sidecar unreachable
  | "wallet_not_ready" // sidecar up, wallet missing/syncing
  | "needs_funds" // wallet ready, spendable balance is zero
  | "confirming" // funds exist but are change awaiting confirmations; sends wait for them
  | "ready" // wallet ready and funded
  | "unknown_balance"; // wallet ready but balance output couldn't be parsed

export interface ZcashNotaryStatus {
  network: string;
  address: string;
  addressType: "unified" | "transparent" | "sapling" | "unknown";
  isShielded: boolean;
  state: NotaryState;
  hasFunds: boolean;
  spendableZats: number | null;
  spendable: string | null;
  pendingZats: number | null;
  anchorAmountZats: number | null;
  anchorsSent: number | null;
  ownsNotaryAddress: boolean | "unknown";
  walletHeight: number | null;
  chainHeight: number | null;
  statusNote: string;
  lastChecked: string;
}

function addressType(address: string): ZcashNotaryStatus["addressType"] {
  if (/^(utest1|u1)/.test(address)) return "unified";
  if (/^(ztestsapling|zs)/.test(address)) return "sapling";
  if (/^(tm|t1|t3)/.test(address)) return "transparent";
  return "unknown";
}

const zats = (n: number) => (n / 1e8).toFixed(8);

export async function getNotaryStatus(): Promise<ZcashNotaryStatus> {
  const config = getZcashConfig();
  const type = addressType(config.notaryAddress);
  const chainHeight = await getChainHeight(config.network);

  const base: ZcashNotaryStatus = {
    network: config.network,
    address: config.notaryAddress,
    addressType: type,
    isShielded: type === "unified" || type === "sapling",
    state: "not_configured",
    hasFunds: false,
    spendableZats: null,
    spendable: null,
    pendingZats: null,
    anchorAmountZats: null,
    anchorsSent: null,
    ownsNotaryAddress: "unknown",
    walletHeight: null,
    chainHeight,
    statusNote: "",
    lastChecked: new Date().toISOString(),
  };

  if (!config.notaryAddress) {
    return { ...base, statusNote: "ZCASH_NOTARY_ADDRESS is not set." };
  }
  if (!isNotaryConfigured()) {
    return {
      ...base,
      statusNote: "Notary service not configured (ZCASH_NOTARY_SIDECAR_URL / ZCASH_NOTARY_SIDECAR_TOKEN). Records are fingerprinted but not anchored.",
    };
  }

  try {
    const health = await getSidecarHealth();
    if (!health.ready) {
      return { ...base, state: "wallet_not_ready", ownsNotaryAddress: health.ownsNotaryAddress, statusNote: health.reason };
    }

    const wallet = await getSidecarWalletStatus();
    const common = {
      ...base,
      ownsNotaryAddress: wallet.ownsNotaryAddress,
      spendableZats: wallet.spendableZats,
      spendable: wallet.spendableZats === null ? null : zats(wallet.spendableZats),
      pendingZats: wallet.pendingZats ?? null,
      anchorAmountZats: wallet.anchorAmountZats,
      anchorsSent: wallet.anchorsSent,
      walletHeight: wallet.walletHeight,
    };

    if (wallet.spendableZats === null) {
      return { ...common, state: "unknown_balance", statusNote: "Notary wallet is online; its balance format wasn't recognised. Anchoring will report if funds are missing." };
    }
    if (wallet.spendableZats <= 0 && (wallet.pendingZats ?? 0) > 0) {
      return {
        ...common,
        state: "confirming",
        hasFunds: true,
        statusNote: `${zats(wallet.pendingZats ?? 0)} TAZ is change from the last anchor, awaiting confirmations (a few minutes). New anchors wait for it automatically.`,
      };
    }
    if (wallet.spendableZats <= 0) {
      return { ...common, state: "needs_funds", statusNote: "Notary wallet is online but has no spendable TAZ. Fund the notary address to start anchoring." };
    }
    return { ...common, state: "ready", hasFunds: true, statusNote: "Notary wallet is funded and anchoring records on-chain." };
  } catch (err) {
    const code = err instanceof NotaryError ? err.code : "sidecar_unreachable";
    if (code === "wallet_not_ready") {
      return { ...base, state: "wallet_not_ready", statusNote: err instanceof Error ? err.message : "Wallet not ready." };
    }
    return { ...base, state: "offline", statusNote: "Notary service is unreachable. Start it with `npm run notary:sidecar`." };
  }
}
