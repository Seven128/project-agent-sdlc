import type {
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  CompiledOutcomeV2,
  EffectiveRiskLevel,
  RiskFactName,
} from "./long-task-delivery-types.js";
import {
  machineAuthorizedAssertionExists,
  outcomeResultFullyEffectivelyExternallyBlocked,
  outcomeUiProofFullyEffectivelyExternallyBlocked,
} from "./long-task-acceptance-reachability-helpers.js";
import type { AcceptanceReachabilityV1 } from "./long-task-acceptance-reachability-types.js";

export interface RiskDecisionV2 {
  effective_level: EffectiveRiskLevel;
  minimum_level: EffectiveRiskLevel;
  reasons: string[];
  reasons_by_outcome: Record<string, RiskFactName[]>;
}

const STRICT_FACTS = new Set<RiskFactName>([
  "public_api_or_schema_change",
  "persistent_data_change",
  "data_migration",
  "security_boundary_change",
  "permission_boundary_change",
  "irreversible_external_effect",
  "full_population_operation",
  "multi_repository_change",
]);

export function classifyLongTaskRisk(
  contract: DeliveryContractV2,
): RiskDecisionV2 {
  const outcomeKeys = new Set(contract.outcomes.map((outcome) => outcome.key));
  const reasonsByOutcome = Object.fromEntries(
    contract.outcomes.map((outcome) => [outcome.key, [] as RiskFactName[]]),
  );
  for (const [fact, outcomes] of Object.entries(contract.risk.facts) as Array<
    [RiskFactName, string[]]
  >) {
    for (const outcome of outcomes) {
      if (!outcomeKeys.has(outcome))
        throw new Error(`risk_outcome_unknown:${fact}:${outcome}`);
      reasonsByOutcome[outcome].push(fact);
    }
  }
  if (contract.risk.facts.multi_repository_change.length)
    throw new Error("multi_repository_delivery_not_supported_v2");
  const reasons = Object.entries(reasonsByOutcome)
    .flatMap(([outcome, facts]) =>
      facts
        .filter((fact) => STRICT_FACTS.has(fact))
        .map((fact) => `${fact}:${outcome}`),
    )
    .concat(
      contract.outcomes
        .filter(
          (outcome) =>
            contract.risk.facts.critical_user_path.includes(outcome.key) &&
            contract.risk.facts.weak_observability.includes(outcome.key),
        )
        .map(
          (outcome) =>
            `critical_user_path_with_weak_observability:${outcome.key}`,
        ),
    );
  const minimum: EffectiveRiskLevel = reasons.length ? "strict" : "standard";
  if (contract.risk.requested_level === "standard" && minimum === "strict")
    throw new Error(`risk_level_below_required:${reasons.join(",")}`);
  return {
    minimum_level: minimum,
    effective_level:
      contract.risk.requested_level === "strict" ? "strict" : minimum,
    reasons,
    reasons_by_outcome: reasonsByOutcome,
  };
}

export function validateRiskProof(
  contract: DeliveryContractV2,
  decision: RiskDecisionV2,
  reachability?: AcceptanceReachabilityV1 | null,
  compiledOutcomes?: readonly CompiledOutcomeV2[],
): void {
  const errors: string[] = [];
  if (!contract.outcomes.length) errors.push("outcome_required");
  for (const check of contract.global.acceptance.checks)
    validateCheck(check, "global", errors);
  for (const outcome of contract.outcomes)
    validateOutcome(
      contract,
      outcome,
      errors,
      reachability,
      compiledOutcomes?.find((candidate) => candidate.key === outcome.key),
      compiledOutcomes !== undefined,
    );
  if (decision.effective_level === "strict")
    validateStrict(contract, decision, errors, reachability, compiledOutcomes);
  if (errors.length)
    throw new Error(
      `delivery_contract_preflight_failed:\n${errors.join("\n")}`,
    );
}

