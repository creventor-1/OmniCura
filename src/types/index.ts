export type SeverityLevel = "non-urgent" | "urgent" | "emergency";

export interface AssessmentResponse {
  possibleConditions: string[];
  severity: SeverityLevel;
  severityReasoning: string;
  firstAidSteps: string[];
  warningSigns: string[];
  recommendedAction: string;
  disclaimer: string;
}

export interface RedFlagCheckResult {
  isEmergency: boolean;
  ruleId?: string;
  category?: string;
  description?: string;
  immediateAction?: string;
  emergencyNumber?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export * from "./database";
export * from "./hospital";

