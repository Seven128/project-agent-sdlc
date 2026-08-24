import {
  copyFile,
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readlink,
  realpath,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  CompiledCheckV2,
  CounterfactualControlV2,
  GlobalCounterfactualControlV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  matchesRepoPattern,
  normalizeRepositoryFile,
} from "./long-task-paths.js";

export interface CounterfactualSandboxV2 {
  root: string;
  mutation_source_root: string;
  dispose(): Promise<void>;
}

export interface CounterfactualProcessExecutionRootV2 {
  root: string;
  mutation_source_root: string;
}

const directProcessExecutionSandboxes = new WeakMap<
  CounterfactualSandboxV2,
  CounterfactualProcessExecutionRootV2
>();

type RemoveTree = (
  target: string,
  options: { recursive: true; force: true },
) => Promise<void>;

type Wait = (milliseconds: number) => Promise<void>;

const TRANSIENT_REMOVE_CODES = new Set([
  "EBUSY",
  "EMFILE",
  "ENFILE",
  "ENOTEMPTY",
  "EPERM",
]);
const REMOVE_RETRY_LIMIT = process.platform === "win32" ? 6 : 2;
const REMOVE_RETRY_DELAY_MS = 100;

export async function createCounterfactualSandbox(
  snapshotRoot: string,
  check: CompiledCheckV2,
  control: CounterfactualControlV2 | GlobalCounterfactualControlV2,
  bindingCarrierPaths: string[],
  manifest?: WorkspaceManifestV2,
  protectedAuthorityPaths: readonly string[] = [],
  executionUniverse: readonly CompiledCheckV2[] = [check],
): Promise<CounterfactualSandboxV2> {
  const root = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-counterfactual-"),
  );
  if (!manifest) {
    await cp(snapshotRoot, root, {
      recursive: true,
      force: true,
      dereference: false,
    });
    return disposable(root, root, null);
  }

  const directProcessPaths = directProcessExecutionPaths({
    check,
    control,
    manifest,
    protected_authority_paths: protectedAuthorityPaths,
    execution_universe: executionUniverse,
  });
  let processExecution: CounterfactualProcessExecutionRootV2 | null = null;
  if (directProcessPaths) {
    const processRoot = await mkdtemp(
      path.join(os.tmpdir(), "ty-context-counterfactual-process-"),
    );
    await copyInBatches(snapshotRoot, processRoot, directProcessPaths);
    await mkdir(path.join(processRoot, check.runner.resolved_cwd), {
      recursive: true,
    });
    processExecution = {
      root: processRoot,
      mutation_source_root: snapshotRoot,
    };
  }

  const exactPaths = new Set([
    ...Object.keys(check.runner.frozen_files),
    ...Object.keys(check.verification_input_hashes),
    ...(check.process_runtime_closure?.allowed_runtime_files ?? []),
    check.runner.resolved_target,
    ...(control.mutation.type === "replace_file"
      ? [control.mutation.fixture_path]
      : []),
  ]);
  const patterns = [
    ...check.input_paths,
    ...check.expected_output_paths,
    ...check.artifact_globs,
    ...bindingCarrierPaths,
    ...(control.mutation.type === "remove_paths"
      ? control.mutation.paths
      : [control.mutation.path]),
  ];
  for (const requirement of check.environment_requirements) {
    if (requirement.kind === "file") exactPaths.add(requirement.target);
    if (requirement.kind === "directory")
      patterns.push(`${requirement.target}/**`);
  }
  const candidates = new Set([
    ...manifest.files.map((file) => file.path),
    ...protectedAuthorityPaths.map((file, index) =>
      normalizeRepositoryFile(
        file,
        `counterfactual.protected_authority_paths[${index}]`,
      ),
    ),
  ]);
  const selected = [...candidates].filter(
    (relative) =>
      exactPaths.has(relative) ||
      patterns.some((pattern) => matchesRepoPattern(relative, pattern)),
  );
  await copyInBatches(snapshotRoot, root, selected);
  await mkdir(path.join(root, check.runner.resolved_cwd), { recursive: true });
  await linkDependencyRoots(snapshotRoot, root, check.runner.resolved_cwd);
  return disposable(root, root, processExecution);
}

export function counterfactualSandboxProcessExecution(
  sandbox: CounterfactualSandboxV2,
): CounterfactualProcessExecutionRootV2 | null {
  return directProcessExecutionSandboxes.get(sandbox) ?? null;
}

