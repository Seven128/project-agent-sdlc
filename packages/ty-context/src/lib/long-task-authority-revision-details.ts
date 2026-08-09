import type {
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  DeliveryRunnerV2,
  SourceClaimV2,
} from "./long-task-delivery-types.js";
import { proveRepositoryPatternSubset } from "./long-task-paths.js";
import { canonicalValueJson } from "./strict-codec.js";

export function checkIndex(
  globalChecks: CompiledCheckV2[],
  outcomes: CompiledOutcomeV2[],
): Map<string, CompiledCheckV2> {
  return new Map([
    ...globalChecks.map((check) => [`GLOBAL.${check.key}`, check] as const),
    ...outcomes.flatMap((outcome) =>
      outcome.acceptance.checks.map(
        (check) => [`${outcome.key}.${check.key}`, check] as const,
      ),
    ),
  ]);
}

export function changedRunnerFields(
  identity: string,
  before: CompiledCheckV2,
  after: CompiledCheckV2,
): string[] {
  const beforeRunner = declaredRunner(before);
  const afterRunner = declaredRunner(after);
  const changed = (Object.keys(beforeRunner) as Array<keyof DeliveryRunnerV2>)
    .filter((field) => !same(beforeRunner[field], afterRunner[field]))
    .map((field) => `${identity}:${field}`);
  if (before.runner.resolved_target !== after.runner.resolved_target)
    changed.push(`${identity}:resolved_target`);
  if (before.runner.resolved_cwd !== after.runner.resolved_cwd)
    changed.push(`${identity}:resolved_cwd`);
  if (before.runner.package_script !== after.runner.package_script)
    changed.push(`${identity}:package_script`);
  return changed;
}

export function removedOrReplacedVerificationInputs(
  identity: string,
  before: CompiledCheckV2,
  after: CompiledCheckV2,
): string[] {
  return Object.entries(before.verification_input_hashes)
    .filter(([file, hash]) => after.verification_input_hashes[file] !== hash)
    .map(([file]) => `${identity}:${file}`);
}

export function addedVerificationInputs(
  identity: string,
  before: CompiledCheckV2,
  after: CompiledCheckV2,
): string[] {
  return Object.keys(after.verification_input_hashes)
    .filter((file) => before.verification_input_hashes[file] === undefined)
    .map((file) => `${identity}:${file}`);
}

export function addedInputPaths(
  identity: string,
  before: CompiledCheckV2,
  after: CompiledCheckV2,
): string[] {
  return after.input_paths
    .filter((pattern) => !before.input_paths.includes(pattern))
    .map((pattern) => `${identity}:${pattern}`);
}

export function removedOrNarrowedInputPaths(
  identity: string,
  before: CompiledCheckV2,
  after: CompiledCheckV2,
): string[] {
  return before.input_paths
    .filter(
      (oldPattern) =>
        !after.input_paths.some(
          (newPattern) =>
            proveRepositoryPatternSubset(oldPattern, newPattern).status ===
            "proven_subset",
        ),
    )
    .map((pattern) => `${identity}:${pattern}`);
}

export function removedOrWeakenedExpectedOutputPaths(
  identity: string,
  before: CompiledCheckV2,
  after: CompiledCheckV2,
): string[] {
  return before.expected_output_paths
    .filter(
      (oldPattern) =>
        !after.expected_output_paths.some(
          (newPattern) =>
            proveRepositoryPatternSubset(newPattern, oldPattern).status ===
            "proven_subset",
        ),
    )
    .map((pattern) => `${identity}:${pattern}`);
}

