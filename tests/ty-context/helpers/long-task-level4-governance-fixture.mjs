import { REAL_PROCESS_SCHEMAS } from "../../../tools/long_task_real_process_schema_policy.mjs";
import {
  canonical,
  sha256,
} from "../../../tools/long_task_real_process_roi_scoring.mjs";
import { digest } from "./long-task-level4-test-utils.mjs";

export function digestEntry(id, role, locator, bytes) {
  return { id, role, locator, bytes: bytes.length, sha256: digest(bytes) };
}

export function buildLevel4GovernanceRecords({
  candidate,
  benchmarkIdentitySha256,
  runtimeTcbIdentitySha256,
  evidenceArtifacts,
  auditInputs,
}) {
  const evidenceBase = {
    schema_version: "level4-evidence-reference-v1",
    candidate,
    benchmark_implementation_identity_sha256: benchmarkIdentitySha256,
    runtime_tcb_identity_sha256: runtimeTcbIdentitySha256,
    formal_conclusion_owner: "verify_long_task_real_process_roi",
    artifacts: [...evidenceArtifacts].sort(byId),
  };
  const evidenceReference = {
    ...evidenceBase,
    identity_sha256: sha256(canonical(evidenceBase)),
  };
  const commands = [
    auditCommand("formal-verifier", ["node", "verify_long_task_real_process_roi.mjs"]),
    auditCommand("validation", ["make", "validate-harness"]),
  ];
  const inputs = [...auditInputs].sort(byId);
  const formalReport = inputs.find((entry) => entry.role === "formal-verifier-report");
  const auditRecord = {
    schema_version: REAL_PROCESS_SCHEMAS.LEVEL4_INDEPENDENT_AUDIT_SCHEMA,
    audit_id: "independent-audit-structural-fixture",
    audited_at: "2026-08-16T04:00:00.000Z",
    auditor: {
      auditor_id: "auditor-independent",
      implementation_owner_id: "implementation-owner",
      organization: "independent-structural-fixture",
      implementation_participation: false,
      collection_participation: false,
      independence_statement: "No implementation or collection participation.",
    },
    candidate,
    formal_conclusion_owner: "verify_long_task_real_process_roi",
    formal_roi_conclusion_owned: false,
    inputs,
    input_census_identity_sha256: sha256(canonical(inputs)),
    commands,
    current_candidate_results: {
      candidate_commit: candidate.commit,
      candidate_tree: candidate.tree,
      package_sha256: candidate.package_sha256,
      benchmark_implementation_identity_sha256: benchmarkIdentitySha256,
      runtime_tcb_identity_sha256: runtimeTcbIdentitySha256,
      formal_report_input_id: formalReport.id,
      formal_verifier_command_id: "formal-verifier",
      validation_command_ids: ["validation"],
    },
    findings: [
      {
        finding_id: "structural-controls-closed",
        severity: "note",
        status: "closed",
        summary: "Current candidate identities and current command results agree.",
        input_refs: [formalReport.id],
        command_refs: ["formal-verifier"],
      },
    ],
    audit_conclusion: {
      governance_audit_passed: true,
      open_blocker_count: 0,
      open_p1_count: 0,
      open_critical_counterexample_count: 0,
    },
  };
  const ownerDecision = {
    schema_version: "level4-project-owner-decision-v1",
    candidate,
    decided_at: "2026-08-16T05:00:00.000Z",
    owner: "project-owner",
    scope: "project-tiny-context-harness-level4-capability",
    decision: "promote-level-4",
    approved: true,
    evidence_reference_sha256: sha256(canonical(evidenceReference)),
    audit_record_sha256: sha256(canonical(auditRecord)),
  };
  const promotionRecord = {
    schema_version: REAL_PROCESS_SCHEMAS.LEVEL4_PROMOTION_RECORD_SCHEMA,
    promotion_kind: "direct-child-governance-records-only",
    candidate,
    capability_level: "level_4",
    level_4_claimed: true,
    formal_conclusion_owner: "verify_long_task_real_process_roi",
    package_sha256: candidate.package_sha256,
    benchmark_implementation_identity_sha256: benchmarkIdentitySha256,
    runtime_tcb_identity_sha256: runtimeTcbIdentitySha256,
    evidence_reference_sha256: sha256(canonical(evidenceReference)),
    audit_record_sha256: sha256(canonical(auditRecord)),
    owner_decision_sha256: sha256(canonical(ownerDecision)),
  };
  return { evidenceReference, auditRecord, ownerDecision, promotionRecord };
}

function auditCommand(commandId, argv) {
  return {
    command_id: commandId,
    argv,
    cwd: "C:/Dev/project-tiny-context-harness",
    started_at: "2026-08-16T03:00:00.000Z",
    completed_at: "2026-08-16T03:01:00.000Z",
    exit_code: 0,
    stdout_sha256: digest(`${commandId}:stdout`),
    stderr_sha256: digest(`${commandId}:stderr`),
  };
}

function byId(left, right) {
  return left.id.localeCompare(right.id);
}
