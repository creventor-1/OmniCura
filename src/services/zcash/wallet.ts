/**
 * OmniCura Zcash Notary Wallet & Cryptographic Utilities
 * 
 * Implements Zcash key derivation and transparent testnet address generation (P2PKH tm...).
 * Conforms to Zcash Protocol Specification Section 5.6 (Transparent Addresses).
 */

import crypto from "crypto";
import { ZcashNetwork } from "./config";

const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

/**
 * Base58 encode a raw Buffer
 */
export function encodeBase58(buffer: Buffer): string {
  const digits = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; ++j) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) digits.push(0);
  return digits.reverse().map((d) => BASE58_ALPHABET[d]).join("");
}

/**
 * Base58 decode a string into Buffer
 */
export function decodeBase58(str: string): Buffer {
  const bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const value = BASE58_ALPHABET.indexOf(c);
    if (value === -1) throw new Error(`Invalid Base58 character: ${c}`);
    for (let j = 0; j < bytes.length; j++) bytes[j] *= 58;
    bytes[0] += value;
    let carry = 0;
    for (let j = 0; j < bytes.length; ++j) {
      bytes[j] += carry;
      carry = bytes[j] >> 8;
      bytes[j] &= 0xff;
    }
    while (carry) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === BASE58_ALPHABET[0]; i++) bytes.push(0);
  return Buffer.from(bytes.reverse());
}

/**
 * Encodes payload with 4-byte double SHA-256 checksum
 */
export function base58Check(payload: Buffer): string {
  const hash1 = crypto.createHash("sha256").update(payload).digest();
  const hash2 = crypto.createHash("sha256").update(hash1).digest();
  const checksum = hash2.subarray(0, 4);
  return encodeBase58(Buffer.concat([payload, checksum]));
}

/**
 * Validates and unpacks a Base58Check string
 */
export function verifyBase58Check(encoded: string): { isValid: boolean; payload?: Buffer } {
  try {
    const decoded = decodeBase58(encoded);
    if (decoded.length < 5) return { isValid: false };
    const payload = decoded.subarray(0, decoded.length - 4);
    const checksum = decoded.subarray(decoded.length - 4);

    const hash1 = crypto.createHash("sha256").update(payload).digest();
    const hash2 = crypto.createHash("sha256").update(hash1).digest();
    const expectedChecksum = hash2.subarray(0, 4);

    const isValid = checksum.equals(expectedChecksum);
    return { isValid, payload: isValid ? payload : undefined };
  } catch {
    return { isValid: false };
  }
}

export interface GeneratedZcashKeypair {
  address: string;
  wif: string;
  publicKeyHex: string;
  privateKeyHex: string;
  network: ZcashNetwork;
  format: "transparent_p2pkh";
}

/**
 * Generates a valid Zcash Testnet keypair and transparent P2PKH address (`tm...`).
 * Uses secp256k1 curve with standard hash160 and Zcash testnet prefix [0x1D, 0x25].
 */
export function generateZcashTestnetKeypair(): GeneratedZcashKeypair {
  // 1. Generate secp256k1 EC Keypair
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "secp256k1",
  });

  // 2. Export raw private key scalar (32 bytes)
  const rawPriv = privateKey.export({ format: "jwk" });
  if (!rawPriv.d) {
    throw new Error("Failed to export private key scalar");
  }
  const privScalarBuf = Buffer.from(rawPriv.d, "base64url");
  // Pad to 32 bytes if necessary
  const privKey32 = Buffer.alloc(32);
  privScalarBuf.copy(privKey32, 32 - privScalarBuf.length);

  // 3. Export public key and compress it (33 bytes)
  // SPKI DER format ends with 65-byte uncompressed public key: 0x04 || X (32B) || Y (32B)
  const spkiDer = publicKey.export({ type: "spki", format: "der" });
  const uncompressedPub = spkiDer.subarray(spkiDer.length - 65);
  const isEven = uncompressedPub[64] % 2 === 0;
  const prefixByte = isEven ? 0x02 : 0x03;
  const compressedPub = Buffer.concat([
    Buffer.from([prefixByte]),
    uncompressedPub.subarray(1, 33),
  ]);

  // 4. Hash160 = RIPEMD160(SHA256(compressedPub))
  const sha = crypto.createHash("sha256").update(compressedPub).digest();
  const ripemd160 = crypto.createHash("ripemd160").update(sha).digest();

  // 5. Zcash Testnet Transparent P2PKH Prefix: 0x1D25 (two bytes)
  // Results in addresses starting with 'tm'
  const zcashTestnetP2PKHPrefix = Buffer.from([0x1d, 0x25]);
  const addressPayload = Buffer.concat([zcashTestnetP2PKHPrefix, ripemd160]);
  const address = base58Check(addressPayload);

  // 6. Testnet Private Key WIF (prefix 0xef, suffix 0x01 for compressed)
  const wifPayload = Buffer.concat([Buffer.from([0xef]), privKey32, Buffer.from([0x01])]);
  const wif = base58Check(wifPayload);

  return {
    address,
    wif,
    publicKeyHex: compressedPub.toString("hex"),
    privateKeyHex: privKey32.toString("hex"),
    network: "testnet",
    format: "transparent_p2pkh",
  };
}

/**
 * Validates a Zcash address format (transparent or shielded).
 */
export function validateZcashAddress(
  address: string,
  network: ZcashNetwork = "testnet"
): { isValid: boolean; type?: string; details?: string } {
  if (!address || typeof address !== "string") {
    return { isValid: false, details: "Address must be a non-empty string" };
  }

  const cleanAddr = address.trim();

  if (network === "testnet") {
    // Transparent P2PKH testnet address (tm...)
    if (cleanAddr.startsWith("tm")) {
      const res = verifyBase58Check(cleanAddr);
      if (!res.isValid || !res.payload) {
        return { isValid: false, details: "Invalid testnet Base58Check checksum" };
      }
      if (res.payload[0] === 0x1d && res.payload[1] === 0x25) {
        return { isValid: true, type: "testnet_transparent_p2pkh" };
      }
      return { isValid: false, details: "Unexpected testnet prefix bytes" };
    }

    // Unified testnet address (utest1...)
    if (cleanAddr.startsWith("utest1")) {
      return { isValid: true, type: "testnet_unified" };
    }

    // Sapling testnet address (ztestsapling...)
    if (cleanAddr.startsWith("ztestsapling")) {
      return { isValid: true, type: "testnet_sapling" };
    }

    return {
      isValid: false,
      details: "Testnet address must start with 'tm' (transparent), 'utest1' (unified), or 'ztestsapling' (sapling)",
    };
  }

  // Mainnet validation
  if (cleanAddr.startsWith("t1") || cleanAddr.startsWith("t3")) {
    const res = verifyBase58Check(cleanAddr);
    return res.isValid
      ? { isValid: true, type: "mainnet_transparent" }
      : { isValid: false, details: "Invalid mainnet Base58Check checksum" };
  }

  if (cleanAddr.startsWith("u1")) {
    return { isValid: true, type: "mainnet_unified" };
  }

  if (cleanAddr.startsWith("zs")) {
    return { isValid: true, type: "mainnet_sapling" };
  }

  return { isValid: false, details: "Unrecognized mainnet Zcash address prefix" };
}
