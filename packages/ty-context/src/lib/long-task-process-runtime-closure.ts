import path from "node:path";
import type {
  CompiledObservationAuthorityV2,
  CompiledProcessRuntimeClosureV2,
  DeliveryBindingV2,
  DeliveryCheckV2,
  ExecutionTargetV2,
  FrozenRunnerV2,
  SourceBackedExecutionTargetV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  classifyRepositoryPatternOverlap,
  matchesRepoPattern,
  normalizeRepositoryFile,
} from "./long-task-paths.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export interface CompileProcessRuntimeClosureInput {
  check: DeliveryCheckV2;
  runner: FrozenRunnerV2;
  execution_target: ExecutionTargetV2;
  observation_authorities: readonly CompiledObservationAuthorityV2[];
  production_bindings: readonly DeliveryBindingV2[];
  production_owner_paths: readonly string[];
  source_backed_execution_target: SourceBackedExecutionTargetV2 | null;
  workspace_manifest: WorkspaceManifestV2;
  protected_authority_paths: readonly string[];
}

interface ExpandedBinding {
  binding: DeliveryBindingV2;
  files: string[];
}

export function compileProcessRuntimeClosure(
  input: CompileProcessRuntimeClosureInput,
): CompiledProcessRuntimeClosureV2 | null {
  const processAuthorities = input.observation_authorities.filter(
    (authority) => authority.authority === "package_process_json_exact",
  );
  if (!processAuthorities.length) return null;

  const targetRef = input.execution_target.key;
  const sourceTarget = input.source_backed_execution_target;
  if (!sourceTarget || sourceTarget.target_ref !== targetRef)
    fail("process_root_source_binding_required", targetRef);

  const rootTarget = normalizeRepositoryFile(
    input.execution_target.root_entrypoint,
    `${input.check.key}.process_root`,
  );
  requireManifestFile(input.workspace_manifest, rootTarget, targetRef);
  const expandedBindings = input.production_bindings.map((binding) => ({
    binding,
    files: expandBinding(input.workspace_manifest, binding),
  }));

  validateInputRoleSeparation(input);
  requireProductionOwnership(input, rootTarget, targetRef);
  const rootBindings = bindingsContaining(expandedBindings, rootTarget);
  if (!rootBindings.length)
    fail(
      "process_root_production_binding_required",
      `${targetRef}:${rootTarget}`,
    );

  const rootArgvFiles = argvAttributedRepositoryFiles(
    input.execution_target.root_argv ?? [],
    input.runner.resolved_cwd,
    input.workspace_manifest,
  );
  const selectedBindings = new Map<string, ExpandedBinding>();
  for (const binding of rootBindings) selectBinding(selectedBindings, binding);
  for (const argvFile of rootArgvFiles) {
    requireProductionOwnership(input, argvFile, targetRef);
    const bindings = bindingsContaining(expandedBindings, argvFile);
    if (!bindings.length)
      fail(
        "process_root_production_binding_required",
        `${targetRef}:${argvFile}`,
      );
    for (const binding of bindings) selectBinding(selectedBindings, binding);
  }

  const productionCarrierFiles = new Set<string>();
  for (const carrierRef of processAuthorities.flatMap(
    (authority) => authority.carrier_refs,
  )) {
    const matchingBindings = expandedBindings.filter(
      ({ binding }) =>
        binding.key === carrierRef.binding_ref &&
        carrierRef.carrier_paths.every((carrierPath) =>
          binding.carrier_paths.includes(carrierPath),
        ),
    );
    if (!matchingBindings.length)
      fail(
        "process_root_production_binding_required",
        `${targetRef}:${carrierRef.binding_ref}`,
      );
    for (const binding of matchingBindings) {
      selectBinding(selectedBindings, binding);
      for (const carrierPath of carrierRef.carrier_paths)
        for (const file of expandPattern(input.workspace_manifest, carrierPath))
          productionCarrierFiles.add(file);
    }
  }

  const allowedRuntimeFiles = new Set<string>([rootTarget, ...rootArgvFiles]);
  for (const { files } of selectedBindings.values())
    for (const file of files) allowedRuntimeFiles.add(file);
  for (const file of productionCarrierFiles) allowedRuntimeFiles.add(file);
  for (const file of allowedRuntimeFiles) {
    requireProductionOwnership(input, file, targetRef);
    validateConcreteRoleSeparation(input, file);
  }

  const projection = {
    target_ref: targetRef,
    source_target: sourceTarget,
    root_target: rootTarget,
    root_argv_files: [...new Set(rootArgvFiles)].sort(),
    production_carrier_files: [...productionCarrierFiles].sort(),
    allowed_runtime_files: [...allowedRuntimeFiles].sort(),
    production_binding_refs: [...selectedBindings.keys()].sort(),
    forbidden_role_matches: [],
  } satisfies Omit<CompiledProcessRuntimeClosureV2, "closure_identity">;
  return {
    ...projection,
    closure_identity: sha256Hex(canonicalValueJson(projection)),
  };
}

