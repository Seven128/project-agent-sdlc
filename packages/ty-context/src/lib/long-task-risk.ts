import type {
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
  EffectiveRiskLevel,
  RiskFactName,
} from "./long-task-delivery-types.js";
import { outcomeResultExternallyBlocked } from "./long-task-claims.js";

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
): void {
  const errors: string[] = [];
  if (!contract.outcomes.length) errors.push("outcome_required");
  for (const check of contract.global.acceptance.checks)
    validateCheck(check, "global", errors);
  for (const outcome of contract.outcomes)
    validateOutcome(contract, outcome, errors);
  if (decision.effective_level === "strict")
    validateStrict(contract, decision, errors);
  if (errors.length)
    throw new Error(
      `delivery_contract_preflight_failed:\n${errors.join("\n")}`,
    );
}

function validateOutcome(
  contract: DeliveryContractV2,
  outcome: DeliveryOutcomeV2,
  errors: string[],
): void {
  const checks = new Map(
    outcome.acceptance.checks.map((check) => [check.key, check]),
  );
  const resultExternallyBlocked = outcomeResultExternallyBlocked(
    contract,
    outcome.key,
  );
  if (!checks.size && !resultExternallyBlocked)
    errors.push(`outcome_without_executable_check:${outcome.key}`);
  if (!outcome.technical.expected_change_paths.length)
    errors.push(`expected_change_paths_empty:${outcome.key}`);
  for (const check of checks.values())
    validateCheck(check, outcome.key, errors);
  if (
    (outcome.product.owner_surfaces.length ||
      outcome.product.controls.length) &&
    !resultExternallyBlocked &&
    ![...checks.values()].some((check) => check.proof_surface === "ui_browser")
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
    if (!checks.has(checkKey))
      errors.push(`outcome_check_reference_unknown:${outcome.key}:${checkKey}`);
}

function validateStrict(
  contract: DeliveryContractV2,
  decision: RiskDecisionV2,
  errors: string[],
): void {
  const explicitStrictWithoutFacts =
    contract.risk.requested_level === "strict" && decision.reasons.length === 0;
  for (const outcome of contract.outcomes) {
    if (outcomeResultExternallyBlocked(contract, outcome.key)) continue;
    const facts = new Set(decision.reasons_by_outcome[outcome.key]);
    const checks = outcome.acceptance.checks;
    const hasNegative = checks.some(
      (check) => check.negative_assertions.length > 0,
    );
    const hasCounterfactual =
      outcome.acceptance.counterfactual_controls.length > 0;
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
        hasNegative,
        hasCounterfactual,
        errors,
      );
    if (facts.has("public_api_or_schema_change"))
      requireStrictProof(
        outcome,
        "api_contract",
        hasNegative,
        hasCounterfactual,
        errors,
      );
    if (facts.has("persistent_data_change") || facts.has("data_migration")) {
      requireStrictProof(
        outcome,
        "data_state",
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
        !checks.some((check) => check.proof_surface === "population_coverage")
      )
        errors.push(`strict_population_coverage_proof_required:${outcome.key}`);
      if (!outcome.acceptance.population)
        errors.push(`strict_population_declaration_required:${outcome.key}`);
    }
    if (
      facts.has("critical_user_path") &&
      facts.has("weak_observability") &&
      !checks.some(
        (check) =>
          check.proof_surface === "ui_browser" ||
          check.proof_surface === "runtime_behavior",
      )
    )
      errors.push(
        `strict_critical_path_observable_proof_required:${outcome.key}`,
      );
  }
}

function requireStrictProof(
  outcome: DeliveryOutcomeV2,
  surface: DeliveryCheckV2["proof_surface"],
  hasNegative: boolean,
  hasCounterfactual: boolean,
  errors: string[],
): void {
  if (
    !outcome.acceptance.checks.some((check) => check.proof_surface === surface)
  )
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
