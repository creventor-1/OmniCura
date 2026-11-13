import { NextRequest, NextResponse } from "next/server";
import { ImageAnalysisRequestSchema } from "@/schemas/vision";
import { checkRedFlags } from "@/lib/red-flags";
import { analyzeSymptomImage } from "@/services/gemini/vision";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = ImageAnalysisRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid image analysis request payload.",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { imageBase64, mimeType, additionalNotes, healthProfile } = parseResult.data;

    // MANDATORY DETERMINISTIC RED-FLAG CHECK on any user text accompanying the image
    if (additionalNotes) {
      const redFlagResult = checkRedFlags(additionalNotes);
      if (redFlagResult.isEmergency) {
        return NextResponse.json({
          success: true,
          isEmergency: true,
          emergencyResult: redFlagResult,
        });
      }
    }

    // Call Gemini Multimodal Vision Service
    const analysis = await analyzeSymptomImage({
      imageBase64,
      mimeType,
      additionalNotes,
      healthProfile,
    });

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error during image analysis.";
    console.error("[API_VISION_ERROR]:", message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
