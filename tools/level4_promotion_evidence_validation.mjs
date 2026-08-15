import { createHash } from "node:crypto";
import path from "node:path";
import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import { assert } from "./long_task_real_process_roi_scoring.mjs";
import {
  parseJson,
  readRegularFileNoFollow,
} from "./long_task_formal_total_cost_shared.mjs";

export async function validateLevel4ExternalArtifacts(evidenceRoot, entries) {
  const byRole = new Map();
  for (const entry of entries) {
    const target = resolveEvidenceArtifact(evidenceRoot, entry.locator);
    const bytes = await readRegularFileNoFollow(target, 512 * 1024 * 1024);
    assert(
      bytes.length === entry.bytes && digest(bytes) === entry.sha256,
      `level4_external_artifact_identity:${entry.id}`,
    );
    assert(
      !byRole.has(entry.role),
      `level4_external_artifact_role:${entry.role}`,
    );
    byRole.set(entry.role, bytes);
  }
  return byRole;
}

export function parseAndValidateLevel4FormalReport(bytes, evidenceReference) {
  const report = parseJson(bytes, "level4_formal_report_json");
  assert(
    report.schema_version ===
      REAL_PROCESS_SCHEMAS.REAL_PROCESS_VERIFICATION_SCHEMA &&
      report.formal_conclusion_owner === "verify_long_task_real_process_roi" &&
      report.candidate_commit === evidenceReference.candidate.commit &&
      report.candidate_tree === evidenceReference.candidate.tree &&
      report.capability_level === "level_3" &&
      report.level_4_claimed === false &&
      report.governance_judgment_included === false &&
      report.formal_status === "total_roi_positive" &&
      report.total_roi_supported === true &&
      report.total_roi_positive === true &&
      report.formal_runtime_tcb_identity_sha256 ===
        evidenceReference.runtime_tcb_identity_sha256 &&
      Array.isArray(report.formal_blockers) &&
      report.formal_blockers.length === 0 &&
      report.formal_accounting?.significant_stable_margin_met === true &&
      ["authorized_real", "authorized_sanitized_real"].includes(
        report.formal_evidence?.incident_evidence_class,
      ),
    "level4_promotion_formal_report",
  );
  return report;
}

export function parseAndValidateLevel4FrozenCandidate(
  bytes,
  evidenceReference,
) {
  const config = parseJson(bytes, "level4_frozen_config_json");
  assert(
    config.schema_version ===
      REAL_PROCESS_SCHEMAS.REAL_PROCESS_FROZEN_CONFIG_SCHEMA &&
      config.variants?.c?.commit === evidenceReference.candidate.commit &&
      config.candidate_tree === evidenceReference.candidate.tree &&
      config.capability_level === "level_3" &&
      config.level_4_claimed === false &&
      config.governance_judgment_included === false &&
      config.formal_runtime_tcb_identity?.identity_sha256 ===
        evidenceReference.runtime_tcb_identity_sha256,
    "level4_promotion_frozen_candidate",
  );
  return config;
}

function resolveEvidenceArtifact(evidenceRoot, locator) {
  assert(
    typeof locator === "string" &&
      locator.length > 0 &&
      !path.isAbsolute(locator) &&
      !locator.includes("\\") &&
      !locator
        .split("/")
        .some((part) => !part || part === "." || part === ".."),
    "level4_evidence_locator",
  );
  const target = path.resolve(evidenceRoot, ...locator.split("/"));
  const back = path.relative(evidenceRoot, target);
  assert(
    back !== ".." &&
      !back.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(back),
    "level4_evidence_locator_escape",
  );
  return target;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
