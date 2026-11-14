/**
 * OmniCura Cryptographic Record Hasher & Tamper Verification Engine
 * 
 * Provides deterministic canonical serialization and SHA-256 hashing for
 * healthcare AI assessments and patient ownership events.
 * 
 * Zero Personal Health Information (PHI) is exposed on-chain:
 * Only the 32-byte SHA-256 digest is anchored to Zcash.
 */

import type { AssessmentResponse } from "../../schemas/triage";

export interface CanonicalAssessmentPayload {
  patientId: string;
  symptoms: string;
  severity: "non-urgent" | "urgent" | "emergency";
  recommendedAction: string;
  possibleConditions: string[];
  firstAidSteps: string[];
  warningSigns: string[];
  timestamp: string;
  schemaVersion: string;
}

export interface VerificationResult {
  isValid: boolean;
  computedHash: string;
  storedHash: string | null;
  status: "verified" | "tampered" | "unverified";
  timestamp: string;
  details: string;
}

export interface OwnershipEventPayload {
  recordId: string;
  userId: string;
  granteeEntity: string;
  accessLevel: "read" | "emergency_only";
  action: "grant" | "revoke" | "share_invite" | "request" | "approve" | "deny" | "view" | string;
  timestamp: string;
}

/**
 * Converts a JS string to a "binary string" whose char codes are its UTF-8 bytes.
 * SHA-256 is defined over bytes; hashing UTF-16 code units directly would make
 * any non-ASCII character (–, —, °, accents) hash differently from every
 * standard SHA-256 implementation.
 */
function toUtf8ByteString(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/**
 * Pure TypeScript SHA-256 (FIPS 180-4) over the UTF-8 encoding of the input.
 * One implementation for every runtime (browser, Node.js, Edge), so a hash
 * computed in the browser always equals the hash recomputed on the server.
 */
export function sha256Hex(input: string): string {
  const ascii = toUtf8ByteString(input);
  let result = "";
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const compositeBitLength = asciiBitLength;
  words[compositeBitLength >> 5] |= 0x80 << (24 - (compositeBitLength % 32));
  words[(((compositeBitLength + 64) >> 9) << 4) + 15] = compositeBitLength;

  for (let i = 0; i < ascii.length; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << (24 - ((i % 4) * 8));
  }

  const w = new Array(64);

  for (let i = 0; i < words.length; i += 16) {
    const oldHash = [...hash];

    for (let j = 0; j < 64; j++) {
      const w15 = w[j - 15];
      const s0 =
        ((w15 >>> 7) | (w15 << 25)) ^
        ((w15 >>> 18) | (w15 << 14)) ^
        (w15 >>> 3);

      const w2 = w[j - 2];
      const s1 =
        ((w2 >>> 17) | (w2 << 15)) ^
        ((w2 >>> 19) | (w2 << 13)) ^
        (w2 >>> 10);

      w[j] =
        j < 16
          ? words[j + i] || 0
          : ((w[j - 16] + s0 + w[j - 7] + s1) | 0);

      const s_1 =
        ((hash[4] >>> 6) | (hash[4] << 26)) ^
        ((hash[4] >>> 11) | (hash[4] << 21)) ^
        ((hash[4] >>> 25) | (hash[4] << 7));

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 = (hash[7] + s_1 + ch + k[j] + w[j]) | 0;

      const s_0 =
        ((hash[0] >>> 2) | (hash[0] << 30)) ^
        ((hash[0] >>> 13) | (hash[0] << 19)) ^
        ((hash[0] >>> 22) | (hash[0] << 10));

      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s_0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    for (let j = 0; j < 8; j++) {
      hash[j] = (hash[j] + oldHash[j]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }

  return result;
}

/**
 * Builds deterministic canonical JSON string with strictly sorted keys.
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJson(item)).join(",")}]`;
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = sortedKeys.map(
    (key) =>
      `${JSON.stringify(key)}:${canonicalizeJson((obj as Record<string, unknown>)[key])}`
  );

  return `{${entries.join(",")}}`;
}

/**
 * Constructs canonical payload from assessment parameters.
 */
export function buildCanonicalAssessmentPayload(params: {
  patientId: string;
  symptoms: string;
  assessment: AssessmentResponse;
  timestamp: string;
}): CanonicalAssessmentPayload {
  const { patientId, symptoms, assessment, timestamp } = params;

  return {
    patientId: patientId.trim(),
    symptoms: symptoms.trim(),
    severity: assessment.severity,
    recommendedAction: assessment.recommendedAction.trim(),
    possibleConditions: (assessment.possibleConditions || []).map((c) =>
      typeof c === "string" ? c.trim() : (c as { condition?: string })?.condition?.trim() || JSON.stringify(c)
    ),
    firstAidSteps: (assessment.firstAidSteps || []).map((s) => s.trim()),
    warningSigns: (assessment.warningSigns || []).map((w) => w.trim()),
    timestamp: new Date(timestamp).toISOString(),
    schemaVersion: "omnicura-v1",
  };
}

/**
 * Computes deterministic SHA-256 hash for an assessment.
 */
export function computeAssessmentHash(params: {
  patientId: string;
  symptoms: string;
  assessment: AssessmentResponse;
  timestamp: string;
}): string {
  const canonical = buildCanonicalAssessmentPayload(params);
  const serialized = canonicalizeJson(canonical);
  return sha256Hex(serialized);
}

/**
 * Computes hash for an ownership/permission event.
 */
export function computeOwnershipEventHash(event: OwnershipEventPayload): string {
  const normalized = {
    recordId: event.recordId,
    userId: event.userId,
    granteeEntity: event.granteeEntity.trim(),
    accessLevel: event.accessLevel,
    action: event.action,
    timestamp: new Date(event.timestamp).toISOString(),
    schemaVersion: "omnicura-ownership-v1",
  };
  return sha256Hex(canonicalizeJson(normalized));
}

/**
 * Verifies whether an assessment record matches its stored cryptographic hash.
 * Detects any tampering in symptoms, urgency, diagnosis, or recommendations.
 */
export function verifyAssessmentIntegrity(params: {
  patientId: string;
  symptoms: string;
  assessment: AssessmentResponse;
  timestamp: string;
  storedHash: string | null | undefined;
}): VerificationResult {
  const { storedHash } = params;
  const computedHash = computeAssessmentHash(params);

  if (!storedHash) {
    return {
      isValid: false,
      computedHash,
      storedHash: null,
      status: "unverified",
      timestamp: new Date().toISOString(),
      details: "No cryptographic anchor registered for this clinical record.",
    };
  }

  const matches = computedHash.toLowerCase() === storedHash.toLowerCase();

  return {
    isValid: matches,
    computedHash,
    storedHash,
    status: matches ? "verified" : "tampered",
    timestamp: new Date().toISOString(),
    details: matches
      ? "Cryptographic integrity confirmed. Record matches its registered hash exactly."
      : "TAMPERING DETECTED: Clinical record content does not match its registered cryptographic hash.",
  };
}
