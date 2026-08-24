import type { CompiledClaimsV2 } from "./long-task-claims.js";
import type {
  DeliveryContractV2,
  DeliveryOutcomeV2,
} from "./long-task-delivery-types.js";
import { validateUiDesignBinding } from "./long-task-ui-design-policy.js";
import {
  bindingCarriers,
  controlClaims,
  expectedControlProofSurface,
  issue,
  type Reporter,
  unique,
  validateCarrierInputs,
  validateRootJourney,
  validateTargetLocalClaimProof,
} from "./long-task-ui-surface-validation.js";
import type { DeliveryContractStructureValidationOptions } from "./long-task-delivery-validation.js";

export function validateUiSurfaceBindings(
  contract: DeliveryContractV2,
  claims: CompiledClaimsV2,
  report?: Reporter,
  options: DeliveryContractStructureValidationOptions = {},
): void {
  const targets = new Map(
    contract.task.execution_targets.map((target) => [target.key, target]),
  );
  const requiredTargets = new Set(
    contract.task.target_profile.required_target_refs,
  );
  const confirmations = new Map(
    contract.global.acceptance.external_confirmations.map((item) => [
      item.key,
      item,
    ]),
  );
  for (const outcome of contract.outcomes)
    validateOutcomeBindings(
      outcome,
      claims,
      targets,
      requiredTargets,
      confirmations,
      report,
      options,
    );
}

function validateOutcomeBindings(
  outcome: DeliveryOutcomeV2,
  claims: CompiledClaimsV2,
  targets: Map<string, DeliveryContractV2["task"]["execution_targets"][number]>,
  requiredTargets: Set<string>,
  confirmations: Map<
    string,
    DeliveryContractV2["global"]["acceptance"]["external_confirmations"][number]
  >,
  report?: Reporter,
  options: DeliveryContractStructureValidationOptions = {},
): void {
  const surfaceBindings = outcome.product.surface_bindings ?? [];
  if (outcome.product.controls.length && !surfaceBindings.length)
    issue(report, "ui_surface_binding_required", outcome.key);
  if (!outcome.product.controls.length && surfaceBindings.length)
    issue(report, "ui_surface_binding_without_controls", outcome.key);
  unique(
    surfaceBindings.map((item) => item.key),
    "ui_surface_binding_key_duplicate",
    outcome.key,
    report,
  );

  const controls = new Map(
    outcome.product.controls.map((control) => [control.key, control]),
  );
  const ownerSurfaces = new Set(outcome.product.owner_surfaces);
  const technicalBindings = new Map(
    outcome.technical.bindings.map((binding) => [binding.key, binding]),
  );
  const checks = new Map(
    outcome.acceptance.checks.map((check) => [check.key, check]),
  );
  const outcomeClaims = new Map(
    (claims.by_outcome[outcome.key] ?? []).map((claim) => [
      claim.local_key,
      claim,
    ]),
  );
  const boundControls = new Set<string>();
  const boundControlTargets = new Set<string>();
  const designTargetKeys = new Set<string>();
  const designAssertionRefs = new Set<string>();

  for (const binding of surfaceBindings) {
    const label = `${outcome.key}:${binding.key}`;
    if (!ownerSurfaces.has(binding.surface_ref))
      issue(
        report,
        "ui_surface_binding_owner_surface_unknown",
        `${label}:${binding.surface_ref}`,
      );
    const target = targets.get(binding.target_ref);
    if (!target || target.role !== "product")
      issue(
        report,
        "ui_surface_binding_product_target_required",
        `${label}:${binding.target_ref}`,
      );
    if (!requiredTargets.has(binding.target_ref))
      issue(
        report,
        "ui_surface_binding_required_target_required",
        `${label}:${binding.target_ref}`,
      );
    validateBoundControls(
      binding,
      controls,
      boundControls,
      boundControlTargets,
      label,
      report,
    );

    const carriers = bindingCarriers(
      binding.route_binding_ref,
      binding.component_binding_refs,
      technicalBindings,
      label,
      report,
      {
        allowEmptyComponentRefs:
          options.allowDeferredDesignComponentBindingClosure === true &&
          binding.design_targets.length > 0,
      },
    );
    const rootCheck = checks.get(binding.root_journey_check_ref);
    if (!rootCheck)
      issue(
        report,
        "ui_surface_binding_root_check_unknown",
        `${label}:${binding.root_journey_check_ref}`,
      );
    else {
      validateRootJourney(binding, rootCheck, label, report);
      validateCarrierInputs(rootCheck, carriers, label, report);
      validateRootBoundControlAssertions(
        binding,
        rootCheck,
        controls,
        label,
        report,
      );
    }

    for (const controlRef of binding.control_refs)
      for (const claim of controlClaims(outcomeClaims, controlRef))
        validateTargetLocalClaimProof(
          outcome,
          claim,
          binding.target_ref,
          expectedControlProofSurface(target?.runtime_family),
          claims,
          checks,
          label,
          report,
        );

    validateUiDesignBinding({
      outcome,
      binding,
      outcomeClaims,
      claims,
      checks,
      confirmations,
      carriers,
      designTargetKeys,
      designAssertionRefs,
      report,
    });
  }

  for (const control of outcome.product.controls)
    if (!boundControls.has(control.key))
      issue(
        report,
        "ui_surface_binding_control_unbound",
        `${outcome.key}:${control.key}`,
      );
}

