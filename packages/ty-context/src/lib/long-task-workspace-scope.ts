import path from "node:path";
import { readConfig } from "./config.js";
import { harnessConfigPath, harnessPath, harnessRoot } from "./harness-root.js";
import { listFiles, pathExists } from "./fs.js";
import {
  matchesRepoPattern,
  normalizeRepositoryFile,
} from "./long-task-paths.js";
import { longTaskCodexAgentProfileBootstrapPaths } from "./long-task-codex-agent-profile.js";
import { packageAssetPath } from "./paths.js";
import { enabledManagedSkillNames, isProfileEnabled } from "./profiles.js";
import type { HarnessConfig, ManagedFile } from "./types.js";

interface WorkspaceScopeAuthority {
  global: {
    technical: {
      forbidden_paths: Array<{ path: string }>;
    };
  };
  outcomes: Array<{
    technical: {
      expected_change_paths: string[];
      allowed_support_paths: string[];
      forbidden_paths: string[];
    };
  }>;
}

export interface WorkspaceScopeClassificationV2 {
  protected: string[];
  expected_change: string[];
  allowed_support: string[];
  forbidden: string[];
  unclassified: string[];
  blocking_paths: string[];
}

export function classifyWorkspaceScope(
  authority: WorkspaceScopeAuthority,
  changedPaths: string[],
  protectedPaths: string[],
): WorkspaceScopeClassificationV2 {
  const protectedSet = new Set(normalizeFiles(protectedPaths));
  const expectedPatterns = authority.outcomes.flatMap(
    (outcome) => outcome.technical.expected_change_paths,
  );
  const supportPatterns = authority.outcomes.flatMap(
    (outcome) => outcome.technical.allowed_support_paths,
  );
  const forbiddenPatterns = [
    ...authority.global.technical.forbidden_paths.map((entry) => entry.path),
    ...authority.outcomes.flatMap(
      (outcome) => outcome.technical.forbidden_paths,
    ),
  ];
  const result: WorkspaceScopeClassificationV2 = {
    protected: [],
    expected_change: [],
    allowed_support: [],
    forbidden: [],
    unclassified: [],
    blocking_paths: [],
  };
  for (const file of normalizeFiles(changedPaths)) {
    if (protectedSet.has(file)) result.protected.push(file);
    else if (matchesAny(file, forbiddenPatterns)) result.forbidden.push(file);
    else if (matchesAny(file, expectedPatterns))
      result.expected_change.push(file);
    else if (matchesAny(file, supportPatterns))
      result.allowed_support.push(file);
    else result.unclassified.push(file);
  }
  result.blocking_paths = [...result.forbidden, ...result.unclassified].sort();
  return result;
}

export function protectedWorkspacePaths(input: {
  contract_files?: Record<string, string> | null;
  source_hashes?: Record<string, string> | null;
  context_hashes?: Record<string, string> | null;
  checks?: Array<{ verification_input_hashes: Record<string, string> }>;
  additional_files?: string[];
}): string[] {
  return normalizeFiles([
    ...Object.keys(input.contract_files ?? {}),
    ...Object.keys(input.source_hashes ?? {}),
    ...Object.keys(input.context_hashes ?? {}),
    ...(input.checks ?? []).flatMap((check) =>
      Object.keys(check.verification_input_hashes),
    ),
    ...(input.additional_files ?? []),
  ]);
}

export async function firstLockManagedWorkspacePaths(
  repository: string,
  changedPaths: string[],
): Promise<string[]> {
  const root = await harnessRoot(repository);
  const config = await readConfig(repository);
  const managedFiles = new Set(
    [
      await harnessConfigPath(repository),
      ".codex/hooks.json",
      ...(await longTaskCodexAgentProfileBootstrapPaths(
        repository,
        root,
        isProfileEnabled(config, "long-task"),
      )),
      ...(await packageManagedBootstrapFiles(root, config)),
    ].map(normalizeManagedRoot),
  );
  return normalizeFiles(changedPaths).filter((file) => managedFiles.has(file));
}

export function workspaceScopeErrors(
  classification: WorkspaceScopeClassificationV2,
): string[] {
  return [
    ...classification.forbidden.map(
      (file) => `workspace_path_forbidden:${file}`,
    ),
    ...classification.unclassified.map(
      (file) => `workspace_path_unclassified:${file}`,
    ),
  ];
}

export function assertWorkspaceScope(
  classification: WorkspaceScopeClassificationV2,
): void {
  const [error] = workspaceScopeErrors(classification);
  if (error) throw new Error(error);
}

function normalizeFiles(files: string[]): string[] {
  return [
    ...new Set(files.map((file) => normalizeRepositoryFile(file))),
  ].sort();
}

function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesRepoPattern(file, pattern));
}

function normalizeManagedRoot(file: string): string {
  return normalizeRepositoryFile(file.replace(/\/+$/u, ""));
}

async function packageManagedBootstrapFiles(
  root: string,
  config: HarnessConfig,
): Promise<string[]> {
  const files: string[] = [];
  for (const managed of config.managed_files)
    files.push(...(await managedBootstrapFiles(root, config, managed)));
  return files;
}

async function managedBootstrapFiles(
  root: string,
  config: HarnessConfig,
  managed: ManagedFile,
): Promise<string[]> {
  const normalized = normalizeManagedRoot(managed.path);
  if (
    managed.path === "AGENTS.md" ||
    managed.path === "Makefile" ||
    managed.path === ".github/workflows/harness.yml"
  )
    return [managed.path];
  if (isSkillsManagedPath(normalized, root)) {
    const files: string[] = [];
    for (const name of enabledManagedSkillNames(config))
      files.push(
        ...(await assetTreeFiles(
          harnessPath(root, "skills", name),
          "skills",
          name,
        )),
      );
    return files;
  }
  if (
    normalized === harnessPath(root, "ty-context-managed", "context_templates")
  )
    return assetTreeFiles(managed.path, "context_templates");
  if (normalized === harnessPath(root, "ty-context-managed", "templates"))
    return assetTreeFiles(managed.path, "templates");
  if (normalized === harnessPath(root, "ty-context-managed", "policies"))
    return assetTreeFiles(managed.path, "policies");
  if (
    normalized ===
    harnessPath(root, "ty-context-managed", "make", "ty-context.mk")
  )
    return [managed.path];
  if (managed.path === "tools") return assetTreeFiles(managed.path, "tools");
  return [];
}

async function assetTreeFiles(
  destinationRoot: string,
  ...assetSegments: string[]
): Promise<string[]> {
  const sourceRoot = packageAssetPath(...assetSegments);
  if (!(await pathExists(sourceRoot))) return [];
  return (await listFiles(sourceRoot)).map((file) =>
    normalizeManagedRoot(
      harnessPath(
        destinationRoot,
        path.relative(sourceRoot, file).replace(/\\/gu, "/"),
      ),
    ),
  );
}

function isSkillsManagedPath(managedPath: string, root: string): boolean {
  return (
    managedPath === harnessPath(root, "skills") ||
    managedPath === ".harness/agents/skills" ||
    (managedPath === ".agents/skills" && root !== ".agents")
  );
}
