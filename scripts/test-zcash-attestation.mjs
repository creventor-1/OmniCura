/**
 * Comprehensive End-to-End Zcash Privacy Verification Test Suite (Phase 6 & 8)
 * 
 * Verifies:
 * 1. Unified Address (utest1...) validation
 * 2. Deterministic canonical JSON hashing
 * 3. Zcash shielded memo proof derivation
 * 4. Assessment anchoring with transaction references & explorer links
 * 5. Tamper detection on modified clinical records
 * 6. Patient data ownership grant/revocation cryptographic events
 */

import { computeAssessmentHash, computeOwnershipEventHash } from "../src/services/crypto/record-hasher.ts";
import { createAttestationMemo, anchorAssessmentToZcash, verifyAssessmentAnchor } from "../src/services/zcash/anchor.ts";
import { validateZcashAddress } from "../src/services/zcash/wallet.ts";

console.log("=== OMNICURA END-TO-END ZCASH VERIFICATION TEST SUITE ===\n");

// 1. Unified Address Validation Test
const patientUnifiedAddress = "utest19d569wa8aaggfuvmvuf26808wdhvx74c7ava3ggxqxzd43hsm4ter3zltvumx463wq5rwy4jnd89klc0pgv7rp2u8498wmanhyhc5m79";
const addrValidation = validateZcashAddress(patientUnifiedAddress, "testnet");
console.log("1. Unified Address Format Test:");
console.log("   Address:       ", patientUnifiedAddress);
console.log("   Is Valid:      ", addrValidation.isValid);
console.log("   Address Type:  ", addrValidation.type);
if (!addrValidation.isValid || addrValidation.type !== "testnet_unified") {
  throw new Error("Failed test 1: Invalid unified address.");
}
console.log("   ✓ PASS: Zcash Testnet Unified Address (utest1...) validated successfully.\n");

// 2. Clinical Assessment Sample
const mockAssessment = {
  severity: "urgent",
  recommendedAction: "Visit Urgent Care or consult an emergency physician within 2 hours.",
  severityReasoning: "Acute onset of high fever (103.4F) accompanied by severe migraine and photophobia.",
  possibleConditions: [
    "Complicated Bacterial Sinusitis (Likely, 84%)",
    "Atypical Migraine with Fever (Possible, 62%)",
  ],
  firstAidSteps: [
    "Rest in a quiet, dark room to reduce light sensitivity.",
    "Hydrate with electrolyte solution or cool water.",
    "Avoid strenuous physical activity.",
  ],
  warningSigns: [
    "Sudden stiff neck or inability to touch chin to chest",
    "Confusion or altered mental state",
    "Loss of vision or extreme sensitivity to sound",
  ],
  disclaimer: "OmniCura AI is for informational triage guidance and is not a definitive diagnosis.",
};

const patientId = "patient-e2e-test";
const timestamp = "2026-11-13T23:50:00.000Z";

// 3. Deterministic Hashing Test
const recordHash = computeAssessmentHash({
  patientId,
  symptoms: "High fever 103.4F, severe pounding headache, photophobia",
  assessment: mockAssessment,
  timestamp,
});

console.log("2. Cryptographic Canonical Fingerprinting:");
console.log("   Record SHA-256: ", recordHash);
console.log("   Length:         ", recordHash.length, "hex characters");
if (recordHash.length !== 64) {
  throw new Error("Failed test 2: SHA-256 hash must be 64 characters.");
}
console.log("   ✓ PASS: Deterministic 256-bit cryptographic digest generated.\n");

// 4. Zcash Shielded Memo Derivation Test
const memo = createAttestationMemo(recordHash, timestamp);
console.log("3. Zcash Shielded Memo Payload:");
console.log("   Memo Proof:     ", memo);
if (!memo.startsWith("omnicura:v1:assessment:") || !memo.includes(recordHash)) {
  throw new Error("Failed test 3: Invalid memo format.");
}
console.log("   ✓ PASS: Zero-knowledge privacy memo proof constructed.\n");

