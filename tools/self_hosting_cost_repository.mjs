import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

import { resolveAffectedChanges } from "./affected_change_discovery.mjs";
import { normalizeRepositoryRelativePath } from "./normalized_host_trace.mjs";
import { unavailableMeasurement } from "./self_hosting_cost_model.mjs";

const exec = promisify(execFile);
const maxGitOutput = 128 * 1024 * 1024;

export const repository = path.resolve(
  fileURLToPath(new URL("..", import.meta.url)),
);

export async function collectRepositoryCandidate() {
  const [headCommit, headTree, patch, untrackedOutput] = await Promise.all([
    gitText(["rev-parse", "--verify", "HEAD^{commit}"]),
    gitText(["rev-parse", "--verify", "HEAD^{tree}"]),
    gitBuffer(["diff", "--binary", "--no-ext-diff", "HEAD", "--"]),
    gitBuffer(["ls-files", "--others", "--exclude-standard", "-z"]),
  ]);
  const untrackedPaths = untrackedOutput
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map(normalizeRepositoryRelativePath)
    .sort(compareText);
  const workingTreeHash = createHash("sha256");
  updateDigest(workingTreeHash, "tracked_patch", patch);
  let untrackedBytes = 0;
  for (const relative of untrackedPaths) {
    const input = await readRepositoryRegular(relative);
    untrackedBytes += input.bytes.length;
    updateDigest(workingTreeHash, `untracked:${relative}`, input.bytes);
  }
  return {
    head_commit: headCommit,
    head_tree: headTree,
    working_tree: {
      clean: patch.length === 0 && untrackedPaths.length === 0,
      digest: workingTreeHash.digest("hex"),
      tracked_patch_bytes: patch.length,
      tracked_patch_sha256: sha256(patch),
      untracked_file_count: untrackedPaths.length,
      untracked_bytes: untrackedBytes,
    },
  };
}

export async function collectExplicitComparison(baseRef) {
  if (!baseRef) return unavailableMeasurement("base_ref_not_supplied");
  if (!/^[A-Za-z0-9][A-Za-z0-9._/@{}~^:+-]{0,255}$/u.test(baseRef)) {
    return unavailableMeasurement("base_ref_invalid_or_unavailable");
  }
  try {
    const baseCommit = await gitText([
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${baseRef}^{commit}`,
    ]);
    const [baseTree, mergeBase, affected] = await Promise.all([
      gitText(["rev-parse", "--verify", `${baseCommit}^{tree}`]),
      gitText(["merge-base", baseCommit, "HEAD"]),
      resolveAffectedChanges({
        repository,
        explicitBase: baseCommit,
        environment: {},
      }),
    ]);
    return {
      availability: "available",
      source: "explicit_base_ref",
      value: {
        requested_ref: baseRef,
        base_commit: baseCommit,
        base_tree: baseTree,
        merge_base_commit: mergeBase,
        changed_paths: affected.paths,
        includes_worktree: affected.discovery.includes_worktree,
      },
    };
  } catch {
    return unavailableMeasurement("base_ref_invalid_or_unavailable");
  }
}

export async function readRepositoryRegular(
  relative,
  { optional = false } = {},
) {
  const normalized = normalizeRepositoryRelativePath(relative);
  const parts = normalized.split("/");
  let current = repository;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if (optional && error?.code === "ENOENT") return null;
      throw error;
    }
    if (info.isSymbolicLink()) {
      throw new Error(`self_hosting_path_symlink_not_allowed:${normalized}`);
    }
    if (index < parts.length - 1 && !info.isDirectory()) {
      throw new Error(`self_hosting_path_parent_not_directory:${normalized}`);
    }
    if (index === parts.length - 1 && !info.isFile()) {
      throw new Error(`self_hosting_input_not_regular:${normalized}`);
    }
  }
  return { path: normalized, bytes: await readFile(current) };
}

export async function candidateIncludesPath(relative) {
  const normalized = normalizeRepositoryRelativePath(relative);
  const output = await gitBuffer([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
    "--",
    `:(literal)${normalized}`,
  ]);
  return output
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .some((entry) => normalizeRepositoryRelativePath(entry) === normalized);
}

export async function writeRepositoryArtifact(relative, value) {
  const normalized = normalizeRepositoryRelativePath(relative);
  if (!normalized.startsWith(".artifacts/")) {
    throw new Error(`self_hosting_artifact_path_unsafe:${normalized}`);
  }
  const target = path.join(repository, ...normalized.split("/"));
  await assertOutputChain(normalized);
  await mkdir(path.dirname(target), { recursive: true });
  await assertOutputChain(normalized);
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o600,
    });
    await replaceArtifact(temporary, target, normalized);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function replaceArtifact(temporary, target, relative) {
  await assertOutputChain(relative);
  try {
    await rename(temporary, target);
    return;
  } catch (error) {
    if (!new Set(["EEXIST", "EPERM"]).has(error?.code)) throw error;
  }
  const backup = `${target}.${process.pid}.${randomUUID()}.backup`;
  await rename(target, backup);
  try {
    await rename(temporary, target);
  } catch (error) {
    await rename(backup, target);
    throw error;
  }
  await rm(backup, { force: true });
}

async function assertOutputChain(relative) {
  const parts = relative.split("/");
  let current = repository;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    try {
      const info = await lstat(current);
      const wrongType =
        index < parts.length - 1 ? !info.isDirectory() : !info.isFile();
      if (info.isSymbolicLink() || wrongType) {
        throw new Error(`self_hosting_artifact_path_unsafe:${relative}`);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

export async function gitText(args) {
  const result = await exec("git", args, {
    cwd: repository,
    windowsHide: true,
    maxBuffer: maxGitOutput,
  });
  return result.stdout.trim();
}

async function gitBuffer(args) {
  const result = await exec("git", args, {
    cwd: repository,
    windowsHide: true,
    encoding: "buffer",
    maxBuffer: maxGitOutput,
  });
  return result.stdout;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function parseReportArguments(args) {
  const options = {
    artifact: ".artifacts/self-hosting-cost/report.json",
    timings: [],
  };
  const names = {
    "--artifact": "artifact",
    "--base-ref": "baseRef",
    "--structural-report": "structuralReport",
    "--host-trace": "hostTrace",
  };
  const flags = new Set([...Object.keys(names), "--timing"]);
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flags.has(flag) || index + 1 >= args.length) {
      throw new Error(`self_hosting_unknown_or_incomplete_argument:${flag}`);
    }
    const value = args[++index];
    if (flag === "--timing") options.timings.push(value);
    else options[names[flag]] = value;
  }
  return options;
}

export function isDirectInvocation(moduleUrl) {
  return Boolean(
    process.argv[1] &&
      pathToFileURL(path.resolve(process.argv[1])).href === moduleUrl,
  );
}

function updateDigest(hash, label, bytes) {
  hash.update(`${Buffer.byteLength(label)}:${label}:${bytes.length}:`, "utf8");
  hash.update(bytes);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
