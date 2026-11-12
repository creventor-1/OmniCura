export interface RedFlagRule {
  id: string;
  category: string;
  description: string;
  immediateAction: string;
  patterns: RegExp[];
}

export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: "CARDIOVASCULAR_EMERGENCY",
    category: "Cardiovascular Emergency",
    description: "Symptoms may indicate acute cardiac distress or heart attack.",
    immediateAction:
      "Call emergency services immediately. Sit upright, rest, loosen tight clothing, and do not attempt to drive yourself to the hospital.",
    patterns: [
      /\b(?:severe|crushing|tight|heavy|squeezing)\s+(?:chest\s+pain|chest\s+pressure|pain\s+in\s+chest)\b/i,
      /\b(?:chest\s+pain|heart\s+attack)\b.*\b(?:shortness\s+of\s+breath|difficulty\s+breathing|can'?t\s+breathe|arm\s+pain|jaw\s+pain|sweating|dizziness)\b/i,
      /\b(?:pain|tightness|pressure)\s+in\s+(?:my\s+)?chest\b.*\b(?:radiating|left\s+arm|shoulder|neck|jaw)\b/i,
      /\b(?:feel\s+like|having)\s+a\s+heart\s+attack\b/i,
    ],
  },
  {
    id: "RESPIRATORY_DISTRESS",
    category: "Severe Respiratory Distress",
    description: "Inability to maintain adequate breathing or airway obstruction.",
    immediateAction:
      "Call emergency services now. Keep the person sitting upright, encourage calm slow breaths, and administer prescribed rescue inhaler if available.",
    patterns: [
      /\b(?:can'?t|cannot|unable\s+to)\s+(?:breathe|catch\s+my\s+breath)\b/i,
      /\b(?:gasping\s+for\s+air|suffocating|choking|turning\s+blue)\b/i,
      /\b(?:severe|acute)\s+(?:shortness\s+of\s+breath|respiratory\s+distress|asthma\s+attack)\b/i,
      /\b(?:blue\s+lips|blue\s+face|stridor|severe\s+wheezing)\b/i,
    ],
  },
  {
    id: "STROKE_SYMPTOMS",
    category: "Suspected Acute Stroke (FAST)",
    description: "Sudden neurological deficit consistent with a stroke.",
    immediateAction:
      "Call emergency services immediately. Note the exact time symptoms started. Keep the person lying flat or head slightly elevated; do not give food or drinks.",
    patterns: [
      /\b(?:face\s+droop|drooping\s+face|facial\s+droop)\b/i,
      /\b(?:slurred\s+speech|cannot\s+speak|unable\s+to\s+speak|difficulty\s+speaking)\b/i,
      /\b(?:sudden\s+weakness|numbness)\s+(?:in\s+)?(?:one\s+arm|one\s+side|arm\s+and\s+leg)\b/i,
      /\b(?:stroke\s+symptoms|having\s+a\s+stroke)\b/i,
      /\b(?:sudden\s+loss\s+of\s+vision|sudden\s+blindness)\b/i,
      /\b(?:worst\s+headache\s+of\s+my\s+life|thunderclap\s+headache)\b/i,
    ],
  },
  {
    id: "ANAPHYLAXIS",
    category: "Severe Allergic Reaction (Anaphylaxis)",
    description: "Rapid allergic reaction threatening airway and circulation.",
    immediateAction:
      "Administer epinephrine auto-injector (EpiPen) immediately if available and call emergency services. Have the person lie flat with legs elevated unless breathing is impaired.",
    patterns: [
      /\b(?:throat\s+closing|throat\s+is\s+closing|swelling\s+in\s+throat)\b/i,
      /\b(?:tongue\s+swelling|swollen\s+tongue|lips\s+swelling)\b/i,
      /\b(?:anaphylaxis|anaphylactic\s+shock)\b/i,
      /\ballergic\s+reaction\b.*\b(?:can'?t\s+breathe|difficulty\s+swallowing|throat)\b/i,
    ],
  },
  {
    id: "SEVERE_HEMORRHAGE",
    category: "Severe Hemorrhage / Uncontrolled Bleeding",
    description: "Life-threatening arterial or massive bleeding.",
    immediateAction:
      "Call emergency services immediately. Apply continuous firm direct pressure with a clean cloth. Do not remove soaked cloths—add more layers on top.",
    patterns: [
      /\b(?:spurting\s+blood|arterial\s+bleeding|uncontrolled\s+bleeding)\b/i,
      /\b(?:bleeding\s+heavily|gushing\s+blood|soaked\s+through\s+bandages)\b/i,
      /\b(?:coughing\s+up\s+blood|vomiting\s+large\s+amounts\s+of\s+blood|vomiting\s+blood)\b/i,
    ],
  },
  {
    id: "LOSS_OF_CONSCIOUSNESS",
    category: "Unresponsiveness / Loss of Consciousness",
    description: "Inability to maintain consciousness or active seizure.",
    immediateAction:
      "Call emergency services immediately. Check for breathing. If breathing, place in recovery position (on their side). If seizing, protect the head, clear the area, and do not put anything in the mouth.",
    patterns: [
      /\b(?:unconscious|unresponsive|passed\s+out|blacked\s+out)\b/i,
      /\b(?:seizure|having\s+a\s+seizure|convulsing|actively\s+shaking)\b/i,
      /\b(?:collapsed\s+and\s+not\s+waking\s+up|cannot\s+wake\s+up)\b/i,
    ],
  },
  {
    id: "MENTAL_HEALTH_CRISIS",
    category: "Mental Health Crisis / Self-Harm",
    description: "Explicit statement or intent of self-harm or suicide.",
    immediateAction:
      "Please call emergency services (112) or reach out to a crisis helpline immediately. You are not alone and immediate confidential help is available.",
    patterns: [
      /\b(?:want\s+to\s+kill\s+myself|going\s+to\s+kill\s+myself|commit\s+suicide)\b/i,
      /\b(?:want\s+to\s+end\s+my\s+life|ending\s+my\s+life|suicidal\s+thoughts)\b/i,
      /\b(?:overdosed\s+on\s+pills|swallowed\s+poison|drank\s+bleach)\b/i,
    ],
  },
];
