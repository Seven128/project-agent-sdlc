import type {
  AuthorityHashesV2,
  CompiledDeliveryContractV2,
  DeliveryContractV2,
  DeliveryOutcomeV2,
} from "./long-task-delivery-types.js";
import {
  type AuthorityFieldPolicy,
  CHECK_AUTHORITY_POLICY,
  projectFieldsByPolicy,
} from "./long-task-authority-policy.js";
import { evidenceAdapterForRunner } from "./long-task-evidence-adapter-policy.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

const ACCEPTANCE_CHECK_POLICIES = new Set<AuthorityFieldPolicy>([
  "identity",
  "semantic_user_review",
  "proof_additive",
  "output_requirement",
]);
const TECHNICAL_CHECK_POLICIES = new Set<AuthorityFieldPolicy>([
  "identity",
  "runner_authority",
  "input_coverage",
]);

export function computeAuthorityHashes(
  contract: DeliveryContractV2,
): AuthorityHashesV2 {
  return {
    source_authority_hash: hash({
      source_paths: contract.task.source_paths,
      source_claims: contract.source_claims,
      semantic_fact_manifest: contract.semantic_fact_manifest,
    }),
    product_authority_hash: hash({
      goal: contract.task.goal,
      target_profile: contract.task.target_profile,
      execution_targets: contract.task.execution_targets,
      stages: contract.stages,
      global: {
        applicability: contract.global.applicability,
        semantic_fact_bindings: contract.global.semantic_fact_bindings ?? null,
        product: contract.global.product,
      },
      outcomes: contract.outcomes.map((outcome) => ({
        key: outcome.key,
        stage: outcome.stage,
        applicability: outcome.applicability,
        ...(outcome.semantic_fact_bindings
          ? {
              semantic_fact_bindings: {
                manifest_ref: outcome.semantic_fact_bindings.manifest_ref,
                facts: outcome.semantic_fact_bindings.facts,
              },
            }
          : {}),
        product: outcome.product,
      })),
    }),
    acceptance_authority_hash: hash({
      global_semantic_fact_bindings:
        contract.global.semantic_fact_bindings ?? null,
      external_confirmations: contract.global.acceptance.external_confirmations,
      global_checks: contract.global.acceptance.checks.map(acceptanceCheck),
      global_counterfactual_controls:
        contract.global.acceptance.counterfactual_controls,
      outcomes: contract.outcomes.map((outcome) => ({
        key: outcome.key,
        ...(outcome.semantic_fact_bindings
          ? { semantic_fact_proofs: outcome.semantic_fact_bindings.proofs }
          : {}),
        checks: outcome.acceptance.checks.map(acceptanceCheck),
        population: outcome.acceptance.population,
        counterfactual_controls: outcome.acceptance.counterfactual_controls,
      })),
    }),
    risk_authority_hash: hash(contract.risk),
    technical_authority_hash: hash({
      global: contract.global.technical,
      outcomes: contract.outcomes.map((outcome) => ({
        key: outcome.key,
        technical: outcome.technical,
        checks: [...outcome.acceptance.checks.map(technicalCheck)],
      })),
      global_checks: contract.global.acceptance.checks.map(technicalCheck),
    }),
  };
}

export function outcomeAuthorityHash(outcome: DeliveryOutcomeV2): string {
  return hash({
    stage: outcome.stage,
    applicability: outcome.applicability,
    semantic_fact_bindings: outcome.semantic_fact_bindings,
    product: outcome.product,
    acceptance: {
      checks: outcome.acceptance.checks.map(acceptanceCheck),
      population: outcome.acceptance.population,
      counterfactual_controls: outcome.acceptance.counterfactual_controls,
    },
  });
}

export function changedAuthoritySections(
  previous: AuthorityHashesV2,
  next: AuthorityHashesV2,
): string[] {
  return (Object.keys(previous) as (keyof AuthorityHashesV2)[])
    .filter((key) => previous[key] !== next[key])
    .map((key) => key.replace(/_authority_hash$/u, ""));
}

