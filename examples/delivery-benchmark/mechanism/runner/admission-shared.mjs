import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MECHANISM_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const REPO_ROOT = path.resolve(MECHANISM_ROOT, "../../..");
export const ADMISSION_CONFIG = path.join(
  MECHANISM_ROOT,
  "admission-set.json",
);
export const ADMISSION_ARTIFACT_ROOT = path.join(
  REPO_ROOT,
  ".artifacts",
  "mechanism-admission",
);

export async function loadAdmissionConfig() {
  const bytes = await readFile(ADMISSION_CONFIG);
  const config = JSON.parse(bytes.toString("utf8"));
  if (config.schema_version !== "tiny-context-fresh-agent-admission-v1")
    throw new Error("admission_config_schema_unsupported");
  return { config, config_sha256: sha256(bytes) };
}

export async function verifyFrozenAdmission(config) {
  const failures = [];
  for (const record of config.frozen_files)
    await verifyFileRecord(record, failures);
  for (const [trackId, track] of Object.entries(config.tracks)) {
    if (track.fixture_identity !== admissionFixtureIdentity(track.modes))
      failures.push(`fixture_identity:${trackId}`);
    for (const variant of Object.values(track.variants)) {
      for (const mode of Object.values(variant.guidance))
        await verifyGuidanceBundle(mode, failures);
    }
  }
  const ancestor = git([
    "merge-base",
    "--is-ancestor",
    config.baseline_commit,
    "HEAD",
  ]);
  if (ancestor.status !== 0) failures.push("baseline_not_ancestor_of_head");
  if (failures.length)
    throw new Error(`admission_freeze_mismatch:${failures.join(",")}`);
  return { frozen_file_count: config.frozen_files.length, failures: [] };
}

export async function guidanceText(bundle) {
  const parts = [];
  for (const source of bundle.sources) {
    const content = await sourceContent(source);
    parts.push(`--- ${source.label} ---\n${content.trim()}\n`);
  }
  const text = parts.join("\n");
  const actual = sha256(text);
  if (actual !== bundle.bundle_sha256)
    throw new Error(`guidance_bundle_digest_mismatch:${actual}`);
  return text;
}

export async function sourceContent(source) {
  let content;
  if (source.kind === "git") {
    const result = git(["show", `${source.commit}:${source.path}`]);
    if (result.status !== 0)
      throw new Error(`guidance_git_source_unavailable:${source.label}`);
    content = result.stdout;
    if (source.git_blob_oid) {
      const oid = git(["rev-parse", `${source.commit}:${source.path}`]);
      if (oid.status !== 0 || oid.stdout.trim() !== source.git_blob_oid)
        throw new Error(`guidance_git_blob_mismatch:${source.label}`);
    }
  } else if (source.kind === "worktree") {
    content = await readFile(path.join(REPO_ROOT, source.path), "utf8");
  } else throw new Error(`guidance_source_kind_unsupported:${source.kind}`);
  const selected = source.extract ? extractSection(content, source.extract) : content;
  const actual = sha256(selected);
  if (actual !== source.content_sha256)
    throw new Error(`guidance_source_digest_mismatch:${source.label}:${actual}`);
  return selected;
}

export async function readTrackedJson(relative) {
  return JSON.parse(await readFile(path.join(MECHANISM_ROOT, relative), "utf8"));
}

export async function createArtifactDirectory(relative) {
  if (!/^[a-z0-9][a-z0-9._/-]*$/u.test(relative) || relative.includes(".."))
    throw new Error(`unsafe_admission_artifact_path:${relative}`);
  const target = path.resolve(ADMISSION_ARTIFACT_ROOT, ...relative.split("/"));
  const rel = path.relative(ADMISSION_ARTIFACT_ROOT, target);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel))
    throw new Error(`unsafe_admission_artifact_path:${relative}`);
  await assertNoFollowParents(ADMISSION_ARTIFACT_ROOT, target);
  try {
    await lstat(target);
    throw new Error(`admission_artifact_collision:${relative}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(target, { recursive: false });
  return target;
}

export function resolveArtifactFile(relative) {
  if (!/^[a-z0-9][a-z0-9._/-]*$/u.test(relative) || relative.includes(".."))
    throw new Error(`unsafe_admission_artifact_path:${relative}`);
  const target = path.resolve(ADMISSION_ARTIFACT_ROOT, ...relative.split("/"));
  const rel = path.relative(ADMISSION_ARTIFACT_ROOT, target);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel))
    throw new Error(`unsafe_admission_artifact_path:${relative}`);
  return target;
}

export async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function admissionFixtureIdentity(modes) {
  const records = Object.entries(modes)
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([mode, value]) =>
      ["task", "hidden", "schema"].map(
        (kind) =>
          `${mode}\0${kind}\0${value[kind].path}\0${value[kind].sha256}`,
      ),
    );
  return sha256(records.join("\0"));
}

export function median(values) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function ratioDelta(after, before) {
  return Number.isFinite(after) && Number.isFinite(before) && before > 0
    ? (after - before) / before
    : null;
}

export function coefficientOfVariation(values) {
  const numbers = values.filter(Number.isFinite);
  if (numbers.length < 2) return null;
  const mean = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  if (mean === 0) return null;
  const variance =
    numbers.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (numbers.length - 1);
  return Math.sqrt(variance) / Math.abs(mean);
}

export function git(args) {
  return spawnSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
}

async function verifyFileRecord(record, failures) {
  const file = path.join(REPO_ROOT, record.path);
  try {
    const actual = sha256(await readFile(file));
    if (actual !== record.sha256) failures.push(`file:${record.path}`);
  } catch {
    failures.push(`missing:${record.path}`);
  }
}

async function verifyGuidanceBundle(bundle, failures) {
  try {
    await guidanceText(bundle);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
}

function extractSection(content, extract) {
  const start = content.indexOf(extract.start_heading);
  const end = content.indexOf(extract.end_heading, start + 1);
  if (start < 0 || end <= start)
    throw new Error(`guidance_section_missing:${extract.start_heading}`);
  if (content.indexOf(extract.start_heading, start + 1) >= 0)
    throw new Error(`guidance_section_duplicate:${extract.start_heading}`);
  return content.slice(start, end);
}

async function assertNoFollowParents(root, target) {
  await mkdir(root, { recursive: true });
  const relative = path.relative(root, target);
  let current = root;
  for (const segment of relative.split(path.sep).slice(0, -1)) {
    current = path.join(current, segment);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink())
        throw new Error(`admission_artifact_parent_link:${current}`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await mkdir(current);
    }
  }
}
