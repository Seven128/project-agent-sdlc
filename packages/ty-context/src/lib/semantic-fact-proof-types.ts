import type {
  EvidenceCapabilityV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import type {
  SemanticFactAuthorityKind,
  SemanticFactLocatedValueV1,
  SemanticFactValueKind,
} from "./semantic-fact-base-types.js";

export interface SemanticFactV1 {
  key: string;
  cell_ref: string;
  outcome_ref: string;
  unit_ref: string;
  family_ref: string;
  condition_ref: string;
  property_ref: string;
  owner_ref: string;
  value_kind: SemanticFactValueKind;
  observation_scope:
    | "product_boundary"
    | "service_boundary"
    | "data_boundary"
    | "security_boundary"
    | "operational_boundary"
    | "implementation_structure"
    | "external_boundary";
  observation_sensitivity: "plain" | "protected";
  quantifier: {
    kind:
      | "one"
      | "all"
      | "any"
      | "none"
      | "exactly"
      | "at_least"
      | "at_most"
      | "range";
    minimum: number | null;
    maximum: number | null;
    population_ref: string | null;
  };
  expected: SemanticFactLocatedValueV1;
  provenance: {
    kind: SemanticFactAuthorityKind;
    authority_ref: string;
    basis_refs: string[];
    derivation: string | null;
  };
  source_item_refs: string[];
}

export interface SemanticFactOracleV1 {
  key: string;
  trust: "frozen_executable" | "named_external_tcb";
  identity: string;
  version: string;
  sha256: string | null;
  capabilities: string[];
}

export interface SemanticFactEnvironmentV1 {
  key: string;
  identity: string;
  definition: SemanticFactLocatedValueV1;
}

export interface SemanticFactProofObligationV1 {
  key: string;
  fact_ref: string;
  method: string;
  authority: "machine" | "external_confirmation";
  proof_surface: ProofSurface;
  evidence_capabilities: EvidenceCapabilityV2[];
  comparison: {
    comparator: string;
    mode: "exact" | "tolerance";
    parameters: SemanticFactLocatedValueV1;
    tolerance: SemanticFactLocatedValueV1 | null;
    mask: SemanticFactLocatedValueV1 | null;
  };
  oracle_ref: string;
  environment_ref: string;
  observer_refs: string[];
  counterfactual: {
    disposition: "required" | "not_applicable" | "external";
    refs: string[];
    basis_refs: string[];
    rationale: string;
  };
}

export interface SemanticFactBlockerV1 {
  key: string;
  kind: "decision_required" | "unavailable" | "conflict" | "unreadable";
  affected_refs: string[];
  source_item_refs: string[];
  owner: string;
  resolution: string;
}
