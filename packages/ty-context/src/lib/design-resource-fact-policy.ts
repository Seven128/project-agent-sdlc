import {
  DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION,
  DESIGN_RESOURCE_METHODS_BY_DIMENSION,
} from "./design-resource-handoff-policy.js";
import type {
  DesignResourceDimension,
  DesignResourceEvidenceKind,
  DesignResourceVerificationMethod,
} from "./design-resource-handoff-types.js";

export const DESIGN_RESOURCE_FACT_INVARIANTS = Object.freeze({
  complete_observable_design_fact_delivery: true,
  resource_fact_inventory_closure_required: true,
  exact_target_visual_pixel_required: true,
  exact_fact_set_conservation_required: true,
  design_fact_expression_boundary: true,
  unsupported_design_fact_blocks: true,
  control_granularity_is_not_design_fact_granularity: true,
  public_design_fact_guidance_required: true,
  design_fact_values_stay_in_canonical_resources: true,
  no_second_design_fact_authority: true,
  fact_inventory_required: true,
  contract_evidence_fact_binding_required: true,
  selected_design_fact_antidegradation_required: true,
  design_fact_distribution_context_cost: true,
  forbidden_design_fact_shortcuts_absent: true,
  preflight_is_not_production_conformance: true,
  unsupported_facts_block: true,
  control_relations_unchanged: true,
} as const);

export const EXACT_TARGET_FULL_TARGET_METHODS = [
  "layout_geometry",
  "visual_pixel",
] as const satisfies readonly DesignResourceVerificationMethod[];

export function assertDesignResourceFactPolicyEnabled(): void {
  if (
    Object.values(DESIGN_RESOURCE_FACT_INVARIANTS).some(
      (enabled) => enabled !== true,
    )
  )
    throw new Error("design_resource_fact_policy_disabled");
}

export function designFactMethodIsCompatible(
  dimension: DesignResourceDimension,
  method: DesignResourceVerificationMethod,
): boolean {
  return DESIGN_RESOURCE_METHODS_BY_DIMENSION[dimension].includes(method);
}

export function designFactEvidenceIsCompatible(
  dimension: DesignResourceDimension,
  kind: DesignResourceEvidenceKind,
): boolean {
  return DESIGN_RESOURCE_EVIDENCE_BY_DIMENSION[dimension].includes(kind);
}
