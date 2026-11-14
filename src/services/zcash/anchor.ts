/**
 * OmniCura Zcash anchoring service (server-side).
 *
 * Flow: record → canonical SHA-256 (computed HERE, never trusted from the client)
 *       → memo `omnicura:v1:assessment:<hash>:<timestamp>`
 *       → notary sidecar sends a shielded self-transfer to the utest1 notary address
 *       → real txid returned → confirmations tracked via a public explorer.
 *
 * No patient data is put on-chain: only the 32-byte digest, inside an encrypted
 * shielded memo. Nothing here fabricates a txid, block height or "verified" state.
 */

import type { StoredAssessment } from "../../types/database";
import type { AssessmentResponse } from "../../schemas/triage";
import { computeAssessmentHash, verifyAssessmentIntegrity } from "../crypto/record-hasher";
import { getZcashConfig, getZcashExplorerUrl, isNotaryConfigured } from "./config";
import { lookupTransaction, type ChainTxState } from "./chain";
import { NotaryError, getAnchorJob, getTransactionMemo, startAnchorTransaction, type NotaryErrorCode } from "./notary-client";

/**
 * pending: broadcast, txid known (awaiting confirmation) · sending: the notary is
 * building the transaction, poll by hash · unanchored: no notary · failed: errored.
 */
export type AnchorRequestStatus = "pending" | "sending" | "unanchored" | "failed";

export interface AnchorRequestResult {
  status: AnchorRequestStatus;
  recordHash: string;
  memo: string;
  txid?: string;
  explorerUrl?: string;
  reason?: NotaryErrorCode;
  message?: string;
}

export type AnchorChainStatus = "confirmed" | "pending" | "not_found" | "unknown";

export interface AnchorStatusResult {
  txid: string;
  status: AnchorChainStatus;
  confirmations: number;
  blockHeight: number | null;
  blockTime: string | null;
  explorerUrl: string;
}

export type AnchorKind = "assessment" | "consent";

/** Memo format: omnicura:v1:<kind>:<sha256_hex>:<iso_timestamp> (≤ 512 bytes). */
export function createAttestationMemo(recordHash: string, timestamp?: string, kind: AnchorKind = "assessment"): string {
  const ts = new Date(timestamp || Date.now()).toISOString();
  return `omnicura:v1:${kind}:${recordHash}:${ts}`;
}

/** Hash exactly as the client and verifier do: patient id as stored, timestamp as stored. */
export function hashStoredAssessment(record: Pick<StoredAssessment, "user_id" | "symptoms" | "created_at" | "assessment_result">): string {
  return computeAssessmentHash({
    patientId: record.user_id || "anonymous-patient",
    symptoms: record.symptoms,
    assessment: record.assessment_result as unknown as AssessmentResponse,
    timestamp: record.created_at,
  });
}

const FRIENDLY: Record<NotaryErrorCode, string> = {
  not_configured: "Zcash notary is not configured on this server.",
  sidecar_unreachable: "Zcash notary service is offline.",
  wallet_not_ready: "Zcash notary wallet is still syncing or not initialised.",
  insufficient_funds: "Zcash notary wallet needs testnet funds (TAZ) to anchor records.",
  funds_confirming: "Zcash notary funds are still confirming from a previous anchor; this will be retried.",
  indexer_unreachable: "Zcash network indexer is unreachable right now.",
  send_timeout: "Zcash transaction took too long to build; it will be retried.",
  send_failed: "Zcash transaction could not be sent.",
  invalid_anchor_request: "Anchor request was rejected as malformed.",
  unauthorised: "Notary service rejected the app's credentials.",
};

/**
 * Starts anchoring a record hash on Zcash and returns without waiting for the
 * send (see getAnchorJobStatus). Never throws: anchoring must never block or
 * break the clinical flow. Returns "unanchored" when no notary is set up,
 * "failed" when the attempt errored, "sending" while the notary builds the
 * transaction, and "pending" with the real txid once it has been broadcast.
 */
export async function anchorRecordHash(
  recordHash: string,
  timestamp: string,
  kind: AnchorKind = "assessment"
): Promise<AnchorRequestResult> {
  const memo = createAttestationMemo(recordHash, timestamp, kind);

  if (!isNotaryConfigured()) {
    return { status: "unanchored", recordHash, memo, reason: "not_configured", message: FRIENDLY.not_configured };
  }

  try {
    const job = await startAnchorTransaction(recordHash, memo);
    return jobToResult(job, recordHash, memo);
  } catch (err) {
    return errorToResult(err, recordHash, memo);
  }
}

function jobToResult(job: Awaited<ReturnType<typeof getAnchorJob>>, recordHash: string, memo: string): AnchorRequestResult {
  if (job.state === "sent") {
    const { network } = getZcashConfig();
    return { status: "pending", recordHash, memo: job.memo || memo, txid: job.txid, explorerUrl: getZcashExplorerUrl(job.txid, network) };
  }
  if (job.state === "failed") {
    return { status: "failed", recordHash, memo, reason: job.error, message: FRIENDLY[job.error] ?? FRIENDLY.send_failed };
  }
  return { status: "sending", recordHash, memo, message: "The notary is building the shielded transaction (1.5–5 min)." };
}

function errorToResult(err: unknown, recordHash: string, memo: string): AnchorRequestResult {
  const code: NotaryErrorCode = err instanceof NotaryError ? err.code : "send_failed";
  const status: AnchorRequestStatus = code === "not_configured" ? "unanchored" : "failed";
  return { status, recordHash, memo, reason: code, message: FRIENDLY[code] ?? FRIENDLY.send_failed };
}

