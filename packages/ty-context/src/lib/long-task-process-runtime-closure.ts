import path from "node:path";
import type {
  CompiledObservationAuthorityV2,
  CompiledProcessRuntimeClosureV2,
  DeliveryBindingV2,
  DeliveryCheckV2,
  ExecutionTargetV2,
  FrozenRunnerV2,
  SourceBackedExecutionTargetV2,
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
  protected_authority_paths: readonly string[];
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
  const productionBindings = [...input.production_bindings];

  validateInputRoleSeparation(input);
  requireProductionOwnership(input, rootTarget, targetRef);
  const rootBindings = bindingsContaining(productionBindings, rootTarget);
  if (!rootBindings.length)
    fail(
      "process_root_production_binding_required",
      `${targetRef}:${rootTarget}`,
    );

  const rootArgvFiles = argvAttributedRepositoryFiles(
    input.execution_target.root_argv ?? [],
    input.runner.resolved_cwd,
    productionBindings,
  );
  const selectedBindings = new Map<string, DeliveryBindingV2>();
  for (const binding of rootBindings) selectBinding(selectedBindings, binding);
  for (const argvFile of rootArgvFiles) {
    requireProductionOwnership(input, argvFile, targetRef);
    const bindings = bindingsContaining(productionBindings, argvFile);
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
    const matchingBindings = productionBindings.filter(
      (binding) =>
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
      for (const carrierPath of carrierRef.carrier_paths) {
        let carrierFile: string;
        try {
          carrierFile = normalizeRepositoryFile(
            carrierPath,
            `${input.check.key}.process_carrier`,
          );
        } catch {
          fail(
            "process_runtime_carrier_exact_path_required",
            `${targetRef}:${carrierRef.binding_ref}:${carrierPath}`,
          );
        }
        productionCarrierFiles.add(carrierFile);
      }
    }
  }

  const allowedRuntimeFiles = new Set<string>([rootTarget, ...rootArgvFiles]);
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

function bindingsContaining(
  bindings: readonly DeliveryBindingV2[],
  file: string,
): DeliveryBindingV2[] {
  return bindings.filter((binding) =>
    binding.carrier_paths.some((pattern) => matchesRepoPattern(file, pattern)),
  );
}

function selectBinding(
  selected: Map<string, DeliveryBindingV2>,
  binding: DeliveryBindingV2,
): void {
  const existing = selected.get(binding.key);
  if (existing && canonicalValueJson(existing) !== canonicalValueJson(binding))
    fail(
      "process_root_production_binding_required",
      `${binding.key}:ambiguous`,
    );
  selected.set(binding.key, binding);
}

function argvAttributedRepositoryFiles(
  argv: readonly string[],
  cwd: string,
  bindings: readonly DeliveryBindingV2[],
): string[] {
  const candidates = new Set(lexicalRepositoryPathCandidates(argv, cwd));
  for (const binding of bindings)
    for (const candidate of exactBindingFiles(binding))
      if (
        argv.some((argument) =>
          argumentReferencesArtifact(argument, candidate, cwd),
        )
      )
        candidates.add(candidate);
  return [...candidates].sort();
}

function exactBindingFiles(binding: DeliveryBindingV2): string[] {
  const candidates = [
    ...(binding.kind === "file" ? [binding.target] : []),
    ...binding.carrier_paths,
  ];
  const result: string[] = [];
  for (const candidate of candidates)
    try {
      result.push(normalizeRepositoryFile(candidate, `${binding.key}.carrier`));
    } catch {
      // A pattern Binding can own an exact attributed path without making the
      // whole dynamic match set part of the stable runtime closure.
    }
  return [...new Set(result)].sort();
}

function lexicalRepositoryPathCandidates(
  argv: readonly string[],
  cwd: string,
): string[] {
  const result = new Set<string>();
  for (const argument of argv) {
    const value = rootArgvFileToken(argument);
    if (!value) continue;
    const relative = value.startsWith("./") ? value.slice(2) : value;
    const candidate =
      cwd && !relative.startsWith(`${cwd}/`)
        ? path.posix.join(cwd, relative)
        : relative;
    try {
      result.add(normalizeRepositoryFile(candidate, "process_root_argv"));
    } catch {
      // Absolute, escaping and otherwise non-repository values are not paths
      // in the admitted root-argv file-token subset.
    }
  }
  return [...result].sort();
}

function rootArgvFileToken(argument: string): string | null {
  const portable = argument.replace(/\\/gu, "/").trim();
  if (!portable || /\s/u.test(portable)) return null;
  const separator = portable.indexOf("=");
  const candidate = separator >= 0 ? portable.slice(separator + 1) : portable;
  const unquoted = candidate.replace(/^(?:"([^"]+)"|'([^']+)')$/u, "$1$2");
  if (
    !unquoted ||
    /^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(unquoted) ||
    /^[A-Za-z]:\//u.test(unquoted) ||
    unquoted.startsWith("/") ||
    unquoted.startsWith("../") ||
    unquoted.includes("/../")
  )
    return null;
  if (!isRecognizedRepositoryFileName(unquoted)) return null;
  return unquoted;
}

function isRecognizedRepositoryFileName(value: string): boolean {
  return /\.(?:json|ya?ml|toml|js|mjs|cjs|ts|tsx|jsx|css|html|txt|md|conf|config|ini)$/iu.test(
    value,
  );
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
