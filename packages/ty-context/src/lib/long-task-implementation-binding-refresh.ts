import type { NextAuthorityMaterialsV2 } from "./long-task-delivery-types.js";
import { canonicalValueJson } from "./strict-codec.js";

export interface ImplementationBindingRefreshBoundaryV2 {
  verifier_content_changed: boolean;
  verifier_runtime_locator_changed: boolean;
  risk_changed: boolean;
}

export function implementationBindingRefreshTargets(
  previous: NextAuthorityMaterialsV2,
  next: NextAuthorityMaterialsV2,
  boundary: ImplementationBindingRefreshBoundaryV2,
): string[] {
  if (
    boundary.verifier_content_changed ||
    boundary.verifier_runtime_locator_changed ||
    boundary.risk_changed ||
    !same(previous.context_snapshot, next.context_snapshot) ||
    !same(previous.design_semantics, next.design_semantics) ||
    previous.design_non_binding_contract_sha256 !==
      next.design_non_binding_contract_sha256 ||
    previous.design_non_binding_source_sha256 !==
      next.design_non_binding_source_sha256
  )
    return [];

  const before = new Map(
    previous.design_implementation_bindings.map((binding) => [
      binding.target_key,
      binding,
    ]),
  );
  const after = new Map(
    next.design_implementation_bindings.map((binding) => [
      binding.target_key,
      binding,
    ]),
  );
  if (
    before.size === 0 ||
    before.size !== after.size ||
    [...before.keys()].some((key) => !after.has(key))
  )
    return [];
  return [...before]
    .filter(([key, binding]) => !same(binding, after.get(key)))
    .map(([key]) => key)
    .sort((left, right) => left.localeCompare(right));
}

function same(left: unknown, right: unknown): boolean {
  return canonicalValueJson(left) === canonicalValueJson(right);
}
