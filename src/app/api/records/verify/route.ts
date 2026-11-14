import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAssessmentIntegrity } from "@/services/crypto/record-hasher";
import { AssessmentResponseSchema } from "@/schemas/triage";

const VerifyRequestSchema = z.object({
  patientId: z.string().optional().default("anonymous-patient"),
  symptoms: z.string(),
  assessment: AssessmentResponseSchema,
  timestamp: z.string(),
  storedHash: z.string().nullable().optional(),
  // For demonstration / testing: allows simulating field tampering
  simulateTamperField: z
    .object({
      field: z.enum(["severity", "recommendedAction", "symptoms"]),
      tamperedValue: z.string(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = VerifyRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid verification payload.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { patientId, symptoms, assessment, timestamp, storedHash, simulateTamperField } =
      parseResult.data;

    let testSymptoms = symptoms;
    const testAssessment = { ...assessment };

    // Apply simulated tampering if requested (for testing/demo verification)
    if (simulateTamperField) {
      if (simulateTamperField.field === "severity") {
        testAssessment.severity = simulateTamperField.tamperedValue as
          | "non-urgent"
          | "urgent"
          | "emergency";
      } else if (simulateTamperField.field === "recommendedAction") {
        testAssessment.recommendedAction = simulateTamperField.tamperedValue;
      } else if (simulateTamperField.field === "symptoms") {
        testSymptoms = simulateTamperField.tamperedValue;
      }
    }

    const result = verifyAssessmentIntegrity({
      patientId,
      symptoms: testSymptoms,
      assessment: testAssessment,
      timestamp,
      storedHash,
    });

    return NextResponse.json({
      success: true,
      verification: result,
      tampered: !result.isValid && result.status === "tampered",
    });
  } catch (error: unknown) {
    console.error("[VERIFY_RECORD_API_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during record verification.",
      },
      { status: 500 }
    );
  }
}
