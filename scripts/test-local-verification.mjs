import {
  computeAssessmentHash,
  verifyAssessmentIntegrity,
  computeOwnershipEventHash,
} from "../src/services/crypto/record-hasher.ts";

console.log("=== OMNICURA LOCAL VERIFICATION TEST SUITE (PHASE 2) ===");

const sampleAssessment = {
  possibleConditions: ["Migraine — 82% (Likely)", "Tension Headache — 64% (Possible)"],
  severity: "urgent",
  severityReasoning: "Severe throbbing unilateral headache accompanied by photophobia.",
  firstAidSteps: ["Rest in a quiet, dark room", "Hydrate with water"],
  warningSigns: ["Sudden thunderclap onset", "Neurological deficits or confusion"],
  recommendedAction: "Consult a healthcare provider within 12-24 hours.",
  disclaimer: "Educational guidance only.",
};

const payload = {
  patientId: "patient-user-123",
  symptoms: "Severe throbbing headache with nausea for 2 days",
  assessment: sampleAssessment,
  timestamp: "2026-11-13T22:00:00.000Z",
};

// 1. Test Deterministic Hashing
const hash1 = computeAssessmentHash(payload);
const hash2 = computeAssessmentHash(payload);
console.log("\n1. Hash Determinism Test:");
console.log(`Hash 1: ${hash1}`);
console.log(`Hash 2: ${hash2}`);
if (hash1 === hash2 && hash1.length === 64) {
  console.log("✓ PASS: Hashing is 100% deterministic (SHA-256 64-hex chars).");
} else {
  console.error("✗ FAIL: Hash mismatch!");
  process.exit(1);
}

// 2. Test Untampered Verification
const validResult = verifyAssessmentIntegrity({
  ...payload,
  storedHash: hash1,
});
console.log("\n2. Untampered Verification Test:");
console.log(`Status: ${validResult.status}`);
console.log(`Details: ${validResult.details}`);
if (validResult.isValid && validResult.status === "verified") {
  console.log("✓ PASS: Untampered record successfully verified.");
} else {
  console.error("✗ FAIL: Valid record failed verification!");
  process.exit(1);
}

// 3. Test Tamper Detection: Changing Severity (e.g. urgent -> non-urgent)
const tamperedAssessment = {
  ...sampleAssessment,
  severity: "non-urgent", // TAMPERED!
};
const tamperedResult = verifyAssessmentIntegrity({
  ...payload,
  assessment: tamperedAssessment,
  storedHash: hash1, // Verifying against original hash
});
console.log("\n3. Tamper Detection Test (Altered Severity):");
console.log(`Is Valid: ${tamperedResult.isValid}`);
console.log(`Status: ${tamperedResult.status}`);
console.log(`Computed Tampered Hash: ${tamperedResult.computedHash}`);
console.log(`Expected Original Hash: ${tamperedResult.storedHash}`);
console.log(`Details: ${tamperedResult.details}`);
if (!tamperedResult.isValid && tamperedResult.status === "tampered") {
  console.log("✓ PASS: Tampering detected immediately! Severity alteration caught by hash mismatch.");
} else {
  console.error("✗ FAIL: Tampered record was not detected!");
  process.exit(1);
}

// 4. Test Tamper Detection: Altering Symptoms
const tamperedSymptomsResult = verifyAssessmentIntegrity({
  ...payload,
  symptoms: "Mild headache", // TAMPERED!
  storedHash: hash1,
});
console.log("\n4. Tamper Detection Test (Altered Symptoms):");
if (!tamperedSymptomsResult.isValid && tamperedSymptomsResult.status === "tampered") {
  console.log("✓ PASS: Tampering detected! Symptom alteration caught by hash mismatch.");
} else {
  console.error("✗ FAIL: Symptom tampering was not detected!");
  process.exit(1);
}

// 5. Test Ownership Event Hash
const grantEventHash = computeOwnershipEventHash({
  recordId: "record-987",
  userId: "patient-user-123",
  granteeEntity: "Dr. Sarah Chen, General Hospital",
  accessLevel: "read",
  action: "grant",
  timestamp: "2026-11-13T22:30:00.000Z",
});
console.log("\n5. Ownership Event Hash Test:");
console.log(`Grant Event Hash: ${grantEventHash}`);
if (grantEventHash && grantEventHash.length === 64) {
  console.log("✓ PASS: Ownership event hash computed successfully.");
} else {
  console.error("✗ FAIL: Ownership event hash generation failed!");
  process.exit(1);
}

console.log("\n=== ALL PHASE 2 TESTS PASSED PERFECTLY ===");
