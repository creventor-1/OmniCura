import { RED_FLAG_RULES } from "./rules";
import { RedFlagCheckResult } from "@/types";
import { DEFAULT_EMERGENCY_NUMBER } from "@/lib/constants";

/**
 * Deterministically checks user input against critical medical emergency rules.
 * This runs BEFORE any LLM invocation on both client and server.
 */
export function checkRedFlags(text: string): RedFlagCheckResult {
  if (!text || typeof text !== "string") {
    return { isEmergency: false };
  }

  const cleaned = text.trim();
  if (cleaned.length === 0) {
    return { isEmergency: false };
  }

  for (const rule of RED_FLAG_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(cleaned)) {
        // Log triggered rule ID internally (without exposing sensitive user message text)
        if (process.env.NODE_ENV !== "test") {
          console.warn(`[SAFETY_ALERT] Triggered red-flag rule: ${rule.id}`);
        }

        return {
          isEmergency: true,
          ruleId: rule.id,
          category: rule.category,
          description: rule.description,
          immediateAction: rule.immediateAction,
          emergencyNumber: DEFAULT_EMERGENCY_NUMBER,
        };
      }
    }
  }

  return { isEmergency: false };
}
