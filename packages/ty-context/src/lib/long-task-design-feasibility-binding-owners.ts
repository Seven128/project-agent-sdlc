import type { DesignResourceImplementationFeasibilityV1 } from "./design-resource-implementation-feasibility-types.js";
import type { DeliveryBindingV2 } from "./long-task-delivery-types.js";
import { invalid } from "./long-task-design-resource-method-binding.js";
import { matchesRepoPattern } from "./long-task-paths.js";

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
  const componentObservation = document.substrate_observations.find(
    (candidate) => candidate.kind === "component_owner_roots",
  );
  for (const binding of componentBindings)
    if (
      componentObservation?.disposition === "observed" &&
      binding.existence === "existing" &&
      !bindingPaths(binding).some((candidate) =>
        pathOrPatternWithinRoots(candidate, componentRoots),
      )
    )
      invalid(
        "feasibility_component_binding_outside_owner_roots",
        `${binding.key}:${componentRoots.join(",")}`,
      );
  const routeObservation = document.substrate_observations.find(
    (candidate) => candidate.kind === "route_owner_roots",
  );
  if (
    routeObservation?.disposition === "observed" &&
    !bindingPaths(routeBinding).some((candidate) =>
      pathOrPatternWithinRoots(candidate, routeRoots),
    )
  )
    invalid(
      "feasibility_route_binding_outside_owner_roots",
      `${routeBinding.key}:${routeRoots.join(",")}`,
    );
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

function bindingPaths(binding: DeliveryBindingV2): string[] {
  return [binding.target, ...binding.carrier_paths];
}

function pathOrPatternWithinRoots(value: string, roots: string[]): boolean {
  const slash = value.replace(/\\/gu, "/");
  const firstPattern = slash.search(/[*?\[\]{}]/u);
  const staticPrefix = (
    firstPattern === -1 ? slash : slash.slice(0, firstPattern)
  ).replace(/\/$/u, "");
  return roots.some(
    (root) => staticPrefix === root || staticPrefix.startsWith(`${root}/`),
  );
}
