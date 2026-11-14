/**
 * OmniCura Zcash configuration (server-side).
 *
 * The notary is a shielded unified address (utest1…). Its spending key never
 * enters this app: anchoring transactions are created by the notary sidecar
 * (scripts/zcash-notary-sidecar.mjs, wrapping zingo-cli), which this app calls
 * over HTTP with a shared token.
 */

export type ZcashNetwork = "testnet" | "mainnet";

export interface ZcashConfig {
  network: ZcashNetwork;
  notaryAddress: string;
  lightwalletdUrl: string;
  sidecarUrl: string;
  sidecarToken: string;
  faucets: string[];
}

export const ZCASH_TESTNET_DEFAULTS = {
  network: "testnet" as ZcashNetwork,
  lightwalletdUrl: "https://testnet.zec.rocks:443",
  faucets: [
    "https://zcashfaucet.jinolabs.xyz",
    "https://fauzec.com",
    "https://faucet.zecpages.com",
  ],
};

export function getZcashConfig(): ZcashConfig {
  const network: ZcashNetwork = process.env.ZCASH_NETWORK === "mainnet" ? "mainnet" : "testnet";
  return {
    network,
    notaryAddress: (process.env.ZCASH_NOTARY_ADDRESS || "").trim(),
    lightwalletdUrl: (process.env.ZCASH_LIGHTWALLETD_URL || ZCASH_TESTNET_DEFAULTS.lightwalletdUrl).trim(),
    sidecarUrl: (process.env.ZCASH_NOTARY_SIDECAR_URL || "").trim().replace(/\/+$/, ""),
    sidecarToken: (process.env.ZCASH_NOTARY_SIDECAR_TOKEN || "").trim(),
    faucets: ZCASH_TESTNET_DEFAULTS.faucets,
  };
}

/**
 * Block explorer link for a transaction. SoChain indexes Zcash testnet
 * (ZECTEST), including shielded transactions; Blockchair only covers mainnet.
 */
export function getZcashExplorerUrl(txid: string, network: ZcashNetwork = "testnet"): string {
  return network === "testnet"
    ? `https://sochain.com/tx/ZECTEST/${txid}`
    : `https://blockchair.com/zcash/transaction/${txid}`;
}

/** True when the app knows the notary address AND how to reach the sidecar that can spend from it. */
export function isNotaryConfigured(): boolean {
  const c = getZcashConfig();
  return Boolean(c.notaryAddress && c.sidecarUrl && c.sidecarToken);
}
