import { constants as fsConstants } from "node:fs";
import { createHash } from "node:crypto";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import {
  FORMAL_EVIDENCE_CAPACITY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import { canonical } from "./long_task_real_process_roi_scoring.mjs";
import { realProcessArtifactRole } from "./long_task_real_process_artifact_roles.mjs";

export { realProcessArtifactRole } from "./long_task_real_process_artifact_roles.mjs";
export { readPackedPackageIdentity } from "./long_task_packed_package_identity.mjs";

const excludedPaths = Object.freeze(["attestation.json", "manifest.json"]);

export async function buildRealProcessArtifactManifest(runSetRoot) {
  const entries = await inspectRunSetFiles(runSetRoot);
  enforceCapacity(entries);
  return {
    schema_version: REAL_PROCESS_SCHEMAS.REAL_PROCESS_MANIFEST_SCHEMA,
    root: ".",
    excludes: [...excludedPaths],
    entries,
    entry_count: entries.length,
    total_bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
    materialized_set_sha256: digest(canonical(entries)),
  };
}

export async function buildImmutableRunArtifactIndex({ runSetRoot, manifest }) {
  validateManifestShape(manifest);
  const actual = await inspectRunSetFiles(runSetRoot);
  enforceCapacity(actual);
  if (canonical(actual) !== canonical(manifest.entries))
    throw new Error("real_process_roi_manifest_recomputation");
  const byPath = new Map(
    actual.map((entry) => [
      entry.path,
      Object.freeze({
        path: entry.path,
        role: entry.role,
        bytes: entry.bytes,
        sha256: entry.sha256,
        absolute_path: resolveContained(runSetRoot, entry.path),
      }),
    ]),
  );
  return Object.freeze({
    size: byPath.size,
    run_set_root: path.resolve(runSetRoot),
    materialized_set_sha256: manifest.materialized_set_sha256,
    has(relativePath) {
      return byPath.has(relativePath);
    },
    get(relativePath) {
      return byPath.get(relativePath) ?? null;
    },
    paths() {
      return Object.freeze([...byPath.keys()]);
    },
    async read(relativePath, expectedRole = null, maximumBytes = null) {
      const entry = byPath.get(relativePath);
      if (!entry) throw new Error(`run_artifact_missing:${relativePath}`);
      if (expectedRole !== null && entry.role !== expectedRole)
        throw new Error(`run_artifact_role:${relativePath}:${entry.role}`);
      if (maximumBytes !== null && entry.bytes > maximumBytes)
        throw new Error(`run_artifact_budget:${relativePath}`);
      const bytes = await readIndexedFile(entry);
      return Buffer.from(bytes);
    },
  });
}

function validateManifestShape(manifest) {
  const keys = Object.keys(manifest).sort();
  const expected = [
    "entries",
    "entry_count",
    "excludes",
    "materialized_set_sha256",
    "root",
    "schema_version",
    "total_bytes",
  ].sort();
  if (
    canonical(keys) !== canonical(expected) ||
    manifest.schema_version !==
      REAL_PROCESS_SCHEMAS.REAL_PROCESS_MANIFEST_SCHEMA ||
    manifest.root !== "." ||
    canonical(manifest.excludes) !== canonical(excludedPaths) ||
    !Array.isArray(manifest.entries) ||
    manifest.entry_count !== manifest.entries.length ||
    manifest.total_bytes !==
      manifest.entries.reduce((total, entry) => total + entry.bytes, 0) ||
    manifest.materialized_set_sha256 !== digest(canonical(manifest.entries))
  )
    throw new Error("real_process_roi_manifest_shape");
  enforceCapacity(manifest.entries);
}

async function inspectRunSetFiles(runSetRoot) {
  const root = path.resolve(runSetRoot);
  await assertDirectory(root, "real_process_roi_run_set_root");
  const paths = [];
  async function visit(current, prefix) {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const directoryEntry of entries) {
      const relative = prefix
        ? `${prefix}/${directoryEntry.name}`
        : directoryEntry.name;
      if (excludedPaths.includes(relative)) continue;
      const target = path.join(current, directoryEntry.name);
      const info = await lstat(target);
      if (info.isSymbolicLink())
        throw new Error(`real_process_roi_artifact_link:${relative}`);
      if (info.isDirectory()) {
        await assertRealPath(
          target,
          `real_process_roi_artifact_reparse:${relative}`,
        );
        await visit(target, relative);
        continue;
      }
      if (!info.isFile() || info.nlink !== 1)
        throw new Error(`real_process_roi_artifact_regular_file:${relative}`);
      paths.push(relative.replaceAll("\\", "/"));
      if (
        paths.length >
        FORMAL_EVIDENCE_CAPACITY.maximum_run_set_files -
          FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_files
      )
        throw new Error("real_process_roi_artifact_file_count");
    }
  }
  await visit(root, "");
  const results = [];
  for (const relative of paths.sort((left, right) =>
    left.localeCompare(right),
  )) {
    const absolute = resolveContained(root, relative);
    const bytes = await readNoFollow(absolute);
    results.push({
      path: relative,
      role: realProcessArtifactRole(relative),
      bytes: bytes.length,
      sha256: digest(bytes),
    });
  }
  return results;
}