export function sourceClaimReductions(
  beforeClaims: SourceClaimV2[],
  afterClaims: SourceClaimV2[],
): string[] {
  const after = new Map(afterClaims.map((claim) => [claim.key, claim]));
  const changed: string[] = [];
  for (const claim of beforeClaims) {
    const candidate = after.get(claim.key);
    if (!candidate) {
      changed.push(`${claim.key}:removed`);
      continue;
    }
    if (
      claim.statement !== candidate.statement ||
      claim.source_ref !== candidate.source_ref ||
      claim.disposition.type !== candidate.disposition.type
    ) {
      changed.push(`${claim.key}:authority_changed`);
      continue;
    }
    if (
      (claim.disposition.type === "claim" ||
        claim.disposition.type === "global_constraint" ||
        claim.disposition.type === "risk_fact") &&
      (candidate.disposition.type === "claim" ||
        candidate.disposition.type === "global_constraint" ||
        candidate.disposition.type === "risk_fact")
    ) {
      const nextRefs = new Set(candidate.disposition.refs);
      if (claim.disposition.refs.some((reference) => !nextRefs.has(reference)))
        changed.push(`${claim.key}:disposition_refs_removed_or_replaced`);
    } else if (!same(claim.disposition, candidate.disposition))
      changed.push(`${claim.key}:disposition_changed`);
  }
  return changed;
}

export function removedGlobalForbiddenPaths(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
): string[] {
  const after = new Map(
    next.global.technical.forbidden_paths.map((item) => [item.key, item.path]),
  );
  return previous.global.technical.forbidden_paths
    .filter((item) => after.get(item.key) !== item.path)
    .map((item) => `GLOBAL:${item.key}:${item.path}`);
}

export function bindingReductions(
  before: CompiledOutcomeV2,
  after: DeliveryOutcomeV2,
): string[] {
  const nextBindings = new Map(
    after.technical.bindings.map((binding) => [binding.key, binding]),
  );
  const reductions: string[] = [];
  for (const binding of before.technical.bindings) {
    const candidate = nextBindings.get(binding.key);
    if (!candidate) {
      reductions.push(`${after.key}:${binding.key}:removed`);
      continue;
    }
    if (
      binding.kind !== candidate.kind ||
      binding.target !== candidate.target ||
      binding.existence !== candidate.existence ||
      binding.verification_check_key !== candidate.verification_check_key
    )
      reductions.push(`${after.key}:${binding.key}:target_or_kind_changed`);
    reductions.push(
      ...expandedPatterns(
        `${after.key}:${binding.key}`,
        binding.carrier_paths,
        candidate.carrier_paths,
      ),
    );
  }
  return reductions;
}

export function obligationReductions(
  before: CompiledOutcomeV2,
  after: DeliveryOutcomeV2,
): string[] {
  const nextObligations = new Map(
    after.technical.obligations.map((obligation) => [
      obligation.key,
      obligation,
    ]),
  );
  const reductions: string[] = [];
  for (const obligation of before.technical.obligations) {
    const candidate = nextObligations.get(obligation.key);
    if (!candidate) {
      reductions.push(`${after.key}:${obligation.key}:removed`);
      continue;
    }
    if (obligation.statement !== candidate.statement)
      reductions.push(`${after.key}:${obligation.key}:statement_changed`);
    const nextSurfaces = new Set(candidate.required_proof_surfaces);
    if (
      obligation.required_proof_surfaces.some(
        (surface) => !nextSurfaces.has(surface),
      )
    )
      reductions.push(`${after.key}:${obligation.key}:proof_surface_removed`);
  }
  return reductions;
}

export function rollbackReductions(
  before: CompiledOutcomeV2,
  after: DeliveryOutcomeV2,
): string[] {
  const previous = before.technical.rollback_and_recovery;
  const next = after.technical.rollback_and_recovery;
  if (!previous) return [];
  if (!next) return [`${after.key}:removed`];
  if (
    previous.rollback !== next.rollback ||
    previous.recovery !== next.recovery
  )
    return [`${after.key}:statement_changed`];
  const nextChecks = new Set(next.verification_check_keys);
  return previous.verification_check_keys.some((key) => !nextChecks.has(key))
    ? [`${after.key}:verification_check_removed`]
    : [];
}

