import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  WorkspaceFileV2,
  WorkspaceFingerprintV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  gitBuffer,
  gitBufferInput,
  gitOutput,
  repoRelative,
  splitGitZero,
} from "./long-task-git.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

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
  const excluded = workspaceFingerprintExcludedPrefixes(root, [
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
  for (const record of splitGitZero(indexBytes)) {
    const tab = record.indexOf("\t");
    if (tab < 0) continue;
    const [modeText, objectId, stage] = record.slice(0, tab).split(" ");
    const relative = record.slice(tab + 1).replace(/\\/gu, "/");
    if (stage !== "0" || workspacePathExcluded(relative, excluded)) continue;
    files.set(relative, {
      path: relative,
      mode: Number.parseInt(modeText, 8),
      size: 0,
      sha256: `git:${objectId}`,
    });
  }
  const overlays = new Set([
    ...splitGitZero(modifiedBytes),
    ...splitGitZero(untrackedBytes),
  ]);
  const overlayNames = [...overlays]
    .map((raw) => raw.replace(/\\/gu, "/"))
    .filter((relative) => !workspacePathExcluded(relative, excluded));
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
  const excluded = workspaceFingerprintExcludedPrefixes(root, [
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
      [...splitGitZero(trackedBytes), ...splitGitZero(untrackedBytes)]
        .map((raw) => raw.replace(/\\/gu, "/"))
        .filter((relative) => !workspacePathExcluded(relative, excluded)),
    ),
  ].sort();
}

export function workspaceFingerprintExcludedPrefixes(
  root: string,
  workdirs: string[],
): string[] {
  return [
    ...workspaceSnapshotExcludedPrefixes(root, workdirs),
    "project_context",
  ].filter(Boolean);
}

export function workspaceSnapshotExcludedPrefixes(
  root: string,
  workdirs: string[],
): string[] {
  return [
    ...workdirs.map((workdir) => repoRelative(root, path.resolve(workdir))),
    "tmp/ty-context/long-task-runs",
  ].filter(Boolean);
}

export function workspacePathExcluded(
  relative: string,
  excluded: string[],
): boolean {
  const normalized = relative.replace(/\\/gu, "/");
  return (
    normalized.split("/").includes("node_modules") ||
    excluded.some(
      (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
    )
  );
}

async function untrackedIdentity(
  root: string,
  excluded: string[],
): Promise<string> {
  const names = splitGitZero(
    await gitBuffer(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
  )
    .map((name) => name.replace(/\\/gu, "/"))
    .filter((name) => !workspacePathExcluded(name, excluded))
    .sort();
  const hashes = await gitObjectIds(root, names);
  const rows: Array<[string, string]> = names.map((name) => [
    name,
    hashes.get(name) ?? "missing",
  ]);
  return sha256Hex(canonicalValueJson(rows));
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

function scopedDiffArgs(base: string[], excluded: string[]): string[] {
  return [
    ...base,
    "--",
    ".",
    ...excluded.map((prefix) => `:(exclude)${prefix}/**`),
    ":(exclude)**/node_modules/**",
  ];
}

function gitFileMode(mode: number): number {
  return mode & 0o111 ? 0o100755 : 0o100644;
}
