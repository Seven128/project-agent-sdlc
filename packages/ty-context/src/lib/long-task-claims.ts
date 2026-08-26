import type {
  ClaimApplicabilityV2,
  ClaimCoverageSummaryV2,
  ClaimProofV2,
  DeliveryAssertionV2,
  DeliveryCheckV2,
  DeliveryContractV2,
  GlobalClaimV2,
  ProductClaimV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import {
  assertAllClaimsCovered,
  assertAllGlobalClaimsCovered,
  generateClaims,
  generateGlobalClaims,
  validateGlobalProofPolarity,
  validateProofSurface,
} from "./long-task-claim-definitions.js";
import { fail } from "./long-task-delivery-shape.js";
import {
  validateClaimAssertionOperator,
  validateGlobalAssertionOperator,
} from "./long-task-claim-proof-policy.js";
import { matchesRepoPattern } from "./long-task-paths.js";

export interface CompiledClaimsV2 {
  by_global: GlobalClaimV2[];
  by_outcome: Record<string, ProductClaimV2[]>;
  summary: ClaimCoverageSummaryV2;
}

interface ExternalConfirmationProjectionInput {
  global: {
    acceptance: {
      external_confirmations: readonly {
        blocks_target: boolean;
        impact_claims: readonly string[];
      }[];
    };
  };
}

interface AllOutcomeExternalConfirmationProjectionInput extends ExternalConfirmationProjectionInput {
  outcomes: readonly { key: string }[];
}

export function outcomeResultExternallyBlocked(
  contract: ExternalConfirmationProjectionInput,
  outcomeKey: string,
): boolean {
  const resultClaim = `${outcomeKey}.result`;
  return contract.global.acceptance.external_confirmations.some(
    (confirmation) =>
      confirmation.blocks_target &&
      confirmation.impact_claims.includes(resultClaim),
  );
}

export function allOutcomeResultsExternallyBlocked(
  contract: AllOutcomeExternalConfirmationProjectionInput,
): boolean {
  return (
    contract.outcomes.length > 0 &&
    contract.outcomes.every((outcome) =>
      outcomeResultExternallyBlocked(contract, outcome.key),
    )
  );
}

interface ScopeProofInput {
  check: DeliveryCheckV2;
  assertion: DeliveryAssertionV2;
  polarity: "positive" | "negative";
}

export function compileProductClaimCoverage(
  contract: DeliveryContractV2,
  options: { allow_uncovered?: boolean } = {},
): CompiledClaimsV2 {
  const byGlobal = generateGlobalClaims(contract.global);
  const byOutcome = Object.fromEntries(
    contract.outcomes.map((outcome) => [outcome.key, generateClaims(outcome)]),
  );
  for (const [outcomeKey, claims] of Object.entries(byOutcome))
    if (!claims.some((claim) => claim.kind !== "result"))
      fail("outcome_atomic_claim_required", outcomeKey);

  const globalProfileMap = validateProfiles(
    "GLOBAL",
    contract.global.applicability,
    contract.global.acceptance.checks,
    contract.task.execution_targets.map((target) => target.key),
  );
  const globalRows = compileGlobalScope(contract, byGlobal, globalProfileMap);
  const outcomeKeys = new Set(contract.outcomes.map((outcome) => outcome.key));
  const globalLocalKeys = new Set(byGlobal.map((claim) => claim.local_key));
  const outcomeRows: ClaimCoverageSummaryV2["claims_by_outcome"] = {};

  for (const outcome of contract.outcomes) {
    const profiles = validateProfiles(
      outcome.key,
      outcome.applicability,
      outcome.acceptance.checks,
      contract.task.execution_targets.map((target) => target.key),
    );
    outcomeRows[outcome.key] = compileOutcomeScope(
      contract,
      outcome.key,
      byOutcome[outcome.key],
      profiles,
      outcomeKeys,
      globalLocalKeys,
    );
  }

  const uncoveredGlobal = byGlobal
    .filter((claim) => !globalRows[claim.local_key]?.covered)
    .map((claim) => claim.id);
  const uncoveredOutcome = Object.values(byOutcome)
    .flat()
    .filter(
      (claim) => !outcomeRows[claim.outcome_key]?.[claim.local_key]?.covered,
    )
    .map((claim) => claim.id);
  const uncovered = [...uncoveredGlobal, ...uncoveredOutcome].sort();
  const total =
    byGlobal.length +
    Object.values(byOutcome).reduce((sum, claims) => sum + claims.length, 0);
  const compiled: CompiledClaimsV2 = {
    by_global: byGlobal,
    by_outcome: byOutcome,
    summary: {
      claims_total: total,
      claims_covered: total - uncovered.length,
      uncovered_claims: uncovered,
      claims_by_global: globalRows,
      claims_by_outcome: outcomeRows,
    },
  };
  if (!options.allow_uncovered) assertCompiledClaimsCovered(compiled);
  return compiled;
}

function compileGlobalScope(
  contract: DeliveryContractV2,
  claims: GlobalClaimV2[],
  profiles: Map<string, ClaimApplicabilityV2>,
): ClaimCoverageSummaryV2["claims_by_global"] {
  const claimMap = new Map(claims.map((claim) => [claim.local_key, claim]));
  const outcomeClaimIds = new Set(
    contract.outcomes.flatMap((outcome) =>
      generateClaims(outcome).map((claim) => claim.id),
    ),
  );
  const proofs = new Map<string, ClaimProofV2[]>();
  for (const proof of scopeAssertions(contract.global.acceptance.checks)) {
    validateAssertionArity(proof.assertion, "GLOBAL", proof.check.key);
    if (!proof.assertion.claims.length) continue;
    const claimKey = proof.assertion.claims[0];
    const claim = claimMap.get(claimKey);
    if (!claim) {
      if (outcomeClaimIds.has(claimKey))
        fail("global_assertion_claim_cross_scope", claimKey);
      fail("global_assertion_claim_unknown", claimKey);
    }
    const applicabilityRef = validateAssertionApplicability(
      claim.applicability_refs,
      proof,
      profiles,
      "GLOBAL",
    );
    const claimProof: ClaimProofV2 = {
      check_key: proof.check.key,
      assertion_key: proof.assertion.key,
      polarity: proof.polarity,
      proof_surface: proof.check.proof_surface,
      applicability_ref: applicabilityRef,
    };
    validateGlobalProofPolarity(claim, claimProof);
    validateGlobalAssertionOperator(proof.assertion, proof.check.key);
    addProof(proofs, claimKey, claimProof);
  }
  for (const claim of claims)
    addBlockingExternalConfirmationProofs(contract, claim, proofs);
  validateProfileUse("GLOBAL", profiles, claims);
  return Object.fromEntries(
    claims.map((claim) => {
      const claimProofs = proofs.get(claim.local_key) ?? [];
      const coverage = applicabilityCoverage(
        claim.applicability_refs,
        claimProofs,
        [],
        claim.required_polarity,
      );
      return [
        claim.local_key,
        {
          covered: coverage.uncovered.length === 0,
          applicability_refs: [...claim.applicability_refs].sort(),
          uncovered_applicability_refs: coverage.uncovered,
          proofs: claimProofs,
        },
      ];
    }),
  );
}

function compileOutcomeScope(
  contract: DeliveryContractV2,
  outcomeKey: string,
  claims: ProductClaimV2[],
  profiles: Map<string, ClaimApplicabilityV2>,
  outcomeKeys: Set<string>,
  globalLocalKeys: Set<string>,
): ClaimCoverageSummaryV2["claims_by_outcome"][string] {
  const outcome = contract.outcomes.find(
    (candidate) => candidate.key === outcomeKey,
  )!;
  const claimMap = new Map(claims.map((claim) => [claim.local_key, claim]));
  const proofs = new Map<string, ClaimProofV2[]>();
  for (const proof of scopeAssertions(outcome.acceptance.checks)) {
    validateAssertionArity(proof.assertion, outcomeKey, proof.check.key);
    if (!proof.assertion.claims.length) continue;
    const claimKey = proof.assertion.claims[0];
    const claim = claimMap.get(claimKey);
    if (!claim) {
      if (globalLocalKeys.has(claimKey))
        fail("assertion_claim_cross_scope", `${outcomeKey}:${claimKey}`);
      const first = claimKey.split(".")[0];
      if (outcomeKeys.has(first) && first !== outcomeKey)
        fail("assertion_claim_cross_outcome", `${outcomeKey}:${claimKey}`);
      fail("assertion_claim_unknown", `${outcomeKey}:${claimKey}`);
    }
    if (
      proof.assertion.observation === "playwright.passed" &&
      (claim.kind === "requirement" ||
        claim.kind === "control" ||
        claim.kind === "control_relation" ||
        claim.kind === "semantic_fact")
    )
      fail(
        "fine_grained_claim_requires_ac_observation",
        `${outcomeKey}:${claim.local_key}`,
      );
    const applicabilityRef = validateAssertionApplicability(
      claim.applicability_refs,
      proof,
      profiles,
      outcomeKey,
    );
    const claimProof: ClaimProofV2 = {
      check_key: proof.check.key,
      assertion_key: proof.assertion.key,
      polarity: proof.polarity,
      proof_surface: proof.check.proof_surface,
      applicability_ref: applicabilityRef,
    };
    validateProofSurface(claim, claimProof, outcomeKey);
    validateClaimAssertionOperator(
      claim,
      proof.assertion,
      proof.check.proof_surface,
      outcomeKey,
      proof.check.key,
    );
    addProof(proofs, claimKey, claimProof);
  }

  for (const binding of outcome.semantic_fact_bindings.proofs) {
    if (binding.authority !== "external_confirmation") continue;
    const factBinding = outcome.semantic_fact_bindings.facts.find(
      (item) => item.fact_ref === binding.fact_ref,
    );
    if (!factBinding)
      fail(
        "semantic_fact_external_fact_binding_missing",
        `${outcomeKey}:${binding.proof_ref}:${binding.fact_ref}`,
      );
    const claim = claimMap.get(factBinding.claim_ref);
    if (!claim)
      fail(
        "semantic_fact_external_claim_unknown",
        `${outcomeKey}:${factBinding.claim_ref}`,
      );
    const confirmation = contract.global.acceptance.external_confirmations.find(
      (item) => item.key === binding.confirmation_ref,
    );
    const fullClaim = `${outcomeKey}.${factBinding.claim_ref}`;
    if (!confirmation || !confirmation.impact_claims.includes(fullClaim))
      fail(
        "semantic_fact_external_confirmation_invalid",
        `${outcomeKey}:${binding.confirmation_ref}:${fullClaim}`,
      );
    addProof(proofs, factBinding.claim_ref, {
      check_key: `EXTERNAL.${binding.confirmation_ref}`,
      assertion_key: null,
      polarity: "positive",
      proof_surface: binding.proof_surface,
      applicability_ref: factBinding.applicability_ref,
    });
  }

  for (const claim of claims)
    if (claim.kind !== "semantic_fact")
      addBlockingExternalConfirmationProofs(contract, claim, proofs);

  validatePopulationReferences(outcome, claimMap);
  validateCounterfactualReferences(outcome, claimMap);
  validateProfileUse(outcomeKey, profiles, claims);
  return Object.fromEntries(
    claims.map((claim) => {
      const claimProofs = proofs.get(claim.local_key) ?? [];
      const requiredSurfaces = [...claim.required_proof_surfaces].sort();
      const coveredSurfaces = [
        ...new Set(claimProofs.map((proof) => proof.proof_surface)),
      ].sort();
      const missingSurfaces = requiredSurfaces.filter(
        (surface) => !coveredSurfaces.includes(surface),
      );
      const coverage = applicabilityCoverage(
        claim.applicability_refs,
        claimProofs,
        requiredSurfaces,
        claim.required_polarity,
      );
      return [
        claim.local_key,
        {
          required_surfaces: requiredSurfaces,
          covered_surfaces: coveredSurfaces,
          missing_surfaces: missingSurfaces,
          covered: coverage.uncovered.length === 0,
          applicability_refs: [...claim.applicability_refs].sort(),
          uncovered_applicability_refs: coverage.uncovered,
          proofs: claimProofs,
        },
      ];
    }),
  );
}

function validateProfiles(
  scope: string,
  profiles: ClaimApplicabilityV2[],
  checks: DeliveryCheckV2[],
  targetRefs: string[],
): Map<string, ClaimApplicabilityV2> {
  const result = new Map<string, ClaimApplicabilityV2>();
  const targets = new Set(targetRefs);
  for (const profile of profiles) {
    if (result.has(profile.key))
      fail("claim_applicability_key_duplicate", `${scope}:${profile.key}`);
    if (!targets.has(profile.target_ref))
      fail(
        "claim_applicability_target_unknown",
        `${scope}:${profile.key}:${profile.target_ref}`,
      );
    validateUniqueNonemptyRefs(
      profile.given_refs,
      "claim_applicability_given_refs",
      `${scope}:${profile.key}`,
    );
    validateUniqueNonemptyRefs(
      profile.when_refs,
      "claim_applicability_when_refs",
      `${scope}:${profile.key}`,
    );
    result.set(profile.key, profile);
  }
  validateScenarioStepSemantics(scope, checks);
  return result;
}

function validateScenarioStepSemantics(
  scope: string,
  checks: DeliveryCheckV2[],
): void {
  for (const phase of ["given", "when"] as const) {
    const semantics = new Map<string, string>();
    for (const check of checks) {
      const seen = new Set<string>();
      for (const step of check.scenario[phase]) {
        if (seen.has(step.key))
          fail(
            "check_scenario_step_duplicate",
            `${scope}:${check.key}:${phase}:${step.key}`,
          );
        seen.add(step.key);
        const previous = semantics.get(step.key);
        if (previous !== undefined && previous !== step.statement)
          fail(
            "check_scenario_step_semantics_conflict",
            `${scope}:${phase}:${step.key}`,
          );
        semantics.set(step.key, step.statement);
      }
    }
  }
}

function validateAssertionArity(
  assertion: DeliveryAssertionV2,
  scope: string,
  checkKey: string,
): void {
  if (assertion.claims.length > 1)
    fail(
      "assertion_single_claim_required",
      `${scope}:${checkKey}:${assertion.key}`,
    );
  if (assertion.claims.length === 1 && !assertion.applicability_ref)
    fail(
      "assertion_applicability_ref_required",
      `${scope}:${checkKey}:${assertion.key}`,
    );
  if (!assertion.claims.length && assertion.applicability_ref)
    fail(
      "claimless_assertion_applicability_ref_forbidden",
      `${scope}:${checkKey}:${assertion.key}`,
    );
}

function validateAssertionApplicability(
  claimRefs: string[],
  proof: ScopeProofInput,
  profiles: Map<string, ClaimApplicabilityV2>,
  scope: string,
): string {
  validateUniqueNonemptyRefs(
    claimRefs,
    "claim_applicability_refs",
    `${scope}:${proof.assertion.claims[0]}`,
  );
  const reference = proof.assertion.applicability_ref!;
  if (!claimRefs.includes(reference))
    fail(
      "claim_assertion_applicability_not_declared",
      `${scope}:${proof.assertion.claims[0]}:${reference}`,
    );
  const profile = profiles.get(reference);
  if (!profile)
    fail(
      "claim_applicability_ref_unknown",
      `${scope}:${proof.assertion.claims[0]}:${reference}`,
    );
  const label = `${scope}:${proof.check.key}:${proof.assertion.key}:${reference}`;
  if (proof.check.execution_target.target_ref !== profile.target_ref)
    fail("claim_applicability_target_mismatch", label);
  if (!proof.check.journey_roles.includes(profile.journey_role))
    fail("claim_applicability_journey_mismatch", label);
  if (
    !sameSet(
      proof.check.scenario.given.map((step) => step.key),
      profile.given_refs,
    )
  )
    fail("claim_applicability_given_mismatch", label);
  if (
    proof.check.scenario.when.map((step) => step.key).join("\0") !==
    profile.when_refs.join("\0")
  )
    fail("claim_applicability_when_mismatch", label);
  return reference;
}

function validatePopulationReferences(
  outcome: DeliveryContractV2["outcomes"][number],
  claims: Map<string, ProductClaimV2>,
): void {
  const population = outcome.acceptance.population;
  if (!population) return;
  const check = outcome.acceptance.checks.find(
    (candidate) => candidate.key === population.check_key,
  );
  if (!check)
    fail(
      "outcome_check_reference_unknown",
      `${outcome.key}:${population.check_key}`,
    );
  const universeBinding = outcome.technical.bindings.find(
    (binding) => binding.key === population.universe_binding_key,
  );
  if (!universeBinding)
    fail(
      "population_universe_binding_unknown",
      `${outcome.key}:${population.universe_binding_key}`,
    );
  const missingUniverseInputs = universeBinding.carrier_paths.filter(
    (carrier) =>
      !check.input_paths.some((pattern) =>
        matchesRepoPattern(carrier, pattern),
      ),
  );
  if (missingUniverseInputs.length)
    fail(
      "population_universe_carrier_input_missing",
      `${outcome.key}:${population.check_key}:${missingUniverseInputs.join(",")}`,
    );
  for (const claim of population.claims)
    if (!claims.has(claim))
      fail("assertion_claim_unknown", `${outcome.key}:${claim}`);
}

function validateCounterfactualReferences(
  outcome: DeliveryContractV2["outcomes"][number],
  claims: Map<string, ProductClaimV2>,
): void {
  for (const control of outcome.acceptance.counterfactual_controls) {
    const check = outcome.acceptance.checks.find(
      (candidate) => candidate.key === control.check_key,
    );
    if (!check)
      fail(
        "outcome_check_reference_unknown",
        `${outcome.key}:${control.check_key}`,
      );
    const assertions = new Set(
      [...check.positive_assertions, ...check.negative_assertions].map(
        (assertion) => assertion.key,
      ),
    );
    if (!control.expected_assertion_failures.length)
      fail(
        "counterfactual_expected_assertion_required",
        `${outcome.key}:${control.key}`,
      );
    for (const assertion of [
      ...control.expected_assertion_failures,
      ...control.preserved_assertions,
      ...control.allowed_fanout_assertions,
    ])
      if (!assertions.has(assertion))
        fail(
          "counterfactual_assertion_unknown",
          `${outcome.key}:${control.key}:${assertion}`,
        );
    for (const claim of control.claims)
      if (!claims.has(claim))
        fail("assertion_claim_unknown", `${outcome.key}:${claim}`);
  }
}

function scopeAssertions(checks: DeliveryCheckV2[]): ScopeProofInput[] {
  return checks.flatMap((check) => [
    ...check.positive_assertions.map((assertion) => ({
      check,
      assertion,
      polarity: "positive" as const,
    })),
    ...check.negative_assertions.map((assertion) => ({
      check,
      assertion,
      polarity: "negative" as const,
    })),
  ]);
}

function applicabilityCoverage(
  refs: string[],
  proofs: ClaimProofV2[],
  requiredSurfaces: ProofSurface[],
  requiredPolarity: "positive" | "negative",
): { uncovered: string[] } {
  const uncovered = refs.filter((reference) => {
    const matching = proofs.filter(
      (proof) =>
        proof.applicability_ref === reference &&
        proof.polarity === requiredPolarity,
    );
    if (!matching.length) return true;
    return requiredSurfaces.some(
      (surface) => !matching.some((proof) => proof.proof_surface === surface),
    );
  });
  return { uncovered: [...uncovered].sort() };
}

function validateProfileUse(
  scope: string,
  profiles: Map<string, ClaimApplicabilityV2>,
  claims: Array<ProductClaimV2 | GlobalClaimV2>,
): void {
  const used = new Set(claims.flatMap((claim) => claim.applicability_refs));
  for (const reference of used)
    if (!profiles.has(reference))
      fail("claim_applicability_ref_unknown", `${scope}:${reference}`);
  for (const reference of profiles.keys())
    if (!used.has(reference))
      fail("claim_applicability_profile_unused", `${scope}:${reference}`);
}

function validateUniqueNonemptyRefs(
  refs: string[],
  code: string,
  detail: string,
): void {
  if (!refs.length) fail(`${code}_required`, detail);
  if (new Set(refs).size !== refs.length) fail(`${code}_duplicate`, detail);
}

function addProof(
  proofs: Map<string, ClaimProofV2[]>,
  claim: string,
  proof: ClaimProofV2,
): void {
  const rows = proofs.get(claim) ?? [];
  rows.push(proof);
  proofs.set(claim, rows);
}

function addBlockingExternalConfirmationProofs(
  contract: DeliveryContractV2,
  claim: ProductClaimV2 | GlobalClaimV2,
  proofs: Map<string, ClaimProofV2[]>,
): void {
  const confirmations =
    contract.global.acceptance.external_confirmations.filter(
      (confirmation) =>
        confirmation.blocks_target &&
        confirmation.impact_claims.includes(claim.id),
    );
  if (!confirmations.length) return;
  for (const confirmation of confirmations)
    for (const applicabilityRef of claim.applicability_refs)
      for (const proofSurface of externalClaimProofSurfaces(
        confirmation,
        claim,
        applicabilityRef,
      ))
        addProof(proofs, claim.local_key, {
          check_key: `EXTERNAL.${confirmation.key}`,
          assertion_key: null,
          polarity: claim.required_polarity,
          proof_surface: proofSurface,
          applicability_ref: applicabilityRef,
        });
}

function externalClaimProofSurfaces(
  confirmation: DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number],
  claim: ProductClaimV2 | GlobalClaimV2,
  applicabilityRef: string,
): ProofSurface[] {
  const declared = [
    ...new Set(
      (confirmation.obligations ?? [])
        .filter(
          (obligation) =>
            obligation.claim_ref === claim.id &&
            obligation.applicability_ref === applicabilityRef,
        )
        .map((obligation) => obligation.proof_surface),
    ),
  ];
  if (declared.length) return declared;
  return "required_proof_surfaces" in claim &&
    claim.required_proof_surfaces.length
    ? claim.required_proof_surfaces
    : ["runtime_behavior"];
}

