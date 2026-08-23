import path from "node:path";
import type {
  DesignResourceFeasibleRealizationV1,
  DesignResourceImplementationFeasibilityCellV1,
  DesignResourceTechnicalSourceRecordV1,
} from "./design-resource-implementation-feasibility-types.js";
import {
  invalidFeasibility,
  requireAtLeastOneSourceRole,
  requireKnownRefs,
  requireSourceRole,
  unique,
} from "./design-resource-implementation-feasibility-validation-support.js";
import { assertProtectedRepositoryFile } from "./long-task-protected-files.js";
import {
  DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
  requireExactFeasibilityDecisionProjection,
  type DesignResourceFeasibilityDecisionSourceIndex,
} from "./design-resource-implementation-feasibility-source-decision.js";

export async function validateFeasibleRealization(
  repository: string,
  realization: DesignResourceFeasibleRealizationV1,
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
  decisionSources: DesignResourceFeasibilityDecisionSourceIndex,
  componentOwnerRoots: string[],
  scope: {
    target_ref: string;
    component_family_ref: string;
    condition_scope_sha256: string;
  },
): Promise<void> {
  if (!realization.strategy_steps.length)
    invalidFeasibility("realization_strategy_steps_required", realization.key);
  unique(
    realization.strategy_steps,
    "realization_strategy_step_duplicate",
    realization.key,
  );
  if (!realization.primitive_refs.length)
    invalidFeasibility("realization_primitive_refs_required", realization.key);
  unique(
    realization.primitive_refs,
    "realization_primitive_ref_duplicate",
    realization.key,
  );
  if (!realization.owner_candidates.length)
    invalidFeasibility(
      "realization_owner_candidates_required",
      realization.key,
    );
  unique(
    realization.owner_candidates.map((item) => `${item.kind}:${item.locator}`),
    "realization_owner_candidate_duplicate",
    realization.key,
  );
  unique(
    realization.supported_customization_surfaces,
    "realization_customization_surface_duplicate",
    realization.key,
  );
  validateFeasibilityBasis(realization, sources);
  unique(
    realization.observed_costs,
    "realization_observed_cost_duplicate",
    realization.key,
  );
  unique(
    realization.observed_risks,
    "realization_observed_risk_duplicate",
    realization.key,
  );
  for (const owner of realization.owner_candidates)
    await validateOwnerCandidate(
      repository,
      realization.key,
      owner,
      sources,
      decisionSources,
      componentOwnerRoots,
      scope,
    );
}

function validateFeasibilityBasis(
  realization: DesignResourceFeasibleRealizationV1,
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
): void {
  if (!realization.feasibility_basis_refs.length)
    invalidFeasibility(
      "realization_feasibility_basis_required",
      realization.key,
    );
  requireKnownRefs(
    realization.feasibility_basis_refs,
    sources,
    "realization_feasibility_basis_unknown",
    realization.key,
  );
  unique(
    realization.feasibility_basis_refs,
    "realization_feasibility_basis_duplicate",
    realization.key,
  );
  requireAtLeastOneSourceRole(
    realization.feasibility_basis_refs,
    sources,
    "feasibility_basis",
    "realization_feasibility_basis_role_missing",
    realization.key,
  );
  requireAtLeastOneSourceRole(
    realization.feasibility_basis_refs,
    sources,
    "capability_basis",
    "realization_capability_basis_role_missing",
    realization.key,
  );
}

async function validateOwnerCandidate(
  repository: string,
  realizationKey: string,
  owner: DesignResourceFeasibleRealizationV1["owner_candidates"][number],
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
  decisionSources: DesignResourceFeasibilityDecisionSourceIndex,
  componentOwnerRoots: string[],
  scope: {
    target_ref: string;
    component_family_ref: string;
    condition_scope_sha256: string;
  },
): Promise<void> {
  if (owner.kind === "existing_path") {
    await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...owner.locator.split("/")),
      `design_resource_feasibility_owner:${realizationKey}`,
    );
    if (
      componentOwnerRoots.length > 0 &&
      !componentOwnerRoots.some(
        (root) =>
          owner.locator === root || owner.locator.startsWith(`${root}/`),
      )
    )
      invalidFeasibility(
        "existing_owner_outside_component_roots",
        `${realizationKey}:${owner.locator}`,
      );
    return;
  }
  if (!owner.authorization_source_refs.length)
    invalidFeasibility("planned_owner_authorization_required", realizationKey);
  unique(
    owner.authorization_source_refs,
    "planned_owner_authorization_duplicate",
    realizationKey,
  );
  requireSourceRole(
    owner.authorization_source_refs,
    sources,
    "planned_owner_authorization",
    "planned_owner_authorization_invalid",
    realizationKey,
  );
  requireExactFeasibilityDecisionProjection(
    owner.authorization_source_refs,
    decisionSources,
    {
      schema_version: DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
      mode: "planned_owner_authorization",
      ...scope,
      owner_locator: owner.locator,
    },
    `planned_owner:${realizationKey}:${owner.locator}`,
    {
      allReferencesMustBeSourceItems: true,
      allowedItemKinds: ["technical_obligation"],
    },
  );
}

export function validateRequiredRealization(
  cell: DesignResourceImplementationFeasibilityCellV1,
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
  decisionSources: DesignResourceFeasibilityDecisionSourceIndex,
  conditionScopeSha256: string,
): void {
  const required = cell.required_realization;
  unique(
    required.technical_authority_source_refs,
    "required_realization_authority_duplicate",
    cell.key,
  );
  if (required.realization_ref === null) {
    if (required.technical_authority_source_refs.length)
      invalidFeasibility(
        "required_realization_authority_without_selection",
        cell.key,
      );
    return;
  }
  if (
    !cell.feasible_realizations.some(
      (realization) => realization.key === required.realization_ref,
    )
  )
    invalidFeasibility("required_realization_unknown", cell.key);
  if (!required.technical_authority_source_refs.length)
    invalidFeasibility("required_realization_authority_required", cell.key);
  requireSourceRole(
    required.technical_authority_source_refs,
    sources,
    "technical_authority",
    "required_realization_authority_invalid",
    cell.key,
  );
  requireExactFeasibilityDecisionProjection(
    required.technical_authority_source_refs,
    decisionSources,
    {
      schema_version: DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
      mode: "required_realization",
      target_ref: cell.target_ref,
      component_family_ref: cell.component_family_ref,
      condition_scope_sha256: conditionScopeSha256,
      realization_ref: required.realization_ref,
    },
    `required_realization:${cell.key}`,
    {
      allReferencesMustBeSourceItems: true,
      allowedItemKinds: ["technical_obligation"],
    },
  );
}
