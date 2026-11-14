import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AssessmentResponseSchema } from "@/schemas/triage";
import { anchorAssessmentToZcash, anchorRecordHash, checkAnchorMemo, getAnchorJobStatus, getAnchorStatus } from "@/services/zcash/anchor";
import { computeOwnershipEventHash } from "@/services/crypto/record-hasher";

/**
 * POST /api/records/anchor
 *   Body: { record: { user_id?, symptoms, created_at, assessment_result } }
 *      or { consentEvent: { recordId, userId, granteeEntity, accessLevel, action, timestamp } }
 *   The hash is recomputed here; any client-supplied hash/txid is ignored.
 *   Response: { status: "pending" | "sending" | "unanchored" | "failed", recordHash, txid?, explorerUrl?, reason?, message? }
 *   "sending" = the notary accepted the job and is building the transaction; poll GET ?hash=.
 *
 * GET /api/records/anchor?memo=<txid>&hash=<64-hex>
 *   Decrypts the transaction's memo (via the notary wallet) and compares its fingerprint with `hash`:
 *   { status: "match" | "mismatch" | "indexing" | "not_found" | "unavailable", memo?, memoHash?, blockHeight?, … }
 *   "indexing" = ask again in a few seconds.
 *
 * GET /api/records/anchor?hash=<64-hex>
 *   Progress of a send: same shape as POST, or { status: "not_found" } (start it again — POST is idempotent).
 *
 * GET /api/records/anchor?txid=<64-hex>
 *   Response: { status: "confirmed" | "pending" | "not_found" | "unknown", confirmations, blockHeight, blockTime, explorerUrl }
 */

const isoTimestamp = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "must be an ISO timestamp");

const AnchorRequestSchema = z.union([
  z.object({
    record: z.object({
      user_id: z.string().max(128).optional(),
      symptoms: z.string().min(1).max(5000),
      created_at: isoTimestamp,
      assessment_result: AssessmentResponseSchema,
    }),
  }),
  z.object({
    consentEvent: z.object({
      recordId: z.string().min(1).max(200),
      userId: z.string().min(1).max(200),
      granteeEntity: z.string().min(1).max(300),
      accessLevel: z.enum(["read", "emergency_only"]),
      action: z.enum(["grant", "revoke", "share_invite", "request", "approve", "deny"]),
      timestamp: isoTimestamp,
    }),
  }),
]);

// Each anchor spends notary funds — throttle per IP and globally (in-memory, per server instance).
const perIp = new Map<string, number[]>();
let globalWindow: number[] = [];
const PER_IP_PER_MIN = 6;
const GLOBAL_PER_HOUR = 60;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const ipHits = (perIp.get(ip) || []).filter((t) => now - t < 60_000);
  globalWindow = globalWindow.filter((t) => now - t < 3_600_000);
  if (ipHits.length >= PER_IP_PER_MIN || globalWindow.length >= GLOBAL_PER_HOUR) return true;
  ipHits.push(now);
  globalWindow.push(now);
  perIp.set(ip, ipHits);
  return false;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ status: "failed", error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = AnchorRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { status: "failed", error: "Invalid record. A complete assessment is required.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { status: "failed", reason: "rate_limited", message: "Too many anchoring requests. Try again shortly." },
      { status: 429 }
    );
  }

  if ("consentEvent" in parsed.data) {
    const event = parsed.data.consentEvent;
    const eventHash = computeOwnershipEventHash(event);
    const result = await anchorRecordHash(eventHash, event.timestamp, "consent");
    return NextResponse.json(result, { status: 200 });
  }

  const result = await anchorAssessmentToZcash(parsed.data.record);
  return NextResponse.json(result, { status: 200 });
}

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get("hash");
  const memoTxid = req.nextUrl.searchParams.get("memo");
  if (memoTxid !== null) {
    if (!/^[0-9a-f]{64}$/i.test(memoTxid) || !/^[0-9a-f]{64}$/i.test(hash || "")) {
      return NextResponse.json({ error: "memo (txid) and hash must both be 64 hex characters." }, { status: 400 });
    }
    const result = await checkAnchorMemo(memoTxid.toLowerCase(), (hash as string).toLowerCase());
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  }
  if (hash !== null) {
    if (!/^[0-9a-f]{64}$/i.test(hash)) {
      return NextResponse.json({ error: "hash must be 64 hex characters." }, { status: 400 });
    }
    const job = await getAnchorJobStatus(hash.toLowerCase());
    return NextResponse.json(job ?? { status: "not_found", recordHash: hash.toLowerCase() }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const txid = req.nextUrl.searchParams.get("txid") || "";
  if (!/^[0-9a-f]{64}$/i.test(txid)) {
    return NextResponse.json({ error: "txid must be 64 hex characters." }, { status: 400 });
  }
  const status = await getAnchorStatus(txid.toLowerCase());
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
