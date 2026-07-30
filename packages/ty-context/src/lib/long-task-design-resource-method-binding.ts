import type {
  DesignResourceHandoffPreflightV1,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type {
  ContractDesignTarget,
  IndexedHandoffTarget,
} from "./long-task-design-resource-handoff.js";

export function validateTargetIdentity(
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): void {
  const { target } = contractTarget;
  const handoffTarget = indexed.target;
  if (target.interpretation !== handoffTarget.interpretation)
    invalid(
      "target_interpretation_mismatch",
      `${target.key}:${target.interpretation}:${handoffTarget.interpretation}`,
    );
  assertSameSet(
    target.condition_keys,
    handoffTarget.condition_refs,
    "target_conditions_mismatch",
    target.key,
  );
  const resourcePaths = handoffTarget.resource_refs.map(
    (ref) =>
      indexed.preflight.handoff.resources.find((item) => item.key === ref)!
        .path,
  );
  assertSameSet(
    target.source_paths,
    [indexed.preflight.handoff_path, ...resourcePaths],
    "target_source_paths_mismatch",
    target.key,
  );
}

export function designSourceItemClaims(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
  sourceItemRef: string,
  claims = new Map(contract.source_claims.map((item) => [item.key, item])),
): string[] {
  const claim = claims.get(sourceItemRef);
  if (!claim)
    invalid(
      "coverage_source_claim_unknown",
      `${contractTarget.target.key}:${sourceItemRef}`,
    );
  if (claim.source_ref.split("#")[0] !== indexed.preflight.handoff_path)
    invalid(
      "coverage_source_claim_file_mismatch",
      `${contractTarget.target.key}:${sourceItemRef}`,
    );
  if (claim.disposition.type !== "claim")
    invalid(
      "coverage_source_claim_disposition_required",
      `${contractTarget.target.key}:${sourceItemRef}:${claim.disposition.type}`,
    );
  const prefix = `${contractTarget.outcome_key}.`;
  return claim.disposition.refs.map((claimRef) => {
    if (!claimRef.startsWith(prefix))
      invalid(
        "coverage_claim_outcome_mismatch",
        `${contractTarget.target.key}:${sourceItemRef}:${claimRef}`,
      );
    return claimRef.slice(prefix.length);
  });
}

export function validateVerificationMethodBindings(
  target: ContractDesignTarget["target"],
  check: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  facts: DesignResourceHandoffPreflightV1["handoff"]["facts"],
  proofs: DesignResourceHandoffPreflightV1["handoff"]["proof_obligations"],
  indexed: IndexedHandoffTarget,
  claimsBySourceItem: Map<string, string[]>,
): void {
  const expectedMethods = new Set(proofs.map((proof) => proof.method));
  const bindings = target.verification_method_bindings;
  assertSameSet(
    bindings.map((item) => item.method),
    [...expectedMethods],
    "verification_methods_mismatch",
    target.key,
  );
  const assertionRefs = bindings.map((item) => item.assertion_ref);
  if (new Set(assertionRefs).size !== assertionRefs.length)
    invalid("verification_method_assertion_duplicate", target.key);
  if (assertionRefs.includes(target.conformance_assertion_ref))
    invalid("verification_method_assertion_must_be_independent", target.key);
  const boundFactRefs: string[] = [];
  for (const binding of bindings) {
    const assertion = check.positive_assertions.find(
      (item) => item.key === binding.assertion_ref,
    );
    if (!assertion)
      invalid(
        "verification_method_assertion_unknown",
        `${target.key}:${binding.method}:${binding.assertion_ref}`,
      );
    const sourceItems = new Set(
      facts
        .filter((fact) =>
          proofs.some(
            (proof) =>
              proof.fact_ref === fact.key && proof.method === binding.method,
          ),
        )
        .flatMap((fact) => fact.source_item_refs),
    );
    for (const sourceItemRef of sourceItems)
      for (const claimRef of claimsBySourceItem.get(sourceItemRef) ?? [])
        if (!assertion.claims.includes(claimRef))
          invalid(
            "verification_method_claim_not_asserted",
            `${target.key}:${binding.method}:${sourceItemRef}:${claimRef}`,
          );
    for (const capability of requiredCapabilities(binding.method))
      if (!assertion.evidence_capabilities.includes(capability))
        invalid(
          "verification_method_capability_required",
          `${target.key}:${binding.method}:${capability}`,
        );
    assertSameSet(
      binding.evidence_artifacts.map((item) => item.condition_key),
      target.condition_keys,
      "verification_method_evidence_conditions_mismatch",
      `${target.key}:${binding.method}`,
    );
    for (const artifact of binding.evidence_artifacts) {
      const expectedFactRefs = facts
        .filter(
          (fact) =>
            proofs.some(
              (proof) =>
                proof.fact_ref === fact.key && proof.method === binding.method,
            ) && fact.condition_ref === artifact.condition_key,
        )
        .map((fact) => fact.key);
      assertSameSet(
        artifact.fact_refs,
        expectedFactRefs,
        "design_method_fact_refs_mismatch",
        `${target.key}:${binding.method}:${artifact.condition_key}`,
      );
      const expectedFactExpectations = proofs
        .filter(
          (proof) =>
            proof.method === binding.method &&
            facts.some(
              (fact) =>
                fact.key === proof.fact_ref &&
                fact.condition_ref === artifact.condition_key,
            ),
        )
        .map((proof) =>
          designFactExpectation(indexed, proof.fact_ref, proof.key),
        );
      assertSameSet(
        artifact.fact_expectations.map((item) => item.fact_ref),
        expectedFactRefs,
        "design_method_fact_expectation_refs_mismatch",
        `${target.key}:${binding.method}:${artifact.condition_key}`,
      );
      assertCanonicalRows(
        artifact.fact_expectations,
        expectedFactExpectations,
        "design_method_fact_expectations_mismatch",
        `${target.key}:${binding.method}:${artifact.condition_key}`,
      );
      boundFactRefs.push(...artifact.fact_refs);
    }
  }
  assertSameSet(
    boundFactRefs,
    facts.map((fact) => fact.key),
    "design_method_fact_refs_mismatch",
    target.key,
  );
}

function designFactExpectation(
  indexed: IndexedHandoffTarget,
  factRef: string,
  proofRef: string,
) {
  const handoff = indexed.preflight.handoff;
  const fact = handoff.facts.find((item) => item.key === factRef)!;
  const proof = handoff.proof_obligations.find(
    (item) => item.key === proofRef,
  )!;
  const oracle = handoff.oracles.find((item) => item.key === proof.oracle_ref)!;
  const environment = handoff.environments.find(
    (item) => item.key === proof.environment_ref,
  )!;
  return {
    fact_ref: fact.key,
    subject_ref: fact.subject_ref,
    variation_ref: fact.variation_ref,
    property_ref: fact.property_ref,
    observation_sensitivity: fact.observation_sensitivity,
    expected: fact.value,
    comparison: proof.comparison,
    oracle: {
      key: oracle.key,
      trust: oracle.trust,
      identity: oracle.identity,
      version: oracle.version,
      sha256: oracle.sha256,
    },
    environment: {
      key: environment.key,
      identity: environment.identity,
      definition: environment.definition,
    },
  };
}

function assertCanonicalRows(
  actual: Array<{ fact_ref: string }>,
  expected: Array<{ fact_ref: string }>,
  code: string,
  detail: string,
): void {
  const left = new Map(
    actual.map((item) => [item.fact_ref, canonicalJson(item)]),
  );
  const right = new Map(
    expected.map((item) => [item.fact_ref, canonicalJson(item)]),
  );
  assertSameSet([...left.keys()], [...right.keys()], code, detail);
  for (const [key, value] of right)
    if (left.get(key) !== value) invalid(code, `${detail}:${key}`);
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

function requiredCapabilities(
  method: DesignResourceVerificationMethod,
): Array<
  | "design_method"
  | "design_conformance"
  | "interaction_trace"
  | "target_runtime"
> {
  if (method === "interaction_trace")
    return ["design_method", "interaction_trace", "target_runtime"];
  if (method === "component_state")
    return [
      "design_method",
      "design_conformance",
      "interaction_trace",
      "target_runtime",
    ];
  return ["design_method", "design_conformance", "target_runtime"];
}

export function assertSameSet(
  actual: string[],
  expected: string[],
  code: string,
  detail: string,
): void {
  const left = [...new Set(actual)].sort();
  const right = [...new Set(expected)].sort();
  if (
    left.length !== right.length ||
    left.some((item, index) => item !== right[index])
  )
    invalid(code, `${detail}:${left.join(",")}:${right.join(",")}`);
}

export function invalid(code: string, detail: string): never {
  throw new Error(
    `delivery_contract_invalid:design_resource_${code}:${detail}`,
  );
}
