import assert from "node:assert/strict";
import { generateClaims } from "../../packages/ty-context/dist/lib/long-task-claim-definitions.js";
import { claimProofMethod } from "../../packages/ty-context/dist/lib/long-task-acceptance-reachability-helpers.js";
import { externalClaimCapabilityFloor } from "../../packages/ty-context/dist/lib/long-task-proof-adequacy.js";
import { canonicalValueJson } from "../../packages/ty-context/dist/lib/strict-codec.js";
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
    applicabilityRef: `first-feasibility-${slug}`,
    method: FEASIBILITY_METHOD,
    proofSurface: FEASIBILITY_PROOF_SURFACE,
    evidenceCapabilities: [
      "semantic_fact",
      "boundary_invocation",
      "actual_provenance",
    ],
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
  for (const identity of semanticIdentities)
    ensureFeasibilityApplicability(outcome, identity);
  const designDescriptors = targetDesignFactObligations(
    outcome,
    selectedTargets,
  );
  assert.ok(
    designDescriptors.length > 0,
    "fixture blocking design confirmation requires exact design Fact obligations",
  );
  const designObligations = designDescriptors.map(
    ({ localClaimRef: _localClaimRef, ...obligation }) => obligation,
  );
  const alreadyConfirmedClaims = new Set(excludedClaimRefs);
  if (excludeAlreadyConfirmedClaims)
    for (const claimRef of contract.global.acceptance.external_confirmations
      .filter((confirmation) => confirmation.blocks_target)
      .flatMap((confirmation) => confirmation.impact_claims))
      alreadyConfirmedClaims.add(claimRef);
  const objectiveClaimRefs = externallyProjectedTargetClaimRefs(
    outcome,
    selectedTargets,
  ).filter((claimRef) => !alreadyConfirmedClaims.has(claimRef));
  designObligations.push(
    ...externalActualClaimObligations(contract, outcome, objectiveClaimRefs),
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
    result_kind: "actual",
  }));
  contract.task.target_profile.completion_authority = "declared_authorities";
  const designConfirmation = makeConfirmation(contract, outcome, {
    key: semanticObligations.length > 0 ? `${key}-design` : key,
    description,
    obligations: designObligations,
    evidenceStatement:
      "Provide evidence for every exact externally observed design Fact and the Source-authorized design assessment.",
  });
  if (semanticObligations.length === 0) return designConfirmation;
  return makeConfirmation(contract, outcome, {
    key,
    description,
    obligations: semanticObligations,
    evidenceStatement:
      "Provide the exact externally observed implementation-feasibility Fact Actual.",
  });
}

function externallyProjectedTargetClaimRefs(outcome, selectedTargets) {
  const selectedTargetKeys = new Set(
    selectedTargets.map((target) => target.key),
  );
  const localClaimRefs = new Set();
  for (const surface of outcome.product.surface_bindings) {
    if (
      !surface.design_targets.some((target) =>
        selectedTargetKeys.has(target.key),
      )
    )
      continue;
    for (const controlRef of surface.control_refs)
      for (const claim of generateClaims(outcome))
        if (claim.local_key.startsWith(`control.${controlRef}.`))
          localClaimRefs.add(claim.local_key);
  }
  for (const target of selectedTargets) {
    for (const claimRef of target.claim_refs) localClaimRefs.add(claimRef);
    const check = outcome.acceptance.checks.find(
      (candidate) => candidate.key === target.conformance_check_ref,
    );
    assert.ok(check);
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
    for (const assertion of [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ])
      if (assertionRefs.has(assertion.key))
        for (const claimRef of assertion.claims) localClaimRefs.add(claimRef);
  }
  return [...localClaimRefs]
    .map((claimRef) => `${outcome.key}.${claimRef}`)
    .sort();
}

function externalActualClaimObligations(contract, outcome, claimRefs) {
  const claims = new Map(
    generateClaims(outcome).map((claim) => [claim.id, claim]),
  );
  return claimRefs.flatMap((claimRef) => {
    const claim = claims.get(claimRef);
    assert.ok(claim, `fixture objective external Claim missing: ${claimRef}`);
    return claim.applicability_refs.flatMap((applicabilityRef) => {
      const proofAssertions = outcome.acceptance.checks.flatMap((check) =>
        [...check.positive_assertions, ...check.negative_assertions]
          .filter(
            (assertion) =>
              assertion.claims.length === 1 &&
              assertion.claims[0] === claim.local_key &&
              assertion.applicability_ref === applicabilityRef,
          )
          .map((assertion) => ({ check, assertion })),
      );
      const surfaces = claim.required_proof_surfaces.length
        ? claim.required_proof_surfaces
        : [...new Set(proofAssertions.map(({ check }) => check.proof_surface))];
      return surfaces.map((proofSurface) => {
        const exactAssertions = proofAssertions.filter(
          ({ check, assertion }) =>
            check.proof_surface === proofSurface &&
            ["equals", "truthy", "falsy", "exists"].includes(
              assertion.operator,
            ),
        );
        assert.ok(
          exactAssertions.length > 0,
          `fixture objective external Claim requires one exact Assertion: ${claimRef}:${applicabilityRef}:${proofSurface}`,
        );
        assert.equal(
          new Set(
            exactAssertions.map(({ check, assertion }) =>
              canonicalValueJson({
                target_ref: check.execution_target.target_ref,
                proof_surface: check.proof_surface,
                expected:
                  assertion.operator === "equals"
                    ? assertion.expected
                    : assertion.operator === "falsy"
                      ? false
                      : true,
                projection:
                  assertion.operator === "equals"
                    ? "raw_exact"
                    : assertion.operator === "exists"
                      ? "presence_boolean"
                      : assertion.operator === "truthy"
                        ? "truthy_boolean"
                        : "falsy_boolean",
              }),
            ),
          ).size,
          1,
          `fixture objective external Claim Assertions must be exactly equivalent: ${claimRef}:${applicabilityRef}:${proofSurface}`,
        );
        const capabilities = [
          ...externalClaimCapabilityFloor(
            contract,
            outcome.key,
            claim.local_key,
            proofSurface,
            applicabilityRef,
          ),
        ].sort();
        const method = claimProofMethod(capabilities);
        assert.equal(
          method,
          "exact_value",
          `fixture objective external Claim requires an exact comparator: ${claimRef}:${applicabilityRef}:${proofSurface}`,
        );
        return {
          key: `confirm-claim-actual-${contractKeySlug(
            `${claimRef}\0${applicabilityRef}\0${proofSurface}`,
          )}`,
          claim_ref: claimRef,
          applicability_ref: applicabilityRef,
          fact_ref: null,
          proof_ref: null,
          method,
          proof_surface: proofSurface,
          evidence_capabilities: capabilities,
          expected_authority_ref: `contract-claim:${claimRef}`,
          result_kind: "actual",
        };
      });
    });
  });
}

