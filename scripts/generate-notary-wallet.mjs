/**
 * Script to generate OmniCura Zcash Testnet Notary Wallet Keypair
 */

import { generateZcashTestnetKeypair, validateZcashAddress } from "../src/services/zcash/wallet.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");

console.log("=== OMNICURA ZCASH TESTNET NOTARY WALLET GENERATOR ===\n");

// Generate keypair
const keypair = generateZcashTestnetKeypair();
const validation = validateZcashAddress(keypair.address, "testnet");

console.log("Network:              Zcash Testnet");
console.log("Format:               Transparent P2PKH");
console.log("Notary Address:      ", keypair.address);
console.log("Address Valid:       ", validation.isValid, `(${validation.type})`);
console.log("Private Key (WIF):   ", keypair.wif);
console.log("Public Key (Hex):    ", keypair.publicKeyHex);
console.log("\n======================================================\n");

// Check if .env.local already has ZCASH_NOTARY_ADDRESS
let envContent = "";
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf8");
}

if (!envContent.includes("ZCASH_NOTARY_ADDRESS")) {
  const zcashEnvBlock = `
# Zcash Testnet Notary Configuration (Generated Phase 5)
ZCASH_NETWORK=testnet
ZCASH_LIGHTWALLETD_URL=https://testnet.lightwalletd.com:9067
ZCASH_NOTARY_ADDRESS=${keypair.address}
ZCASH_NOTARY_PRIVATE_KEY=${keypair.wif}
`;
  fs.appendFileSync(envPath, zcashEnvBlock, "utf8");
  console.log("✓ Successfully saved notary configuration to .env.local");
} else {
  console.log("ℹ .env.local already contains Zcash notary variables. Leaving existing values intact.");
}
