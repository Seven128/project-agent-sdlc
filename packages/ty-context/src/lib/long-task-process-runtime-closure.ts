import path from "node:path";
import type {
  CompiledObservationAuthorityV2,
  CompiledProcessRuntimeClosureV2,
  DeliveryCheckV2,
  ExecutionTargetV2,
  FrozenRunnerV2,
  SourceBackedExecutionTargetV2,
} from "./long-task-delivery-types.js";
import {
  matchesRepoPattern,
  normalizeRepositoryFile,
} from "./long-task-paths.js";
import type { ScopedDeliveryBindingV2 } from "./long-task-scoped-binding.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export interface CompileProcessRuntimeClosureInput {
  check: DeliveryCheckV2;
  runner: FrozenRunnerV2;
  execution_target: ExecutionTargetV2;
  observation_authorities: readonly CompiledObservationAuthorityV2[];
  production_bindings: readonly ScopedDeliveryBindingV2[];
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
    targetRef,
  );
  const selectedBindings = new Map<string, ScopedDeliveryBindingV2>();
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
      (scoped) =>
        scoped.binding_ref === carrierRef.binding_ref &&
        carrierRef.carrier_paths.every((carrierPath) =>
          scoped.binding.carrier_paths.includes(carrierPath),
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
    closure_identity: sha256Hex(
      canonicalValueJson(runtimeExecutionClosureProjection(projection)),
    ),
  };
}

function runtimeExecutionClosureProjection(
  closure: Omit<CompiledProcessRuntimeClosureV2, "closure_identity">,
): Omit<
  CompiledProcessRuntimeClosureV2,
  "closure_identity" | "production_binding_refs"
> {
  return {
    target_ref: closure.target_ref,
    source_target: closure.source_target,
    root_target: closure.root_target,
    root_argv_files: closure.root_argv_files,
    production_carrier_files: closure.production_carrier_files,
    allowed_runtime_files: closure.allowed_runtime_files,
    forbidden_role_matches: closure.forbidden_role_matches,
  };
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
  bindings: readonly ScopedDeliveryBindingV2[],
  file: string,
): ScopedDeliveryBindingV2[] {
  return bindings.filter((scoped) =>
    scoped.binding.carrier_paths.some((pattern) =>
      matchesRepoPattern(file, pattern),
    ),
  );
}

function selectBinding(
  selected: Map<string, ScopedDeliveryBindingV2>,
  scoped: ScopedDeliveryBindingV2,
): void {
  const existing = selected.get(scoped.binding_ref);
  if (existing && canonicalValueJson(existing) !== canonicalValueJson(scoped))
    fail(
      "process_root_production_binding_required",
      `${scoped.binding_ref}:ambiguous`,
    );
  selected.set(scoped.binding_ref, scoped);
}

function argvAttributedRepositoryFiles(
  argv: readonly string[],
  cwd: string,
  bindings: readonly ScopedDeliveryBindingV2[],
  targetRef: string,
): string[] {
  const result = new Set<string>();
  for (const argument of argv) {
    const value = rootArgvPathValue(argument);
    if (!value) continue;
    if (unsafeArgvPathValue(value))
      fail("process_root_argv_unsafe", `${targetRef}:${argument}`);
    const candidate = path.posix.join(cwd === "." ? "" : cwd, value);
    let normalized: string;
    try {
      normalized = normalizeRepositoryFile(candidate, "process_root_argv");
    } catch {
      fail("process_root_argv_unsafe", `${targetRef}:${argument}`);
    }
    if (bindingsContaining(bindings, normalized).length) result.add(normalized);
  }
  return [...result].sort();
}

function rootArgvPathValue(argument: string): string | null {
  const parsedArgument = unwrapCompleteQuoteLayer(
    argument.replace(/\\/gu, "/"),
  );
  const portable = parsedArgument.value;
  if (!portable) return null;
  // A compound shell command is not one finite argv file token. In
  // particular, do not search inside it for a path-shaped substring.
  if (!parsedArgument.quoted && /\s/u.test(portable)) return null;
  // A single-letter slash switch is an argv label (for example cmd.exe /d),
  // not a repository path. Longer slash-prefixed values remain absolute and
  // fail closed below.
  if (/^\/[A-Za-z?]$/u.test(portable)) return null;
  if (!portable.startsWith("--")) return portable;
  const separator = portable.indexOf("=");
  if (separator <= 2 || separator === portable.length - 1) return null;
  const parsedValue = unwrapCompleteQuoteLayer(portable.slice(separator + 1));
  if (!parsedValue.value) return null;
  if (!parsedValue.quoted && /\s/u.test(parsedValue.value)) return null;
  return parsedValue.value;
}

function unwrapCompleteQuoteLayer(value: string): {
  value: string;
  quoted: boolean;
} {
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.at(-1) === quote)
    return { value: value.slice(1, -1), quoted: true };
  return { value, quoted: false };
}

function unsafeArgvPathValue(value: string): boolean {
  return (
    /["']/u.test(value) ||
    value.startsWith("/") ||
    /^[A-Za-z]:\//u.test(value) ||
    /^file:/iu.test(value) ||
    /^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(value)
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
