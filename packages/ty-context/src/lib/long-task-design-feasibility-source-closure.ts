import type { DesignResourceImplementationFeasibilityTargetModel } from "./design-resource-implementation-feasibility-model.js";
import {
  DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
  deriveDesignResourceFeasibilityConditionScopeSha256,
  requireExactFeasibilityDecisionProjection,
  type DesignResourceFeasibilityDecisionProjection,
  type DesignResourceFeasibilityDecisionSourceIndex,
} from "./design-resource-implementation-feasibility-source-decision.js";
import type { DesignResourceImplementationFeasibilityV1 } from "./design-resource-implementation-feasibility-types.js";
import type {
  DeliveryBindingV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import type { ContractDesignTarget } from "./long-task-design-resource-handoff.js";
import { invalid } from "./long-task-design-resource-method-binding.js";

type FeasibilityCell =
  DesignResourceImplementationFeasibilityV1["component_family_cells"][number];
type FeasibleRealization = FeasibilityCell["feasible_realizations"][number];

export function validateSelectedPlannedOwnerClaims(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  document: DesignResourceImplementationFeasibilityV1,
  model: DesignResourceImplementationFeasibilityTargetModel,
  decisions: DesignResourceFeasibilityDecisionSourceIndex,
  realization: FeasibleRealization,
  bindings: DeliveryBindingV2[],
  cell: FeasibilityCell,
): void {
  for (const owner of realization.owner_candidates) {
    if (owner.kind !== "planned_logical_owner") continue;
    if (
      !bindings.some(
        (binding) =>
          binding.existence === "planned" &&
          (binding.key === owner.locator || binding.target === owner.locator),
      )
    )
      continue;
    validateTechnicalDecisionClaim(
      contract,
      contractTarget,
      decisions,
      owner.authorization_source_refs,
      {
        schema_version: DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
        mode: "planned_owner_authorization",
        target_ref: cell.target_ref,
        component_family_ref: cell.component_family_ref,
        condition_scope_sha256:
          deriveDesignResourceFeasibilityConditionScopeSha256(
            document,
            model,
            cell.condition_profile_ref,
          ),
        owner_locator: owner.locator,
      },
      `planned_owner:${cell.key}:${owner.locator}`,
    );
  }
}

export function validateTechnicalDecisionClaim(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  decisions: DesignResourceFeasibilityDecisionSourceIndex,
  sourceRefs: string[],
  expectation: DesignResourceFeasibilityDecisionProjection,
  label: string,
): void {
  const source = requireDecisionSource(
    sourceRefs,
    decisions,
    expectation,
    label,
    ["technical_obligation"],
    true,
  );
  const claim = exactSourceClaim(contract, source, label);
  const validOutcomeClaim =
    claim.disposition.type === "claim" &&
    claim.disposition.refs.some((ref) =>
      ref.startsWith(`${contractTarget.outcome_key}.`),
    );
  if (!validOutcomeClaim && claim.disposition.type !== "global_constraint")
    invalid(
      "feasibility_technical_decision_claim_disposition_invalid",
      `${label}:${claim.key}:${claim.disposition.type}`,
    );
}

export function validateFeasibilityBlockers(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  document: DesignResourceImplementationFeasibilityV1,
  model: DesignResourceImplementationFeasibilityTargetModel,
  decisions: DesignResourceFeasibilityDecisionSourceIndex,
): void {
  for (const blocker of document.blockers) {
    const source = requireDecisionSource(
      blocker.source_record_refs,
      decisions,
      {
        schema_version: DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
        mode: "feasibility_blocker",
        target_ref: blocker.target_ref,
        component_family_ref: blocker.component_family_ref,
        condition_scope_sha256:
          deriveDesignResourceFeasibilityConditionScopeSha256(
            document,
            model,
            blocker.condition_profile_ref,
          ),
        blocker_ref: blocker.key,
      },
      `blocker:${blocker.key}`,
      ["decision", "external_confirmation"],
      false,
    );
    const claim = exactSourceClaim(contract, source, `blocker:${blocker.key}`);
    if (source.source_item_kind === "decision") {
      if (claim.disposition.type !== "decision_required")
        invalid(
          "feasibility_blocker_decision_required",
          `${blocker.key}:${claim.key}:${claim.disposition.type}`,
        );
      continue;
    }
    if (claim.disposition.type !== "external_confirmation")
      invalid(
        "feasibility_blocker_external_confirmation_required",
        `${blocker.key}:${claim.key}:${claim.disposition.type}`,
      );
    const impactedTargetClaims = new Set(
      contractTarget.target.claim_refs.map(
        (claimRef) => `${contractTarget.outcome_key}.${claimRef}`,
      ),
    );
    for (const confirmationRef of claim.disposition.refs) {
      const confirmation =
        contract.global.acceptance.external_confirmations.find(
          (candidate) => candidate.key === confirmationRef,
        );
      if (!confirmation)
        invalid(
          "feasibility_blocker_confirmation_unknown",
          `${blocker.key}:${confirmationRef}`,
        );
      if (!confirmation.blocks_target)
        invalid(
          "feasibility_blocker_confirmation_not_blocking",
          `${blocker.key}:${confirmationRef}`,
        );
      if (
        !confirmation.impact_claims.some((claimRef) =>
          impactedTargetClaims.has(claimRef),
        )
      )
        invalid(
          "feasibility_blocker_confirmation_target_claim_missing",
          `${blocker.key}:${confirmationRef}`,
        );
    }
  }
}

function requireDecisionSource(
  sourceRefs: string[],
  decisions: DesignResourceFeasibilityDecisionSourceIndex,
  expectation: DesignResourceFeasibilityDecisionProjection,
  label: string,
  allowedItemKinds: readonly (
    "technical_obligation" | "decision" | "external_confirmation"
  )[],
  allReferencesMustBeSourceItems: boolean,
) {
  try {
    return requireExactFeasibilityDecisionProjection(
      sourceRefs,
      decisions,
      expectation,
      label,
      { allReferencesMustBeSourceItems, allowedItemKinds },
    );
  } catch (error) {
    invalid(
      "feasibility_source_decision_invalid",
      `${label}:${message(error)}`,
    );
  }
}

function exactSourceClaim(
  contract: DeliveryContractV2,
  source: ReturnType<typeof requireDecisionSource>,
  label: string,
) {
  if (!contract.task.source_paths.includes(source.source_path))
    invalid(
      "feasibility_authority_source_not_declared",
      `${label}:${source.source_path}`,
    );
  const sourceRef = `${source.source_path}#${source.source_item_key}`;
  const matching = contract.source_claims.filter(
    (claim) => claim.source_ref === sourceRef,
  );
  if (matching.length !== 1)
    invalid(
      "feasibility_authority_claim_count",
      `${label}:${sourceRef}:${matching.length}`,
    );
  return matching[0];
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
