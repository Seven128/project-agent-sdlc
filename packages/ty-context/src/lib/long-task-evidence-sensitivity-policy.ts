import type {
  CompiledCheckV2,
  CompiledOutcomeV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";

const NON_RESULT_SENSITIVITY_PREFIXES = [
  "requirement.",
  "control.",
  "control_relation",
  "obligation.",
  "non_completing.",
  "forbidden_shortcut.",
];

export function validateCounterfactualObservationImpact(input: {
  baseline_by_fact: Record<string, string>;
  mutated_by_fact: Record<string, string>;
  expected_affected_fact_refs: string[];
  preserved_fact_refs: string[];
  target_live: boolean;
  carrier_role: "product" | "evidence";
}): string | null {
  if (input.carrier_role === "evidence")
    return "counterfactual_mutates_generated_evidence";
  if (!input.target_live) return "counterfactual_target_not_live";
  const expected = new Set(input.expected_affected_fact_refs);
  const preserved = new Set(input.preserved_fact_refs);
  for (const factRef of expected) {
    if (
      !Object.hasOwn(input.baseline_by_fact, factRef) ||
      !Object.hasOwn(input.mutated_by_fact, factRef)
    )
      return "counterfactual_expected_fact_observation_missing";
    if (
      input.baseline_by_fact[factRef] === input.mutated_by_fact[factRef]
    )
      return "counterfactual_expected_fact_unchanged";
  }
  for (const factRef of new Set([
    ...Object.keys(input.baseline_by_fact),
    ...Object.keys(input.mutated_by_fact),
  ])) {
    if (expected.has(factRef)) continue;
    const baseline = input.baseline_by_fact[factRef];
    const mutated = input.mutated_by_fact[factRef];
    if (
      preserved.has(factRef) &&
      (baseline === undefined || mutated === undefined || baseline !== mutated)
    )
      return "counterfactual_unexpected_fact_impact";
    if (!preserved.has(factRef) && baseline !== mutated)
      return "counterfactual_unexpected_fact_impact";
  }
  return null;
}

export function validateClaimEvidenceSensitivity(
  contract: DeliveryContractV2,
  globalChecks: CompiledCheckV2[],
  outcomes: CompiledOutcomeV2[],
  report?: ValidationReporter,
): void {
  validateGlobalStructuredSensitivity(contract, globalChecks, report);
  validateGlobalSemanticWitnesses(contract, globalChecks, report);
  const weakOutcomes = new Set(contract.risk.facts.weak_observability);
  for (const outcome of outcomes) {
    const population = outcome.acceptance.population;
    const counterfactualsByCheck = groupCounterfactuals(outcome);
    for (const check of outcome.acceptance.checks) {
      const counterfactuals = counterfactualsByCheck.get(check.key) ?? [];
      validateBehavioralSemanticWitnesses(
        outcome.key,
        check,
        counterfactuals,
        report,
      );
      if (check.evidence_adapter === "structured_json_v2") {
        const assertionClaims = new Set(
          assertions(check).flatMap((assertion) => assertion.claims),
        );
        const populationClaims = new Set(
          population?.check_key === check.key ? population.claims : [],
        );
        const declaredClaims = new Set([
          ...assertionClaims,
          ...populationClaims,
        ]);
        const counterfactualClaims = new Set(
          counterfactuals.flatMap((control) => control.claims),
        );
        const required = [...declaredClaims].filter(
          (claim) =>
            weakOutcomes.has(outcome.key) || !populationClaims.has(claim),
        );
        const missing = required
          .filter((claim) => !counterfactualClaims.has(claim))
          .sort();
        if (missing.length)
          issue(
            report,
            `structured_evidence_sensitivity_required:${outcome.key}:${check.key}:${missing.join(",")}`,
          );
        validateResultRoots(outcome.key, check, counterfactuals, report);
      }
      if (
        check.evidence_adapter === "playwright_json_v1" &&
        weakOutcomes.has(outcome.key)
      )
        validateWeakPlaywrightSensitivity(
          outcome.key,
          check,
          counterfactuals,
          report,
        );
    }
  }
}

function validateGlobalSemanticWitnesses(
  contract: DeliveryContractV2,
  checks: CompiledCheckV2[],
  report?: ValidationReporter,
): void {
  for (const check of checks)
    validateBehavioralSemanticWitnesses(
      "GLOBAL",
      check,
      contract.global.acceptance.counterfactual_controls.filter(
        (control) => control.check_key === check.key,
      ),
      report,
    );
}

function validateBehavioralSemanticWitnesses(
  scope: string,
  check: CompiledCheckV2,
  counterfactuals:
    | CompiledOutcomeV2["acceptance"]["counterfactual_controls"]
    | DeliveryContractV2["global"]["acceptance"]["counterfactual_controls"],
  report?: ValidationReporter,
): void {
  for (const assertion of assertions(check)) {
    if (!assertion.claims.length || !isBehavioralAssertion(check, assertion))
      continue;
    const witnesses = counterfactuals.filter(
      (control) =>
        isNarrowSemanticMutation(control.mutation.type) &&
        control.expected_assertion_failures.includes(assertion.key) &&
        assertion.claims.every((claim) => control.claims.includes(claim)),
    );
    if (!witnesses.length) {
      issue(
        report,
        `behavioral_semantic_counterfactual_required:${scope}:${check.key}:${assertion.key}`,
      );
      continue;
    }
    if (
      !witnesses.some((control) =>
        control.preserved_assertions.some((reference) =>
          isLivenessAssertion(check, reference),
        ),
      )
    )
      issue(
        report,
        `behavioral_counterfactual_liveness_witness_required:${scope}:${check.key}:${assertion.key}`,
      );
  }
}

function isNarrowSemanticMutation(type: string): boolean {
  return type === "replace_json_value" || type === "replace_text";
}

function isBehavioralAssertion(
  check: CompiledCheckV2,
  assertion: CompiledCheckV2["positive_assertions"][number],
): boolean {
  return !(
    check.proof_surface === "implementation_structure" &&
    assertion.operator === "exists" &&
    assertion.evidence_capabilities.every(
      (capability) => capability === "presence",
    )
  );
}

function isLivenessAssertion(
  check: CompiledCheckV2,
  reference: string,
): boolean {
  const assertion = check.positive_assertions.find(
    (candidate) => candidate.key === reference,
  );
  return Boolean(
    assertion &&
    !assertion.claims.length &&
    assertion.operator === "equals" &&
    assertion.expected === true &&
    assertion.evidence_capabilities.includes("target_runtime"),
  );
}

function validateGlobalStructuredSensitivity(
  contract: DeliveryContractV2,
  checks: CompiledCheckV2[],
  report?: ValidationReporter,
): void {
  for (const check of checks) {
    if (check.evidence_adapter !== "structured_json_v2") continue;
    const claims = new Set(
      assertions(check).flatMap((assertion) => assertion.claims),
    );
    if (!claims.size) continue;
    const controls = contract.global.acceptance.counterfactual_controls.filter(
      (control) => control.check_key === check.key,
    );
    const covered = new Set(controls.flatMap((control) => control.claims));
    const missing = [...claims].filter((claim) => !covered.has(claim)).sort();
    if (missing.length)
      issue(
        report,
        `global_structured_evidence_sensitivity_required:${check.key}:${missing.join(",")}`,
      );
  }
}

function validateWeakPlaywrightSensitivity(
  outcomeKey: string,
  check: CompiledCheckV2,
  counterfactuals: CompiledOutcomeV2["acceptance"]["counterfactual_controls"],
  report?: ValidationReporter,
): void {
  for (const assertion of assertions(check).filter(
    (item) => item.claims.length > 0,
  )) {
    const relevant = counterfactuals.filter((control) =>
      control.expected_assertion_failures.includes(assertion.key),
    );
    if (!relevant.length) {
      issue(
        report,
        `playwright_weak_observability_sensitivity_required:${outcomeKey}:${check.key}:${assertion.key}`,
      );
      continue;
    }
    const covered = new Set(relevant.flatMap((control) => control.claims));
    const missing = assertion.claims
      .filter((claim) => !covered.has(claim))
      .sort();
    if (missing.length)
      issue(
        report,
        `playwright_weak_observability_claim_sensitivity_required:${outcomeKey}:${check.key}:${missing.join(",")}`,
      );
  }
  validateResultRoots(outcomeKey, check, counterfactuals, report);
}

function validateResultRoots(
  outcomeKey: string,
  check: CompiledCheckV2,
  counterfactuals: CompiledOutcomeV2["acceptance"]["counterfactual_controls"],
  report?: ValidationReporter,
): void {
  for (const assertion of assertions(check)) {
    if (!assertion.claims.includes("result")) continue;
    const resultSensitive = counterfactuals.some(
      (control) =>
        control.expected_assertion_failures.includes(assertion.key) &&
        control.claims.includes("result") &&
        control.claims.some(isNonResultSensitivityClaim),
    );
    if (!resultSensitive)
      issue(
        report,
        `structured_result_counterfactual_non_result_required:${outcomeKey}:${check.key}:${assertion.key}`,
      );
  }
}

function assertions(check: CompiledCheckV2) {
  return [...check.positive_assertions, ...check.negative_assertions];
}

function groupCounterfactuals(outcome: CompiledOutcomeV2) {
  const grouped = new Map<
    string,
    CompiledOutcomeV2["acceptance"]["counterfactual_controls"]
  >();
  for (const control of outcome.acceptance.counterfactual_controls) {
    const controls = grouped.get(control.check_key) ?? [];
    controls.push(control);
    grouped.set(control.check_key, controls);
  }
  return grouped;
}

function isNonResultSensitivityClaim(claim: string): boolean {
  return NON_RESULT_SENSITIVITY_PREFIXES.some((prefix) =>
    claim.startsWith(prefix),
  );
}

type ValidationReporter = (message: string) => void;

function issue(report: ValidationReporter | undefined, message: string): void {
  if (!report) throw new Error(message);
  report(message);
}
