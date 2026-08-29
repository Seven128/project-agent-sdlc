import { readFile } from "node:fs/promises";
import { evaluateProductFacts } from "./facts.mjs";

const requestedScope = process.argv[2] ?? null;
const scope =
  requestedScope === "all"
    ? "all"
    : process.env.TY_CONTEXT_FIXTURE_SECOND_SCOPE
      ? "second"
      : process.env.TY_CONTEXT_FIXTURE_FIRST_SCOPE
        ? "first"
        : (requestedScope ?? "all");
if (!["first", "second", "all"].includes(scope))
  throw new Error(`roi_product_scope_unsupported:${scope}`);

const state = JSON.parse(
  await readFile(new URL("../config/state.json", import.meta.url), "utf8"),
);
const runtimeOptions = new Map(
  process.argv.slice(3).map((argument) => {
    const separator = argument.indexOf("=");
    if (!argument.startsWith("--") || separator < 3)
      throw new Error(`roi_product_runtime_option_invalid:${argument}`);
    return [argument.slice(0, separator), argument.slice(separator + 1)];
  }),
);
if (runtimeOptions.get("--facts") !== "src/facts.mjs")
  throw new Error("roi_product_facts_invocation_required");
const externalInputPath =
  runtimeOptions.get("--external-input") ??
  state.runtime?.external_input_path ??
  null;
if (externalInputPath) {
  let externalInput = null;
  try {
    externalInput = JSON.parse(await readFile(externalInputPath, "utf8"));
  } catch (error) {
    if (
      error?.code !== "ENOENT" ||
      state.runtime?.missing_input_behavior !== "preserve-product-state"
    )
      throw error;
  }
  if (externalInput) {
    if (typeof externalInput.checkout_enabled === "boolean")
      state.checkout.enabled = externalInput.checkout_enabled;
    if (typeof externalInput.currency === "string")
      state.pricing.currency = externalInput.currency;
    if (Number.isInteger(externalInput.retry_budget))
      state.resilience.retry_budget = externalInput.retry_budget;
  }
}
const facts = evaluateProductFacts(state);
const observations = {};

if (scope === "first" || scope === "all") {
  observations["fact.first.observable"] = firstAggregate(facts);
  observations["fact.first.architecture-boundary"] = firstAggregate(facts);
  addAssertion(
    observations,
    "first",
    "catalog-resolution-ready",
    facts["catalog-resolution-ready"],
  );
  addAssertion(
    observations,
    "first",
    "pricing-currency-cny",
    facts["pricing-currency-cny"],
  );
  addAssertion(
    observations,
    "first",
    "inventory-nonnegative",
    facts["inventory-nonnegative"],
  );
  addAssertion(
    observations,
    "first",
    "checkout-enabled",
    facts["checkout-enabled"],
  );
  addAssertion(observations, "first", "first-liveness", true);
  addAssertion(
    observations,
    "first",
    "first-relations-na",
    !firstAggregate(facts),
  );
}

if (scope === "second" || scope === "all") {
  observations["fact.second.observable"] = secondAggregate(facts);
  observations["fact.second.architecture-boundary"] = secondAggregate(facts);
  addAssertion(
    observations,
    "second",
    "degraded-fallback-visible",
    facts["degraded-fallback-visible"],
  );
  addAssertion(
    observations,
    "second",
    "audit-event-emitted",
    facts["audit-event-emitted"],
  );
  addAssertion(
    observations,
    "second",
    "retry-budget-bounded",
    facts["retry-budget-bounded"],
  );
  addAssertion(observations, "second", "health-live", facts["health-live"]);
  addAssertion(observations, "second", "second-liveness", true);
  addAssertion(
    observations,
    "second",
    "second-relations-na",
    !secondAggregate(facts),
  );
}

process.stdout.write(
  `${JSON.stringify({
    schema_version: "ty-context-product-observation-v1",
    observations,
  })}\n`,
);

function addAssertion(observationsValue, outcome, assertion, value) {
  observationsValue[`assertion.${outcome}.${outcome}-check.${assertion}`] =
    value;
}

function firstAggregate(facts) {
  return [
    "catalog-resolution-ready",
    "pricing-currency-cny",
    "inventory-nonnegative",
    "checkout-enabled",
  ].every((key) => facts[key] === true);
}

function secondAggregate(facts) {
  return [
    "degraded-fallback-visible",
    "audit-event-emitted",
    "retry-budget-bounded",
    "health-live",
  ].every((key) => facts[key] === true);
}
