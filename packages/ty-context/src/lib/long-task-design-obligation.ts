import type {
  DeliveryAssertionV2,
  DeliveryCheckV2,
  DeliveryContractV2,
  DeliveryDesignFactExpectationV2,
  EvidenceCapabilityV2,
  ExternalConfirmationV2,
  ProofSurface,
} from "./long-task-delivery-types.js";

type DesignObligationContract = {
  outcomes: ReadonlyArray<{
    key: string;
    product: Pick<
      DeliveryContractV2["outcomes"][number]["product"],
      "surface_bindings"
    >;
    acceptance: {
      checks: ReadonlyArray<
        Pick<
          DeliveryCheckV2,
          | "key"
          | "proof_surface"
          | "positive_assertions"
          | "negative_assertions"
        >
      >;
    };
  }>;
};

export interface DesignFactObligationDescriptorV1 {
  source_obligation_ref: string;
  outcome_key: string;
  check_key: string;
  target_key: string;
  assertion_ref: string;
  local_claim_ref: string;
  claim_ref: string;
  applicability_ref: string;
  fact_ref: string;
  method: string;
  proof_surface: ProofSurface;
  evidence_capabilities: EvidenceCapabilityV2[];
  expected_authority_ref: string;
  expected: DeliveryDesignFactExpectationV2["expected"];
  comparison: DeliveryDesignFactExpectationV2["comparison"];
  observation_sensitivity: "plain" | "protected";
}

export function designGroundObligationRef(
  targetKey: string,
  method: string,
  conditionKey: string,
  factRef: string,
): string {
  return `design.${targetKey}.${method}.${conditionKey}.${factRef}`;
}

export function designFactObligationDescriptors(
  contract: DesignObligationContract,
): DesignFactObligationDescriptorV1[] {
  const result: DesignFactObligationDescriptorV1[] = [];
  for (const outcome of contract.outcomes)
    for (const surface of outcome.product.surface_bindings ?? [])
      for (const target of surface.design_targets) {
        const check = outcome.acceptance.checks.find(
          (candidate) => candidate.key === target.conformance_check_ref,
        );
        if (!check) continue;
        for (const binding of target.verification_method_bindings)
          for (const artifact of binding.evidence_artifacts)
            for (const expectation of artifact.fact_expectations) {
              const descriptor = descriptorForExpectation(
                outcome.key,
                check,
                target.key,
                binding.assertion_ref,
                designGroundObligationRef(
                  target.key,
                  binding.method,
                  artifact.condition_key,
                  expectation.fact_ref,
                ),
                expectation.fact_ref,
                binding.method,
                expectation,
              );
              if (descriptor) result.push(descriptor);
            }
        for (const binding of target.symbolic_method_bindings ?? [])
          for (const expectation of binding.rule_expectations) {
            const descriptor = descriptorForExpectation(
              outcome.key,
              check,
              target.key,
              binding.assertion_ref,
              expectation.obligation_ref,
              expectation.fact_rule_ref,
              binding.method,
              expectation,
            );
            if (descriptor) result.push(descriptor);
          }
      }
  return result;
}

export function exactExternalDesignObligationRefs(
  contract: DesignObligationContract & {
    global: {
      acceptance: {
        external_confirmations: readonly ExternalConfirmationV2[];
      };
    };
  },
  outcomeKey: string,
  checkKey: string,
): Set<string> {
  const confirmations = contract.global.acceptance.external_confirmations;
  return new Set(
    designFactObligationDescriptors(contract)
      .filter(
        (descriptor) =>
          descriptor.outcome_key === outcomeKey &&
          descriptor.check_key === checkKey &&
          confirmations.some(
            (confirmation) =>
              confirmation.blocks_target &&
              confirmation.obligations?.some((obligation) =>
                externalDesignObligationMatches(obligation, descriptor),
              ),
          ),
      )
      .map((descriptor) => descriptor.source_obligation_ref),
  );
}

