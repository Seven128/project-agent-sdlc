import type { DesignResourceImplementationFeasibilityV1 } from "./design-resource-implementation-feasibility-types.js";
import type { DeliveryBindingV2 } from "./long-task-delivery-types.js";
import { invalid } from "./long-task-design-resource-method-binding.js";
import {
  matchesRepoPattern,
  proveRepositoryPatternSubset,
} from "./long-task-paths.js";

type FeasibleRealization =
  DesignResourceImplementationFeasibilityV1["component_family_cells"][number]["feasible_realizations"][number];

export function matchingFeasibilityBindingKeys(
  realization: FeasibleRealization,
  bindings: DeliveryBindingV2[],
): Set<string> {
  const result = new Set<string>();
  for (const owner of realization.owner_candidates)
    for (const binding of bindings) {
      if (binding.existence !== owner.existence) continue;
      const matches =
        owner.kind === "planned_logical_owner"
          ? binding.key === owner.locator || binding.target === owner.locator
          : (binding.kind === "file" && binding.target === owner.locator) ||
            binding.carrier_paths.some((pattern) =>
              matchesRepoPattern(owner.locator, pattern),
            );
      if (matches) result.add(binding.key);
    }
  return result;
}

export function validateFeasibilityBindingOwnerRoots(
  document: DesignResourceImplementationFeasibilityV1,
  componentBindings: DeliveryBindingV2[],
  routeBinding: DeliveryBindingV2,
): void {
  const componentRoots = observedOwnerRoots(document, "component_owner_roots");
  const routeRoots = observedOwnerRoots(document, "route_owner_roots");
  if (componentBindings.length && componentRoots.length === 0)
    invalid("feasibility_component_owner_roots_required", document.target_ref);
  for (const binding of componentBindings) {
    if (binding.existence === "planned" && binding.carrier_paths.length === 0)
      invalid("feasibility_planned_binding_carrier_required", binding.key);
    proveBindingPathUniverseWithinObservedRoots(
      binding,
      componentRoots,
      "feasibility_component_binding_outside_owner_roots",
    );
  }
  if (routeRoots.length === 0)
    invalid("feasibility_route_owner_roots_required", document.target_ref);
  proveBindingPathUniverseWithinObservedRoots(
    routeBinding,
    routeRoots,
    "feasibility_route_binding_outside_owner_roots",
  );
}

function proveBindingPathUniverseWithinObservedRoots(
  binding: DeliveryBindingV2,
  roots: string[],
  errorCode:
    | "feasibility_component_binding_outside_owner_roots"
    | "feasibility_route_binding_outside_owner_roots",
): void {
  for (const candidate of bindingPathUniverse(binding)) {
    const proofs = roots.map((root) =>
      proveRepositoryPatternSubset(
        candidate,
        `${root.replace(/\/+$/u, "")}/**`,
      ),
    );
    if (proofs.some((proof) => proof.status === "proven_subset")) continue;
    const proof = proofs[0];
    invalid(
      errorCode,
      `${binding.key}:${candidate}:${proof?.status ?? "unknown"}:${proof?.reason ?? "owner_roots_empty"}:${roots.join(",")}`,
    );
  }
}

function observedOwnerRoots(
  document: DesignResourceImplementationFeasibilityV1,
  kind: "component_owner_roots" | "route_owner_roots",
): string[] {
  const observation = document.substrate_observations.find(
    (candidate) => candidate.kind === kind,
  );
  return observation?.disposition === "observed" &&
    observation.value?.kind === "repository_paths"
    ? observation.value.paths
    : [];
}

function bindingPathUniverse(binding: DeliveryBindingV2): string[] {
  return binding.kind === "verified"
    ? [...binding.carrier_paths]
    : [binding.target, ...binding.carrier_paths];
}
