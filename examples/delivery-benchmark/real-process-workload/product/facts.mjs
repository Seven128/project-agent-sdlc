export const FACT_IDS = Object.freeze([
  "catalog-resolution-ready",
  "pricing-currency-cny",
  "inventory-nonnegative",
  "checkout-enabled",
  "degraded-fallback-visible",
  "audit-event-emitted",
  "retry-budget-bounded",
  "health-live",
]);

export function evaluateProductFacts(state) {
  assertState(state);
  const degraded = state.mode === "degraded";
  const checkoutEnabled = state.checkout.enabled === true;
  const retryBudgetBounded =
    Number.isInteger(state.resilience.retry_budget) &&
    state.resilience.retry_budget >= 0 &&
    state.resilience.retry_budget <= 3;
  return Object.freeze({
    "catalog-resolution-ready":
      checkoutEnabled &&
      (degraded
        ? state.catalog.fallback_ready === true
        : state.catalog.primary_ready === true),
    "pricing-currency-cny": checkoutEnabled && state.pricing.currency === "CNY",
    "inventory-nonnegative":
      checkoutEnabled &&
      Number.isInteger(state.inventory.available) &&
      state.inventory.available >= 0,
    "checkout-enabled": checkoutEnabled,
    "degraded-fallback-visible":
      retryBudgetBounded &&
      (!degraded || state.catalog.fallback_ready === true),
    "audit-event-emitted":
      retryBudgetBounded && state.observability.audit_event_emitted === true,
    "retry-budget-bounded": retryBudgetBounded,
    "health-live": retryBudgetBounded && state.health.live === true,
  });
}

function assertState(state) {
  if (!state || typeof state !== "object")
    throw new Error("roi_product_state_object_required");
  if (!new Set(["normal", "degraded"]).has(state.mode))
    throw new Error(`roi_product_mode_unsupported:${state.mode}`);
  for (const owner of [
    "catalog",
    "pricing",
    "inventory",
    "checkout",
    "observability",
    "resilience",
    "health",
  ])
    if (!state[owner] || typeof state[owner] !== "object")
      throw new Error(`roi_product_state_owner_missing:${owner}`);
}
