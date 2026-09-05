import type {
  CompiledCheckV2,
  CompiledDesignTargetV2,
  CompiledObservationAuthorityV2,
  DeliveryDesignFactExpectationV2,
} from "./long-task-delivery-types.js";
import type {
  CompiledDesignFactObligationDescriptorV1,
  CompiledDesignObligationIdentity,
} from "./long-task-compiled-design-obligation-types.js";
import {
  designGroundObligationRef,
  sameDesignObligationSet,
} from "./long-task-design-obligation-identity.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export function compiledDesignCandidates(
  check: CompiledCheckV2,
  identity: CompiledDesignObligationIdentity,
  expectedAuthorityRef: string,
  localClaimRef: string,
): CompiledDesignFactObligationDescriptorV1[] {
  if (
    check.outcome_key !== identity.outcome_key ||
    check.proof_surface !== identity.proof_surface
  )
    return [];
  const authorities = check.observation_authorities.filter(
    (authority) =>
      authority.authority === "external_confirmation" &&
      authority.obligation_ref === identity.proof_ref &&
      authority.fact_ref === identity.fact_ref &&
      authority.claim_refs.length === 1 &&
      authority.claim_refs[0] === localClaimRef &&
      authority.target_ref === check.execution_target.target_ref &&
      authority.proof_surface === identity.proof_surface &&
      authority.method === identity.method &&
      sameDesignObligationSet(
        authority.evidence_capabilities,
        designIdentityCapabilities(identity),
      ) &&
      authority.actual_projection === "raw_exact" &&
      authority.carrier_refs.length === 0,
  );
  return authorities.flatMap((authority) =>
    check.design_conformance_targets.flatMap((target) =>
      descriptorsForCompiledTarget(
        check,
        target,
        authority,
        identity,
        expectedAuthorityRef,
        localClaimRef,
      ),
    ),
  );
}

function descriptorsForCompiledTarget(
  check: CompiledCheckV2,
  target: CompiledDesignTargetV2,
  authority: CompiledObservationAuthorityV2,
  identity: CompiledDesignObligationIdentity,
  expectedAuthorityRef: string,
  localClaimRef: string,
): CompiledDesignFactObligationDescriptorV1[] {
  if (
    target.conformance_check_ref !== check.key ||
    target.target_ref !== authority.target_ref
  )
    return [];
  return [
    ...groundDescriptors(
      check,
      target,
      authority,
      identity,
      expectedAuthorityRef,
      localClaimRef,
    ),
    ...symbolicDescriptors(
      check,
      target,
      authority,
      identity,
      expectedAuthorityRef,
      localClaimRef,
    ),
  ];
}

function groundDescriptors(
  check: CompiledCheckV2,
  target: CompiledDesignTargetV2,
  authority: CompiledObservationAuthorityV2,
  identity: CompiledDesignObligationIdentity,
  expectedAuthorityRef: string,
  localClaimRef: string,
): CompiledDesignFactObligationDescriptorV1[] {
  const result: CompiledDesignFactObligationDescriptorV1[] = [];
  for (const binding of target.verification_method_bindings)
    for (const artifact of binding.evidence_artifacts)
      for (const expectation of artifact.fact_expectations) {
        const obligationRef = designGroundObligationRef(
          target.key,
          binding.method,
          artifact.condition_key,
          expectation.fact_ref,
        );
        if (
          binding.assertion_ref === authority.assertion_ref &&
          binding.method === identity.method &&
          obligationRef === identity.proof_ref &&
          expectation.fact_ref === identity.fact_ref &&
          authority.observation_identity === expectation.fact_ref &&
          compiledExpectationMatchesAuthority(expectation, authority)
        )
          result.push(
            compiledDescriptor(
              check,
              target,
              authority,
              identity,
              expectedAuthorityRef,
              localClaimRef,
              expectation,
            ),
          );
      }
  return result;
}

function symbolicDescriptors(
  check: CompiledCheckV2,
  target: CompiledDesignTargetV2,
  authority: CompiledObservationAuthorityV2,
  identity: CompiledDesignObligationIdentity,
  expectedAuthorityRef: string,
  localClaimRef: string,
): CompiledDesignFactObligationDescriptorV1[] {
  const result: CompiledDesignFactObligationDescriptorV1[] = [];
  for (const binding of target.symbolic_method_bindings ?? [])
    for (const expectation of binding.rule_expectations)
      if (
        binding.assertion_ref === authority.assertion_ref &&
        binding.method === identity.method &&
        expectation.obligation_ref === identity.proof_ref &&
        expectation.fact_rule_ref === identity.fact_ref &&
        expectation.proof_surface === identity.proof_surface &&
        authority.observation_identity === expectation.obligation_ref &&
        compiledExpectationMatchesAuthority(expectation, authority)
      )
        result.push(
          compiledDescriptor(
            check,
            target,
            authority,
            identity,
            expectedAuthorityRef,
            localClaimRef,
            expectation,
          ),
        );
  return result;
}

function compiledDescriptor(
  check: CompiledCheckV2,
  target: CompiledDesignTargetV2,
  authority: CompiledObservationAuthorityV2,
  identity: CompiledDesignObligationIdentity,
  expectedAuthorityRef: string,
  localClaimRef: string,
  expectation: Pick<
    DeliveryDesignFactExpectationV2,
    "expected" | "comparison" | "observation_sensitivity"
  >,
): CompiledDesignFactObligationDescriptorV1 {
  return {
    source_obligation_ref: authority.obligation_ref,
    outcome_key: identity.outcome_key!,
    check_key: check.key,
    target_key: target.key,
    assertion_ref: authority.assertion_ref,
    local_claim_ref: localClaimRef,
    claim_ref: identity.claim_ref,
    applicability_ref: identity.applicability_ref,
    fact_ref: identity.fact_ref!,
    method: authority.method,
    proof_surface: authority.proof_surface,
    evidence_capabilities: [...authority.evidence_capabilities].sort(),
    expected_authority_ref: expectedAuthorityRef,
    expected: expectation.expected,
    comparison: expectation.comparison,
    observation_sensitivity: expectation.observation_sensitivity,
    observation_authority: authority,
  };
}

function compiledExpectationMatchesAuthority(
  expectation: Pick<DeliveryDesignFactExpectationV2, "expected" | "comparison">,
  authority: CompiledObservationAuthorityV2,
): boolean {
  const comparison = {
    comparator: expectation.comparison.comparator,
    mode: expectation.comparison.mode,
    parameters_sha256: expectation.comparison.parameters.sha256,
    tolerance_sha256: expectation.comparison.tolerance?.sha256 ?? null,
    mask_sha256: expectation.comparison.mask?.sha256 ?? null,
  };
  return (
    authority.expected_value_sha256 === expectation.expected.sha256 &&
    canonicalValueJson(authority.comparison) ===
      canonicalValueJson(comparison) &&
    authority.expected_identity ===
      sha256Hex(
        canonicalValueJson({
          obligation_ref: authority.obligation_ref,
          fact_ref: authority.fact_ref,
          method: authority.method,
          expected_value_sha256: authority.expected_value_sha256,
          comparison,
          actual_projection: authority.actual_projection,
          carrier_refs: authority.carrier_refs,
        }),
      )
  );
}

function designIdentityCapabilities(
  identity: CompiledDesignObligationIdentity,
): string[] {
  return [
    ...(identity.evidence_capabilities ??
      identity.required_evidence_capabilities ??
      []),
  ].sort();
}
