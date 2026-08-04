import type { DesignResourceSymbolicCompilationSession } from "./design-resource-symbolic-compilation.js";
import type {
  DesignResourceHandoffPreflightV2,
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceProofV2,
} from "./design-resource-symbolic-fact-types.js";
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

export function validateSymbolicNoninterferenceEquivalence(
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
  validateDomainCardinality(proof, certificate.key, exhaustive, cardinality);
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
      else
        assertSymbolicallyEquivalent(
          projection.compiled_region,
          side,
          candidate,
          certificate.key,
          ruleRef,
        );
    }
  }
}

function validateDomainCardinality(
  proof: DesignResourceSymbolicNoninterferenceProofV2,
  certificateKey: string,
  exhaustive: boolean,
  cardinality: bigint,
): void {
  if (exhaustive) {
    if (proof.complete_domain_cardinality !== cardinality.toString())
      invalid("v2_exhaustive_domain_cardinality_mismatch", certificateKey);
    if (cardinality > MAX_EXHAUSTIVE_DOMAIN_CARDINALITY)
      invalid(
        "v2_exhaustive_domain_capacity_exceeded",
        `${certificateKey}:${cardinality}`,
      );
  } else if (proof.complete_domain_cardinality !== null)
    invalid("v2_symbolic_equivalence_cardinality_forbidden", certificateKey);
}

function assertSymbolicallyEquivalent(
  rule: CompiledSymbolicDenotationV1,
  side: CompiledSymbolicDenotationV1,
  candidate: CompiledSymbolicDenotationV1,
  certificateKey: string,
  ruleRef: string,
): void {
  if (rule.canonical_sha256 !== side.canonical_sha256)
    invalid("v2_side_predicate_rule_mismatch", `${certificateKey}:${ruleRef}`);
  if (side.canonical_sha256 !== candidate.canonical_sha256)
    invalid("v2_symbolic_equivalence_mismatch", `${certificateKey}:${ruleRef}`);
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
