import {
  generateWithFallback,
  GeminiContentItem,
} from "./client";
import {
  ImageAnalysisResponse,
  ImageAnalysisResponseSchema,
  MedicationScanResponse,
  MedicationScanResponseSchema,
} from "@/schemas/vision";

const SYMPTOM_VISION_SYSTEM_INSTRUCTION = `
You are TriageAI Vision, an educational multimodal symptom triage assistant.
Your role is to visually examine user-submitted images of visible symptoms (such as rashes, cuts, burns, insect bites, or swelling) and provide educational triage assessments.

CRITICAL MEDICAL & SAFETY RULES:
1. NEVER PROVIDE A DEFINITIVE MEDICAL DIAGNOSIS. Frame all findings as possibilities or educational observations.
2. ALWAYS EXPRESS UNCERTAINTY: Medical conditions cannot be diagnosed with certainty from photos alone.
3. DETERMINE APPROPRIATE SEVERITY:
   - "emergency": Signs of severe trauma, third-degree burns, tissue necrosis, spreading infection with systemic red flags, severe allergic facial swelling, or deep uncontrollable bleeding.
   - "urgent": Second-degree burns, deep cuts requiring stitches, suspicious rapidly spreading rash, signs of localized infection (pus, warmth, red streaks), or severe pain.
   - "non-urgent": Superficial minor abrasions, mild first-degree sunburn, mild localized contact dermatitis, minor insect bites without systemic symptoms.
4. PROVIDE SAFE FIRST-AID: Provide actionable, evidence-based supportive first-aid care (e.g. clean with mild soap and water, apply cool compress, elevate, avoid scratching/popping blisters).
5. CLEAR WARNING SIGNS: Explicitly state warning signs that require emergency or urgent medical evaluation.
6. MANDATORY DISCLAIMER: Include this exact disclaimer: "Educational guidance only. This assessment is not a medical diagnosis. Consult a qualified healthcare professional or visit an urgent care facility for in-person evaluation."

You MUST respond strictly in valid JSON matching this schema:
{
  "visualObservations": "Objective description of what is visible in the image (e.g., localized erythematous papules, superficial epidermal scrape)",
  "possibleConditions": ["Condition 1 (possibility)", "Condition 2 (possibility)"],
  "severity": "non-urgent" | "urgent" | "emergency",
  "severityReasoning": "Clinical reasoning for the selected severity level",
  "firstAidSteps": ["Step 1", "Step 2", "Step 3"],
  "warningSigns": ["Escalation sign 1", "Escalation sign 2"],
  "recommendedAction": "Clear next action (e.g., monitor with self-care, visit urgent care within 24 hours, seek emergency care)",
  "uncertaintyNotes": "Statement explaining photographic limitations and emphasizing professional confirmation",
  "disclaimer": "Educational guidance only. This assessment is not a medical diagnosis. Consult a qualified healthcare professional or visit an urgent care facility for in-person evaluation."
}
`.trim();

const MEDICATION_SCAN_SYSTEM_INSTRUCTION = `
You are TriageAI Medication Scanner, an educational pharmaceutical assistant.
Your role is to visually inspect images of medication packages, blister packs, pill bottles, or prescription labels to provide educational identification and safety information.

CRITICAL PHARMACEUTICAL & SAFETY RULES:
1. EDUCATIONAL PURPOSES ONLY. Never instruct the user on changing their prescription or dosages.
2. EXPRESS UNCERTAINTY: If the pill imprint, NDC code, or label text is blurred, partially obscured, or ambiguous, state confidence as "low" or "unidentified" and emphasize verification.
3. EMPHASIZE PHARMACIST VERIFICATION: Always advise users to verify any pill or medication with a licensed pharmacist or prescribing physician before taking it.
4. HIGHLIGHT CRITICAL SAFETY PRECAUTIONS: Mention common contraindications, pregnancy warnings, or food/alcohol interactions where known.

You MUST respond strictly in valid JSON matching this schema:
{
  "identifiedName": "Primary identified medication name (or 'Unidentified Medication' if unclear)",
  "genericName": "Generic active chemical name if identified",
  "brandNames": ["Common brand names"],
  "confidence": "high" | "moderate" | "low" | "unidentified",
  "primaryPurpose": "Common therapeutic indication (e.g., analgesic / fever reducer, antibiotic)",
  "typicalUses": ["Common use 1", "Common use 2"],
  "safetyPrecautions": ["Precaution 1", "Precaution 2"],
  "commonSideEffects": ["Side effect 1", "Side effect 2"],
  "interactionsWarning": "Key warnings regarding alcohol, other medications, or medical conditions",
  "pharmacistNotice": "Explicit notice reminding user to verify with a licensed pharmacist or physician before ingestion",
  "disclaimer": "Educational guidance only. Do not take unidentified or unverified medications. Always verify prescriptions with a licensed pharmacist."
}
`.trim();

export async function analyzeSymptomImage(params: {
  imageBase64: string;
  mimeType: string;
  additionalNotes?: string;
  healthProfile?: {
    age?: number;
    sex?: string;
    allergies?: string[];
    chronicConditions?: string[];
  };
}): Promise<ImageAnalysisResponse> {
  const notesText = params.additionalNotes ? `User notes: "${params.additionalNotes}"` : "No additional notes provided.";
  let profileText = "";
  if (params.healthProfile) {
    const { age, sex, allergies, chronicConditions } = params.healthProfile;
    profileText = `\nPatient context: Age: ${age || "Unknown"}, Sex: ${sex || "Unknown"}, Allergies: ${allergies?.join(", ") || "None listed"}, Conditions: ${chronicConditions?.join(", ") || "None listed"}.`;
  }

  const promptText = `Please analyze this image of a visible symptom for educational triage.\n${notesText}${profileText}\nProvide an educational assessment following your clinical guidelines in valid JSON format.`;

  const contents: GeminiContentItem[] = [
    {
      role: "user",
      parts: [
        { text: promptText },
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.imageBase64,
          },
        },
      ],
    },
  ];

  const result = await generateWithFallback({
    systemInstruction: SYMPTOM_VISION_SYSTEM_INSTRUCTION,
    contents,
    responseMimeType: "application/json",
  });

  const parsed = JSON.parse(result.text);
  return ImageAnalysisResponseSchema.parse(parsed);
}

export async function scanMedicationImage(params: {
  imageBase64: string;
  mimeType: string;
  additionalNotes?: string;
}): Promise<MedicationScanResponse> {
  const notesText = params.additionalNotes ? `User notes: "${params.additionalNotes}"` : "No additional notes provided.";
  const promptText = `Please analyze this medication or pill packaging image.\n${notesText}\nProvide educational identification and safety information in valid JSON format.`;

  const contents: GeminiContentItem[] = [
    {
      role: "user",
      parts: [
        { text: promptText },
        {
          inlineData: {
            mimeType: params.mimeType,
            data: params.imageBase64,
          },
        },
      ],
    },
  ];

  const result = await generateWithFallback({
    systemInstruction: MEDICATION_SCAN_SYSTEM_INSTRUCTION,
    contents,
    responseMimeType: "application/json",
  });

  const parsed = JSON.parse(result.text);
  return MedicationScanResponseSchema.parse(parsed);
}