export function externalDesignObligationMatches(
  obligation: NonNullable<ExternalConfirmationV2["obligations"]>[number],
  descriptor: DesignFactObligationDescriptorV1,
): boolean {
  return (
    obligation.claim_ref === descriptor.claim_ref &&
    obligation.applicability_ref === descriptor.applicability_ref &&
    obligation.fact_ref === descriptor.fact_ref &&
    obligation.proof_ref === descriptor.source_obligation_ref &&
    obligation.method === descriptor.method &&
    obligation.proof_surface === descriptor.proof_surface &&
    sameSet(
      obligation.evidence_capabilities,
      descriptor.evidence_capabilities,
    ) &&
    obligation.expected_authority_ref === descriptor.expected_authority_ref &&
    obligation.result_kind === "actual" &&
    obligation.judgment_basis === undefined
  );
}

export function findDesignFactObligation(
  contract: DesignObligationContract,
  identity: {
    outcome_key: string | null;
    claim_ref: string;
    applicability_ref: string;
    fact_ref: string | null;
    proof_ref: string | null;
    method: string;
    proof_surface: ProofSurface;
    required_evidence_capabilities?: readonly EvidenceCapabilityV2[];
    evidence_capabilities?: readonly EvidenceCapabilityV2[];
  },
): DesignFactObligationDescriptorV1 | null {
  if (!identity.outcome_key || !identity.fact_ref || !identity.proof_ref)
    return null;
  const capabilities =
    identity.evidence_capabilities ??
    identity.required_evidence_capabilities ??
    [];
  const candidates = designFactObligationDescriptors(contract).filter(
    (descriptor) =>
      descriptor.source_obligation_ref === identity.proof_ref &&
      descriptor.outcome_key === identity.outcome_key &&
      descriptor.claim_ref === identity.claim_ref &&
      descriptor.applicability_ref === identity.applicability_ref &&
      descriptor.fact_ref === identity.fact_ref &&
      descriptor.method === identity.method &&
      descriptor.proof_surface === identity.proof_surface &&
      sameSet(descriptor.evidence_capabilities, capabilities),
  );
  return candidates.length === 1 ? candidates[0] : null;
}

function descriptorForExpectation(
  outcomeKey: string,
  check: Pick<
    DeliveryCheckV2,
    "key" | "proof_surface" | "positive_assertions" | "negative_assertions"
  >,
  targetKey: string,
  assertionRef: string,
  sourceObligationRef: string,
  factRef: string,
  method: string,
  expectation: Pick<
    DeliveryDesignFactExpectationV2,
    "expected" | "comparison" | "observation_sensitivity"
  >,
): DesignFactObligationDescriptorV1 | null {
  const assertion = findAssertion(check, assertionRef);
  if (
    !assertion ||
    assertion.claims.length !== 1 ||
    !assertion.applicability_ref
  )
    return null;
  const localClaimRef = assertion.claims[0];
  return {
    source_obligation_ref: sourceObligationRef,
    outcome_key: outcomeKey,
    check_key: check.key,
    target_key: targetKey,
    assertion_ref: assertionRef,
    local_claim_ref: localClaimRef,
    claim_ref: `${outcomeKey}.${localClaimRef}`,
    applicability_ref: assertion.applicability_ref,
    fact_ref: factRef,
    method,
    proof_surface: check.proof_surface,
    evidence_capabilities: [...assertion.evidence_capabilities].sort(),
    expected_authority_ref: `design-proof:${sourceObligationRef}`,
    expected: expectation.expected,
    comparison: expectation.comparison,
    observation_sensitivity: expectation.observation_sensitivity,
  };
}

function findAssertion(
  check: Pick<DeliveryCheckV2, "positive_assertions" | "negative_assertions">,
  assertionRef: string,
): DeliveryAssertionV2 | null {
  return (
    [...check.positive_assertions, ...check.negative_assertions].find(
      (assertion) => assertion.key === assertionRef,
    ) ?? null
  );
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}