function directProcessExecutionPaths(input: {
  check: CompiledCheckV2;
  control: CounterfactualControlV2 | GlobalCounterfactualControlV2;
  manifest: WorkspaceManifestV2;
  protected_authority_paths: readonly string[];
  execution_universe: readonly CompiledCheckV2[];
}): string[] | null {
  const checks = [
    ...new Map(
      [
        input.check,
        ...input.execution_universe.filter(
          (candidate) =>
            candidate.raw_execution_identity ===
            input.check.raw_execution_identity,
        ),
      ].map((candidate) => [candidate.internal_id, candidate]),
    ).values(),
  ];
  const processChecks = checks.filter((candidate) =>
    (candidate.observation_authorities ?? []).some(
      (authority) => authority.authority === "package_process_json_exact",
    ),
  );
  if (!processChecks.some((candidate) => candidate === input.check))
    return null;
  const closures = processChecks.map(
    (candidate) => candidate.process_runtime_closure ?? null,
  );
  if (closures.some((closure) => closure === null)) return null;
  const closureIdentities = new Set(
    closures.map((closure) => closure!.closure_identity),
  );
  if (closureIdentities.size !== 1) return null;
  const primaryClosure = input.check.process_runtime_closure!;
  const mutationTargets =
    input.control.mutation.type === "remove_paths"
      ? input.control.mutation.paths
      : [input.control.mutation.path];
  if (
    mutationTargets.some(
      (target) =>
        !primaryClosure.production_carrier_files.includes(target) ||
        input.protected_authority_paths.some((pattern) =>
          matchesRepoPattern(target, pattern),
        ),
    )
  )
    return null;
  const replacementFixture =
    input.control.mutation.type === "replace_file"
      ? input.control.mutation.fixture_path
      : null;
  if (
    replacementFixture !== null &&
    !input.manifest.files.some((file) => file.path === replacementFixture)
  )
    return null;

  const selected = new Set<string>();
  for (const candidate of checks)
    for (const authority of candidate.observation_authorities ?? []) {
      if (
        authority.authority !== "package_static_json_exact" &&
        authority.authority !== "package_process_json_exact"
      )
        continue;
      for (const pattern of authority.carrier_refs.flatMap(
        (carrier) => carrier.carrier_paths,
      ))
        for (const file of input.manifest.files)
          if (matchesRepoPattern(file.path, pattern)) selected.add(file.path);
      if (authority.authority === "package_process_json_exact")
        for (const file of candidate.process_runtime_closure!
          .allowed_runtime_files)
          if (input.manifest.files.some((entry) => entry.path === file))
            selected.add(file);
    }
  return [...selected]
    .filter(
      (file) =>
        !input.protected_authority_paths.some((pattern) =>
          matchesRepoPattern(file, pattern),
        ),
    )
    .sort();
}

async function copyInBatches(
  sourceRoot: string,
  targetRoot: string,
  paths: string[],
): Promise<void> {
  const concurrency = 32;
  for (let index = 0; index < paths.length; index += concurrency)
    await Promise.all(
      paths
        .slice(index, index + concurrency)
        .map((relative) =>
          copyEntry(
            path.join(sourceRoot, relative),
            path.join(targetRoot, relative),
          ),
        ),
    );
}

async function copyEntry(source: string, target: string): Promise<void> {
  await mkdir(path.dirname(target), { recursive: true });
  const info = await lstat(source);
  if (!info.isSymbolicLink()) {
    await copyFile(source, target);
    return;
  }
  const link = await readlink(source);
  if (process.platform === "win32") await symlink(link, target, "junction");
  else await symlink(link, target);
}

async function linkDependencyRoots(
  sourceRoot: string,
  targetRoot: string,
  resolvedCwd: string,
): Promise<void> {
  const segments = resolvedCwd === "." ? [] : resolvedCwd.split("/");
  for (let length = 0; length <= segments.length; length += 1) {
    const relative = path.join(...segments.slice(0, length), "node_modules");
    const source = path.join(sourceRoot, relative);
    if (!(await lstat(source).catch(() => null))) continue;
    const target = path.join(targetRoot, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await rm(target, { recursive: true, force: true });
    await symlink(
      await realpath(source),
      target,
      process.platform === "win32" ? "junction" : "dir",
    );
  }
}

function disposable(
  root: string,
  mutationSourceRoot: string,
  processExecution: CounterfactualProcessExecutionRootV2 | null,
): CounterfactualSandboxV2 {
  const sandbox: CounterfactualSandboxV2 = {
    root,
    mutation_source_root: mutationSourceRoot,
    async dispose() {
      directProcessExecutionSandboxes.delete(sandbox);
      await Promise.all(
        [processExecution?.root, root]
          .filter((candidate): candidate is string => Boolean(candidate))
          .map((candidate) => removeCounterfactualSandboxRoot(candidate)),
      );
    },
  };
  if (processExecution)
    directProcessExecutionSandboxes.set(sandbox, processExecution);
  return sandbox;
}

export async function removeCounterfactualSandboxRoot(
  root: string,
  removeTree: RemoveTree = rm,
  wait: Wait = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await removeTree(root, { recursive: true, force: true });
      return;
    } catch (error) {
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : "";
      if (!TRANSIENT_REMOVE_CODES.has(code) || attempt >= REMOVE_RETRY_LIMIT)
        throw error;
      await wait(REMOVE_RETRY_DELAY_MS * (attempt + 1));
    }
  }
}