export function counterfactualReductions(
  before: CompiledOutcomeV2,
  after: DeliveryOutcomeV2,
): string[] {
  const next = after.acceptance.counterfactual_controls;
  return before.acceptance.counterfactual_controls
    .filter((control) => !counterfactualCoveragePreserved(control, next))
    .map((control) => `${after.key}:${control.key}`);
}

export function globalCounterfactualReductions(
  before: CompiledDeliveryContractV2,
  after: DeliveryContractV2,
): string[] {
  const next = after.global.acceptance.counterfactual_controls;
  return (before.global.acceptance.counterfactual_controls ?? [])
    .filter((control) => !counterfactualCoveragePreserved(control, next))
    .map((control) => `GLOBAL:${control.key}`);
}

function counterfactualCoveragePreserved(
  previous: {
    binding_key?: string;
    binding_ref?: string;
    check_key: string;
    claims: string[];
    mutation: unknown;
    expected_assertion_failures: string[];
    preserved_assertions?: string[];
    allowed_fanout_assertions?: string[];
  },
  next: Array<{
    binding_key?: string;
    binding_ref?: string;
    check_key: string;
    claims: string[];
    mutation: unknown;
    expected_assertion_failures: string[];
    preserved_assertions?: string[];
    allowed_fanout_assertions?: string[];
  }>,
): boolean {
  return next.some(
    (candidate) =>
      same(candidate.binding_key, previous.binding_key) &&
      same(candidate.binding_ref, previous.binding_ref) &&
      candidate.check_key === previous.check_key &&
      same(candidate.mutation, previous.mutation) &&
      includesEvery(candidate.claims, previous.claims) &&
      includesEvery(
        candidate.expected_assertion_failures,
        previous.expected_assertion_failures,
      ) &&
      includesEvery(
        candidate.preserved_assertions ?? [],
        previous.preserved_assertions ?? [],
      ) &&
      includesEvery(
        previous.allowed_fanout_assertions ?? [],
        candidate.allowed_fanout_assertions ?? [],
      ),
  );
}

function includesEvery(values: string[], required: string[]): boolean {
  const available = new Set(values);
  return required.every((value) => available.has(value));
}

export function expandedPatterns(
  label: string,
  before: string[],
  after: string[],
): string[] {
  return after
    .filter(
      (candidate) =>
        !before.some(
          (existing) =>
            proveRepositoryPatternSubset(candidate, existing).status ===
            "proven_subset",
        ),
    )
    .map((candidate) => `${label}:${candidate}`);
}

export function removedExactValues(
  label: string,
  before: string[],
  after: string[],
): string[] {
  const available = new Set(after);
  return before
    .filter((value) => !available.has(value))
    .map((value) => `${label}:${value}`);
}

export function removedStructuredValues(
  label: string,
  before: unknown[],
  after: unknown[],
): string[] {
  const available = new Set(after.map(canonicalValueJson));
  return before
    .filter((value) => !available.has(canonicalValueJson(value)))
    .map((value) => `${label}:${canonicalValueJson(value)}`);
}

export function removedValues(
  before: Set<string>,
  after: Set<string>,
): string[] {
  return [...before].filter((value) => !after.has(value)).sort();
}

export function addedValues(before: Set<string>, after: Set<string>): string[] {
  return [...after].filter((value) => !before.has(value)).sort();
}

export function same(left: unknown, right: unknown): boolean {
  return canonicalValueJson(left) === canonicalValueJson(right);
}

function declaredRunner(check: CompiledCheckV2): DeliveryRunnerV2 {
  const runner = check.runner;
  return {
    type: runner.type,
    target: runner.target,
    argv: runner.argv,
    cwd: runner.cwd,
    timeout_ms: runner.timeout_ms,
    effect: runner.effect,
    retry_policy: runner.retry_policy,
    idempotent: runner.idempotent,
  };
}
