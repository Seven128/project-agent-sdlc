import type { DesignResourceSymbolicCompilationSession } from "./design-resource-symbolic-compilation.js";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import {
  DESIGN_RESOURCE_SYMBOLIC_NONINTERFERENCE_ORACLE_CAPABILITIES,
  type DesignResourceSymbolicNoninterferenceOracleCapability,
} from "./design-resource-fact-enums.js";
import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceProofV2,
} from "./design-resource-symbolic-fact-types.js";
import type { SymbolicManifestIndexes } from "./design-resource-symbolic-indexes.js";
import { validateStaticDependencyClosure } from "./design-resource-symbolic-static-dependency-validation.js";
import { validateSymbolicNoninterferenceArtifact } from "./design-resource-symbolic-noninterference-artifact.js";
import {
  assertSameSet,
  invalid,
  unique,
} from "./design-resource-symbolic-validation-support.js";
import { evaluateCanonicalSymbolicDenotation } from "./symbolic-denotation-engine.js";
import type {
  CompiledSymbolicDenotationV1,
  SymbolicDenotationAxisDomain,
  SymbolicDenotationScalar,
} from "./symbolic-denotation-types.js";

const MAX_EXHAUSTIVE_DOMAIN_CARDINALITY = 100_000n;

export function validateTrustedSymbolicNoninterference(
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  indexes: SymbolicManifestIndexes,
  compilation: DesignResourceSymbolicCompilationSession,
  target: DesignResourceHandoffPreflightV2["handoff"]["targets"][number],
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): void {
  if (!certificate.omitted_axis_refs.length) {
    if (
      certificate.source_noninterference_proof != null ||
      certificate.production_noninterference_proof != null
    )
      invalid("v2_noninterference_proof_without_omission", certificate.key);
    return;
  }
  const proofs = [
    ["source", certificate.source_noninterference_proof],
    ["production", certificate.production_noninterference_proof],
  ] as const;
  for (const [side, proof] of proofs) {
    if (!proof)
      invalid(
        "v2_noninterference_proof_unavailable",
        `${certificate.key}:${side}:${certificate.omitted_axis_refs.join(",")}`,
      );
    validateProof(
      side,
      proof,
      manifest,
      certificate,
      projections,
      indexes,
      compilation,
      target,
      resources,
      contents,
    );
  }
}

function validateProof(
  expectedSide: "source" | "production",
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  indexes: SymbolicManifestIndexes,
  compilation: DesignResourceSymbolicCompilationSession,
  target: DesignResourceHandoffPreflightV2["handoff"]["targets"][number],
  resources: ReadonlyMap<string, DesignResource>,
  contents: ReadonlyMap<string, Buffer>,
): void {
  if (proof.side !== expectedSide)
    invalid(
      "v2_noninterference_proof_side_mismatch",
      `${certificate.key}:${expectedSide}:${proof.side}`,
    );
  assertSameSet(
    proof.input_resource_refs,
    manifest.inspector.input_resources.map((item) => item.resource_ref),
    "v2_noninterference_input_closure_mismatch",
    `${certificate.key}:${expectedSide}`,
  );
  if (!indexes.oracles.has(proof.oracle_ref))
    invalid("v2_noninterference_oracle_unknown", proof.oracle_ref);
  const oracle = indexes.oracles.get(proof.oracle_ref)!;
  if (oracle.trust !== "frozen_executable" || oracle.sha256 === null)
    invalid("v2_noninterference_frozen_oracle_required", proof.oracle_ref);
  const requiredCapability = `symbolic_noninterference.${expectedSide}.${proof.method}`;
  if (!isNoninterferenceOracleCapability(requiredCapability))
    invalid(
      "v2_noninterference_oracle_capability_unregistered",
      requiredCapability,
    );
  if (!oracle.capability_refs.includes(requiredCapability))
    invalid(
      "v2_noninterference_oracle_capability_missing",
      `${proof.oracle_ref}:${requiredCapability}`,
    );
  if (!indexes.environments.has(proof.environment_ref))
    invalid("v2_noninterference_environment_unknown", proof.environment_ref);
  if (proof.dynamic_dependency_kinds.length)
    invalid(
      "v2_noninterference_dynamic_dependency_unproved",
      `${certificate.key}:${proof.dynamic_dependency_kinds.join(",")}`,
    );
  if (proof.external_device_refs.length)
    invalid(
      "v2_noninterference_external_device_unproved",
      `${certificate.key}:${proof.external_device_refs.join(",")}`,
    );
  unique(
    proof.input_resource_refs,
    `v2_noninterference_input_duplicate:${certificate.key}:${expectedSide}`,
  );
  unique(
    proof.dynamic_dependency_kinds,
    `v2_noninterference_dynamic_dependency_duplicate:${certificate.key}:${expectedSide}`,
  );
  unique(
    proof.external_device_refs,
    `v2_noninterference_external_device_duplicate:${certificate.key}:${expectedSide}`,
  );
  assertSameSet(
    proof.omitted_axis_refs,
    certificate.omitted_axis_refs,
    "v2_noninterference_artifact_omitted_axis_mismatch",
    `${certificate.key}:${expectedSide}`,
  );
  if (proof.method === "closed_world_static_dependency_closure") {
    validateStaticDependencyClosure(proof, certificate, projections, manifest);
  } else
    validateEquivalenceProof(
      proof,
      manifest,
      certificate,
      projections,
      compilation,
    );
  validateSymbolicNoninterferenceArtifact(
    manifest,
    certificate,
    proof,
    target,
    resources,
    contents,
  );
}