function validateBoundControls(
  binding: DeliveryOutcomeV2["product"]["surface_bindings"][number],
  controls: Map<string, DeliveryOutcomeV2["product"]["controls"][number]>,
  boundControls: Set<string>,
  boundControlTargets: Set<string>,
  label: string,
  report?: Reporter,
): void {
  unique(
    binding.control_refs,
    "ui_surface_binding_control_ref_duplicate",
    label,
    report,
  );
  if (!binding.control_refs.length)
    issue(report, "ui_surface_binding_control_ref_required", label);
  for (const controlRef of binding.control_refs) {
    const control = controls.get(controlRef);
    if (!control)
      issue(
        report,
        "ui_surface_binding_control_unknown",
        `${label}:${controlRef}`,
      );
    else if (control.surface.trim() && control.surface !== binding.surface_ref)
      issue(
        report,
        "ui_surface_binding_control_surface_mismatch",
        `${label}:${controlRef}:${control.surface}`,
      );
    const identity = `${controlRef}\0${binding.target_ref}`;
    if (boundControlTargets.has(identity))
      issue(
        report,
        "ui_surface_binding_control_target_duplicate",
        `${label}:${controlRef}:${binding.target_ref}`,
      );
    boundControlTargets.add(identity);
    boundControls.add(controlRef);
  }
}

function validateRootBoundControlAssertions(
  binding: DeliveryOutcomeV2["product"]["surface_bindings"][number],
  check: DeliveryOutcomeV2["acceptance"]["checks"][number],
  controls: Map<string, DeliveryOutcomeV2["product"]["controls"][number]>,
  label: string,
  report?: Reporter,
): void {
  for (const controlRef of binding.control_refs) {
    const control = controls.get(controlRef);
    if (!control) continue;
    const claimRef = rootJourneyClaimRef(control);
    if (
      !check.positive_assertions.some(
        (assertion) =>
          assertion.claims.includes(claimRef) &&
          assertion.evidence_capabilities.includes("interaction_trace") &&
          assertion.evidence_capabilities.includes("target_runtime"),
      )
    )
      issue(
        report,
        "ui_surface_binding_root_control_proof_missing",
        `${label}:${controlRef}:${claimRef}`,
      );
  }
}

function rootJourneyClaimRef(
  control: DeliveryOutcomeV2["product"]["controls"][number],
): string {
  const field = control.navigation_result?.trim()
    ? "navigation_result"
    : control.interaction?.trim()
      ? "interaction"
      : control.trigger?.trim()
        ? "trigger"
        : "location";
  return `control.${control.key}.${field}`;
}
