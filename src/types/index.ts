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
  matchedTriggers: string[];
  guidanceMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}
