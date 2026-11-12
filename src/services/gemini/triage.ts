import { checkRedFlags } from "@/lib/red-flags";
import { generateWithFallback, GeminiContentItem } from "./client";
import { TRIAGE_SYSTEM_PROMPT, TRIAGE_RESPONSE_SCHEMA } from "./prompts";
import {
  TriageMessage,
  TriageTurnResponse,
  TriageTurnResponseSchema,
} from "@/schemas/triage";
import { RedFlagCheckResult } from "@/types";

export interface ProcessTriageResult {
  success: boolean;
  isEmergency: boolean;
  emergencyResult?: RedFlagCheckResult;
  data?: TriageTurnResponse;
  error?: string;
}

export async function processTriageConversation(
  messages: TriageMessage[],
  healthProfile?: {
    age?: number;
    sex?: string;
    allergies?: string[];
    chronicConditions?: string[];
    currentMedications?: string[];
  }
): Promise<ProcessTriageResult> {
  if (!messages || messages.length === 0) {
    return {
      success: false,
      isEmergency: false,
      error: "No messages provided in triage request.",
    };
  }

  // Find latest user message
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user");

  const latestText = lastUserMessage?.content || "";

  // 1. MANDATORY DETERMINISTIC SERVER-SIDE RED-FLAG SCREENING
  const redFlag = checkRedFlags(latestText);
  if (redFlag.isEmergency) {
    return {
      success: true,
      isEmergency: true,
      emergencyResult: redFlag,
    };
  }

  // 2. Prepare context for Gemini
  let profileContext = "";
  if (healthProfile) {
    profileContext = `\n\nOPTIONAL USER HEALTH CONTEXT (Consented by user):
- Age: ${healthProfile.age || "Unknown"}
- Sex: ${healthProfile.sex || "Unknown"}
- Known Allergies: ${healthProfile.allergies?.join(", ") || "None reported"}
- Chronic Conditions: ${healthProfile.chronicConditions?.join(", ") || "None reported"}
- Current Medications: ${healthProfile.currentMedications?.join(", ") || "None reported"}`;
  }

  const systemInstruction = `${TRIAGE_SYSTEM_PROMPT}${profileContext}`;

  // Build conversational contents
  const conversationHistory: GeminiContentItem[] = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  try {
    const { text } = await generateWithFallback({
      systemInstruction,
      contents: conversationHistory,
      responseMimeType: "application/json",
      responseSchema: TRIAGE_RESPONSE_SCHEMA,
    });

    const parsedJson = JSON.parse(text);
    const validated = TriageTurnResponseSchema.safeParse(parsedJson);

    if (!validated.success) {
      console.error("[TRIAGE_VALIDATION_ERROR]", validated.error);
      return {
        success: false,
        isEmergency: false,
        error: "Structured validation failed on AI assessment response.",
      };
    }

    return {
      success: true,
      isEmergency: false,
      data: validated.data,
    };
  } catch (err: unknown) {
    console.error("[TRIAGE_PIPELINE_ERROR]", err);
    return {
      success: false,
      isEmergency: false,
      error:
        "The triage service is experiencing temporary high demand. If symptoms are severe or concerning, please consult a healthcare facility immediately.",
    };
  }
}
