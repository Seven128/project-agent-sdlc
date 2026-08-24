import assert from "node:assert/strict";
import { generateClaims } from "../../packages/ty-context/dist/lib/long-task-claim-definitions.js";
import { claimProofMethod } from "../../packages/ty-context/dist/lib/long-task-acceptance-reachability-helpers.js";
import { externalClaimCapabilityFloor } from "../../packages/ty-context/dist/lib/long-task-proof-adequacy.js";
import { mutateFixtureSemanticManifest } from "./long-task-semantic-fact-test-support.mjs";
import { addFeasibilityDecisionFactInventory } from "./long-task-feasibility-semantic-manifest-fixture.mjs";

const FEASIBILITY_METHOD = "exact_value";
const FEASIBILITY_PROOF_SURFACE = "implementation_structure";

export function feasibilityDecisionSemanticIdentity(sourceItemRef) {
  const slug = sourceItemRef.replaceAll(".", "-").replaceAll("_", "-");
  const factKey = `fact.feasibility.${slug}`;
  return {
    sourceItemRef,
    slug,
    factKey,
    proofKey: `proof.feasibility.${slug}.expert`,
    claimRef: `semantic_fact.${factKey}`,
    applicabilityRef: "first-root-success",
    method: FEASIBILITY_METHOD,
    proofSurface: FEASIBILITY_PROOF_SURFACE,
    evidenceCapabilities: ["semantic_fact"],
  };
}

export function configureExactTargetBlockingConfirmation(
  contract,
  {
    key,
    description = "Confirm the exact externally blocked production design obligations before completion.",
    excludeAlreadyConfirmedClaims = false,
    excludedClaimRefs = [],
    semanticIdentities = [],
    targetKey = null,
    targetKeys = null,
  },
) {
  const outcome = contract.outcomes[0];
  const designTargets = outcome.product.surface_bindings.flatMap(
    (surface) => surface.design_targets,
  );
  const selectedTargetKeys = targetKeys ?? [targetKey ?? designTargets[0]?.key];
  const selectedTargets = selectedTargetKeys.map((selectedKey) =>
    designTargets.find((candidate) => candidate.key === selectedKey),
  );
  assert.ok(
    selectedTargets.every(Boolean),
    `external confirmation target missing: ${selectedTargetKeys.join(",")}`,
  );
  const alreadyConfirmedClaims = new Set(excludedClaimRefs);
  if (excludeAlreadyConfirmedClaims)
    for (const claimRef of contract.global.acceptance.external_confirmations
      .filter(
        (confirmation) =>
          confirmation.blocks_target && confirmation.key !== key,
      )
      .flatMap((confirmation) => confirmation.impact_claims))
      alreadyConfirmedClaims.add(claimRef);
  const ordinaryObligations = externalClaimObligations(
    contract,
    outcome,
    [
      ...new Set(
        selectedTargets.flatMap((target) =>
          externallyProjectedTargetClaimRefs(outcome, target),
        ),
      ),
    ]
      .filter((claimRef) => !alreadyConfirmedClaims.has(claimRef))
      .sort(),
  );
  const semanticObligations = semanticIdentities.map((identity) => ({
    key: `confirm-${identity.proofKey.replaceAll(".", "-")}`,
    claim_ref: `${outcome.key}.${identity.claimRef}`,
    applicability_ref: identity.applicabilityRef,
    fact_ref: identity.factKey,
    proof_ref: identity.proofKey,
    method: identity.method,
    proof_surface: identity.proofSurface,
    evidence_capabilities: [...identity.evidenceCapabilities],
    expected_authority_ref: `semantic-proof:${identity.proofKey}`,
    result_kind: "judgment",
  }));
  const obligations = [...ordinaryObligations, ...semanticObligations];
  const profile = outcome.applicability.find(
    (candidate) => candidate.key === obligations[0].applicability_ref,
  );
  assert.ok(profile);
  assert.ok(
    obligations.every(
      (obligation) => obligation.applicability_ref === profile.key,
    ),
    "fixture target-blocking confirmation must remain one exact Session",
  );
  contract.task.target_profile.completion_authority = "declared_authorities";
  const confirmation = {
    key,
    description,
    owner: "project-owner",
    kind: "expert_authority",
    impact_claims: [...new Set(obligations.map((row) => row.claim_ref))].sort(),
    blocks_target: true,
    actor: {
      id: "fixture-design-owner",
      role: "production design acceptance owner",
      authority_kind: "expert",
    },
    target_ref: profile.target_ref,
    environment_identity: "fixture-design-environment-v1",
    scenario: {
      given: profile.given_refs.map((stepKey) => ({
        key: stepKey,
        statement: `Establish ${stepKey}.`,
      })),
      when: profile.when_refs.map((stepKey) => ({
        key: stepKey,
        statement: `Perform ${stepKey}.`,
      })),
    },
    evidence_requirements: [
      {
        key: "design-obligation-evidence",
        statement:
          "Provide evidence for every exact target and feasibility obligation.",
      },
    ],
    obligations,
  };
  const existing = contract.global.acceptance.external_confirmations.findIndex(
    (candidate) => candidate.key === key,
  );
  if (existing === -1)
    contract.global.acceptance.external_confirmations.push(confirmation);
  else
    contract.global.acceptance.external_confirmations[existing] = confirmation;
  return confirmation;
}