function targetDesignFactObligations(outcome, selectedTargets) {
  const result = [];
  for (const target of selectedTargets) {
    const check = outcome.acceptance.checks.find(
      (candidate) => candidate.key === target.conformance_check_ref,
    );
    assert.ok(check, `fixture design Check missing: ${target.key}`);
    const append = ({ assertionRef, sourceObligationRef, factRef, method }) => {
      const assertion = [
        ...check.positive_assertions,
        ...check.negative_assertions,
      ].find((candidate) => candidate.key === assertionRef);
      assert.ok(
        assertion,
        `fixture design Assertion missing: ${target.key}:${assertionRef}`,
      );
      assert.equal(
        assertion.claims.length,
        1,
        `fixture design Assertion must own one Claim: ${target.key}:${assertionRef}`,
      );
      assert.ok(
        assertion.applicability_ref,
        `fixture design Assertion applicability missing: ${target.key}:${assertionRef}`,
      );
      const localClaimRef = assertion.claims[0];
      result.push({
        key: `confirm-${contractKeySlug(sourceObligationRef)}`,
        localClaimRef,
        claim_ref: `${outcome.key}.${localClaimRef}`,
        applicability_ref: assertion.applicability_ref,
        fact_ref: factRef,
        proof_ref: sourceObligationRef,
        method,
        proof_surface: check.proof_surface,
        evidence_capabilities: [...assertion.evidence_capabilities].sort(),
        expected_authority_ref: `design-proof:${sourceObligationRef}`,
        result_kind: "actual",
      });
    };
    for (const binding of target.verification_method_bindings)
      for (const artifact of binding.evidence_artifacts)
        for (const expectation of artifact.fact_expectations)
          append({
            assertionRef: binding.assertion_ref,
            sourceObligationRef: `design.${target.key}.${binding.method}.${artifact.condition_key}.${expectation.fact_ref}`,
            factRef: expectation.fact_ref,
            method: binding.method,
          });
    for (const binding of target.symbolic_method_bindings ?? [])
      for (const expectation of binding.rule_expectations)
        append({
          assertionRef: binding.assertion_ref,
          sourceObligationRef: expectation.obligation_ref,
          factRef: expectation.fact_rule_ref,
          method: binding.method,
        });
  }
  assert.equal(
    new Set(result.map((obligation) => obligation.proof_ref)).size,
    result.length,
    "fixture design obligation identities must be unique",
  );
  return result;
}

function makeConfirmation(
  contract,
  outcome,
  { key, description, obligations, evidenceStatement },
) {
  assert.ok(obligations.length > 0);
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
        key: `${contractKeySlug(key)}-evidence`,
        statement: evidenceStatement,
      },
    ],
    obligations,
  };
  upsertConfirmation(contract, confirmation);
  return confirmation;
}

function upsertConfirmation(contract, confirmation) {
  const existing = contract.global.acceptance.external_confirmations.findIndex(
    (candidate) => candidate.key === confirmation.key,
  );
  if (existing === -1)
    contract.global.acceptance.external_confirmations.push(confirmation);
  else
    contract.global.acceptance.external_confirmations[existing] = confirmation;
}

function contractKeySlug(value) {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");
}

export async function addExternalFeasibilityDecisionSemanticFact(
  fixture,
  { identity, expectedValue, confirmationRef },
) {
  const outcome = fixture.contract.outcomes[0];
  ensureFeasibilityApplicability(outcome, identity);
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

function ensureFeasibilityApplicability(outcome, identity) {
  if (
    outcome.applicability.some(
      (candidate) => candidate.key === identity.applicabilityRef,
    )
  )
    return;
  const base = outcome.applicability[0];
  assert.ok(base, "fixture feasibility applicability template is required");
  outcome.applicability.push({
    ...structuredClone(base),
    key: identity.applicabilityRef,
    dimensions: structuredClone(base.dimensions).map((dimension, index) => ({
      ...dimension,
      value: index === 0 ? `feasibility-${identity.slug}` : dimension.value,
    })),
  });
}
