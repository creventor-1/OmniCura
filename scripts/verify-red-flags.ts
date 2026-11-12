import { checkRedFlags } from "../src/lib/red-flags";

interface TestCase {
  input: string;
  expectedEmergency: boolean;
  expectedCategory?: string;
}

const testCases: TestCase[] = [
  // --- Positives (Must Trigger Emergency) ---
  {
    input: "I have severe chest pain and can't breathe",
    expectedEmergency: true,
    expectedCategory: "Cardiovascular Emergency",
  },
  {
    input: "I feel like I'm having a heart attack, tight pain in chest radiating to left arm",
    expectedEmergency: true,
    expectedCategory: "Cardiovascular Emergency",
  },
  {
    input: "I cannot breathe, gasping for air",
    expectedEmergency: true,
    expectedCategory: "Severe Respiratory Distress",
  },
  {
    input: "My father has sudden slurred speech and facial droop",
    expectedEmergency: true,
    expectedCategory: "Suspected Acute Stroke (FAST)",
  },
  {
    input: "I have the worst headache of my life that came out of nowhere",
    expectedEmergency: true,
    expectedCategory: "Suspected Acute Stroke (FAST)",
  },
  {
    input: "My throat is closing and my tongue is swelling after eating seafood",
    expectedEmergency: true,
    expectedCategory: "Severe Allergic Reaction (Anaphylaxis)",
  },
  {
    input: "There is spurting blood from my leg cut",
    expectedEmergency: true,
    expectedCategory: "Severe Hemorrhage / Uncontrolled Bleeding",
  },
  {
    input: "He is unconscious and not waking up",
    expectedEmergency: true,
    expectedCategory: "Unresponsiveness / Loss of Consciousness",
  },
  {
    input: "I want to end my life, I have suicidal thoughts",
    expectedEmergency: true,
    expectedCategory: "Mental Health Crisis / Self-Harm",
  },

  // --- Negatives (Must NOT Trigger Emergency) ---
  {
    input: "I have a mild sore throat, cough, and runny nose for 3 days",
    expectedEmergency: false,
  },
  {
    input: "My left knee is slightly sore after playing football yesterday",
    expectedEmergency: false,
  },
  {
    input: "Can I take ibuprofen for a mild back ache?",
    expectedEmergency: false,
  },
  {
    input: "I have a low grade fever and feel tired",
    expectedEmergency: false,
  },
];

let failed = 0;

console.log("=== Verifying Deterministic Red-Flag Detection Rules ===\n");

for (const tc of testCases) {
  const result = checkRedFlags(tc.input);

  if (result.isEmergency !== tc.expectedEmergency) {
    console.error(`❌ FAILED: "${tc.input}"`);
    console.error(`   Expected isEmergency: ${tc.expectedEmergency}, got: ${result.isEmergency}`);
    failed++;
  } else if (tc.expectedEmergency && tc.expectedCategory && result.category !== tc.expectedCategory) {
    console.error(`❌ FAILED CATEGORY: "${tc.input}"`);
    console.error(`   Expected category: "${tc.expectedCategory}", got: "${result.category}"`);
    failed++;
  } else {
    console.log(`✓ PASSED: "${tc.input.slice(0, 45)}..." -> [Emergency: ${result.isEmergency}]`);
  }
}

console.log(`\nResults: ${testCases.length - failed}/${testCases.length} tests passed.`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log("All red-flag safety tests passed successfully!");
}
