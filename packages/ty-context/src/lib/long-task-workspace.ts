import { spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";
import type {
  WorkspaceFileV2,
  WorkspaceFingerprintV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";

export interface WorkspaceSnapshotV2 {
  root: string;
  manifest: WorkspaceManifestV2;
  preparation_ms: number;
  dispose(): Promise<void>;
}

export async function repositoryRoot(start: string): Promise<string> {
  return path.resolve(
    await gitOutput(path.resolve(start), ["rev-parse", "--show-toplevel"]),
  );
}

export async function gitCommonDir(root: string): Promise<string> {
  return path.resolve(
    await gitOutput(root, [
      "rev-parse",
      "--path-format=absolute",
      "--git-common-dir",
    ]),
  );
}

export async function captureWorkspaceFingerprint(
  rootInput: string,
  excludedPrefixes: string[] = [],
): Promise<WorkspaceFingerprintV2> {
  const root = path.resolve(rootInput);
  const indexTree = await gitOutput(root, ["write-tree"]);
  const [head, headTree, staged, unstaged, statusBytes, untracked] =
    await Promise.all([
      gitOutput(root, ["rev-parse", "HEAD"]),
      gitOutput(root, ["rev-parse", "HEAD^{tree}"]),
      gitBuffer(
        root,
        scopedDiffArgs(
          ["diff", "--cached", "--binary", "--no-ext-diff"],
          excludedPrefixes,
        ),
      ),
      gitBuffer(
        root,
        scopedDiffArgs(["diff", "--binary", "--no-ext-diff"], excludedPrefixes),
      ),
      Promise.all([
        gitBuffer(
          root,
          scopedDiffArgs(
            ["diff", "--cached", "--raw", "-z", "-M"],
            excludedPrefixes,
          ),
        ),
        gitBuffer(
          root,
          scopedDiffArgs(["diff", "--raw", "-z", "-M"], excludedPrefixes),
        ),
      ]).then((rows) => Buffer.concat(rows)),
      untrackedIdentity(root, excludedPrefixes),
    ]);
  const unsigned = {
    head,
    head_tree: headTree,
    index_tree: indexTree,
    staged_diff_sha256: sha256Hex(staged),
    unstaged_diff_sha256: sha256Hex(unstaged),
    untracked_sha256: untracked,
    status_sha256: sha256Hex(statusBytes),
  };
  return {
    ...unsigned,
    identity: sha256Hex(canonicalValueJson(unsigned)),
  };
}

export async function captureWorkspaceManifest(
  rootInput: string,
  workdirInput: string,
  _copyRoot?: string,
  additionalExcludedWorkdirs: string[] = [],
): Promise<WorkspaceManifestV2> {
  const root = path.resolve(rootInput);
  const workdir = path.resolve(workdirInput);
  const workdirRelative = repoRelative(root, workdir);
  if (!workdirRelative)
    throw new Error("long_task_workdir_must_not_be_repository_root");
  const excluded = excludedPrefixes(root, [
    workdir,
    ...additionalExcludedWorkdirs,
  ]);
  const fingerprint = await captureWorkspaceFingerprint(root, excluded);
  const [indexBytes, modifiedBytes, untrackedBytes] = await Promise.all([
    gitBuffer(root, ["ls-files", "--stage", "-z"]),
    gitBuffer(root, ["diff", "--name-only", "-z"]),
    gitBuffer(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
  ]);
  const files = new Map<string, WorkspaceFileV2>();
  for (const record of splitZero(indexBytes)) {
    const tab = record.indexOf("\t");
    if (tab < 0) continue;
    const [modeText, objectId, stage] = record.slice(0, tab).split(" ");
    const relative = record.slice(tab + 1).replace(/\\/gu, "/");
    if (stage !== "0" || excludedPath(relative, excluded)) continue;
    files.set(relative, {
      path: relative,
      mode: Number.parseInt(modeText, 8),
      size: 0,
      sha256: `git:${objectId}`,
    });
  }
  const overlays = new Set([
    ...splitZero(modifiedBytes),
    ...splitZero(untrackedBytes),
  ]);
  const overlayNames = [...overlays]
    .map((raw) => raw.replace(/\\/gu, "/"))
    .filter((relative) => !excludedPath(relative, excluded));
  const overlayInfo = new Map(
    await Promise.all(
      overlayNames.map(
        async (relative) =>
          [
            relative,
            await stat(path.join(root, ...relative.split("/")), {
              bigint: true,
            }).catch(() => null),
          ] as const,
      ),
    ),
  );
  const overlayHashes = await gitObjectIds(
    root,
    overlayNames.filter((relative) => overlayInfo.get(relative)?.isFile()),
  );
  for (const relative of overlayNames) {
    const absolute = path.join(root, ...relative.split("/"));
    const info = overlayInfo.get(relative);
    if (!info?.isFile()) {
      files.delete(relative);
      continue;
    }
    const bytes = await readFile(absolute);
    files.set(relative, {
      path: relative,
      mode: gitFileMode(Number(info.mode)),
      size: bytes.length,
      sha256: `git:${overlayHashes.get(relative)}`,
    });
  }
  return {
    repository_root: root,
    git_head: fingerprint.head,
    files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)),
    fingerprint,
    snapshot_sha256: fingerprint.identity,
  };
}

export async function createWorkspaceSnapshot(
  rootInput: string,
  workdirInput: string,
  label: string,
  additionalExcludedWorkdirs: string[] = [],
): Promise<WorkspaceSnapshotV2> {
  const started = performance.now();
  const root = path.resolve(rootInput);
  const workdir = path.resolve(workdirInput);
  const fingerprintExcluded = excludedPrefixes(root, [
    workdir,
    ...additionalExcludedWorkdirs,
  ]);
  const snapshotExcluded = snapshotExcludedPrefixes(root, [
    workdir,
    ...additionalExcludedWorkdirs,
  ]);
  const manifest = await captureWorkspaceManifest(
    root,
    workdir,
    undefined,
    additionalExcludedWorkdirs,
  );
  const before = manifest.fingerprint;
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), `ty-context-${safe(label)}-`),
  );
  try {
    await gitVoid(root, [
      "checkout-index",
      "--all",
      "--force",
      `--prefix=${temporary.replace(/\\/gu, "/")}/`,
    ]);
    await overlayTrackedEolDifferences(root, temporary);
    const [modified, untracked] = await Promise.all([
      gitBuffer(root, ["diff", "--name-only", "-z"]),
      gitBuffer(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
    ]);
    for (const raw of new Set([
      ...splitZero(modified),
      ...splitZero(untracked),
    ])) {
      const relative = raw.replace(/\\/gu, "/");
      if (excludedPath(relative, snapshotExcluded)) continue;
      const source = path.join(root, ...relative.split("/"));
      const target = path.join(temporary, ...relative.split("/"));
      const info = await stat(source).catch(() => null);
      if (!info?.isFile()) {
        await rm(target, { recursive: true, force: true });
        continue;
      }
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
    }
    await removeExcludedSnapshotPaths(temporary, snapshotExcluded);
    await linkDependencyTrees(root, temporary, [
      workdir,
      ...additionalExcludedWorkdirs,
    ]);
    const after = await captureWorkspaceFingerprint(root, fingerprintExcluded);
    if (after.identity !== before.identity)
      throw new Error("workspace_changed_during_snapshot");
    return {
      root: temporary,
      manifest,
      preparation_ms: performance.now() - started,
      dispose: () => rm(temporary, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(temporary, { recursive: true, force: true });
    throw error;
  }
}

export function changedWorkspacePaths(
  baseline: WorkspaceManifestV2,
  current: WorkspaceManifestV2,
): string[] {
  const before = new Map(
    baseline.files.map((file) => [file.path, `${file.mode}:${file.sha256}`]),
  );
  const after = new Map(
    current.files.map((file) => [file.path, `${file.mode}:${file.sha256}`]),
  );
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((file) => before.get(file) !== after.get(file))
    .sort();
}

export async function changedWorkspacePathsFromHead(
  rootInput: string,
  workdirInput: string,
  additionalExcludedWorkdirs: string[] = [],
): Promise<string[]> {
  const root = path.resolve(rootInput);
  const workdir = path.resolve(workdirInput);
  const excluded = excludedPrefixes(root, [
    workdir,
    ...additionalExcludedWorkdirs,
  ]);
  const [trackedBytes, untrackedBytes] = await Promise.all([
    gitBuffer(
      root,
      scopedDiffArgs(
        ["diff", "--name-only", "--no-renames", "--no-ext-diff", "-z", "HEAD"],
        excluded,
      ),
    ),
    gitBuffer(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
  ]);
  return [
    ...new Set(
      [...splitZero(trackedBytes), ...splitZero(untrackedBytes)]
        .map((raw) => raw.replace(/\\/gu, "/"))
        .filter((relative) => !excludedPath(relative, excluded)),
    ),
  ].sort();
}

export async function currentGitState(root: string): Promise<{
  head: string;
  tree: string;
  dirty: string[];
}> {
  const [head, tree, raw] = await Promise.all([
    gitOutput(root, ["rev-parse", "HEAD"]),
    gitOutput(root, ["rev-parse", "HEAD^{tree}"]),
    gitOutput(root, ["status", "--short", "--untracked-files=all"]),
  ]);
  return {
    head,
    tree,
    dirty: raw ? raw.split(/\r?\n/u).filter(Boolean) : [],
  };
}

export async function currentGitTree(root: string): Promise<string> {
  return gitOutput(root, ["rev-parse", "HEAD^{tree}"]);
}

export async function gitPath(root: string, pathSpec: string): Promise<string> {
  return path.resolve(
    await gitOutput(root, [
      "rev-parse",
      "--path-format=absolute",
      "--git-path",
      pathSpec,
    ]),
  );
}

export async function gitConfigGet(
  root: string,
  name: string,
): Promise<string | null> {
  try {
    return await gitOutput(root, ["config", "--local", "--get", name]);
  } catch (error) {
    if (message(error).includes("git_exit:1")) return null;
    throw error;
  }
}

export async function gitConfigSet(
  root: string,
  name: string,
  value: string,
): Promise<void> {
  await gitVoid(root, ["config", "--local", name, value]);
}

export async function gitConfigUnset(
  root: string,
  name: string,
): Promise<void> {
  try {
    await gitVoid(root, ["config", "--local", "--unset-all", name]);
  } catch (error) {
    if (!message(error).includes("git_exit:5")) throw error;
  }
}

export function resolveInsideRepository(
  rootInput: string,
  relativeInput: string,
  label: string,
): string {
  if (!relativeInput || path.isAbsolute(relativeInput))
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  const normalized = relativeInput.replace(/\\/gu, "/");
  if (normalized.split("/").includes(".."))
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  const root = path.resolve(rootInput);
  const resolved = path.resolve(root, ...normalized.split("/"));
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`))
    throw new Error(`unsafe_path:${label}:${relativeInput}`);
  return resolved;
}

export function repoRelative(rootInput: string, fileInput: string): string {
  const value = path
    .relative(path.resolve(rootInput), path.resolve(fileInput))
    .replace(/\\/gu, "/");
  if (value.startsWith("../") || path.isAbsolute(value))
    throw new Error(`path_outside_repository:${fileInput}`);
  return value;
}

async function untrackedIdentity(
  root: string,
  excluded: string[],
): Promise<string> {
  const names = splitZero(
    await gitBuffer(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
  )
    .map((name) => name.replace(/\\/gu, "/"))
    .filter((name) => !excludedPath(name, excluded))
    .sort();
  const hashes = await gitObjectIds(root, names);
  const rows: Array<[string, string]> = names.map((name) => [
    name,
    hashes.get(name) ?? "missing",
  ]);
  return sha256Hex(canonicalValueJson(rows));
}

function excludedPrefixes(root: string, workdirs: string[]): string[] {
  return [
    ...snapshotExcludedPrefixes(root, workdirs),
    "project_context",
  ].filter(Boolean);
}

function snapshotExcludedPrefixes(root: string, workdirs: string[]): string[] {
  return [
    ...workdirs.map((workdir) => repoRelative(root, path.resolve(workdir))),
    "tmp/ty-context/long-task-runs",
  ].filter(Boolean);
}

function excludedPath(relative: string, excluded: string[]): boolean {
  const normalized = relative.replace(/\\/gu, "/");
  return (
    normalized.split("/").includes("node_modules") ||
    excluded.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    )
  );
}

async function removeExcludedSnapshotPaths(
  snapshotRoot: string,
  excluded: string[],
): Promise<void> {
  for (const relative of excluded)
    await rm(path.join(snapshotRoot, ...relative.split("/")), {
      recursive: true,
      force: true,
    });
  async function visit(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name === "node_modules") {
        await rm(target, { recursive: true, force: true });
      } else if (entry.isDirectory()) await visit(target);
    }
  }
  await visit(snapshotRoot);
}

async function overlayTrackedEolDifferences(
  sourceRoot: string,
  snapshotRoot: string,
): Promise<void> {
  const [raw, autocrlf] = await Promise.all([
    gitBuffer(sourceRoot, ["ls-files", "--eol", "-z"]),
    gitConfigGet(sourceRoot, "core.autocrlf"),
  ]);
  for (const record of splitZero(raw)) {
    const tab = record.indexOf("\t");
    if (tab < 0) continue;
    const metadata = record.slice(0, tab);
    const relative = record.slice(tab + 1).replace(/\\/gu, "/");
    const match = metadata.match(/^i\/(\S+)\s+w\/(\S+)\s+attr\/(.*)$/u);
    if (!match) continue;
    const [, indexEol, worktreeEol, attributesRaw] = match;
    const expected = checkoutEol(indexEol, attributesRaw.trim(), autocrlf);
    if (worktreeEol === expected) continue;
    const source = path.join(sourceRoot, ...relative.split("/"));
    const target = path.join(snapshotRoot, ...relative.split("/"));
    const info = await stat(source).catch(() => null);
    if (!info?.isFile()) continue;
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}

function checkoutEol(
  indexEol: string,
  attributes: string,
  autocrlf: string | null,
): string {
  const explicit = attributes.match(/(?:^|\s)eol=(lf|crlf)(?:\s|$)/u)?.[1];
  if (explicit) return explicit;
  if (/(?:^|\s)-text(?:\s|$)/u.test(attributes)) return indexEol;
  if (indexEol === "-text" || indexEol === "none") return indexEol;
  return autocrlf?.toLowerCase() === "true" ? "crlf" : indexEol;
}

async function linkDependencyTrees(
  sourceRoot: string,
  snapshotRoot: string,
  workdirs: string[],
): Promise<void> {
  const protectedWorkdirs = workdirs.map((workdir) =>
    repoRelative(sourceRoot, workdir),
  );
  async function visit(directory: string, relative = ""): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      if (
        protectedWorkdirs.some(
          (protectedWorkdir) =>
            next === protectedWorkdir ||
            next.startsWith(`${protectedWorkdir}/`),
        ) ||
        entry.name === ".git"
      )
        continue;
      const source = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name === "node_modules") {
        const target = path.join(snapshotRoot, ...next.split("/"));
        await mkdir(path.dirname(target), { recursive: true });
        await rm(target, { recursive: true, force: true });
        await symlink(
          source,
          target,
          process.platform === "win32" ? "junction" : "dir",
        );
      } else if (entry.isDirectory()) await visit(source, next);
    }
  }
  await visit(sourceRoot);
}

function splitZero(value: Buffer): string[] {
  return value.toString("utf8").split("\0").filter(Boolean);
}

function scopedDiffArgs(base: string[], excluded: string[]): string[] {
  return [
    ...base,
    "--",
    ".",
    ...excluded.map((prefix) => `:(exclude)${prefix}/**`),
    ":(exclude)**/node_modules/**",
  ];
}

async function gitObjectIds(
  root: string,
  names: string[],
): Promise<Map<string, string>> {
  if (!names.length) return new Map();
  const output = await gitBufferInput(
    root,
    ["hash-object", "--stdin-paths"],
    Buffer.from(`${names.join("\n")}\n`, "utf8"),
  );
  const ids = output.toString("utf8").trim().split(/\r?\n/u);
  return new Map(names.map((name, index) => [name, ids[index]]));
}

function gitFileMode(mode: number): number {
  return mode & 0o111 ? 0o100755 : 0o100644;
}

async function gitOutput(root: string, argv: string[]): Promise<string> {
  return (await gitBuffer(root, argv)).toString("utf8").trim();
}

async function gitVoid(root: string, argv: string[]): Promise<void> {
  await gitBuffer(root, argv);
}

async function gitBuffer(root: string, argv: string[]): Promise<Buffer> {
  return gitBufferInput(root, argv);
}

async function gitBufferInput(
  root: string,
  argv: string[],
  input?: Buffer,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", argv, {
      cwd: root,
      shell: false,
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    if (input) child.stdin.end(input);
    child.on("close", (code) => {
      if (code === 0) resolve(Buffer.concat(stdout));
      else
        reject(
          new Error(
            `git_exit:${code}:${argv.join(" ")}:${Buffer.concat(stderr).toString("utf8").trim()}`,
          ),
        );
    });
  });
}

function safe(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/gu, "-").slice(0, 80);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
