import { NextRequest, NextResponse } from "next/server";
import { MedicationScanRequestSchema } from "@/schemas/vision";
import { scanMedicationImage } from "@/services/gemini/vision";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = MedicationScanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid medication scan request payload.",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { imageBase64, mimeType, additionalNotes } = parseResult.data;

    // Call Gemini Multimodal Medication Scanner Service
    const scanResult = await scanMedicationImage({
      imageBase64,
      mimeType,
      additionalNotes,
    });

    return NextResponse.json({
      success: true,
      data: scanResult,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error during medication scan.";
    console.error("[API_MEDICATION_ERROR]:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
