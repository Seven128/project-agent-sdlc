import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { lstat, readFile, realpath, writeFile } from "node:fs/promises";
import path from "node:path";

export function readGitBlob(repoRoot, source) {
  const spec = `${source.commit}:${source.path}`;
  const oid = readGitObjectId(repoRoot, spec);
  if (oid !== source.blob_oid)
    throw new Error(`git_blob_oid_mismatch:${source.path}`);
  return execFileSync("git", ["show", spec], {
    cwd: repoRoot,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

export function readGitObjectId(repoRoot, spec) {
  return execFileSync("git", ["rev-parse", "--verify", spec], {
    cwd: repoRoot,
    encoding: "utf8",
    windowsHide: true,
  }).trim();
}

export async function readRegularContained(root, target) {
  const resolvedRoot = await realpath(path.resolve(root));
  const resolved = path.resolve(target);
  if (!inside(resolvedRoot, resolved))
    throw new Error("guidance_path_outside_root");
  const relative = path.relative(resolvedRoot, resolved);
  let cursor = resolvedRoot;
  for (const segment of relative.split(path.sep)) {
    cursor = path.join(cursor, segment);
    const status = await lstat(cursor);
    if (status.isSymbolicLink()) throw new Error("guidance_path_is_link");
  }
  const status = await lstat(resolved);
  if (!status.isFile()) throw new Error("guidance_path_not_regular_file");
  if (!inside(resolvedRoot, await realpath(resolved)))
    throw new Error("guidance_realpath_outside_root");
  return readFile(resolved);
}

export async function readTrackedRegularContained(repoRoot, relative) {
  const normalized = String(relative).replace(/\\/gu, "/");
  const bytes = await readRegularContained(
    repoRoot,
    path.join(repoRoot, ...normalized.split("/")),
  );
  let indexBytes;
  try {
    readGitObjectId(repoRoot, `:${normalized}`);
    indexBytes = execFileSync("git", ["show", `:${normalized}`], {
      cwd: repoRoot,
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    throw new Error(`delegation_tracked_source_missing:${normalized}`);
  }
  if (!bytes.equals(indexBytes))
    throw new Error(`delegation_tracked_source_index_mismatch:${normalized}`);
  return bytes;
}

export async function writeVerified(target, bytes, root) {
  await readRegularContained(root, target);
  await writeFile(target, bytes);
  const actual = await readRegularContained(root, target);
  if (!actual.equals(bytes))
    throw new Error("delegation_guidance_write_mismatch");
}

export function decodeUtf8(bytes, label) {
  let value;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label}_invalid_utf8`);
  }
  if (value.charCodeAt(0) === 0xfeff)
    throw new Error(`${label}_utf8_bom_forbidden`);
  return value;
}

export function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}
