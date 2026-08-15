import { mkdir, writeFile } from "node:fs/promises";
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
  walkRegularFiles,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA } = REAL_PROCESS_SCHEMAS;
const precollectionRoles = Object.freeze([
  "collector",
  "incident_source",
  "price_document",
  "price_source",
  "redaction_rule",
  "scenario_catalog",
  "scenario_gold",
  "scenario_source",
  "state_retention_source",
]);

export async function readFormalPrecollectionPlan({ planPath, limits }) {
  const bytes = await readRegularFileNoFollow(
    planPath,
    limits.maximum_bytes_per_file,
  );
  const identity = parseJson(bytes, "formal_precollection_plan_json");
  validateFormalPrecollectionIdentity(identity, limits);
  assert(
    assertTimestamp(identity.frozen_at, "formal_precollection_frozen_at") <=
      Date.now(),
    "formal_precollection_frozen_in_future",
  );
  const sourceRoot = path.resolve(path.dirname(planPath), "sources");
  await assertDirectoryNoFollow(sourceRoot, "formal_precollection_source_root");
  const allowedDirectories = directoriesFor(identity.entries);
  const actualPaths = await walkRegularFiles(
    sourceRoot,
    limits.maximum_files,
    allowedDirectories,
  );
  assertSameSet(
    actualPaths,
    identity.entries.map((entry) => entry.path),
    "formal_precollection_source_file_set",
  );
  const files = new Map();
  for (const entry of identity.entries) {
    const source = resolveContained(sourceRoot, entry.path);
    const sourceBytes = await readRegularFileNoFollow(
      source,
      limits.maximum_bytes_per_file,
    );
    assert(
      sourceBytes.length === entry.bytes &&
        sha256(sourceBytes) === entry.sha256,
      `formal_precollection_source_identity:${entry.path}`,
    );
    files.set(entry.path, { entry, bytes: sourceBytes });
  }
  return { identity, files };
}

export function validateFormalPrecollectionIdentity(identity, limits) {
  assertExactKeys(
    identity,
    ["entries", "frozen_at", "identity_sha256", "schema_version"],
    "formal_precollection_identity_fields",
  );
  assert(
    identity.schema_version === FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA &&
      Array.isArray(identity.entries) &&
      identity.entries.length > 0 &&
      identity.entries.length <= limits.maximum_files,
    "formal_precollection_identity",
  );
  assertTimestamp(identity.frozen_at, "formal_precollection_frozen_at");
  const seen = new Set();
  let totalBytes = 0;
  for (const entry of identity.entries) {
    assertExactKeys(
      entry,
      ["bytes", "path", "role", "sha256"],
      `formal_precollection_entry_fields:${entry.path}`,
    );
    assertSafeRelativePath(entry.path, "formal_precollection_entry_path");
    assert(
      !seen.has(entry.path),
      `formal_precollection_entry_duplicate:${entry.path}`,
    );
    seen.add(entry.path);
    assert(
      precollectionRoles.includes(entry.role),
      `formal_precollection_entry_role:${entry.path}`,
    );
    assert(
      Number.isInteger(entry.bytes) &&
        entry.bytes >= 0 &&
        entry.bytes <= limits.maximum_bytes_per_file,
      `formal_precollection_entry_bytes:${entry.path}`,
    );
    assert(
      shaPattern.test(entry.sha256),
      `formal_precollection_entry_sha:${entry.path}`,
    );
    totalBytes += entry.bytes;
  }
  assert(
    totalBytes <= limits.maximum_total_bytes,
    "formal_precollection_total_bytes",
  );
  assert(
    canonical(identity.entries) ===
      canonical(
        [...identity.entries].sort((left, right) =>
          left.path.localeCompare(right.path),
        ),
      ),
    "formal_precollection_entry_order",
  );
  for (const requiredRole of [
    "collector",
    "incident_source",
    "price_document",
    "price_source",
    "scenario_catalog",
    "scenario_gold",
    "scenario_source",
  ])
    assert(
      identity.entries.some((entry) => entry.role === requiredRole),
      `formal_precollection_required_role:${requiredRole}`,
    );
  assert(
    identity.identity_sha256 === precollectionIdentitySha(identity),
    "formal_precollection_identity_sha",
  );
  return identity;
}

export function validateFormalPrecollectionBinding({
  identity,
  bundle,
  window,
  limits,
}) {
  if (identity === null)
    return {
      bound: false,
      blockers: ["formal_evidence_precollection_lock_missing"],
    };
  validateFormalPrecollectionIdentity(identity, limits);
  assert(
    assertTimestamp(identity.frozen_at, "formal_precollection_frozen_at") <=
      window.started,
    "formal_precollection_after_collection_start",
  );
  const actual = [...bundle.files.values()]
    .filter(({ entry }) => precollectionRoles.includes(entry.role))
    .map(({ entry }) => ({
      path: entry.path,
      role: entry.role,
      bytes: entry.bytes,
      sha256: entry.sha256,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  assert(
    canonical(actual) === canonical(identity.entries),
    "formal_precollection_packet_binding",
  );
  return { bound: true, blockers: [] };
}

export async function materializeFormalPrecollectionInputs({
  runSetRoot,
  precollection,
}) {
  if (precollection === null) return;
  for (const [relative, source] of precollection.files) {
    const target = path.resolve(
      runSetRoot,
      "inputs",
      "formal-evidence-precollection",
      ...relative.split("/"),
    );
    const relativeBack = path.relative(runSetRoot, target);
    assert(
      !path.isAbsolute(relativeBack) &&
        relativeBack !== ".." &&
        !relativeBack.startsWith(`..${path.sep}`),
      `formal_precollection_materialization_escape:${relative}`,
    );
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, source.bytes);
  }
}

export async function readMaterializedFormalPrecollection({
  runArtifactIndex,
  identity,
  limits,
}) {
  validateFormalPrecollectionIdentity(identity, limits);
  const files = new Map();
  for (const entry of identity.entries) {
    const artifactPath = `inputs/formal-evidence-precollection/${entry.path}`;
    const bytes = await runArtifactIndex.read(
      artifactPath,
      "precollection_input",
      limits.maximum_bytes_per_file,
    );
    assert(
      bytes.length === entry.bytes && sha256(bytes) === entry.sha256,
      `formal_precollection_run_artifact_identity:${entry.path}`,
    );
    files.set(entry.path, { entry, bytes, artifact_path: artifactPath });
  }
  return Object.freeze({
    identity,
    files,
  });
}

function precollectionIdentitySha(identity) {
  return sha256(
    canonical({ frozen_at: identity.frozen_at, entries: identity.entries }),
  );
}

function directoriesFor(entries) {
  const directories = new Set();
  for (const entry of entries) {
    const segments = entry.path.split("/");
    for (let index = 1; index < segments.length; index += 1)
      directories.add(segments.slice(0, index).join("/"));
  }
  return directories;
}