/**
 * Progress of a send started by anchorRecordHash. `null` means the notary has no
 * record of it (e.g. it restarted mid-send); the caller simply starts it again,
 * which is safe because the notary de-duplicates by hash.
 */
export async function getAnchorJobStatus(recordHash: string): Promise<AnchorRequestResult | null> {
  if (!isNotaryConfigured()) {
    return { status: "unanchored", recordHash, memo: "", reason: "not_configured", message: FRIENDLY.not_configured };
  }
  try {
    const job = await getAnchorJob(recordHash);
    return job.state === "not_found" ? null : jobToResult(job, recordHash, "");
  } catch (err) {
    return errorToResult(err, recordHash, "");
  }
}

/** Convenience wrapper: hash a stored record server-side, then anchor it. */
export async function anchorAssessmentToZcash(
  record: Pick<StoredAssessment, "user_id" | "symptoms" | "created_at" | "assessment_result">
): Promise<AnchorRequestResult> {
  const recordHash = hashStoredAssessment(record);
  return anchorRecordHash(recordHash, record.created_at);
}

/** Looks a txid up on-chain. "confirmed" only when a block actually contains it. */
export async function getAnchorStatus(txid: string): Promise<AnchorStatusResult> {
  const { network } = getZcashConfig();
  const chain = await lookupTransaction(txid, network);
  const map: Record<ChainTxState, AnchorChainStatus> = {
    confirmed: "confirmed",
    mempool: "pending",
    not_found: "not_found",
    unknown: "unknown",
  };
  return {
    txid,
    status: map[chain.state],
    confirmations: chain.confirmations,
    blockHeight: chain.blockHeight,
    blockTime: chain.blockTime,
    explorerUrl: getZcashExplorerUrl(txid, network),
  };
}

export interface MemoCheckResult {
  /**
   * match: the memo inside the transaction carries exactly the expected fingerprint ·
   * mismatch: it carries a different one · indexing: the notary is decrypting, ask again ·
   * not_found: no OmniCura memo in that transaction · unavailable: notary not reachable.
   */
  status: "match" | "mismatch" | "indexing" | "not_found" | "unavailable";
  txid: string;
  expectedHash: string;
  memo?: string;
  memoKind?: AnchorKind;
  memoHash?: string;
  memoTimestamp?: string;
  /** The notary wallet's view of the transaction: confirmed / pending / failed … */
  walletStatus?: string;
  blockHeight?: number | null;
  message?: string;
}

const MEMO_PARSE = /^omnicura:v1:(assessment|consent):([0-9a-f]{64}):(.+)$/;

/**
 * Reads the encrypted memo of an anchoring transaction (decrypted by the notary's
 * wallet) and compares the fingerprint inside it with the one expected for a record.
 */
export async function checkAnchorMemo(txid: string, expectedHash: string): Promise<MemoCheckResult> {
  const base = { txid, expectedHash };
  if (!isNotaryConfigured()) {
    return { ...base, status: "unavailable", message: FRIENDLY.not_configured };
  }
  try {
    const found = await getTransactionMemo(txid);
    if (found.state === "indexing") {
      return { ...base, status: "indexing", message: "The notary wallet is decrypting its transactions." };
    }
    if (found.state === "not_found") {
      return { ...base, status: "not_found", message: "This transaction has no OmniCura memo in the notary wallet." };
    }
    const m = found.memo.match(MEMO_PARSE);
    if (!m) return { ...base, status: "not_found", memo: found.memo, message: "The memo is not an OmniCura anchor." };
    return {
      ...base,
      status: m[2] === expectedHash ? "match" : "mismatch",
      memo: found.memo,
      memoKind: m[1] as AnchorKind,
      memoHash: m[2],
      memoTimestamp: m[3],
      walletStatus: found.walletStatus,
      blockHeight: found.blockHeight,
    };
  } catch (err) {
    const code: NotaryErrorCode = err instanceof NotaryError ? err.code : "sidecar_unreachable";
    return { ...base, status: "unavailable", message: FRIENDLY[code] ?? FRIENDLY.sidecar_unreachable };
  }
}

/**
 * Integrity check of a stored record against its registered hash.
 * (Chain confirmation is a separate question — see getAnchorStatus.)
 */
export function verifyAssessmentAnchor(record: StoredAssessment): {
  isValid: boolean;
  status: "verified" | "tampered" | "pending";
  recordHash: string;
  expectedHash?: string;
  zcashTxid?: string;
  explorerUrl?: string;
  details: string;
} {
  const { network } = getZcashConfig();

  if (!record.record_hash) {
    return {
      isValid: false,
      status: "pending",
      recordHash: "",
      details: "No cryptographic hash has been registered for this record.",
    };
  }

  const integrity = verifyAssessmentIntegrity({
    patientId: record.user_id || "anonymous-patient",
    symptoms: record.symptoms,
    assessment: record.assessment_result as unknown as AssessmentResponse,
    timestamp: record.created_at,
    storedHash: record.record_hash,
  });

  const txid = record.zcash_txid || undefined;
  const explorerUrl = txid ? getZcashExplorerUrl(txid, network) : undefined;

  if (!integrity.isValid) {
    return {
      isValid: false,
      status: "tampered",
      recordHash: integrity.computedHash,
      expectedHash: record.record_hash,
      zcashTxid: txid,
      explorerUrl,
      details: "TAMPERING DETECTED: Assessment data has been modified after its hash was registered.",
    };
  }

  return {
    isValid: true,
    status: "verified",
    recordHash: record.record_hash,
    zcashTxid: txid,
    explorerUrl,
    details: txid
      ? "Record matches its registered hash. Check the Zcash transaction for on-chain confirmation."
      : "Record matches its registered hash. It has not been anchored on Zcash yet.",
  };
}
