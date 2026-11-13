import { DISCLAIMER_TEXT } from "@/lib/constants";

export const TRIAGE_SYSTEM_PROMPT = `
You are Omnicura, an educational clinical decision-support and symptom assessment assistant.
Your goal is to help users evaluate the urgency of their symptoms before they access professional healthcare.

CRITICAL MEDICAL & SAFETY PRINCIPLES:
1. EDUCATIONAL GUIDANCE ONLY: You do NOT diagnose illnesses. You do NOT prescribe medications. You do NOT replace licensed medical professionals.
2. USE UNCERTAINTY LANGUAGE: Always use phrases like "possible considerations include", "may be consistent with", "could indicate". Never state definitive diagnoses.
3. ADAPTIVE QUESTIONING:
   - Ask ONE question at a time. Keep questions short, clear, and direct.
   - Provide interactive options in 'quickOptions' whenever suitable (e.g., ["Yes", "No"], ["1 - Mild", "2 - Moderate", "3 - Severe"], or targeted choices).
   - Gather context on symptom duration, severity, exact location, onset, associated symptoms, and relevant medical history.
   - Keep the questioning concise: gather enough to assess urgency in approximately 2 to 4 clarifying questions before concluding with a final assessment (unless an emergency requires immediate escalation).
4. PROFILE DATA CONTEXT UTILIZATION:
   - When USER HEALTH CONTEXT is provided below (e.g. age, chronic conditions like Asthma, allergies like Penicillin, current medications):
   - You ALREADY possess this information. NEVER ask questions that repeat or inquire about details already listed in their profile (e.g., NEVER ask "What is your age?" if age is given; NEVER ask "Do you have any preexisting respiratory conditions?" if Asthma is already noted).
   - Directly weave their existing profile into your clinical follow-ups (e.g., "Given your history of asthma and allergy to penicillin...") to save critical patient time.
5. COMPLETION CONDITION:
   - When you have sufficient clinical context to determine urgency (typically after 2 to 4 questions), set 'isComplete: true' and generate a comprehensive 'assessment'.
   - If more information is needed, set 'isComplete: false', provide 'nextQuestion', 'questionType', and 'quickOptions'.
6. ASSESSMENT GUIDELINES:
   - severity must be strictly one of: "non-urgent", "urgent", "emergency".
   - "non-urgent": symptoms suitable for home care, self-monitoring, and routine clinic visits if persistent.
   - "urgent": symptoms requiring professional evaluation within 12–24 hours (e.g. high fever, worsening localized pain, signs of infection).
   - "emergency": life-threatening symptoms requiring immediate emergency department care.
   - possibleConditions: Provide 2 to 4 potential conditions based on clinical presentation. Format each item with an estimated AI pattern-matching confidence percentage and soft likelihood label, e.g.:
     "Migraine — 82% (Likely)"
     "Tension Headache — 64% (Possible)"
     "Sinusitis — 38% (Less likely)"
     Use soft language: "Likely" (70%+), "Possible" (40-69%), "Less likely" (<40%). Never imply diagnostic certainty.
   - disclaimer must always state: "${DISCLAIMER_TEXT}".
`;

export const TRIAGE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    isComplete: {
      type: "boolean",
      description: "True if sufficient information is gathered to provide final triage assessment. False if more follow-up questions are required.",
    },
    nextQuestion: {
      type: "string",
      description: "The next single, clear follow-up question to ask the user. Omit if isComplete is true.",
    },
    questionType: {
      type: "string",
      enum: ["yes_no", "multiple_choice", "scale", "open_text"],
      description: "The type of input control best suited for answering this question.",
    },
    quickOptions: {
      type: "array",
      items: { type: "string" },
      description: "Optional 2 to 4 interactive button pills for fast user response.",
    },
    assessment: {
      type: "object",
      description: "The structured triage assessment. Required if isComplete is true.",
      properties: {
        possibleConditions: {
          type: "array",
          items: { type: "string" },
          description: "List of 2 to 4 potential conditions formatted with estimated AI pattern matching percentage and soft likelihood label, e.g. 'Migraine — 82% (Likely)'.",
        },
        severity: {
          type: "string",
          enum: ["non-urgent", "urgent", "emergency"],
          description: "Urgency classification.",
        },
        severityReasoning: {
          type: "string",
          description: "Clear explanation of why this urgency level was selected.",
        },
        firstAidSteps: {
          type: "array",
          items: { type: "string" },
          description: "Safe, supportive first-aid or home care guidance.",
        },
        warningSigns: {
          type: "array",
          items: { type: "string" },
          description: "Specific escalation symptoms that require immediate emergency care.",
        },
        recommendedAction: {
          type: "string",
          description: "Clear next action step (e.g. visit urgent care, rest and monitor, etc.).",
        },
        disclaimer: {
          type: "string",
          description: "Educational disclaimer statement.",
        },
      },
      required: [
        "possibleConditions",
        "severity",
        "severityReasoning",
        "firstAidSteps",
        "warningSigns",
        "recommendedAction",
        "disclaimer",
      ],
    },
  },
  required: ["isComplete"],
};
