import path from "node:path";
import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertDirectoryNoFollow,
  assertExactKeys,
  assertSafeRelativePath,
  assertSameSet,
  assertTimestamp,
  parseJson,
  readRegularFileNoFollow,
  resolveContained,
  shaPattern,
  sourceRoles,
  walkRegularFiles,
} from "./long_task_formal_total_cost_shared.mjs";

const {
  FORMAL_TOTAL_COST_REDACTION_RULE_SCHEMA,
  FORMAL_TOTAL_COST_SOURCE_MANIFEST_SCHEMA,
} = REAL_PROCESS_SCHEMAS;

export async function readFormalSourceBundle({ packetPath, manifest, limits }) {
  assertExactKeys(
    manifest,
    [
      "entries",
      "entry_count",
      "materialized_set_sha256",
      "root",
      "schema_version",
      "total_bytes",
    ],
    "formal_evidence_source_manifest_fields",
  );
  assert(
    manifest.schema_version === FORMAL_TOTAL_COST_SOURCE_MANIFEST_SCHEMA &&
      manifest.root === "sources" &&
      Array.isArray(manifest.entries),
    "formal_evidence_source_manifest",
  );
  assert(
    manifest.entries.length <= limits.maximum_files &&
      manifest.entry_count === manifest.entries.length,
    "formal_evidence_source_file_count",
  );
  const sortedEntries = [...manifest.entries].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  assert(
    canonical(manifest.entries) === canonical(sortedEntries),
    "formal_evidence_source_manifest_order",
  );
  const seen = new Set();
  const allowedDirectories = new Set();
  let declaredTotal = 0;
  for (const entry of manifest.entries) {
    validateManifestEntry(entry, limits, seen, allowedDirectories);
    declaredTotal += entry.bytes;
  }
  assert(
    declaredTotal === manifest.total_bytes &&
      declaredTotal <= limits.maximum_total_bytes,
    "formal_evidence_source_total_budget",
  );
  assert(
    manifest.materialized_set_sha256 === sha256(canonical(manifest.entries)),
    "formal_evidence_source_manifest_identity",
  );
  const packetRoot = path.dirname(path.resolve(packetPath));
  const bundleRoot = path.resolve(packetRoot, manifest.root);
  await assertDirectoryNoFollow(bundleRoot, "formal_evidence_source_root");
  const actualPaths = await walkRegularFiles(
    bundleRoot,
    limits.maximum_files,
    allowedDirectories,
  );
  assertSameSet(actualPaths, [...seen], "formal_evidence_source_file_set");
  const files = new Map();
  for (const entry of manifest.entries) {
    const target = resolveContained(bundleRoot, entry.path);
    const bytes = await readRegularFileNoFollow(
      target,
      limits.maximum_bytes_per_file,
    );
    assert(
      bytes.length === entry.bytes && sha256(bytes) === entry.sha256,
      `formal_evidence_source_identity:${entry.path}`,
    );
    files.set(entry.path, { entry, bytes });
  }
  return { root: bundleRoot, manifest, files };
}

export function validateFormalCollectorIdentity(
  identity,
  bundle,
  window,
  precollectionFrozenAt = null,
) {
  assertExactKeys(
    identity,
    ["entries", "frozen_at", "identity_sha256"],
    "formal_evidence_collector_fields",
  );
  const frozenAt = assertTimestamp(
    identity.frozen_at,
    "formal_evidence_collector_frozen_at",
  );
  assert(
    frozenAt <= window.started &&
      (precollectionFrozenAt === null || frozenAt <= precollectionFrozenAt),
    "formal_evidence_collector_not_prefrozen",
  );
  assert(
    Array.isArray(identity.entries) && identity.entries.length > 0,
    "formal_evidence_collector_entries",
  );
  const expected = [...bundle.files.values()]
    .filter(({ entry }) => entry.role === "collector")
    .map(({ entry }) => ({
      path: entry.path,
      bytes: entry.bytes,
      sha256: entry.sha256,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  const actual = [...identity.entries].sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  for (const entry of actual)
    assertExactKeys(
      entry,
      ["bytes", "path", "sha256"],
      `formal_evidence_collector_entry_fields:${entry.path}`,
    );
  assert(
    canonical(actual) === canonical(expected) &&
      identity.identity_sha256 === sha256(canonical(actual)),
    "formal_evidence_collector_identity",
  );
}

export function validateFormalRedactionRules(
  bundle,
  window,
  precollectionFrozenAt = null,
) {
  const rules = new Map();
  for (const [sourcePath, source] of bundle.files) {
    if (source.entry.role !== "redaction_rule") continue;
    const rule = parseJson(source.bytes, `redaction_rule_json:${sourcePath}`);
    assertExactKeys(
      rule,
      [
        "fields",
        "frozen_at",
        "method",
        "replacement",
        "rule_id",
        "schema_version",
      ],
      `redaction_rule_fields:${sourcePath}`,
    );
    assert(
      rule.schema_version === FORMAL_TOTAL_COST_REDACTION_RULE_SCHEMA &&
        typeof rule.rule_id === "string" &&
        rule.rule_id.length > 0 &&
        rule.method === "deterministic-field-redaction" &&
        Array.isArray(rule.fields) &&
        rule.fields.length > 0 &&
        rule.fields.every(
          (field) => typeof field === "string" && field.length > 0,
        ) &&
        rule.replacement === "[REDACTED]" &&
        assertTimestamp(
          rule.frozen_at,
          `redaction_rule_frozen_at:${sourcePath}`,
        ) <= window.started &&
        (precollectionFrozenAt === null ||
          assertTimestamp(
            rule.frozen_at,
            `redaction_rule_frozen_at:${sourcePath}`,
          ) <= precollectionFrozenAt),
      `redaction_rule:${sourcePath}`,
    );
    rules.set(sourcePath, rule);
  }
  return rules;
}

function validateManifestEntry(entry, limits, seen, allowedDirectories) {
  assertExactKeys(
    entry,
    ["bytes", "path", "role", "sha256"],
    `formal_evidence_source_entry_fields:${entry.path}`,
  );
  assertSafeRelativePath(entry.path, "formal_evidence_source_path");
  const segments = entry.path.split("/");
  for (let index = 1; index < segments.length; index += 1)
    allowedDirectories.add(segments.slice(0, index).join("/"));
  assert(
    !seen.has(entry.path),
    `formal_evidence_source_duplicate:${entry.path}`,
  );
  seen.add(entry.path);
  assert(
    sourceRoles.includes(entry.role),
    `formal_evidence_source_role:${entry.path}`,
  );
  assert(
    Number.isInteger(entry.bytes) &&
      entry.bytes >= 0 &&
      entry.bytes <= limits.maximum_bytes_per_file,
    `formal_evidence_source_file_budget:${entry.path}`,
  );
  assert(
    shaPattern.test(entry.sha256),
    `formal_evidence_source_sha:${entry.path}`,
  );
}
