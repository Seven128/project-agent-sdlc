import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { MECHANISM_ROOT, REPO_ROOT } from "./shared.mjs";

const MARKER_SCHEMA = "tiny-context-mechanism-owned-run-v1";
const MARKER_RELATIVE = ".benchmark/mechanism-owned-run.json";

export async function resetOwnedRunDirectory(directory, options = {}) {
  if (typeof directory !== "string" || directory.trim() === "")
    throw new Error("mechanism_run_out_dir_required");
  const target = path.resolve(directory);
  const repoRoot = path.resolve(options.repoRoot ?? REPO_ROOT);
  const mechanismRoot = path.resolve(options.mechanismRoot ?? MECHANISM_ROOT);
  assertSafeTarget(target, repoRoot, mechanismRoot);
  await assertExistingComponentsNotLinked(target);

  const status = await lstatOrNull(target);
  if (status?.isSymbolicLink() || (status && !status.isDirectory()))
    throw new Error("mechanism_run_out_dir_not_regular_directory");
  const entries = status ? await readdir(target) : [];
  if (entries.length > 0) {
    if (options.force !== true)
      throw new Error(`${target} is not empty; pass --force`);
    await verifyOwnedMarker(target);
    assertSafeTarget(target, repoRoot, mechanismRoot);
    await assertExistingComponentsNotLinked(target);
    await rm(target, { recursive: true, force: false });
  }

  await mkdir(target, { recursive: true });
  await assertExistingComponentsNotLinked(target);
  const marker = markerFor(target);
  const markerPath = path.join(target, ...MARKER_RELATIVE.split("/"));
  await mkdir(path.dirname(markerPath), { recursive: true });
  await writeFile(markerPath, `${JSON.stringify(marker, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return target;
}

export function mechanismRunMarker(target) {
  return markerFor(path.resolve(target));
}

function assertSafeTarget(target, repoRoot, mechanismRoot) {
  const fileSystemRoot = path.parse(target).root;
  const protectedTargets = [
    fileSystemRoot,
    path.resolve(homedir()),
    repoRoot,
    mechanismRoot,
    path.resolve(process.cwd()),
  ];
  if (protectedTargets.some((item) => ancestorOrSame(target, item)))
    throw new Error("mechanism_run_out_dir_protected");

  if (inside(repoRoot, target)) {
    const ownedRepoBase = path.join(repoRoot, ".artifacts", "mechanism", "runs");
    if (!inside(ownedRepoBase, target) || samePath(ownedRepoBase, target))
      throw new Error("mechanism_run_out_dir_repo_scope_forbidden");
  }
}

async function verifyOwnedMarker(target) {
  const markerPath = path.join(target, ...MARKER_RELATIVE.split("/"));
  const status = await lstatOrNull(markerPath);
  if (!status || status.isSymbolicLink() || !status.isFile())
    throw new Error("mechanism_run_owned_marker_missing");
  let value;
  try {
    value = JSON.parse(await readFile(markerPath, "utf8"));
  } catch {
    throw new Error("mechanism_run_owned_marker_invalid");
  }
  if (JSON.stringify(value) !== JSON.stringify(markerFor(target)))
    throw new Error("mechanism_run_owned_marker_mismatch");
}

function markerFor(target) {
  const targetPath = normalizedAbsolute(target);
  return {
    schema_version: MARKER_SCHEMA,
    target_path: targetPath,
    ownership_key: createHash("sha256")
      .update(`${MARKER_SCHEMA}\0${targetPath}`)
      .digest("hex"),
  };
}

async function assertExistingComponentsNotLinked(target) {
  const parsed = path.parse(target);
  let cursor = parsed.root;
  for (const segment of target.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, segment);
    const status = await lstatOrNull(cursor);
    if (!status) break;
    if (status.isSymbolicLink())
      throw new Error("mechanism_run_out_dir_link_forbidden");
  }
}

async function lstatOrNull(target) {
  try {
    return await lstat(target);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function ancestorOrSame(candidate, protectedTarget) {
  return samePath(candidate, protectedTarget) || inside(candidate, protectedTarget);
}

function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))
  );
}

function samePath(left, right) {
  return normalizedAbsolute(left) === normalizedAbsolute(right);
}

function normalizedAbsolute(value) {
  const resolved = path.resolve(value).replace(/\\/gu, "/");
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
