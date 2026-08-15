import { createHash } from "node:crypto";
import { assert, canonical } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  parseJson,
  shaPattern,
} from "./long_task_formal_total_cost_shared.mjs";

const bundlePath = "incident/bundle.json";
const requiredRoles = Object.freeze([
  "incident_design",
  "incident_provenance",
  "incident_runtime",
]);

export function validateControlledIncidentBundle({
  bundle,
  scenarios,
  precollectionFrozenAt,
}) {
  const source = bundle.files.get(bundlePath);
  assert(
    source?.entry.role === "incident_source",
    "formal_incident_bundle_missing",
  );
  const record = parseJson(source.bytes, "formal_incident_bundle_json");
  assertExactKeys(
    record,
    [
      "authorization",
      "evidence_class",
      "incident_id",
      "mapping",
      "original",
      "sanitized",
      "schema_version",
      "task_gold_derivation",
    ],
    "formal_incident_bundle_fields",
  );
  assert(
    record.schema_version === "level4-controlled-incident-source-bundle-v1" &&
      [
        "authorized_real",
        "authorized_sanitized_real",
        "synthetic_test_only",
      ].includes(record.evidence_class) &&
      typeof record.incident_id === "string" &&
      record.incident_id.length > 0,
    "formal_incident_bundle",
  );
  const original = validateManifest(record.original, "original", bundle);
  const sanitized = validateManifest(record.sanitized, "sanitized", bundle);
  validateMapping(record.mapping, original, sanitized);
  validateAuthorization(record.authorization, record, precollectionFrozenAt);
  validateTaskGoldDerivation(record.task_gold_derivation, scenarios);
  const used = new Set([bundlePath, ...original.keys(), ...sanitized.keys()]);
  for (const [sourcePath, item] of bundle.files)
    if (item.entry.role === "incident_source")
      assert(
        used.has(sourcePath),
        `formal_incident_source_unused:${sourcePath}`,
      );
  const promotionEligible = [
    "authorized_real",
    "authorized_sanitized_real",
  ].includes(record.evidence_class);
  return {
    incident_id: record.incident_id,
    evidence_class: record.evidence_class,
    promotion_eligible: promotionEligible,
    blockers: promotionEligible ? [] : ["controlled_incident_external_pending"],
  };
}

function validateManifest(value, kind, bundle) {
  assertExactKeys(
    value,
    ["entries", "identity_sha256", "kind"],
    `formal_incident_${kind}_manifest_fields`,
  );
  assert(
    value.kind === kind &&
      Array.isArray(value.entries) &&
      value.entries.length > 0 &&
      value.entries.length <= 128 &&
      value.identity_sha256 ===
        shaForCanonical({ kind: value.kind, entries: value.entries }),
    `formal_incident_${kind}_manifest`,
  );
  const entries = new Map();
  const roles = new Set();
  for (const entry of value.entries) {
    assertExactKeys(
      entry,
      ["bytes", "path", "role", "sha256"],
      `formal_incident_${kind}_entry_fields:${entry.path}`,
    );
    assert(
      typeof entry.path === "string" &&
        entry.path.startsWith(`incident/${kind}/`) &&
        !entries.has(entry.path) &&
        typeof entry.role === "string" &&
        entry.role.startsWith("incident_") &&
        Number.isSafeInteger(entry.bytes) &&
        entry.bytes > 0 &&
        shaPattern.test(entry.sha256),
      `formal_incident_${kind}_entry:${entry.path}`,
    );
    const materialized = bundle.files.get(entry.path);
    assert(
      materialized?.entry.role === "incident_source" &&
        materialized.bytes.length === entry.bytes &&
        materialized.entry.sha256 === entry.sha256,
      `formal_incident_${kind}_source:${entry.path}`,
    );
    entries.set(entry.path, entry);
    roles.add(entry.role);
  }
  assert(
    requiredRoles.every((role) => roles.has(role)),
    `formal_incident_${kind}_required_roles`,
  );
  return entries;
}

function validateMapping(mapping, original, sanitized) {
  assert(Array.isArray(mapping), "formal_incident_mapping");
  assert(
    mapping.length === original.size && mapping.length > 0,
    "formal_incident_mapping_count",
  );
  const originalSeen = new Set();
  const sanitizedSeen = new Set();
  for (const item of mapping) {
    assertExactKeys(
      item,
      ["disposition", "original_path", "reason", "sanitized_path"],
      `formal_incident_mapping_fields:${item.original_path}`,
    );
    assert(
      original.has(item.original_path) &&
        !originalSeen.has(item.original_path) &&
        ["exact", "redacted", "excluded"].includes(item.disposition) &&
        typeof item.reason === "string" &&
        item.reason.length > 0,
      `formal_incident_mapping_item:${item.original_path}`,
    );
    originalSeen.add(item.original_path);
    if (item.disposition === "excluded")
      assert(
        item.sanitized_path === null,
        `formal_incident_mapping_excluded:${item.original_path}`,
      );
    else {
      assert(
        sanitized.has(item.sanitized_path) &&
          !sanitizedSeen.has(item.sanitized_path),
        `formal_incident_mapping_sanitized:${item.original_path}`,
      );
      sanitizedSeen.add(item.sanitized_path);
      if (item.disposition === "exact")
        assert(
          original.get(item.original_path).sha256 ===
            sanitized.get(item.sanitized_path).sha256,
          `formal_incident_mapping_exact:${item.original_path}`,
        );
    }
  }
  assert(
    sanitizedSeen.size === sanitized.size,
    "formal_incident_mapping_sanitized_complete",
  );
}

function validateAuthorization(authorization, record, precollectionFrozenAt) {
  assertExactKeys(
    authorization,
    [
      "authorization_id",
      "granted_at",
      "owner",
      "permitted_uses",
      "publication_terms",
      "retention_terms",
      "scope",
    ],
    "formal_incident_authorization_fields",
  );
  assert(
    [
      authorization.authorization_id,
      authorization.owner,
      authorization.scope,
    ].every((value) => typeof value === "string" && value.length > 0) &&
      assertTimestamp(
        authorization.granted_at,
        "formal_incident_authorization_time",
      ) <= precollectionFrozenAt &&
      Array.isArray(authorization.permitted_uses) &&
      ["formal-evidence-collection", "independent-capability-audit"].every(
        (use) => authorization.permitted_uses.includes(use),
      ) &&
      typeof authorization.retention_terms === "string" &&
      authorization.retention_terms.length > 0 &&
      typeof authorization.publication_terms === "string" &&
      authorization.publication_terms.length > 0 &&
      (record.evidence_class === "synthetic_test_only" ||
        authorization.permitted_uses.includes("level4-governance-promotion")),
    "formal_incident_authorization",
  );
}

function validateTaskGoldDerivation(derivation, scenarios) {
  assertExactKeys(
    derivation,
    [
      "gold_sha256",
      "gold_source_ref",
      "method",
      "task_sha256",
      "task_source_ref",
    ],
    "formal_incident_task_gold_fields",
  );
  const scenario = scenarios.get("fixed-controlled-incident");
  assert(
    scenario &&
      derivation.method === "authorized-incident-source-derivation-v1" &&
      derivation.task_source_ref === scenario.task_source_ref &&
      derivation.gold_source_ref === scenario.gold_source_ref &&
      derivation.task_sha256 === scenario.task.entry.sha256 &&
      derivation.gold_sha256 === scenario.gold.entry.sha256,
    "formal_incident_task_gold_derivation",
  );
}

function shaForCanonical(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}