function validateOutcome(
  contract: DeliveryContractV2,
  outcome: DeliveryOutcomeV2,
  errors: string[],
  reachability?: AcceptanceReachabilityV1 | null,
  compiledOutcome?: CompiledOutcomeV2,
  useCompiledAuthority = false,
): void {
  const declaredChecks = new Map(
    outcome.acceptance.checks.map((check) => [check.key, check]),
  );
  const resultExternallyBlocked =
    outcomeResultFullyEffectivelyExternallyBlocked(outcome, reachability);
  const hasMachineProof = useCompiledAuthority
    ? machineAuthorizedAssertionExists(
        compiledOutcome?.acceptance.checks ?? [],
        { outcome_key: outcome.key },
      )
    : declaredChecks.size > 0;
  if (!hasMachineProof && !resultExternallyBlocked)
    errors.push(`outcome_without_executable_check:${outcome.key}`);
  if (!outcome.technical.expected_change_paths.length)
    errors.push(`expected_change_paths_empty:${outcome.key}`);
  for (const check of declaredChecks.values())
    validateCheck(check, outcome.key, errors);
  const hasMachineUiProof = useCompiledAuthority
    ? machineAuthorizedAssertionExists(
        compiledOutcome?.acceptance.checks ?? [],
        { outcome_key: outcome.key, proof_surface: "ui_browser" },
      )
    : [...declaredChecks.values()].some(
        (check) => check.proof_surface === "ui_browser",
      );
  const uiProofExternallyBlocked =
    useCompiledAuthority &&
    outcomeUiProofFullyEffectivelyExternallyBlocked(
      contract,
      outcome,
      reachability,
    );
  if (
    (outcome.product.owner_surfaces.length ||
      outcome.product.controls.length) &&
    !hasMachineUiProof &&
    !uiProofExternallyBlocked
  )
    errors.push(`ui_outcome_requires_ui_browser_proof:${outcome.key}`);
  const referenced = [
    ...(outcome.acceptance.population
      ? [outcome.acceptance.population.check_key]
      : []),
    ...outcome.acceptance.counterfactual_controls.map(
      (control) => control.check_key,
    ),
    ...(outcome.technical.rollback_and_recovery?.verification_check_keys ?? []),
    ...outcome.technical.bindings.flatMap((binding) =>
      binding.verification_check_key ? [binding.verification_check_key] : [],
    ),
  ];
  for (const checkKey of referenced)
    if (!declaredChecks.has(checkKey))
      errors.push(`outcome_check_reference_unknown:${outcome.key}:${checkKey}`);
}