function isNoninterferenceOracleCapability(
  value: string,
): value is DesignResourceSymbolicNoninterferenceOracleCapability {
  return (
    DESIGN_RESOURCE_SYMBOLIC_NONINTERFERENCE_ORACLE_CAPABILITIES as readonly string[]
  ).includes(value);
}

function validateEquivalenceProof(
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  manifest: DesignResourceObservableRuleManifestV2,
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2,
  projections: DesignResourceHandoffPreflightV2["rule_projections"],
  compilation: DesignResourceSymbolicCompilationSession,
): void {
  if (proof.static_dependency_nodes.length || proof.static_rule_roots.length)
    invalid("v2_equivalence_static_graph_forbidden", certificate.key);
  const caseRuleRefs = proof.equivalence_cases.flatMap(
    (item) => item.fact_rule_refs,
  );
  unique(caseRuleRefs, `v2_equivalence_rule_ref_duplicate:${certificate.key}`);
  assertSameSet(
    caseRuleRefs,
    certificate.fact_rule_refs,
    "v2_equivalence_rule_set_mismatch",
    certificate.key,
  );
  const projectionByRule = new Map(
    projections.map((projection) => [projection.rule.key, projection]),
  );
  const exhaustive =
    proof.method === "finite_complete_domain_exhaustive_equivalence";
  const cardinality = BigInt(
    projections[0].compiled_region.theoretical_ground_cardinality,
  );
  if (exhaustive) {
    if (proof.complete_domain_cardinality !== cardinality.toString())
      invalid("v2_exhaustive_domain_cardinality_mismatch", certificate.key);
    if (cardinality > MAX_EXHAUSTIVE_DOMAIN_CARDINALITY)
      invalid(
        "v2_exhaustive_domain_capacity_exceeded",
        `${certificate.key}:${cardinality}`,
      );
  } else if (proof.complete_domain_cardinality !== null)
    invalid("v2_symbolic_equivalence_cardinality_forbidden", certificate.key);
  for (const proofCase of proof.equivalence_cases) {
    if (!proofCase.fact_rule_refs.length)
      invalid("v2_equivalence_case_rules_required", certificate.key);
    const side = compilation.compile(proofCase.side_predicate);
    const candidate = compilation.compile(proofCase.axis_erased_predicate);
    for (const axisRef of certificate.omitted_axis_refs)
      if (!candidate.omitted_axis_refs.includes(axisRef))
        invalid(
          "v2_equivalence_candidate_axis_not_erased",
          `${certificate.key}:${axisRef}`,
        );
    for (const ruleRef of proofCase.fact_rule_refs) {
      const projection = projectionByRule.get(ruleRef);
      if (!projection)
        invalid("v2_equivalence_rule_unknown", `${certificate.key}:${ruleRef}`);
      if (exhaustive)
        assertExhaustivelyEquivalentChain(
          manifest.axis_domains,
          projection.compiled_region,
          side,
          candidate,
          `${certificate.key}:${ruleRef}`,
        );
      else {
        if (
          projection.compiled_region.canonical_sha256 !== side.canonical_sha256
        )
          invalid(
            "v2_side_predicate_rule_mismatch",
            `${certificate.key}:${ruleRef}`,
          );
        if (side.canonical_sha256 !== candidate.canonical_sha256)
          invalid(
            "v2_symbolic_equivalence_mismatch",
            `${certificate.key}:${ruleRef}`,
          );
      }
    }
  }
}

function assertExhaustivelyEquivalentChain(
  domains: SymbolicDenotationAxisDomain[],
  rule: CompiledSymbolicDenotationV1,
  side: CompiledSymbolicDenotationV1,
  erased: CompiledSymbolicDenotationV1,
  label: string,
): void {
  forEachAssignment(domains, 0, {}, (assignment) => {
    if (
      evaluateCanonicalSymbolicDenotation(rule.canonical_dag, assignment) !==
        evaluateCanonicalSymbolicDenotation(side.canonical_dag, assignment) ||
      evaluateCanonicalSymbolicDenotation(side.canonical_dag, assignment) !==
        evaluateCanonicalSymbolicDenotation(erased.canonical_dag, assignment)
    )
      invalid("v2_exhaustive_equivalence_mismatch", label);
  });
}

function forEachAssignment(
  domains: SymbolicDenotationAxisDomain[],
  index: number,
  assignment: Record<string, SymbolicDenotationScalar>,
  visit: (assignment: Record<string, SymbolicDenotationScalar>) => void,
): void {
  if (index === domains.length) {
    visit(assignment);
    return;
  }
  const domain = domains[index];
  if (domain.kind === "enum") {
    for (const value of domain.values) {
      assignment[domain.key] = value;
      forEachAssignment(domains, index + 1, assignment, visit);
    }
  } else {
    for (let value = domain.minimum; value <= domain.maximum; value += 1) {
      assignment[domain.key] = value;
      forEachAssignment(domains, index + 1, assignment, visit);
    }
  }
  delete assignment[domain.key];
}
