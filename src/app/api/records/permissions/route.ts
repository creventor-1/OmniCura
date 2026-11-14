import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { computeOwnershipEventHash } from "@/services/crypto/record-hasher";

const PermissionActionSchema = z.object({
  action: z.enum(["grant", "revoke", "restore"]),
  userId: z.string().optional().default("patient-current"),
  grantId: z.string().optional(),
  granteeEntity: z.string().optional(),
  accessLevel: z.enum(["read", "emergency_only"]).optional().default("read"),
  recordId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = PermissionActionSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid permission payload.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { action, userId, grantId, granteeEntity, accessLevel, recordId } = parseResult.data;
    const now = new Date().toISOString();

    const eventHash = computeOwnershipEventHash({
      recordId: recordId || "all-records",
      userId,
      granteeEntity: granteeEntity || grantId || "Medical Entity",
      accessLevel,
      action: action === "revoke" ? "revoke" : "grant",
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      action,
      eventHash,
      timestamp: now,
      status: action === "revoke" ? "revoked" : "granted",
    });
  } catch (error: unknown) {
    console.error("[PERMISSIONS_API_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process permission request.",
      },
      { status: 500 }
    );
  }
}
