export const APP_NAME = "Omnicura";

export const DEFAULT_EMERGENCY_NUMBER =
  process.env.NEXT_PUBLIC_DEFAULT_EMERGENCY_NUMBER || "112";

export const DISCLAIMER_TEXT =
  "Omnicura provides educational guidance only and is not a medical diagnosis. If you are experiencing a life-threatening medical emergency, call your local emergency services immediately.";

export const BRIEF_DISCLAIMER_TEXT =
  "Omnicura gives educational guidance only and is not a diagnosis. If this is an emergency, call 112 or your local emergency number immediately.";

export const SEVERITY_LEVELS = {
  NON_URGENT: "non-urgent",
  URGENT: "urgent",
  EMERGENCY: "emergency",
} as const;