function externallyProjectedTargetClaimRefs(outcome, target) {
  const claimRefs = new Set(
    target.claim_refs.map((claimRef) => `${outcome.key}.${claimRef}`),
  );
  const assertionRefs = new Set([
    target.conformance_assertion_ref,
    ...target.verification_method_bindings.map(
      (binding) => binding.assertion_ref,
    ),
    ...(target.symbolic_method_bindings ?? []).map(
      (binding) => binding.assertion_ref,
    ),
    ...(target.symbolic_certificate_binding
      ? [target.symbolic_certificate_binding.assertion_ref]
      : []),
  ]);
  const check = outcome.acceptance.checks.find(
    (candidate) => candidate.key === target.conformance_check_ref,
  );
  assert.ok(check);
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ])
    if (
      assertionRefs.has(assertion.key) ||
      assertion.evidence_capabilities.includes("state_delta")
    )
      for (const claimRef of assertion.claims)
        claimRefs.add(`${outcome.key}.${claimRef}`);
  return [...claimRefs].sort();
}

export async function addExternalFeasibilityDecisionSemanticFact(
  fixture,
  { identity, expectedValue, confirmationRef },
) {
  const outcome = fixture.contract.outcomes[0];
  outcome.semantic_fact_bindings.facts.push({
    fact_ref: identity.factKey,
    claim_ref: identity.claimRef,
    applicability_ref: identity.applicabilityRef,
  });
  outcome.semantic_fact_bindings.proofs.push({
    proof_ref: identity.proofKey,
    fact_ref: identity.factKey,
    method: identity.method,
    proof_surface: identity.proofSurface,
    evidence_capabilities: [...identity.evidenceCapabilities],
    authority: "external_confirmation",
    confirmation_ref: confirmationRef,
  });

  await mutateFixtureSemanticManifest(fixture, (manifest) => {
    addFeasibilityDecisionFactInventory(
      manifest,
      outcome,
      identity,
      expectedValue,
    );
  });
}

function externalClaimObligations(contract, outcome, claimRefs) {
  const claims = new Map(
    generateClaims(outcome).map((claim) => [claim.id, claim]),
  );
  return claimRefs.flatMap((claimRef) => {
    const claim = claims.get(claimRef);
    assert.ok(claim, `external claim missing: ${claimRef}`);
    const surfaces = claim.required_proof_surfaces.length
      ? claim.required_proof_surfaces
      : ["runtime_behavior"];
    return claim.applicability_refs.flatMap((applicabilityRef) =>
      surfaces.map((proofSurface) => {
        const capabilities = [
          ...externalClaimCapabilityFloor(
            contract,
            outcome.key,
            claim.local_key,
            proofSurface,
            applicabilityRef,
          ),
        ].sort();
        return {
          key: contractKeySlug(
            "confirm",
            claimRef,
            applicabilityRef,
            proofSurface,
          ),
          claim_ref: claimRef,
          applicability_ref: applicabilityRef,
          fact_ref: null,
          proof_ref: null,
          method: claimProofMethod(capabilities),
          proof_surface: proofSurface,
          evidence_capabilities: capabilities,
          expected_authority_ref: `contract-claim:${claimRef}`,
          result_kind: "judgment",
        };
      }),
    );
  });
}

function contractKeySlug(...parts) {
  return parts
    .join("-")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}
