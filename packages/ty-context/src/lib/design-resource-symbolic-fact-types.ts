import type {
  DesignResourceDesignSystemSnapshotV1,
  DesignResourceInspectorV1,
} from "./design-resource-fact-manifest-model.js";
import type {
  DesignResourceEnvironmentV1,
  DesignResourceFactLineageV1,
  DesignResourceLocatedDigestV1,
  DesignResourceOracleV1,
  DesignResourcePropertyDefinitionV1,
} from "./design-resource-fact-types.js";
import type {
  DesignResourceHandoffBlockerV1,
  DesignResourceHandoffResourceV1,
  DesignResourceHandoffSubjectV1,
  DesignResourceSourceProfileKind,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";
import type {
  CompiledSymbolicDenotationV1,
  SymbolicDenotationAxisDomain,
  SymbolicDenotationDisposition,
  SymbolicDenotationPredicate,
  SymbolicExtensionalPointV1,
} from "./symbolic-denotation-types.js";
import type { DesignResourceSymbolicNoninterferenceCertificateV2 } from "./design-resource-symbolic-noninterference-types.js";

export type {
  DesignResourceSymbolicNoninterferenceArtifactV1,
  DesignResourceSymbolicNoninterferenceCertificateV2,
  DesignResourceSymbolicNoninterferenceEquivalenceCaseV2,
  DesignResourceSymbolicNoninterferenceFailureWitnessV1,
  DesignResourceSymbolicNoninterferenceProofMethodV2,
  DesignResourceSymbolicNoninterferenceProofV2,
  DesignResourceSymbolicStaticDependencyNodeV2,
  DesignResourceSymbolicStaticDependencyRootV2,
} from "./design-resource-symbolic-noninterference-types.js";

export interface DesignResourceSymbolicPopulationV2 {
  key: string;
  kind: "static" | "dynamic";
  member_subject_refs: string[];
  universe: DesignResourceLocatedDigestV1;
  enumeration: "complete" | "symbolic_partition";
  exclusions: Array<{
    key: string;
    region: SymbolicDenotationPredicate;
    basis_refs: string[];
    rationale: string;
  }>;
  quantifier: SymbolicExtensionalPointV1["quantifier"];
}

export interface DesignResourceSymbolicFactRuleV2 {
  key: string;
  subject_or_relation_ref: string;
  target_ref: string;
  property_ref: string;
  population_ref: string | null;
  quantifier: SymbolicExtensionalPointV1["quantifier"];
  region: SymbolicDenotationPredicate;
  expected: DesignResourceLocatedDigestV1;
  value_kind: string;
  provenance_ref: string;
  observation_scope: "subject" | "full_target";
  observation_sensitivity: "plain" | "protected";
  lineage: DesignResourceFactLineageV1;
  evidence_refs: string[];
  census_refs: string[];
  source_item_refs: string[];
  semantic_obligation_refs: string[];
}

export interface DesignResourceSymbolicDispositionRegionV2 {
  key: string;
  subject_or_relation_ref: string;
  target_ref: string;
  property_ref: string;
  population_ref: string | null;
  quantifier: SymbolicExtensionalPointV1["quantifier"];
  region: SymbolicDenotationPredicate;
  disposition: Exclude<SymbolicDenotationDisposition, "specified">;
  census_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceSymbolicProofObligationV2 {
  key: string;
  fact_rule_ref: string;
  method: DesignResourceVerificationMethod;
  region_sha256: string;
  proof_surface: string;
  observation_boundary: string;
  comparison: {
    comparator: string;
    mode: "exact" | "tolerance";
    parameters: DesignResourceLocatedDigestV1;
    tolerance: DesignResourceLocatedDigestV1 | null;
    mask: DesignResourceLocatedDigestV1 | null;
  };
  oracle_ref: string;
  environment_ref: string;
  protected_value_policy: string;
  completion_effect: string;
}

export interface DesignResourceSymbolicDependencyEdgeV2 {
  key: string;
  axis_ref: string;
  fact_rule_ref: string;
  effects: Array<"disposition" | "expected_semantics" | "proof_denotation">;
}

export interface DesignResourceSymbolicSubjectProfileBindingV2 {
  key: string;
  subject_refs: string[];
  profile_refs: string[];
  census_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceSymbolicCustomPropertyClosureV2 {
  property_ref: string;
  applicable_subject_refs: string[];
  census_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceSymbolicApplicabilityExceptionV2 {
  key: string;
  subject_ref: string;
  property_ref: string;
  disposition: "applicable" | "not_applicable";
  census_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface DesignResourceSymbolicStructuralApplicabilityV2 {
  profile_catalog: "package-subject-property-applicability-v1";
  subject_profile_bindings: DesignResourceSymbolicSubjectProfileBindingV2[];
  inspector_custom_property_closure: DesignResourceSymbolicCustomPropertyClosureV2[];
  instance_exceptions: DesignResourceSymbolicApplicabilityExceptionV2[];
}

export interface DesignResourceObservableRuleManifestV2 {
  schema_version: "design-resource-observable-rule-manifest-v2";
  scope_key: string;
  target_key: string;
  inspector: DesignResourceInspectorV1;
  design_system: DesignResourceDesignSystemSnapshotV1;
  axis_domains: SymbolicDenotationAxisDomain[];
  reachable_region: SymbolicDenotationPredicate;
  subjects: DesignResourceHandoffSubjectV1[];
  populations: DesignResourceSymbolicPopulationV2[];
  properties: DesignResourcePropertyDefinitionV1[];
  fact_rules: DesignResourceSymbolicFactRuleV2[];
  disposition_regions: DesignResourceSymbolicDispositionRegionV2[];
  semantic_proof_obligations: DesignResourceSymbolicProofObligationV2[];
  dependency_edges: DesignResourceSymbolicDependencyEdgeV2[];
  noninterference_certificates: DesignResourceSymbolicNoninterferenceCertificateV2[];
  oracles: DesignResourceOracleV1[];
  environments: DesignResourceEnvironmentV1[];
  acceptance_blockers: DesignResourceHandoffBlockerV1[];
  structural_applicability?: DesignResourceSymbolicStructuralApplicabilityV2;
}

export interface DesignResourceSymbolicHandoffTargetV2 {
  key: string;
  interpretation: "exact_target" | "constraint";
  resource_refs: string[];
  source_profile: {
    kind: DesignResourceSourceProfileKind;
    entry_resource_ref: string;
    dependency_resource_refs: string[];
    fact_manifest_resource_ref: string;
    acquisition: "complete";
  };
  selection_basis: string;
}

export interface DesignResourceSymbolicHandoffCoverageV2 {
  key: string;
  target_ref: string;
  subject_or_relation_refs: string[];
  property_refs: string[];
  fact_rule_refs: string[];
  semantic_obligation_refs: string[];
  certificate_refs: string[];
  source_item_refs: string[];
  rationale: string;
}

export interface DesignResourceHandoffV2 {
  schema_version: "design-resource-handoff-v2";
  representation: "symbolic_rules_v2";
  intent: "implementation_handoff";
  scope: {
    key: string;
    style_dependency: "style-bearing" | "non-fidelity" | "mixed";
    surface_keys: string[];
    necessary_context: string[];
    exclusions: string[];
  };
  provenance: {
    provider: string;
    provider_version: string;
    project: string;
    run: string;
    capability: string;
    agent: string;
    model: string;
    design_system_id: string;
  };
  resources: DesignResourceHandoffResourceV1[];
  targets: DesignResourceSymbolicHandoffTargetV2[];
  coverage: DesignResourceSymbolicHandoffCoverageV2[];
  proposal: {
    reconciliation_status: "applied" | "returned" | "not_applicable";
    path: string;
    revision: string;
  };
}

export interface ParsedDesignResourceHandoffV2 {
  handoff_path: string;
  handoff: DesignResourceHandoffV2;
  source_item_keys: string[];
  source_item_kinds: Record<string, string>;
}

export interface DesignResourceSymbolicRuleProjectionV2 {
  rule: DesignResourceSymbolicFactRuleV2;
  compiled_region: CompiledSymbolicDenotationV1;
}

export interface DesignResourceHandoffPreflightV2 extends ParsedDesignResourceHandoffV2 {
  preflight_schema_version: "design-resource-handoff-preflight-v2";
  status: "ready";
  manifest: DesignResourceObservableRuleManifestV2;
  resource_hashes: Record<string, string>;
  rule_projections: DesignResourceSymbolicRuleProjectionV2[];
  metrics: {
    semantic_obligations: number;
    certificate_obligations: number;
    certificate_covered_omitted_axes: number;
    certificate_covered_dependency_edges: number;
    canonical_dag_nodes: number;
    canonical_partition_edges: number;
    canonical_bytes: number;
    theoretical_ground_cardinality: string;
  };
}
