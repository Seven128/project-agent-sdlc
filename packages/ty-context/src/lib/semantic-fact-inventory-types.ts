import type { EvidenceCapabilityV2 } from "./long-task-delivery-types.js";
import type {
  SemanticFactDisposition,
  SemanticFactLocatedValueV1,
  SemanticFactLocatorKind,
  SemanticFactValueKind,
} from "./semantic-fact-base-types.js";

export interface SemanticFactInputV1 {
  key: string;
  kind:
    | "source_item"
    | "context"
    | "attachment"
    | "canonical_spec"
    | "repository_preservation"
    | "external_constraint"
    | "delegated_instruction"
    | "design_resource";
  source_ref: string;
  sha256: string;
  disposition:
    "non_ui_material" | "ui_design" | "supporting_only" | "excluded_by_scope";
  fact_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface SemanticFactCensusEntryV1 {
  key: string;
  kind:
    | "input"
    | "scope_exclusion"
    | "family"
    | "subject"
    | "relation"
    | "population"
    | "axis"
    | "axis_value"
    | "condition_rule"
    | "condition"
    | "property"
    | "fact_cell"
    | "fact"
    | "proof_obligation"
    | "oracle"
    | "environment"
    | "blocker"
    | "custom";
  locator: {
    material_ref: string;
    kind: SemanticFactLocatorKind;
    value: string;
  };
  identity_sha256: string;
  disposition: "material_with_facts" | "supporting_only";
  fact_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface SemanticFactFamilyDispositionV1 {
  key: string;
  family: string;
  standard: boolean;
  disposition: SemanticFactDisposition;
  outcome_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface SemanticFactSubjectV1 {
  key: string;
  family_ref: string;
  outcome_ref: string;
  kind: string;
  parent_ref: string | null;
  owner_ref: string | null;
  source_item_refs: string[];
  basis_refs: string[];
}

export interface SemanticFactRelationV1 {
  key: string;
  family_ref: string;
  outcome_ref: string;
  kind: string;
  endpoints: Array<{ role: string; unit_ref: string }>;
  source_item_refs: string[];
  basis_refs: string[];
}

export interface SemanticFactPopulationV1 {
  key: string;
  family_ref: string;
  outcome_ref: string;
  kind: "static" | "dynamic";
  member_unit_refs: string[];
  universe: SemanticFactLocatedValueV1;
  enumeration_rule: string;
  exclusion_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
}

export interface SemanticFactAxisDispositionV1 {
  key: string;
  axis: string;
  standard: boolean;
  disposition: SemanticFactDisposition;
  outcome_refs: string[];
  values: Array<{
    key: string;
    source_item_refs: string[];
    basis_refs: string[];
  }>;
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface SemanticFactConditionV1 {
  key: string;
  outcome_ref: string;
  axis_values: Array<{ axis_ref: string; value_ref: string }>;
  source_item_refs: string[];
  basis_refs: string[];
}

export interface SemanticFactConditionExclusionV1 {
  key: string;
  outcome_ref: string;
  axis_values: Array<{ axis_ref: string; value_ref: string }>;
  disposition: Exclude<SemanticFactDisposition, "applicable">;
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface SemanticFactConditionRuleV1 {
  key: string;
  outcome_ref: string;
  axis_refs: string[];
  mode: "independent" | "cross_product" | "explicit_meaningful";
  condition_refs: string[];
  exclusion_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface SemanticFactPropertyDispositionV1 {
  key: string;
  family_ref: string;
  property: string;
  standard: boolean;
  value_kind: SemanticFactValueKind;
  required_methods: string[];
  required_evidence_capabilities: EvidenceCapabilityV2[];
  applicable_unit_refs: string[];
  not_applicable_unit_refs: string[];
  decision_required_unit_refs: string[];
  unavailable_unit_refs: string[];
  condition_refs: string[];
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}

export interface SemanticFactCellV1 {
  key: string;
  outcome_ref: string;
  unit_ref: string;
  condition_ref: string;
  property_ref: string;
  disposition:
    "specified" | "not_applicable" | "decision_required" | "unavailable";
  fact_ref: string | null;
  source_item_refs: string[];
  basis_refs: string[];
  rationale: string;
}
