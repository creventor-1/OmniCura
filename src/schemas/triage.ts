import { z } from "zod";

export const SeverityLevelSchema = z.enum(["non-urgent", "urgent", "emergency"]);

export const AssessmentResponseSchema = z.object({
  possibleConditions: z.array(z.string()),
  severity: SeverityLevelSchema,
  severityReasoning: z.string(),
  firstAidSteps: z.array(z.string()),
  warningSigns: z.array(z.string()),
  recommendedAction: z.string(),
  disclaimer: z.string(),
});

export type AssessmentResponse = z.infer<typeof AssessmentResponseSchema>;

export const TriageMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  timestamp: z.string().optional(),
});

export type TriageMessage = z.infer<typeof TriageMessageSchema>;

export const TriageTurnResponseSchema = z.object({
  isComplete: z.boolean(),
  nextQuestion: z.string().optional(),
  questionType: z.enum(["yes_no", "multiple_choice", "scale", "open_text"]).optional(),
  quickOptions: z.array(z.string()).optional(),
  assessment: AssessmentResponseSchema.optional(),
});

export type TriageTurnResponse = z.infer<typeof TriageTurnResponseSchema>;
