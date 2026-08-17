import type {
  DesignResourceHandoffPreflightV1,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";
import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceSymbolicHandoffTargetV2,
} from "./design-resource-symbolic-fact-types.js";
import { designResourceSymbolicNoninterferenceProofDigest } from "./design-resource-symbolic-validation-support.js";
import type { DeliveryContractV2 } from "./long-task-delivery-types.js";
import type {
  ContractDesignTarget,
  IndexedHandoffTarget,
} from "./long-task-design-resource-handoff.js";
import { matchesRepoPattern } from "./long-task-paths.js";

export function validateTargetIdentity(
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget,
): void {
  const { target } = contractTarget;
  if (target.fact_model !== undefined)
    invalid("v1_target_fact_model_must_be_absent", target.key);
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

export interface IndexedSymbolicHandoffTarget {
  preflight: DesignResourceHandoffPreflightV2;
  target: DesignResourceSymbolicHandoffTargetV2;
}

export function validateSymbolicTargetIdentity(
  contractTarget: ContractDesignTarget,
  indexed: IndexedSymbolicHandoffTarget,
): void {
  const { target } = contractTarget;
  const handoffTarget = indexed.target;
  if (target.fact_model !== "symbolic_rules_v2")
    invalid("v2_target_fact_model_required", target.key);
  if (target.interpretation !== handoffTarget.interpretation)
    invalid(
      "target_interpretation_mismatch",
      `${target.key}:${target.interpretation}:${handoffTarget.interpretation}`,
    );
  if (target.condition_keys.length)
    invalid("v2_ground_condition_keys_forbidden", target.key);
  if (target.verification_method_bindings.length)
    invalid("v2_ground_method_bindings_forbidden", target.key);
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

export function validateSymbolicVerificationMethodBindings(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedSymbolicHandoffTarget,
  claimsBySourceItem: Map<string, string[]>,
): void {
  const target = contractTarget.target;
  const preflight = indexed.preflight;
  const check = contract.outcomes
    .find((item) => item.key === contractTarget.outcome_key)!
    .acceptance.checks.find(
      (item) => item.key === target.conformance_check_ref,
    )!;
  const bindings = target.symbolic_method_bindings ?? [];
  const expectedMethods = [
    ...new Set(
      preflight.manifest.semantic_proof_obligations.map((item) => item.method),
    ),
  ];
  assertSameSet(
    bindings.map((item) => item.method),
    expectedMethods,
    "v2_verification_methods_mismatch",
    target.key,
  );
  const assertionRefs = bindings.map((item) => item.assertion_ref);
  if (new Set(assertionRefs).size !== assertionRefs.length)
    invalid("v2_verification_method_assertion_duplicate", target.key);
  if (assertionRefs.includes(target.conformance_assertion_ref))
    invalid("v2_verification_method_assertion_must_be_independent", target.key);
  const boundObligationRefs: string[] = [];
  const artifactPaths = new Set<string>();
  for (const binding of bindings) {
    const assertion = check.positive_assertions.find(
      (item) => item.key === binding.assertion_ref,
    );
    if (!assertion)
      invalid(
        "v2_verification_method_assertion_unknown",
        `${target.key}:${binding.method}:${binding.assertion_ref}`,
      );
    const assertedClaims = claimsAssertedByRootOrMethod(
      target,
      check,
      assertion.claims,
    );
    for (const capability of requiredCapabilities(binding.method))
      if (!assertion.evidence_capabilities.includes(capability))
        invalid(
          "v2_verification_method_capability_required",
          `${target.key}:${binding.method}:${capability}`,
        );
    const expected = preflight.manifest.semantic_proof_obligations
      .filter((obligation) => obligation.method === binding.method)
      .map((obligation) => symbolicRuleExpectation(preflight, obligation.key));
    assertCanonicalRowsByKey(
      binding.rule_expectations,
      expected,
      "obligation_ref",
      "v2_rule_expectations_mismatch",
      `${target.key}:${binding.method}`,
    );
    for (const expectation of expected) {
      const rule = preflight.manifest.fact_rules.find(
        (item) => item.key === expectation.fact_rule_ref,
      )!;
      for (const sourceItemRef of rule.source_item_refs)
        for (const claimRef of claimsBySourceItem.get(sourceItemRef) ?? [])
          if (!assertedClaims.has(claimRef))
            invalid(
              "v2_verification_method_claim_not_asserted",
              `${target.key}:${binding.method}:${sourceItemRef}:${claimRef}`,
            );
      boundObligationRefs.push(expectation.obligation_ref);
    }
    for (const artifactPath of [
      binding.artifact_path,
      binding.observation_path,
    ]) {
      if (artifactPaths.has(artifactPath))
        invalid("v2_evidence_artifact_reused", `${target.key}:${artifactPath}`);
      artifactPaths.add(artifactPath);
      if (
        !check.artifact_globs.some((pattern) =>
          matchesRepoPattern(artifactPath, pattern),
        )
      )
        invalid("v2_evidence_artifact_glob_missing", artifactPath);
    }
  }
  assertSameSet(
    boundObligationRefs,
    preflight.manifest.semantic_proof_obligations.map((item) => item.key),
    "v2_semantic_obligation_binding_mismatch",
    target.key,
  );
  validateSymbolicCertificateBinding(
    target,
    preflight,
    check,
    assertionRefs,
    artifactPaths,
  );
}

function validateSymbolicCertificateBinding(
  target: ContractDesignTarget["target"],
  preflight: DesignResourceHandoffPreflightV2,
  check: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  assertionRefs: string[],
  artifactPaths: Set<string>,
): void {
  const certificateBinding = target.symbolic_certificate_binding;
  if (!certificateBinding)
    invalid("v2_certificate_binding_required", target.key);
  const certificateAssertion = check.positive_assertions.find(
    (item) => item.key === certificateBinding.assertion_ref,
  );
  if (!certificateAssertion)
    invalid(
      "v2_certificate_assertion_unknown",
      `${target.key}:${certificateBinding.assertion_ref}`,
    );
  if (
    certificateBinding.assertion_ref === target.conformance_assertion_ref ||
    assertionRefs.includes(certificateBinding.assertion_ref)
  )
    invalid("v2_certificate_assertion_must_be_independent", target.key);
  if (
    !certificateAssertion.evidence_capabilities.includes(
      "design_symbolic_certificate",
    )
  )
    invalid(
      "v2_certificate_capability_required",
      `${target.key}:${certificateBinding.assertion_ref}`,
    );
  const expectedCertificates =
    preflight.manifest.noninterference_certificates.map((certificate) => {
      const sourceProofDigest =
        designResourceSymbolicNoninterferenceProofDigest(
          certificate.source_noninterference_proof,
        );
      const productionProofDigest =
        designResourceSymbolicNoninterferenceProofDigest(
          certificate.production_noninterference_proof,
        );
      return {
        certificate_ref: certificate.key,
        fact_rule_refs: [...certificate.fact_rule_refs],
        omitted_axis_refs: [...certificate.omitted_axis_refs],
        dependency_edge_refs: [...certificate.dependency_edge_refs],
        canonical_rule_dag_sha256: certificate.canonical_rule_dag_sha256,
        ...(sourceProofDigest
          ? { source_noninterference_proof_sha256: sourceProofDigest }
          : {}),
        ...(productionProofDigest
          ? { production_noninterference_proof_sha256: productionProofDigest }
          : {}),
      };
    });
  assertCanonicalRowsByKey(
    certificateBinding.expectations,
    expectedCertificates,
    "certificate_ref",
    "v2_certificate_expectations_mismatch",
    target.key,
  );
  if (
    canonicalJson(certificateBinding.metrics) !==
    canonicalJson(preflight.metrics)
  )
    invalid("v2_certificate_metrics_mismatch", target.key);
  if (
    !check.artifact_globs.some((pattern) =>
      matchesRepoPattern(certificateBinding.artifact_path, pattern),
    )
  )
    invalid(
      "v2_certificate_artifact_glob_missing",
      certificateBinding.artifact_path,
    );
  if (artifactPaths.has(certificateBinding.artifact_path))
    invalid(
      "v2_certificate_artifact_reused",
      `${target.key}:${certificateBinding.artifact_path}`,
    );
}

export function designSourceItemClaims(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  indexed: IndexedHandoffTarget | IndexedSymbolicHandoffTarget,
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
    const assertedClaims = claimsAssertedByRootOrMethod(
      target,
      check,
      assertion.claims,
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
        if (!assertedClaims.has(claimRef))
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

function claimsAssertedByRootOrMethod(
  target: ContractDesignTarget["target"],
  check: DeliveryContractV2["outcomes"][number]["acceptance"]["checks"][number],
  methodClaims: string[],
): Set<string> {
  const rootAssertion = check.positive_assertions.find(
    (item) => item.key === target.conformance_assertion_ref,
  );
  return new Set([...(rootAssertion?.claims ?? []), ...methodClaims]);
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

function symbolicRuleExpectation(
  preflight: DesignResourceHandoffPreflightV2,
  obligationRef: string,
) {
  const obligation = preflight.manifest.semantic_proof_obligations.find(
    (item) => item.key === obligationRef,
  )!;
  const rule = preflight.manifest.fact_rules.find(
    (item) => item.key === obligation.fact_rule_ref,
  )!;
  const oracle = preflight.manifest.oracles.find(
    (item) => item.key === obligation.oracle_ref,
  )!;
  const environment = preflight.manifest.environments.find(
    (item) => item.key === obligation.environment_ref,
  )!;
  return {
    obligation_ref: obligation.key,
    fact_rule_ref: rule.key,
    region_sha256: obligation.region_sha256,
    subject_or_relation_ref: rule.subject_or_relation_ref,
    property_ref: rule.property_ref,
    population_ref: rule.population_ref,
    quantifier: structuredClone(rule.quantifier),
    observation_sensitivity: rule.observation_sensitivity,
    expected: structuredClone(rule.expected),
    proof_surface: obligation.proof_surface,
    observation_boundary: obligation.observation_boundary,
    comparison: structuredClone(obligation.comparison),
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
      definition: structuredClone(environment.definition),
    },
    protected_value_policy: obligation.protected_value_policy,
    completion_effect: obligation.completion_effect,
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

function assertCanonicalRowsByKey<T extends Record<string, unknown>>(
  actual: T[],
  expected: T[],
  keyName: keyof T,
  code: string,
  detail: string,
): void {
  const left = new Map(
    actual.map((item) => [String(item[keyName]), canonicalJson(item)]),
  );
  const right = new Map(
    expected.map((item) => [String(item[keyName]), canonicalJson(item)]),
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
