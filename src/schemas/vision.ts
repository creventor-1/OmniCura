import { z } from "zod";
import { SeverityLevelSchema } from "./triage";

// Schema for Image Symptom Analysis
export const ImageAnalysisResponseSchema = z.object({
  visualObservations: z.string(),
  possibleConditions: z.array(z.string()),
  severity: SeverityLevelSchema,
  severityReasoning: z.string(),
  firstAidSteps: z.array(z.string()),
  warningSigns: z.array(z.string()),
  recommendedAction: z.string(),
  uncertaintyNotes: z.string(),
  disclaimer: z.string(),
});

export type ImageAnalysisResponse = z.infer<typeof ImageAnalysisResponseSchema>;

export const ImageAnalysisRequestSchema = z.object({
  imageBase64: z.string().min(1, "Image data is required"),
  mimeType: z.string().default("image/jpeg"),
  additionalNotes: z.string().optional(),
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

export type ImageAnalysisRequest = z.infer<typeof ImageAnalysisRequestSchema>;

// Schema for Medication Scanner
export const MedicationScanResponseSchema = z.object({
  identifiedName: z.string(),
  genericName: z.string().optional(),
  brandNames: z.array(z.string()).optional(),
  confidence: z.enum(["high", "moderate", "low", "unidentified"]),
  primaryPurpose: z.string(),
  typicalUses: z.array(z.string()),
  safetyPrecautions: z.array(z.string()),
  commonSideEffects: z.array(z.string()),
  interactionsWarning: z.string(),
  pharmacistNotice: z.string(),
  disclaimer: z.string(),
});

export type MedicationScanResponse = z.infer<typeof MedicationScanResponseSchema>;

export const MedicationScanRequestSchema = z.object({
  imageBase64: z.string().min(1, "Image data is required"),
  mimeType: z.string().default("image/jpeg"),
  additionalNotes: z.string().optional(),
});

export type MedicationScanRequest = z.infer<typeof MedicationScanRequestSchema>;
