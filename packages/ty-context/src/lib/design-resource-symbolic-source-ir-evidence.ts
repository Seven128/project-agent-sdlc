import { Buffer } from "node:buffer";
import type { DesignResource } from "./design-resource-handoff-file-primitives.js";
import type {
  DesignResourceObservableRuleManifestV2,
  DesignResourceSymbolicNoninterferenceDerivedResultV2,
  DesignResourceSymbolicNoninterferenceFailureWitnessV1,
  DesignResourceSymbolicNoninterferenceProofMethodV2,
} from "./design-resource-symbolic-fact-types.js";
import {
  compareText,
  stableJson,
} from "./design-resource-symbolic-validation-support.js";
import type {
  CompiledSymbolicDenotationV1,
  SymbolicDenotationPredicate,
} from "./symbolic-denotation-types.js";

export interface DerivedCurrentSourceNoninterferenceEvidenceV2 {
  derived_result: DesignResourceSymbolicNoninterferenceDerivedResultV2;
  failure_witness: DesignResourceSymbolicNoninterferenceFailureWitnessV1 | null;
}

export interface DerivedSourceCase {
  index: number;
  region: {
    rule_region_sha256: string;
    predicate: SymbolicDenotationPredicate;
  };
  compiledSource: CompiledSymbolicDenotationV1;
  compiledRule: CompiledSymbolicDenotationV1;
  factRuleRefs: string[];
}

export function derivedSourceResult(
  method: DesignResourceSymbolicNoninterferenceProofMethodV2,
  sourceResourceRef: string,
  cases: DerivedSourceCase[],
  manifest: DesignResourceObservableRuleManifestV2,
): DesignResourceSymbolicNoninterferenceDerivedResultV2 {
  const result = emptyDerivedSourceResult(method, sourceResourceRef);
  if (method === "closed_world_static_dependency_closure") {
    const inputNodeRef = "source.input.complete";
    result.static_dependency_nodes = [
      {
        key: inputNodeRef,
        axis_refs: [],
        dependency_refs: [],
        input_resource_refs: manifest.inspector.input_resources
          .map((input) => input.resource_ref)
          .sort(compareText),
      },
      ...cases.map((proofCase) => ({
        key: `source.region.${proofCase.region.rule_region_sha256}`,
        axis_refs: [...proofCase.compiledSource.referenced_axis_refs].sort(
          compareText,
        ),
        dependency_refs: [inputNodeRef],
        input_resource_refs: [],
      })),
    ];
    result.static_rule_roots = cases.map((proofCase) => ({
      fact_rule_refs: [...proofCase.factRuleRefs],
      node_ref: `source.region.${proofCase.region.rule_region_sha256}`,
    }));
    return result;
  }
  result.equivalence_cases = cases.map((proofCase) => ({
    fact_rule_refs: [...proofCase.factRuleRefs],
    side_predicate: structuredClone(proofCase.region.predicate),
    axis_erased_predicate: structuredClone(proofCase.region.predicate),
  }));
  return result;
}

export function emptyDerivedSourceResult(
  method: DesignResourceSymbolicNoninterferenceProofMethodV2,
  sourceResourceRef: string | null = null,
): DesignResourceSymbolicNoninterferenceDerivedResultV2 {
  return {
    source_ir_resource_ref: sourceResourceRef,
    static_dependency_nodes: [],
    static_rule_roots: [],
    equivalence_cases: [],
    complete_domain_cardinality:
      method === "finite_complete_domain_exhaustive_equivalence" ? "0" : null,
    exhaustive_evaluation_sha256: null,
  };
}

export function sourceCaseWitness({
  certificateScopeSha256,
  resource,
  source,
  proofCase,
  kind,
  axisRef = null,
  assignment = null,
  detail,
}: {
  certificateScopeSha256: string;
  resource: DesignResource;
  source: string;
  proofCase: DerivedSourceCase;
  kind: DesignResourceSymbolicNoninterferenceFailureWitnessV1["kind"];
  axisRef?: string | null;
  assignment?: DesignResourceSymbolicNoninterferenceFailureWitnessV1["assignment"];
  detail: string;
}): DesignResourceSymbolicNoninterferenceFailureWitnessV1 {
  const locator = `/certificate_scopes/*/regions/${proofCase.index}/predicate`;
  const needle = axisRef ?? proofCase.region.rule_region_sha256;
  const offset = source.indexOf(needle);
  return sourceNoninterferenceWitness({
    certificateScopeSha256,
    kind,
    axisRef,
    factRuleRef: proofCase.factRuleRefs[0] ?? null,
    resource,
    locator,
    nodeRef: `source.region.${proofCase.region.rule_region_sha256}`,
    byteOffset:
      offset < 0 ? null : Buffer.byteLength(source.slice(0, offset), "utf8"),
    assignment,
    detail,
  });
}

export function sourceNoninterferenceWitness({
  certificateScopeSha256,
  kind = "unsupported_dependency",
  axisRef = null,
  factRuleRef = null,
  resource,
  locator = null,
  nodeRef = null,
  byteOffset = null,
  assignment = null,
  detail,
}: {
  certificateScopeSha256: string;
  kind?: DesignResourceSymbolicNoninterferenceFailureWitnessV1["kind"];
  axisRef?: string | null;
  factRuleRef?: string | null;
  resource?: DesignResource;
  locator?: string | null;
  nodeRef?: string | null;
  byteOffset?: number | null;
  assignment?: DesignResourceSymbolicNoninterferenceFailureWitnessV1["assignment"];
  detail: string;
}): DesignResourceSymbolicNoninterferenceFailureWitnessV1 {
  return {
    kind,
    side: "source",
    certificate_scope_sha256: certificateScopeSha256,
    axis_ref: axisRef,
    fact_rule_ref: factRuleRef,
    resource_ref: resource?.key ?? null,
    path: resource?.path ?? null,
    locator,
    node_ref: nodeRef,
    byte_offset: byteOffset,
    assignment,
    detail,
  };
}

export function failedSourceEvidence(
  derivedResult: DesignResourceSymbolicNoninterferenceDerivedResultV2,
  failureWitness: DesignResourceSymbolicNoninterferenceFailureWitnessV1,
): DerivedCurrentSourceNoninterferenceEvidenceV2 {
  return { derived_result: derivedResult, failure_witness: failureWitness };
}

export function sameStringSet(left: string[], right: string[]): boolean {
  return (
    stableJson([...new Set(left)].sort(compareText)) ===
    stableJson([...new Set(right)].sort(compareText))
  );
}

export function sourceOracleErrorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
