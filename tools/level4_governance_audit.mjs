import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertSameSet,
  assertTimestamp,
  shaPattern,
} from "./long_task_formal_total_cost_shared.mjs";
import {
  validateLevel4AuditConclusion,
  validateLevel4CurrentCandidateResults,
  validateLevel4Findings,
} from "./level4_governance_audit_findings.mjs";
import {
  validateLevel4CandidateIdentity,
  validateLevel4DigestEntries,
} from "./level4_governance_shared.mjs";

export const LEVEL4_AUDIT_REQUIRED_INPUT_ROLES = Object.freeze([
  "accounting-policy",
  "benchmark-implementation",
  "candidate-commit-tree",
  "candidate-package-tarball",
  "collector-catalog-and-implementations",
  "context-delta",
  "controlled-incident-source-bundle",
  "formal-evidence-packet",
  "formal-verifier-report",
  "precollection-plan-and-sources",
  "run-set-manifest-and-attestation",
  "runtime-tcb",
  "scenario-catalog-task-gold",
  "structural-cost-report",
  "validation-results",
]);

export function validateLevel4IndependentAuditRecord(
  record,
  evidenceReference,
) {
  assertExactKeys(
    record,
    [
      "audit_conclusion",
      "audit_id",
      "audited_at",
      "auditor",
      "candidate",
      "commands",
      "current_candidate_results",
      "findings",
      "formal_conclusion_owner",
      "formal_roi_conclusion_owned",
      "input_census_identity_sha256",
      "inputs",
      "schema_version",
    ],
    "level4_audit_fields",
  );
  assert(
    record.schema_version ===
      REAL_PROCESS_SCHEMAS.LEVEL4_INDEPENDENT_AUDIT_SCHEMA &&
      typeof record.audit_id === "string" &&
      record.audit_id.length > 0 &&
      record.formal_conclusion_owner === "verify_long_task_real_process_roi" &&
      record.formal_roi_conclusion_owned === false,
    "level4_audit",
  );
  assertTimestamp(record.audited_at, "level4_audit_time");
  validateLevel4CandidateIdentity(record.candidate, "level4_audit_candidate");
  assert(
    canonical(record.candidate) === canonical(evidenceReference.candidate),
    "level4_audit_evidence_candidate",
  );
  validateAuditor(record.auditor);
  const inputsById = validateLevel4DigestEntries(
    record.inputs,
    "level4_audit_input",
  );
  assert(
    record.input_census_identity_sha256 === sha256(canonical(record.inputs)),
    "level4_audit_input_census_identity",
  );
  assertSameSet(
    record.inputs.map((entry) => entry.role),
    LEVEL4_AUDIT_REQUIRED_INPUT_ROLES,
    "level4_audit_input_role_census",
  );
  const commandsById = validateAuditCommands(record.commands);
  validateLevel4CurrentCandidateResults(
    record.current_candidate_results,
    evidenceReference,
    inputsById,
    commandsById,
  );
  validateLevel4Findings(record.findings, inputsById, commandsById);
  validateLevel4AuditConclusion(record.audit_conclusion, record.findings);
  return record;
}

function validateAuditor(auditor) {
  assertExactKeys(
    auditor,
    [
      "auditor_id",
      "collection_participation",
      "implementation_owner_id",
      "implementation_participation",
      "independence_statement",
      "organization",
    ],
    "level4_auditor_fields",
  );
  assert(
    [
      auditor.auditor_id,
      auditor.implementation_owner_id,
      auditor.independence_statement,
      auditor.organization,
    ].every((value) => typeof value === "string" && value.length > 0) &&
      auditor.auditor_id !== auditor.implementation_owner_id &&
      auditor.implementation_participation === false &&
      auditor.collection_participation === false,
    "level4_auditor_independence",
  );
}

function validateAuditCommands(commands) {
  assert(
    Array.isArray(commands) && commands.length > 0,
    "level4_audit_commands",
  );
  const commandsById = new Map();
  for (const command of commands) {
    validateAuditCommand(command, commandsById);
    commandsById.set(command.command_id, command);
  }
  return commandsById;
}

function validateAuditCommand(command, commandsById) {
  assertExactKeys(
    command,
    [
      "argv",
      "command_id",
      "completed_at",
      "cwd",
      "exit_code",
      "started_at",
      "stderr_sha256",
      "stdout_sha256",
    ],
    "level4_audit_command_fields",
  );
  const started = assertTimestamp(
    command.started_at,
    "level4_audit_command_started",
  );
  const completed = assertTimestamp(
    command.completed_at,
    "level4_audit_command_completed",
  );
  assert(
    typeof command.command_id === "string" &&
      command.command_id.length > 0 &&
      !commandsById.has(command.command_id) &&
      Array.isArray(command.argv) &&
      command.argv.length > 0 &&
      command.argv.every(
        (token) => typeof token === "string" && !token.includes("\u0000"),
      ) &&
      typeof command.cwd === "string" &&
      command.cwd.length > 0 &&
      completed >= started &&
      Number.isInteger(command.exit_code) &&
      shaPattern.test(command.stdout_sha256) &&
      shaPattern.test(command.stderr_sha256),
    "level4_audit_command",
  );
}