export function protectedAuthorityChanged(
  previous: CompiledDeliveryContractV2,
  next: AuthorityHashesV2,
): string[] {
  return changedAuthoritySections(previous.authority_hashes, next).filter(
    (section) => section !== "technical",
  );
}

export function acceptanceSemanticsChanged(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
): boolean {
  return !same(acceptanceSemantics(previous), acceptanceSemantics(next));
}

export function isMonotonicAcceptanceStrengthening(
  previous: CompiledDeliveryContractV2,
  next: DeliveryContractV2,
): boolean {
  if (!acceptanceSemanticsChanged(previous, next)) return false;
  if (
    !same(
      previous.global.acceptance.external_confirmations,
      next.global.acceptance.external_confirmations,
    ) ||
    !counterfactualsStrengthened(
      previous.global.acceptance.counterfactual_controls ?? [],
      next.global.acceptance.counterfactual_controls,
    ) ||
    !checksStrengthened(
      previous.global.acceptance.checks,
      next.global.acceptance.checks,
    )
  )
    return false;
  const nextOutcomes = new Map(
    next.outcomes.map((outcome) => [outcome.key, outcome]),
  );
  if (nextOutcomes.size !== previous.outcomes.length) return false;
  for (const previousOutcome of previous.outcomes) {
    const nextOutcome = nextOutcomes.get(previousOutcome.key);
    if (!nextOutcome) return false;
    if (
      !checksStrengthened(
        previousOutcome.acceptance.checks,
        nextOutcome.acceptance.checks,
      ) ||
      !optionalStrengthened(
        previousOutcome.acceptance.population,
        nextOutcome.acceptance.population,
      ) ||
      !counterfactualsStrengthened(
        previousOutcome.acceptance.counterfactual_controls,
        nextOutcome.acceptance.counterfactual_controls,
      )
    )
      return false;
  }
  return true;
}

function acceptanceCheck(
  check: DeliveryContractV2["global"]["acceptance"]["checks"][number],
): unknown {
  return {
    ...projectFieldsByPolicy(
      check,
      CHECK_AUTHORITY_POLICY,
      ACCEPTANCE_CHECK_POLICIES,
    ),
    evidence_adapter: evidenceAdapterForRunner(check.runner.type),
  };
}

function technicalCheck(
  check: DeliveryContractV2["global"]["acceptance"]["checks"][number],
): unknown {
  return projectFieldsByPolicy(
    check,
    CHECK_AUTHORITY_POLICY,
    TECHNICAL_CHECK_POLICIES,
  );
}

function acceptanceSemantics(
  contract: Pick<DeliveryContractV2, "outcomes" | "global">,
): unknown {
  return {
    external_confirmations: contract.global.acceptance.external_confirmations,
    global_checks: contract.global.acceptance.checks.map(acceptanceCheck),
    global_counterfactual_controls:
      contract.global.acceptance.counterfactual_controls ?? [],
    outcomes: contract.outcomes.map((outcome) => ({
      key: outcome.key,
      checks: outcome.acceptance.checks.map(acceptanceCheck),
      population: outcome.acceptance.population,
      counterfactual_controls: outcome.acceptance.counterfactual_controls,
    })),
  };
}