function validateStrict(
  contract: DeliveryContractV2,
  decision: RiskDecisionV2,
  errors: string[],
  reachability?: AcceptanceReachabilityV1 | null,
  compiledOutcomes?: readonly CompiledOutcomeV2[],
): void {
  const explicitStrictWithoutFacts =
    contract.risk.requested_level === "strict" && decision.reasons.length === 0;
  for (const outcome of contract.outcomes) {
    if (outcomeResultFullyEffectivelyExternallyBlocked(outcome, reachability))
      continue;
    const compiledOutcome = compiledOutcomes?.find(
      (candidate) => candidate.key === outcome.key,
    );
    const useCompiledAuthority = compiledOutcomes !== undefined;
    const facts = new Set(decision.reasons_by_outcome[outcome.key]);
    const checks = outcome.acceptance.checks;
    const hasNegative = useCompiledAuthority
      ? machineAuthorizedAssertionExists(
          compiledOutcome?.acceptance.checks ?? [],
          { outcome_key: outcome.key, polarity: "negative" },
        )
      : checks.some((check) => check.negative_assertions.length > 0);
    const hasCounterfactual = useCompiledAuthority
      ? hasMachineCounterfactual(compiledOutcome)
      : outcome.acceptance.counterfactual_controls.length > 0;
    if (explicitStrictWithoutFacts) {
      if (!hasNegative)
        errors.push(`strict_negative_assertion_required:${outcome.key}`);
      if (!hasCounterfactual)
        errors.push(`strict_counterfactual_control_required:${outcome.key}`);
    }
    if (
      facts.has("security_boundary_change") ||
      facts.has("permission_boundary_change")
    )
      requireStrictProof(
        outcome,
        "security_boundary",
        hasMachineSurfaceProof(
          outcome,
          compiledOutcome,
          "security_boundary",
          useCompiledAuthority,
        ),
        hasNegative,
        hasCounterfactual,
        errors,
      );
    if (facts.has("public_api_or_schema_change"))
      requireStrictProof(
        outcome,
        "api_contract",
        hasMachineSurfaceProof(
          outcome,
          compiledOutcome,
          "api_contract",
          useCompiledAuthority,
        ),
        hasNegative,
        hasCounterfactual,
        errors,
      );
    if (facts.has("persistent_data_change") || facts.has("data_migration")) {
      requireStrictProof(
        outcome,
        "data_state",
        hasMachineSurfaceProof(
          outcome,
          compiledOutcome,
          "data_state",
          useCompiledAuthority,
        ),
        hasNegative,
        hasCounterfactual,
        errors,
      );
      if (!outcome.technical.rollback_and_recovery)
        errors.push(`strict_rollback_and_recovery_required:${outcome.key}`);
    }
    if (
      facts.has("irreversible_external_effect") &&
      !outcome.technical.rollback_and_recovery
    )
      errors.push(`strict_rollback_and_recovery_required:${outcome.key}`);
    if (facts.has("full_population_operation")) {
      if (
        !hasMachineSurfaceProof(
          outcome,
          compiledOutcome,
          "population_coverage",
          useCompiledAuthority,
        )
      )
        errors.push(`strict_population_coverage_proof_required:${outcome.key}`);
      if (!outcome.acceptance.population)
        errors.push(`strict_population_declaration_required:${outcome.key}`);
    }
    if (
      facts.has("critical_user_path") &&
      facts.has("weak_observability") &&
      !(
        hasMachineSurfaceProof(
          outcome,
          compiledOutcome,
          "ui_browser",
          useCompiledAuthority,
        ) ||
        hasMachineSurfaceProof(
          outcome,
          compiledOutcome,
          "runtime_behavior",
          useCompiledAuthority,
        )
      )
    )
      errors.push(
        `strict_critical_path_observable_proof_required:${outcome.key}`,
      );
  }
}

function hasMachineSurfaceProof(
  outcome: DeliveryOutcomeV2,
  compiledOutcome: CompiledOutcomeV2 | undefined,
  surface: DeliveryCheckV2["proof_surface"],
  useCompiledAuthority: boolean,
): boolean {
  return useCompiledAuthority
    ? machineAuthorizedAssertionExists(
        compiledOutcome?.acceptance.checks ?? [],
        { outcome_key: outcome.key, proof_surface: surface },
      )
    : outcome.acceptance.checks.some(
        (check) => check.proof_surface === surface,
      );
}

function hasMachineCounterfactual(
  outcome: CompiledOutcomeV2 | undefined,
): boolean {
  if (!outcome) return false;
  return outcome.acceptance.counterfactual_controls.some(
    (control) =>
      control.claims.length > 0 &&
      control.expected_assertion_failures.some((assertionRef) =>
        machineAuthorizedAssertionExists(outcome.acceptance.checks, {
          outcome_key: outcome.key,
          check_key: control.check_key,
          assertion_key: assertionRef,
        }),
      ),
  );
}

function requireStrictProof(
  outcome: DeliveryOutcomeV2,
  surface: DeliveryCheckV2["proof_surface"],
  hasSurfaceProof: boolean,
  hasNegative: boolean,
  hasCounterfactual: boolean,
  errors: string[],
): void {
  if (!hasSurfaceProof)
    errors.push(`strict_${surface}_proof_required:${outcome.key}`);
  if (!hasNegative)
    errors.push(`strict_negative_assertion_required:${outcome.key}`);
  if (!hasCounterfactual)
    errors.push(`strict_counterfactual_control_required:${outcome.key}`);
}

function validateCheck(
  check: DeliveryCheckV2,
  owner: string,
  errors: string[],
): void {
  if (!check.verification_inputs.length)
    errors.push(`verification_inputs_empty:${owner}:${check.key}`);
  if (
    check.runner.retry_policy === "transient_once" &&
    (!check.runner.idempotent ||
      !["read_only", "test_sandbox"].includes(check.runner.effect))
  )
    errors.push(`unsafe_retry_policy:${owner}:${check.key}`);
}
