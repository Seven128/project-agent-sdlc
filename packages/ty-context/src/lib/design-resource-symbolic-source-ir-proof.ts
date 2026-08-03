import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceProofMethodV2,
} from "./design-resource-symbolic-fact-types.js";
import { compareText } from "./design-resource-symbolic-validation-support.js";
import {
  derivedSourceResult,
  emptyDerivedSourceResult,
  failedSourceEvidence,
  sameStringSet,
  sourceCaseWitness,
  sourceNoninterferenceWitness,
  type DerivedCurrentSourceNoninterferenceEvidenceV2,
} from "./design-resource-symbolic-source-ir-evidence.js";
import { evaluateCompleteSymbolicSourceDomain } from "./design-resource-symbolic-source-ir-evaluation.js";
import type { DesignResourceSymbolicSourceIrCertificateScopeV1 } from "./design-resource-symbolic-source-ir-types.js";
import { createSymbolicDenotationCompilationSession } from "./symbolic-denotation-engine.js";
import type { CompiledSymbolicDenotationV1 } from "./symbolic-denotation-types.js";

export function deriveCurrentSourceScopeEvidence({
  manifest,
  certificate,
  method,
  resource,
  source,
  sourceResourceRef,
  scope,
  certificateScopeSha256,
}: {
  manifest: DesignResourceObservableRuleManifestV2;
  certificate: DesignResourceSymbolicNoninterferenceCertificateV2;
  method: DesignResourceSymbolicNoninterferenceProofMethodV2;
  resource: DesignResource;
  source: string;
  sourceResourceRef: string;
  scope: DesignResourceSymbolicSourceIrCertificateScopeV1;
  certificateScopeSha256: string;
}): DerivedCurrentSourceNoninterferenceEvidenceV2 {
  const ruleIndex = new Map(
    manifest.fact_rules.map((rule) => [rule.key, rule]),
  );
  const rules = certificate.fact_rule_refs.map((ruleRef) => {
    const rule = ruleIndex.get(ruleRef);
    if (!rule) throw new Error(`certificate_rule_unknown:${ruleRef}`);
    return rule;
  });
  const compilation = createSymbolicDenotationCompilationSession(
    manifest.axis_domains,
    [
      ...rules.map((rule) => rule.region),
      ...scope.regions.map((row) => row.predicate),
    ],
  );
  const rulesByRegion = new Map<
    string,
    { factRuleRefs: string[]; compiled: CompiledSymbolicDenotationV1 }
  >();
  for (const rule of rules) {
    const compiled = compilation.compile(rule.region);
    const current = rulesByRegion.get(compiled.canonical_sha256) ?? {
      factRuleRefs: [],
      compiled,
    };
    current.factRuleRefs.push(rule.key);
    rulesByRegion.set(compiled.canonical_sha256, current);
  }
  const declaredRegionRefs = scope.regions.map((row) => row.rule_region_sha256);
  if (new Set(declaredRegionRefs).size !== declaredRegionRefs.length)
    throw new Error("symbolic_source_ir_region_duplicate");
  if (!sameStringSet(declaredRegionRefs, [...rulesByRegion.keys()]))
    return failedSourceEvidence(
      emptyDerivedSourceResult(method, sourceResourceRef),
      sourceNoninterferenceWitness({
        certificateScopeSha256,
        resource,
        locator: "/certificate_scopes/*/regions",
        detail: `source_rule_region_set_mismatch:${declaredRegionRefs.join(",")}:${[
          ...rulesByRegion.keys(),
        ].join(",")}`,
        kind: "source_rule_denotation_mismatch",
      }),
    );
  const cases = scope.regions.map((region, index) => {
    const expected = rulesByRegion.get(region.rule_region_sha256)!;
    return {
      index,
      region,
      compiledSource: compilation.compile(region.predicate),
      compiledRule: expected.compiled,
      factRuleRefs: [...expected.factRuleRefs].sort(compareText),
    };
  });
  const derived = derivedSourceResult(
    method,
    sourceResourceRef,
    cases,
    manifest,
  );
  if (method !== "finite_complete_domain_exhaustive_equivalence") {
    for (const proofCase of cases) {
      const omittedAxisRef = proofCase.compiledSource.referenced_axis_refs.find(
        (axisRef) => certificate.omitted_axis_refs.includes(axisRef),
      );
      if (omittedAxisRef)
        return failedSourceEvidence(
          derived,
          sourceCaseWitness({
            certificateScopeSha256,
            resource,
            source,
            proofCase,
            axisRef: omittedAxisRef,
            kind: "omitted_axis_dependency",
            detail: "current Source expression branches on an omitted axis",
          }),
        );
      if (
        proofCase.compiledSource.canonical_sha256 !==
        proofCase.compiledRule.canonical_sha256
      )
        return failedSourceEvidence(
          derived,
          sourceCaseWitness({
            certificateScopeSha256,
            resource,
            source,
            proofCase,
            kind: "source_rule_denotation_mismatch",
            detail:
              "current Source predicate differs from the current Rule region",
          }),
        );
    }
    return { derived_result: derived, failure_witness: null };
  }
  const exhaustive = evaluateCompleteSymbolicSourceDomain(
    manifest.axis_domains,
    certificate.omitted_axis_refs,
    cases.map((proofCase) => ({
      fact_rule_refs: proofCase.factRuleRefs,
      source: proofCase.compiledSource,
      rule: proofCase.compiledRule,
    })),
  );
  derived.complete_domain_cardinality = exhaustive.cardinality;
  derived.exhaustive_evaluation_sha256 = exhaustive.evaluation_sha256;
  if (exhaustive.counterexample) {
    const proofCase = cases.find((item) =>
      item.factRuleRefs.includes(exhaustive.counterexample!.fact_rule_ref),
    )!;
    return failedSourceEvidence(
      derived,
      sourceCaseWitness({
        certificateScopeSha256,
        resource,
        source,
        proofCase,
        kind: exhaustive.counterexample.kind,
        axisRef: exhaustive.counterexample.axis_ref,
        assignment: exhaustive.counterexample.assignment,
        detail: exhaustive.counterexample.detail,
      }),
    );
  }
  return { derived_result: derived, failure_witness: null };
}
