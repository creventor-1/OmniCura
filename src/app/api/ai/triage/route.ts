import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TriageMessageSchema } from "@/schemas/triage";
import { processTriageConversation } from "@/services/gemini/triage";

const RequestBodySchema = z.object({
  messages: z.array(TriageMessageSchema).min(1),
  healthProfile: z
    .object({
      age: z.number().optional(),
      sex: z.string().optional(),
      allergies: z.array(z.string()).optional(),
      chronicConditions: z.array(z.string()).optional(),
      currentMedications: z.array(z.string()).optional(),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parseResult = RequestBodySchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload. Ensure messages is a non-empty array.",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { messages, healthProfile } = parseResult.data;
    const result = await processTriageConversation(messages, healthProfile);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Unable to process triage at this time.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[API_TRIAGE_ROUTE_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error while processing triage request.",
      },
      { status: 500 }
    );
  }
}