function validateInputRoleSeparation(
  input: CompileProcessRuntimeClosureInput,
): void {
  for (const inputPattern of input.check.input_paths) {
    const expected = firstOverlap(
      inputPattern,
      input.protected_authority_paths,
    );
    if (expected)
      fail(
        "process_runtime_input_expected_authority_forbidden",
        `${input.check.key}:${inputPattern}:${expected}`,
      );
    const verification = firstOverlap(
      inputPattern,
      input.check.verification_inputs,
    );
    if (verification)
      fail(
        "process_runtime_input_verification_role_forbidden",
        `${input.check.key}:${inputPattern}:${verification}`,
      );
    const evidence = firstOverlap(inputPattern, [
      ...input.check.expected_output_paths,
      ...input.check.artifact_globs,
    ]);
    if (evidence)
      fail(
        "process_runtime_input_evidence_role_forbidden",
        `${input.check.key}:${inputPattern}:${evidence}`,
      );
  }
}

function validateConcreteRoleSeparation(
  input: CompileProcessRuntimeClosureInput,
  file: string,
): void {
  const expected = firstMatchingPattern(file, input.protected_authority_paths);
  if (expected)
    fail(
      "process_runtime_input_expected_authority_forbidden",
      `${input.check.key}:${file}:${expected}`,
    );
  const verification = firstMatchingPattern(
    file,
    input.check.verification_inputs,
  );
  if (verification)
    fail(
      "process_runtime_input_verification_role_forbidden",
      `${input.check.key}:${file}:${verification}`,
    );
  const evidence = firstMatchingPattern(file, [
    ...input.check.expected_output_paths,
    ...input.check.artifact_globs,
  ]);
  if (evidence)
    fail(
      "process_runtime_input_evidence_role_forbidden",
      `${input.check.key}:${file}:${evidence}`,
    );
}

function requireProductionOwnership(
  input: CompileProcessRuntimeClosureInput,
  file: string,
  targetRef: string,
): void {
  if (
    !input.production_owner_paths.some((pattern) =>
      matchesRepoPattern(file, pattern),
    )
  )
    fail(
      "process_root_production_binding_required",
      `${targetRef}:${file}:production_owner`,
    );
}

function expandBinding(
  manifest: WorkspaceManifestV2,
  binding: DeliveryBindingV2,
): string[] {
  return [
    ...new Set(
      binding.carrier_paths.flatMap((pattern) =>
        expandPattern(manifest, pattern),
      ),
    ),
  ].sort();
}

function expandPattern(
  manifest: WorkspaceManifestV2,
  pattern: string,
): string[] {
  return manifest.files
    .filter((file) => matchesRepoPattern(file.path, pattern))
    .map((file) => file.path)
    .sort();
}

function bindingsContaining(
  bindings: readonly ExpandedBinding[],
  file: string,
): ExpandedBinding[] {
  return bindings.filter(({ binding }) =>
    binding.carrier_paths.some((pattern) => matchesRepoPattern(file, pattern)),
  );
}

function selectBinding(
  selected: Map<string, ExpandedBinding>,
  binding: ExpandedBinding,
): void {
  const existing = selected.get(binding.binding.key);
  if (
    existing &&
    canonicalValueJson(existing.binding) !== canonicalValueJson(binding.binding)
  )
    fail(
      "process_root_production_binding_required",
      `${binding.binding.key}:ambiguous`,
    );
  selected.set(binding.binding.key, binding);
}

function requireManifestFile(
  manifest: WorkspaceManifestV2,
  file: string,
  targetRef: string,
): void {
  if (
    manifest.files.filter((candidate) => candidate.path === file).length !== 1
  )
    fail("process_root_production_binding_required", `${targetRef}:${file}`);
}

function argvAttributedRepositoryFiles(
  argv: readonly string[],
  cwd: string,
  manifest: WorkspaceManifestV2,
): string[] {
  return manifest.files
    .map((file) => file.path)
    .filter((artifactPath) =>
      argv.some((argument) =>
        argumentReferencesArtifact(argument, artifactPath, cwd),
      ),
    )
    .sort();
}

function argumentReferencesArtifact(
  argument: string,
  artifactPath: string,
  cwd: string,
): boolean {
  const normalizedArgument = portableArgument(argument);
  const repositoryPath = portableArgument(artifactPath);
  const relativeFromCwd = portableArgument(
    path.posix.relative(cwd === "." ? "" : cwd, artifactPath),
  );
  return [repositoryPath, relativeFromCwd, `./${relativeFromCwd}`].some(
    (candidate) => candidate !== "" && normalizedArgument.includes(candidate),
  );
}

function portableArgument(value: string): string {
  return value.replace(/\\/gu, "/").toLowerCase();
}

function firstOverlap(
  candidate: string,
  patterns: readonly string[],
): string | null {
  return (
    patterns.find(
      (pattern) =>
        classifyRepositoryPatternOverlap(candidate, pattern).status ===
        "proven_overlap",
    ) ?? null
  );
}

function firstMatchingPattern(
  file: string,
  patterns: readonly string[],
): string | null {
  return patterns.find((pattern) => matchesRepoPattern(file, pattern)) ?? null;
}

function fail(code: string, detail: string): never {
  throw new Error(`${code}:${detail}`);
}