function sameSet(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((item) => right.includes(item))
  );
}

export function assertCompiledClaimsCovered(compiled: CompiledClaimsV2): void {
  for (const [outcomeKey, claims] of Object.entries(compiled.by_outcome))
    for (const claim of claims)
      assertRequiredSurfacesForEveryApplicability(
        outcomeKey,
        claim,
        compiled.summary.claims_by_outcome[outcomeKey]?.[claim.local_key],
      );
  const uncoveredGlobal = compiled.by_global
    .filter(
      (claim) => !compiled.summary.claims_by_global[claim.local_key]?.covered,
    )
    .map((claim) => claim.id);
  const uncoveredOutcome = Object.values(compiled.by_outcome)
    .flat()
    .filter(
      (claim) =>
        !compiled.summary.claims_by_outcome[claim.outcome_key]?.[
          claim.local_key
        ]?.covered,
    )
    .map((claim) => claim.id);
  assertAllGlobalClaimsCovered(uncoveredGlobal);
  assertAllClaimsCovered(uncoveredOutcome);
}

function assertRequiredSurfacesForEveryApplicability(
  scope: string,
  claim: ProductClaimV2,
  summary:
    ClaimCoverageSummaryV2["claims_by_outcome"][string][string] | undefined,
): void {
  if (!summary || !claim.required_proof_surfaces.length) return;
  for (const applicabilityRef of claim.applicability_refs) {
    const proofs = summary.proofs.filter(
      (proof) =>
        proof.applicability_ref === applicabilityRef &&
        proof.polarity === claim.required_polarity,
    );
    const missing = claim.required_proof_surfaces.filter(
      (surface) => !proofs.some((proof) => proof.proof_surface === surface),
    );
    if (missing.length)
      fail(
        "product_claim_required_surfaces_missing",
        `${scope}:${claim.local_key}:${applicabilityRef}:${missing.sort().join(",")}`,
      );
  }
}
