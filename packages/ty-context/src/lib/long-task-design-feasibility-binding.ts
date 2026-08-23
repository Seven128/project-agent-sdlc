import {
  DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
  deriveDesignResourceFeasibilityConditionScopeSha256,
  parseDesignResourceFeasibilityDecisionProjections,
  type DesignResourceFeasibilityDecisionSourceIndex,
} from "./design-resource-implementation-feasibility-source-decision.js";
import {
  createV1ImplementationFeasibilityTargetModel,
  createV2ImplementationFeasibilityTargetModel,
  type DesignResourceImplementationFeasibilityTargetModel,
} from "./design-resource-implementation-feasibility-model.js";
import type { DesignResourceImplementationFeasibilityV1 } from "./design-resource-implementation-feasibility-types.js";
import type { DesignResourceHandoffPreflightV1 } from "./design-resource-handoff-types.js";
import type { DesignResourceHandoffPreflightV2 } from "./design-resource-symbolic-fact-types.js";
import type {
  CompiledSourceItemV2,
  DeliveryContractV2,
} from "./long-task-delivery-types.js";
import {
  matchingFeasibilityBindingKeys,
  validateFeasibilityBindingOwnerRoots,
} from "./long-task-design-feasibility-binding-owners.js";
import {
  validateFeasibilityBlockers,
  validateSelectedPlannedOwnerClaims,
  validateTechnicalDecisionClaim,
} from "./long-task-design-feasibility-source-closure.js";
import type { ContractDesignTarget } from "./long-task-design-resource-handoff.js";
import { invalid } from "./long-task-design-resource-method-binding.js";

type DesignResourcePreflight =
  DesignResourceHandoffPreflightV1 | DesignResourceHandoffPreflightV2;

export function validateLongTaskDesignFeasibilityBindings(
  contract: DeliveryContractV2,
  contractTarget: ContractDesignTarget,
  preflight: DesignResourcePreflight,
  sourceItems: CompiledSourceItemV2[],
): void {
  const document = preflight.technical_feasibility_documents.find(
    (item) => item.target_ref === contractTarget.target.key,
  );
  if (!document) return;
  const model = feasibilityTargetModel(preflight, contractTarget.target.key);
  const decisions = compiledDecisionSources(document, sourceItems);
  const outcome = contract.outcomes.find(
    (item) => item.key === contractTarget.outcome_key,
  )!;
  const bindingsByKey = new Map(
    outcome.technical.bindings.map((binding) => [binding.key, binding]),
  );
  const componentBindings = contractTarget.binding.component_binding_refs.map(
    (bindingRef) => {
      const binding = bindingsByKey.get(bindingRef);
      if (!binding)
        invalid(
          "feasibility_component_binding_unknown",
          `${contractTarget.target.key}:${bindingRef}`,
        );
      return binding;
    },
  );
  const routeBinding = bindingsByKey.get(
    contractTarget.binding.route_binding_ref,
  );
  if (!routeBinding)
    invalid(
      "feasibility_route_binding_unknown",
      `${contractTarget.target.key}:${contractTarget.binding.route_binding_ref}`,
    );
  validateFeasibilityBindingOwnerRoots(
    document,
    componentBindings,
    routeBinding,
  );
  const consumedComponentBindings = new Set<string>();
  for (const cell of document.component_family_cells) {
    const blockerOnly =
      cell.feasible_realizations.length === 0 && cell.blocker_refs.length > 0;
    if (blockerOnly) continue;
    const matching = cell.feasible_realizations
      .map((realization) => ({
        realization,
        bindingKeys: matchingFeasibilityBindingKeys(
          realization,
          componentBindings,
        ),
      }))
      .filter((candidate) => candidate.bindingKeys.size > 0);
    const required = cell.required_realization.realization_ref;
    if (
      required !== null &&
      (matching.length !== 1 || matching[0].realization.key !== required)
    )
      invalid(
        "feasibility_required_realization_binding_mismatch",
        `${cell.key}:${required}:${matching.map((item) => item.realization.key).join(",")}`,
      );
    if (required === null && matching.length === 0)
      invalid("feasibility_realization_binding_missing", cell.key);
    if (required === null && matching.length > 1)
      invalid(
        "feasibility_realization_binding_ambiguous",
        `${cell.key}:${matching.map((item) => item.realization.key).join(",")}`,
      );
    const selected = matching.length === 1 ? matching[0] : null;
    if (selected)
      for (const bindingKey of selected.bindingKeys)
        consumedComponentBindings.add(bindingKey);
    if (required !== null)
      validateTechnicalDecisionClaim(
        contract,
        contractTarget,
        decisions,
        cell.required_realization.technical_authority_source_refs,
        {
          schema_version: DESIGN_RESOURCE_FEASIBILITY_DECISION_SCHEMA,
          mode: "required_realization",
          target_ref: cell.target_ref,
          component_family_ref: cell.component_family_ref,
          condition_scope_sha256:
            deriveDesignResourceFeasibilityConditionScopeSha256(
              document,
              model,
              cell.condition_profile_ref,
            ),
          realization_ref: required,
        },
        `required_realization:${cell.key}`,
      );
    if (selected)
      validateSelectedPlannedOwnerClaims(
        contract,
        contractTarget,
        document,
        model,
        decisions,
        selected.realization,
        componentBindings,
        cell,
      );
  }
  for (const bindingRef of contractTarget.binding.component_binding_refs)
    if (!consumedComponentBindings.has(bindingRef))
      invalid(
        "feasibility_component_binding_unattributed",
        `${contractTarget.target.key}:${bindingRef}`,
      );
  validateFeasibilityBlockers(
    contract,
    contractTarget,
    document,
    model,
    decisions,
  );
}

function feasibilityTargetModel(
  preflight: DesignResourcePreflight,
  targetRef: string,
): DesignResourceImplementationFeasibilityTargetModel {
  if ("preflight_schema_version" in preflight) {
    const target = preflight.handoff.targets.find(
      (candidate) => candidate.key === targetRef,
    )!;
    return createV2ImplementationFeasibilityTargetModel(
      target,
      preflight.manifest,
    );
  }
  const target = preflight.handoff.targets.find(
    (candidate) => candidate.key === targetRef,
  )!;
  return createV1ImplementationFeasibilityTargetModel(
    preflight.handoff,
    target,
  );
}

function compiledDecisionSources(
  document: DesignResourceImplementationFeasibilityV1,
  sourceItems: CompiledSourceItemV2[],
): DesignResourceFeasibilityDecisionSourceIndex {
  const index: DesignResourceFeasibilityDecisionSourceIndex = new Map();
  for (const record of document.source_records) {
    if (record.locator.kind !== "source_item") continue;
    const item = sourceItems.find(
      (candidate) =>
        candidate.source_path === record.path &&
        candidate.key === record.locator.value,
    );
    if (!item)
      invalid(
        "feasibility_source_item_not_declared",
        `${record.key}:${record.path}#${record.locator.value}`,
      );
    if (item.text_sha256 !== record.locator.text_sha256)
      invalid(
        "feasibility_source_item_digest_mismatch",
        `${record.key}:${record.locator.text_sha256}:${item.text_sha256}`,
      );
    index.set(record.key, {
      source_record_ref: record.key,
      source_path: record.path,
      source_item_key: item.key,
      source_item_kind: item.kind,
      text_sha256: item.text_sha256,
      projections: parseDesignResourceFeasibilityDecisionProjections(
        record.path,
        item.key,
        item.normalized_text,
      ),
    });
  }
  return index;
}
