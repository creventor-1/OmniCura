import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AssessmentResponseSchema } from "@/schemas/triage";
import { anchorAssessmentToZcash, anchorRecordHash, getAnchorStatus } from "@/services/zcash/anchor";
import { computeOwnershipEventHash } from "@/services/crypto/record-hasher";

/**
 * POST /api/records/anchor
 *   Body: { record: { user_id?, symptoms, created_at, assessment_result } }
 *      or { consentEvent: { recordId, userId, granteeEntity, accessLevel, action, timestamp } }
 *   The hash is recomputed here; any client-supplied hash/txid is ignored.
 *   Response: { status: "pending" | "unanchored" | "failed", recordHash, txid?, explorerUrl?, reason?, message? }
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
  const txid = req.nextUrl.searchParams.get("txid") || "";
  if (!/^[0-9a-f]{64}$/i.test(txid)) {
    return NextResponse.json({ error: "txid must be 64 hex characters." }, { status: 400 });
  }
  const status = await getAnchorStatus(txid.toLowerCase());
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}
