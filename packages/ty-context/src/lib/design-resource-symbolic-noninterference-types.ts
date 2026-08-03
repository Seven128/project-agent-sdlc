import type { SymbolicDenotationPredicate } from "./symbolic-denotation-types.js";

export interface DesignResourceSymbolicNoninterferenceCertificateV2 {
  key: string;
  fact_rule_refs: string[];
  omitted_axis_refs: string[];
  dependency_edge_refs: string[];
  canonical_rule_dag_sha256: string;
  source_noninterference_proof?: DesignResourceSymbolicNoninterferenceProofV2 | null;
  production_noninterference_proof?: DesignResourceSymbolicNoninterferenceProofV2 | null;
}

export type DesignResourceSymbolicNoninterferenceProofMethodV2 =
  | "closed_world_static_dependency_closure"
  | "restricted_ir_symbolic_equivalence"
  | "finite_complete_domain_exhaustive_equivalence";

export interface DesignResourceSymbolicNoninterferenceEquivalenceCaseV2 {
  fact_rule_refs: string[];
  side_predicate: SymbolicDenotationPredicate;
  axis_erased_predicate: SymbolicDenotationPredicate;
}

export interface DesignResourceSymbolicStaticDependencyNodeV2 {
  key: string;
  axis_refs: string[];
  dependency_refs: string[];
  input_resource_refs: string[];
}

export interface DesignResourceSymbolicStaticDependencyRootV2 {
  fact_rule_refs: string[] | null;
  node_ref: string;
}

export interface DesignResourceSymbolicNoninterferenceFailureWitnessV1 {
  kind: "omitted_axis_dependency" | "unsupported_dependency";
  axis_ref: string | null;
  resource_ref: string | null;
  path: string | null;
  byte_offset: number | null;
  detail: string;
}

export interface DesignResourceSymbolicNoninterferenceArtifactV1 {
  schema_version: "design-resource-symbolic-noninterference-artifact-v1";
  side: "source" | "production";
  method: DesignResourceSymbolicNoninterferenceProofMethodV2;
  oracle_identity: string;
  oracle_version: string;
  oracle_implementation_sha256: string;
  environment_sha256: string;
  input_snapshot_sha256: string;
  target_snapshot_sha256: string;
  omitted_axis_refs: string[];
  method_result_sha256: string;
  verdict: "passed" | "failed";
  failure_witness: DesignResourceSymbolicNoninterferenceFailureWitnessV1 | null;
}

export interface DesignResourceSymbolicNoninterferenceProofV2 {
  side: "source" | "production";
  method: DesignResourceSymbolicNoninterferenceProofMethodV2;
  input_resource_refs: string[];
  oracle_ref: string;
  environment_ref: string;
  static_dependency_nodes: DesignResourceSymbolicStaticDependencyNodeV2[];
  static_rule_roots: DesignResourceSymbolicStaticDependencyRootV2[];
  equivalence_cases: DesignResourceSymbolicNoninterferenceEquivalenceCaseV2[];
  dynamic_dependency_kinds: string[];
  external_device_refs: string[];
  complete_domain_cardinality: string | null;
  oracle_version: string;
  oracle_implementation_sha256: string;
  environment_sha256: string;
  input_snapshot_sha256: string;
  target_snapshot_sha256: string;
  omitted_axis_refs: string[];
  method_result_sha256: string;
  artifact_resource_ref: string;
  artifact_path: string;
  artifact_sha256: string;
  failure_witness: DesignResourceSymbolicNoninterferenceFailureWitnessV1 | null;
}
