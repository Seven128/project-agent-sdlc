import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  shaPattern,
} from "./long_task_formal_total_cost_shared.mjs";
import {
  level4IdentityWithout,
  validateLevel4CandidateIdentity,
  validateLevel4DigestEntries,
} from "./level4_governance_shared.mjs";

export {
  LEVEL4_AUDIT_REQUIRED_INPUT_ROLES,
  validateLevel4IndependentAuditRecord,
} from "./level4_governance_audit.mjs";

export const LEVEL4_GOVERNANCE_RECORD_NAMES = Object.freeze([
  "evidence-reference.json",
  "independent-audit.json",
  "owner-decision.json",
  "promotion-record.json",
]);

export function validateLevel4EvidenceReference(record) {
  assertExactKeys(
    record,
    [
      "artifacts",
      "benchmark_implementation_identity_sha256",
      "candidate",
      "formal_conclusion_owner",
      "identity_sha256",
      "runtime_tcb_identity_sha256",
      "schema_version",
    ],
    "level4_evidence_reference_fields",
  );
  assert(
    record.schema_version === "level4-evidence-reference-v1" &&
      record.formal_conclusion_owner === "verify_long_task_real_process_roi",
    "level4_evidence_reference",
  );
  validateLevel4CandidateIdentity(
    record.candidate,
    "level4_evidence_candidate",
  );
  assert(
    shaPattern.test(record.benchmark_implementation_identity_sha256) &&
      shaPattern.test(record.runtime_tcb_identity_sha256),
    "level4_evidence_tcb_identity",
  );
  validateLevel4DigestEntries(record.artifacts, "level4_evidence_artifact");
  const requiredRoles = [
    "candidate-package-tarball",
    "formal-evidence-packet",
    "formal-verifier-report",
    "run-set-frozen-config",
    "run-set-manifest",
  ];
  assert(
    requiredRoles.every((role) =>
      record.artifacts.some((entry) => entry.role === role),
    ),
    "level4_evidence_artifact_roles",
  );
  assert(
    record.identity_sha256 === level4IdentityWithout(record, "identity_sha256"),
    "level4_evidence_reference_identity",
  );
  return record;
}

export function validateLevel4OwnerDecision(
  record,
  evidenceReference,
  auditRecord,
) {
  assertExactKeys(
    record,
    [
      "approved",
      "audit_record_sha256",
      "candidate",
      "decided_at",
      "decision",
      "evidence_reference_sha256",
      "owner",
      "schema_version",
      "scope",
    ],
    "level4_owner_decision_fields",
  );
  assert(
    record.schema_version === "level4-project-owner-decision-v1" &&
      record.approved === true &&
      record.decision === "promote-level-4" &&
      record.scope === "project-tiny-context-harness-level4-capability" &&
      typeof record.owner === "string" &&
      record.owner.length > 0 &&
      record.evidence_reference_sha256 ===
        sha256(canonical(evidenceReference)) &&
      record.audit_record_sha256 === sha256(canonical(auditRecord)) &&
      canonical(record.candidate) === canonical(evidenceReference.candidate) &&
      auditRecord.audit_conclusion.governance_audit_passed === true,
    "level4_owner_decision",
  );
  assertTimestamp(record.decided_at, "level4_owner_decision_time");
  return record;
}

export function validateLevel4PromotionRecord(
  record,
  evidenceReference,
  auditRecord,
  ownerDecision,
) {
  assertExactKeys(
    record,
    [
      "audit_record_sha256",
      "benchmark_implementation_identity_sha256",
      "candidate",
      "capability_level",
      "evidence_reference_sha256",
      "formal_conclusion_owner",
      "level_4_claimed",
      "owner_decision_sha256",
      "package_sha256",
      "promotion_kind",
      "runtime_tcb_identity_sha256",
      "schema_version",
    ],
    "level4_promotion_record_fields",
  );
  assert(
    record.schema_version ===
      REAL_PROCESS_SCHEMAS.LEVEL4_PROMOTION_RECORD_SCHEMA &&
      record.promotion_kind === "direct-child-governance-records-only" &&
      record.capability_level === "level_4" &&
      record.level_4_claimed === true &&
      record.formal_conclusion_owner === "verify_long_task_real_process_roi" &&
      canonical(record.candidate) === canonical(evidenceReference.candidate) &&
      record.package_sha256 === evidenceReference.candidate.package_sha256 &&
      record.benchmark_implementation_identity_sha256 ===
        evidenceReference.benchmark_implementation_identity_sha256 &&
      record.runtime_tcb_identity_sha256 ===
        evidenceReference.runtime_tcb_identity_sha256 &&
      record.evidence_reference_sha256 ===
        sha256(canonical(evidenceReference)) &&
      record.audit_record_sha256 === sha256(canonical(auditRecord)) &&
      record.owner_decision_sha256 === sha256(canonical(ownerDecision)),
    "level4_promotion_record",
  );
  return record;
}
