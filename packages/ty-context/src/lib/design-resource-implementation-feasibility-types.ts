import type { SymbolicDenotationPredicate } from "./symbolic-denotation-types.js";

export interface DesignResourceTechnicalFeasibilityInputV1 {
  key: string;
  target_ref: string;
  path: string;
  media_type: "application/json";
  sha256: string;
}

export const DESIGN_RESOURCE_SUBSTRATE_OBSERVATION_KINDS = [
  "platform",
  "framework_runtime",
  "ui_system",
  "token_theming_adapter",
  "component_owner_roots",
  "route_owner_roots",
] as const;

export type DesignResourceSubstrateObservationKind =
  (typeof DESIGN_RESOURCE_SUBSTRATE_OBSERVATION_KINDS)[number];

export type DesignResourceSubstrateObservationDisposition =
  "observed" | "not_applicable" | "decision_required" | "unavailable";

export const DESIGN_RESOURCE_TECHNICAL_SOURCE_ROLES = [
  "technical_platform",
  "framework_runtime",
  "ui_system",
  "token_theming_adapter",
  "component_owner",
  "route_owner",
  "capability_basis",
  "planned_owner_authorization",
  "technical_authority",
  "feasibility_basis",
] as const;

export type DesignResourceTechnicalSourceRole =
  (typeof DESIGN_RESOURCE_TECHNICAL_SOURCE_ROLES)[number];

export interface DesignResourceTechnicalSourceRecordV1 {
  key: string;
  path: string;
  media_type: string;
  sha256: string;
  locator:
    | { kind: "whole_resource"; value: "." }
    | { kind: "json_pointer"; value: string }
    | { kind: "markdown_anchor" | "source_anchor"; value: string }
    | { kind: "source_item"; value: string; text_sha256: string };
  roles: DesignResourceTechnicalSourceRole[];
}

export type DesignResourceSubstrateObservationValueV1 =
  | {
      kind: "identifier";
      name: string;
      version_source_ref: string | null;
    }
  | {
      kind: "repository_paths";
      paths: string[];
    };

export interface DesignResourceSubstrateObservationV1 {
  kind: DesignResourceSubstrateObservationKind;
  disposition: DesignResourceSubstrateObservationDisposition;
  value: DesignResourceSubstrateObservationValueV1 | null;
  source_record_refs: string[];
  reason: string | null;
}

export interface DesignResourceExplicitConditionProfileV1 {
  key: string;
  condition_refs: string[];
}

export interface DesignResourceSymbolicConditionProfileV1 {
  key: string;
  region: SymbolicDenotationPredicate;
}

export type DesignResourceImplementationConditionModelV1 =
  | {
      kind: "explicit_conditions_v1";
      profiles: DesignResourceExplicitConditionProfileV1[];
    }
  | {
      kind: "symbolic_regions_v2";
      profiles: DesignResourceSymbolicConditionProfileV1[];
    };

export const DESIGN_RESOURCE_IMPLEMENTATION_STRATEGY_STEPS = [
  "reuse_existing",
  "compose_existing",
  "extend_shared_component",
  "theme_with_tokens",
  "create_shared_component",
] as const;

export type DesignResourceImplementationStrategyStep =
  (typeof DESIGN_RESOURCE_IMPLEMENTATION_STRATEGY_STEPS)[number];

export const DESIGN_RESOURCE_CUSTOMIZATION_SURFACES = [
  "theme_tokens",
  "component_variant",
  "primitive_props",
  "composition",
  "content_slot",
  "icon_slot",
  "behavior_slot",
  "style_api",
] as const;

export type DesignResourceCustomizationSurface =
  (typeof DESIGN_RESOURCE_CUSTOMIZATION_SURFACES)[number];

export type DesignResourceImplementationOwnerCandidateV1 =
  | {
      kind: "existing_path";
      locator: string;
      existence: "existing";
    }
  | {
      kind: "planned_logical_owner";
      locator: string;
      existence: "planned";
      authorization_source_refs: string[];
    };

export interface DesignResourceFeasibleRealizationV1 {
  key: string;
  strategy_steps: DesignResourceImplementationStrategyStep[];
  primitive_refs: string[];
  owner_candidates: DesignResourceImplementationOwnerCandidateV1[];
  supported_customization_surfaces: DesignResourceCustomizationSurface[];
  feasibility_basis_refs: string[];
  observed_costs: string[];
  observed_risks: string[];
}

export interface DesignResourceImplementationFeasibilityCellV1 {
  key: string;
  component_family_ref: string;
  target_ref: string;
  condition_profile_ref: string;
  design_fact_refs: string[];
  feasible_realizations: DesignResourceFeasibleRealizationV1[];
  required_realization: {
    realization_ref: string | null;
    technical_authority_source_refs: string[];
  };
  blocker_refs: string[];
}

export interface DesignResourceImplementationFeasibilityBlockerV1 {
  key: string;
  component_family_ref: string;
  target_ref: string;
  condition_profile_ref: string;
  source_record_refs: string[];
  substrate_observation_refs: DesignResourceSubstrateObservationKind[];
  description: string;
}

export interface DesignResourceImplementationFeasibilityV1 {
  schema_version: "design-resource-implementation-feasibility-v1";
  key: string;
  target_ref: string;
  realization_mode: "native_substrate" | "mapped_substrate" | "reference";
  source_records: DesignResourceTechnicalSourceRecordV1[];
  substrate_observations: DesignResourceSubstrateObservationV1[];
  condition_model: DesignResourceImplementationConditionModelV1;
  component_family_cells: DesignResourceImplementationFeasibilityCellV1[];
  blockers: DesignResourceImplementationFeasibilityBlockerV1[];
}

export interface DesignResourceImplementationFeasibilityIdentityV1 {
  key: string;
  target_ref: string;
  path: string;
  sha256: string;
  realization_mode: DesignResourceImplementationFeasibilityV1["realization_mode"];
  component_family_cells: number;
  blockers: number;
}

export interface LoadedDesignResourceImplementationFeasibilityV1 {
  index: DesignResourceTechnicalFeasibilityInputV1;
  document: DesignResourceImplementationFeasibilityV1;
  identity: DesignResourceImplementationFeasibilityIdentityV1;
}