function checksStrengthened(
  previous: DeliveryContractV2["global"]["acceptance"]["checks"],
  next: DeliveryContractV2["global"]["acceptance"]["checks"],
): boolean {
  const nextChecks = new Map(next.map((check) => [check.key, check]));
  for (const previousCheck of previous) {
    const nextCheck = nextChecks.get(previousCheck.key);
    if (
      !nextCheck ||
      previousCheck.proof_surface !== nextCheck.proof_surface ||
      !same(previousCheck.execution_target, nextCheck.execution_target) ||
      !subset(previousCheck.journey_roles, nextCheck.journey_roles) ||
      !subset(previousCheck.scenario.given, nextCheck.scenario.given) ||
      !subset(previousCheck.scenario.when, nextCheck.scenario.when) ||
      !subset(
        previousCheck.verification_inputs,
        nextCheck.verification_inputs,
      ) ||
      !subset(previousCheck.input_paths, nextCheck.input_paths) ||
      !subset(
        previousCheck.expected_output_paths,
        nextCheck.expected_output_paths,
      ) ||
      !subset(previousCheck.artifact_globs, nextCheck.artifact_globs) ||
      !subset(
        previousCheck.environment_requirements,
        nextCheck.environment_requirements,
      ) ||
      !assertionsStrengthened(
        previousCheck.positive_assertions,
        nextCheck.positive_assertions,
      ) ||
      !assertionsStrengthened(
        previousCheck.negative_assertions,
        nextCheck.negative_assertions,
      )
    )
      return false;
  }
  return true;
}

function assertionsStrengthened(
  previous: DeliveryContractV2["global"]["acceptance"]["checks"][number]["positive_assertions"],
  next: DeliveryContractV2["global"]["acceptance"]["checks"][number]["positive_assertions"],
): boolean {
  const nextAssertions = new Map(
    next.map((assertion) => [assertion.key, assertion]),
  );
  for (const previousAssertion of previous) {
    const nextAssertion = nextAssertions.get(previousAssertion.key);
    if (
      !nextAssertion ||
      previousAssertion.criterion !== nextAssertion.criterion ||
      !same(previousAssertion.claims, nextAssertion.claims) ||
      previousAssertion.applicability_ref !== nextAssertion.applicability_ref ||
      previousAssertion.observation !== nextAssertion.observation ||
      previousAssertion.operator !== nextAssertion.operator ||
      !same(previousAssertion.expected, nextAssertion.expected) ||
      !subset(
        previousAssertion.evidence_capabilities,
        nextAssertion.evidence_capabilities,
      )
    )
      return false;
  }
  return true;
}

function counterfactualsStrengthened(
  previous: Array<{
    binding_key?: string;
    binding_ref?: string;
    check_key: string;
    claims: string[];
    mutation: unknown;
    expected_assertion_failures: string[];
    preserved_assertions: string[];
    allowed_fanout_assertions?: string[];
  }>,
  next: Array<{
    binding_key?: string;
    binding_ref?: string;
    check_key: string;
    claims: string[];
    mutation: unknown;
    expected_assertion_failures: string[];
    preserved_assertions: string[];
    allowed_fanout_assertions?: string[];
  }>,
): boolean {
  return previous.every((control) =>
    next.some(
      (candidate) =>
        same(candidate.binding_key, control.binding_key) &&
        same(candidate.binding_ref, control.binding_ref) &&
        candidate.check_key === control.check_key &&
        same(candidate.mutation, control.mutation) &&
        subset(control.claims, candidate.claims) &&
        subset(
          control.expected_assertion_failures,
          candidate.expected_assertion_failures,
        ) &&
        subset(control.preserved_assertions, candidate.preserved_assertions) &&
        subset(
          candidate.allowed_fanout_assertions ?? [],
          control.allowed_fanout_assertions ?? [],
        ),
    ),
  );
}

function subset(previous: unknown[], next: unknown[]): boolean {
  const available = new Set(next.map((item) => canonicalValueJson(item)));
  return previous.every((item) => available.has(canonicalValueJson(item)));
}

function optionalStrengthened(previous: unknown, next: unknown): boolean {
  return previous === null || previous === undefined
    ? true
    : same(previous, next);
}

function same(left: unknown, right: unknown): boolean {
  return canonicalValueJson(left) === canonicalValueJson(right);
}

function hash(value: unknown): string {
  return sha256Hex(canonicalValueJson(value));
}
