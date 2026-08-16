import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { WorkspaceManifestV2 } from "./long-task-delivery-types.js";
import {
  GitCommandError,
  gitBuffer,
  gitEffectiveConfigGet,
  gitVoid,
  repoRelative,
  splitGitZero,
} from "./long-task-git.js";
import {
  captureWorkspaceFingerprint,
  captureWorkspaceManifest,
  workspaceFingerprintExcludedPrefixes,
  workspacePathExcluded,
  workspaceSnapshotExcludedPrefixes,
} from "./long-task-workspace-manifest.js";

const MAX_CHECKOUT_INDEX_ATTEMPTS = 2;

export interface WorkspaceSnapshotV2 {
  root: string;
  manifest: WorkspaceManifestV2;
  preparation_ms: number;
  dispose(): Promise<void>;
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
  const fingerprintExcluded = workspaceFingerprintExcludedPrefixes(root, [
    workdir,
    ...additionalExcludedWorkdirs,
  ]);
  const snapshotExcluded = workspaceSnapshotExcludedPrefixes(root, [
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
  const temporary = await checkoutIndexIntoFreshRoot(
    root,
    label,
    before.identity,
    fingerprintExcluded,
  );
  try {
    await overlayTrackedEolDifferences(root, temporary);
    const [modified, untracked] = await Promise.all([
      gitBuffer(root, ["diff", "--name-only", "-z"]),
      gitBuffer(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
    ]);
    for (const raw of new Set([
      ...splitGitZero(modified),
      ...splitGitZero(untracked),
    ])) {
      const relative = raw.replace(/\\/gu, "/");
      if (workspacePathExcluded(relative, snapshotExcluded)) continue;
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

async function checkoutIndexIntoFreshRoot(
  root: string,
  label: string,
  expectedFingerprint: string,
  fingerprintExcluded: string[],
): Promise<string> {
  for (let attempt = 1; attempt <= MAX_CHECKOUT_INDEX_ATTEMPTS; attempt += 1) {
    const temporary = await mkdtemp(
      path.join(os.tmpdir(), `ty-context-${safe(label)}-`),
    );
    try {
      await gitVoid(root, [
        "checkout-index",
        "--all",
        "--force",
        "--ignore-skip-worktree-bits",
        `--prefix=${temporary.replace(/\\/gu, "/")}/`,
      ]);
      return temporary;
    } catch (error) {
      await rm(temporary, { recursive: true, force: true });
      if (
        !retryableUnclassifiedCheckout(error) ||
        attempt === MAX_CHECKOUT_INDEX_ATTEMPTS
      )
        throw error;
      const current = await captureWorkspaceFingerprint(
        root,
        fingerprintExcluded,
      );
      if (current.identity !== expectedFingerprint)
        throw new Error("workspace_changed_during_snapshot");
    }
  }
  throw new Error("workspace_snapshot_checkout_attempts_exhausted");
}

function retryableUnclassifiedCheckout(error: unknown): boolean {
  return (
    error instanceof GitCommandError &&
    error.exitCode === 1 &&
    error.signal === null &&
    error.stdoutBytes === 0 &&
    error.stderrBytes === 0
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
    gitEffectiveConfigGet(sourceRoot, "core.autocrlf"),
  ]);
  for (const record of splitGitZero(raw)) {
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

function safe(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/gu, "-").slice(0, 80);
}