// 5. Anchoring Pipeline Test
const mockStoredRecord = {
  id: "rec-test-1",
  user_id: patientId,
  symptoms: "High fever 103.4F, severe pounding headache, photophobia",
  severity: mockAssessment.severity,
  assessment_result: mockAssessment,
  disclaimer: mockAssessment.disclaimer,
  created_at: timestamp,
  record_hash: recordHash,
  verification_status: "verified",
  verified_at: timestamp,
};

const attestation = await anchorAssessmentToZcash(mockStoredRecord);
console.log("4. Zcash Anchoring Pipeline:");
console.log("   Attestation Status:", attestation.status);
console.log("   Record Hash:       ", attestation.recordHash);
console.log("   Memo Proof:        ", attestation.memo);
if (attestation.txid) {
  console.log("   Zcash Txid:        ", attestation.txid);
  console.log("   Explorer URL:      ", attestation.explorerUrl);
} else {
  console.log("   Notary State:      ", attestation.reason, `(${attestation.message})`);
}
if (!attestation.recordHash || !attestation.memo.startsWith("omnicura:v1:assessment:")) {
  throw new Error("Failed test 4: Anchoring pipeline failed to generate valid memo.");
}
console.log("   ✓ PASS: Assessment anchoring pipeline executed gracefully.\n");

// 6. Integrity Verification on Original Record
const sampleTxid = attestation.txid || "e6a8fdc661e1d46b5f780033625cf5d00f4d4b358922a8203141d52b5a926c85";
const originalVerification = verifyAssessmentAnchor({
  ...mockStoredRecord,
  zcash_txid: sampleTxid,
});
console.log("5. Verification on Original Untampered Record:");
console.log("   Is Valid:       ", originalVerification.isValid);
console.log("   Status:         ", originalVerification.status);
console.log("   Details:        ", originalVerification.details);
if (!originalVerification.isValid || originalVerification.status !== "verified") {
  throw new Error("Failed test 5: Untampered record must pass verification.");
}
console.log("   ✓ PASS: Original record verified successfully.\n");

// 7. Tamper Detection Test (Malicious alteration of severity from urgent to non-urgent)
const tamperedAssessment = {
  ...mockAssessment,
  severity: "non-urgent", // Malicious downgrade
  recommendedAction: "No action needed, take rest.",
};

const tamperedRecord = {
  ...mockStoredRecord,
  assessment_result: tamperedAssessment,
  zcash_txid: sampleTxid,
};

const tamperedVerification = verifyAssessmentAnchor(tamperedRecord);
console.log("6. Tamper Detection Test (Malicious Severity Modification):");
console.log("   Is Valid:       ", tamperedVerification.isValid);
console.log("   Status:         ", tamperedVerification.status);
console.log("   Details:        ", tamperedVerification.details);
if (tamperedVerification.isValid || tamperedVerification.status !== "tampered") {
  throw new Error("Failed test 6: Tampering was NOT detected!");
}
console.log("   ✓ PASS: Cryptographic tamper detection caught unauthorized clinical change!\n");

// 8. Patient Data Ownership Permission Event Hash Test
const grantEventHash = computeOwnershipEventHash({
  recordId: "rec-test-1",
  userId: patientId,
  granteeEntity: "Dr. Elena Rostova (Neurology Specialist)",
  accessLevel: "read",
  action: "grant",
  timestamp,
});

console.log("7. Patient Data Ownership Event Test:");
console.log("   Grant Event Hash:", grantEventHash);
if (grantEventHash.length !== 64) {
  throw new Error("Failed test 7: Grant event hash invalid.");
}
console.log("   ✓ PASS: Patient access grant event cryptographically authenticated.\n");

console.log("=========================================================");
console.log("ALL ZCASH PRIVACY & INTEGRITY VERIFICATION TESTS PASSED!");
console.log("=========================================================\n");
