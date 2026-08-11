import type { DeliveryBindingV2 } from "./long-task-delivery-types.js";

/**
 * Ephemeral compiler identity for one authored Outcome-local Binding.
 * Authored Contracts keep their existing local Binding keys.
 */
export interface ScopedDeliveryBindingV2 {
  outcome_key: string;
  local_key: string;
  binding_ref: string;
  binding: DeliveryBindingV2;
}

export function scopeDeliveryBinding(
  outcomeKey: string,
  binding: DeliveryBindingV2,
): ScopedDeliveryBindingV2 {
  return {
    outcome_key: outcomeKey,
    local_key: binding.key,
    binding_ref: `${outcomeKey}.${binding.key}`,
    binding,
  };
}

export function scopeDeliveryBindings(
  outcomeKey: string,
  bindings: readonly DeliveryBindingV2[],
): ScopedDeliveryBindingV2[] {
  return bindings.map((binding) => scopeDeliveryBinding(outcomeKey, binding));
}