function enforceCapacity(entries) {
  const maximumIndexedFiles =
    FORMAL_EVIDENCE_CAPACITY.maximum_run_set_files -
    FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_files;
  const maximumIndexedBytes =
    FORMAL_EVIDENCE_CAPACITY.maximum_run_set_total_bytes -
    FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_total_bytes;
  if (
    entries.length > maximumIndexedFiles ||
    entries.some(
      (entry) =>
        !entry ||
        typeof entry.path !== "string" ||
        entry.role !== realProcessArtifactRole(entry.path) ||
        !Number.isSafeInteger(entry.bytes) ||
        entry.bytes < 0 ||
        entry.bytes > FORMAL_EVIDENCE_CAPACITY.maximum_lifecycle_file_bytes ||
        !/^[a-f0-9]{64}$/u.test(entry.sha256 ?? ""),
    ) ||
    entries.reduce((total, entry) => total + entry.bytes, 0) >
      maximumIndexedBytes
  )
    throw new Error("real_process_roi_artifact_capacity");
  if (canonical(entries) !== canonical([...entries].sort(compareEntry)))
    throw new Error("real_process_roi_artifact_order");
  const formalEntries = entries.filter((entry) =>
    entry.path.startsWith("formal-evidence/"),
  );
  const hasFormalIndex = entries.some(
    (entry) => entry.path === "formal-evidence-index.json",
  );
  if (
    formalEntries.length > FORMAL_EVIDENCE_CAPACITY.maximum_formal_files ||
    formalEntries.reduce((total, entry) => total + entry.bytes, 0) >
      FORMAL_EVIDENCE_CAPACITY.maximum_formal_total_bytes ||
    (hasFormalIndex
      ? formalEntries.length !==
        FORMAL_EVIDENCE_CAPACITY.expected_runner_artifact_count
      : formalEntries.length !== 0)
  )
    throw new Error("real_process_roi_formal_artifact_capacity");
}

async function readIndexedFile(entry) {
  const bytes = await readNoFollow(entry.absolute_path);
  if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256)
    throw new Error(`run_artifact_identity_changed:${entry.path}`);
  return bytes;
}

async function readNoFollow(target) {
  const before = await lstat(target);
  if (!before.isFile() || before.isSymbolicLink() || before.nlink !== 1)
    throw new Error(`real_process_roi_artifact_regular_file:${target}`);
  await assertRealPath(target, `real_process_roi_artifact_reparse:${target}`);
  const handle = await open(
    target,
    fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0),
  );
  try {
    const opened = await handle.stat();
    if (
      !opened.isFile() ||
      opened.size !== before.size ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino
    )
      throw new Error(`real_process_roi_artifact_identity_before:${target}`);
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      after.size !== opened.size ||
      after.dev !== opened.dev ||
      after.ino !== opened.ino
    )
      throw new Error(`real_process_roi_artifact_identity_after:${target}`);
    return bytes;
  } finally {
    await handle.close();
  }
}

async function assertDirectory(target, code) {
  const info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(code);
  await assertRealPath(target, `${code}_reparse`);
}

async function assertRealPath(target, code) {
  const actual = await realpath(target);
  if (normalizeHostPath(actual) !== normalizeHostPath(path.resolve(target)))
    throw new Error(code);
}

function resolveContained(root, relative) {
  const normalized = normalizeRelativePath(relative);
  const resolved = path.resolve(root, ...normalized.split("/"));
  const back = path.relative(path.resolve(root), resolved);
  if (
    back === ".." ||
    back.startsWith(`..${path.sep}`) ||
    path.isAbsolute(back)
  )
    throw new Error(`real_process_roi_artifact_escape:${relative}`);
  return resolved;
}

function normalizeRelativePath(relative) {
  if (
    typeof relative !== "string" ||
    relative.length === 0 ||
    relative.includes("\\") ||
    path.posix.isAbsolute(relative) ||
    relative
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  )
    throw new Error(`real_process_roi_artifact_path:${relative}`);
  return relative;
}

function normalizeHostPath(value) {
  return process.platform === "win32" ? value.toLowerCase() : value;
}

function compareEntry(left, right) {
  return left.path.localeCompare(right.path);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
