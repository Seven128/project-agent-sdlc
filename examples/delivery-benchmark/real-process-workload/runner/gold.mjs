import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const goldPath = new URL("../semantic-gold.json", import.meta.url);
const GOLD_FACT_IDS = Object.freeze([
  "catalog-resolution-ready",
  "pricing-currency-cny",
  "inventory-nonnegative",
  "checkout-enabled",
  "degraded-fallback-visible",
  "audit-event-emitted",
  "retry-budget-bounded",
  "health-live",
]);

export async function loadSemanticGold() {
  const gold = JSON.parse(await readFile(goldPath, "utf8"));
  if (
    gold.schema_version !== "long-task-real-process-semantic-gold-v1" ||
    gold.facts.length !== GOLD_FACT_IDS.length
  )
    throw new Error("real_process_gold_schema_invalid");
  const actualIds = gold.facts.map((fact) => fact.id).sort();
  if (JSON.stringify(actualIds) !== JSON.stringify([...GOLD_FACT_IDS].sort()))
    throw new Error("real_process_gold_fact_set_invalid");
  return gold;
}

export async function evaluateIndependentGold({ state, caseId }) {
  const gold = await loadSemanticGold();
  const facts = evaluateGoldFacts(structuredClone(state));
  const factRows = gold.facts.map((fact) => ({
    fact_id: fact.id,
    expected: fact.expected,
    actual: facts[fact.id],
    matches: facts[fact.id] === fact.expected,
  }));
  const semanticConformant = factRows.every((fact) => fact.matches);
  const boundaryConformant =
    caseId === "correct-control" || caseId === "wrong-product-value";
  const conformant = semanticConformant && boundaryConformant;
  const result = {
    schema_version: "long-task-real-process-gold-result-v1",
    observer: "real-process-gold-v1",
    independent_of_harness: true,
    case_id: caseId,
    semantic_conformant: semanticConformant,
    boundary_conformant: boundaryConformant,
    conformant,
    facts: factRows,
  };
  return {
    ...result,
    result_sha256: digestCanonical(result),
  };
}

export async function evaluateCounterfactualGold({ baseline, mutation }) {
  const gold = await loadSemanticGold();
  const mutated = structuredClone(baseline);
  replaceJsonPointer(mutated, mutation.pointer, mutation.value);
  const before = evaluateGoldFacts(structuredClone(baseline));
  const after = evaluateGoldFacts(mutated);
  const changed = GOLD_FACT_IDS.filter((id) => before[id] !== after[id]);
  const expectedAffected = new Set(mutation.affected_fact_ids);
  const preserved = new Set(mutation.preserved_fact_ids);
  const allowedFanout = new Set(mutation.allowed_fanout_fact_ids);
  const affectedChanged = [...expectedAffected].every((id) =>
    changed.includes(id),
  );
  const preservedUnchanged = [...preserved].every(
    (id) => !changed.includes(id),
  );
  const unexpected = changed.filter(
    (id) => !expectedAffected.has(id) && !allowedFanout.has(id),
  );
  const result = {
    schema_version: "long-task-real-process-counterfactual-gold-v1",
    id: mutation.id,
    passed: affectedChanged && preservedUnchanged && unexpected.length === 0,
    baseline_observation_count: gold.facts.length,
    mutated_observation_count: gold.facts.length,
    changed_fact_ids: changed,
    affected_changed: affectedChanged,
    preserved_unchanged: preservedUnchanged,
    unexpected_changed_fact_ids: unexpected,
  };
  return {
    ...result,
    result_sha256: digestCanonical(result),
  };
}

function evaluateGoldFacts(state) {
  return {
    "catalog-resolution-ready":
      state.mode === "normal"
        ? state.catalog.primary_ready === true
        : state.mode === "degraded" && state.catalog.fallback_ready === true,
    "pricing-currency-cny": state.pricing.currency === "CNY",
    "inventory-nonnegative":
      Number.isInteger(state.inventory.available) &&
      state.inventory.available >= 0,
    "checkout-enabled": state.checkout.enabled === true,
    "degraded-fallback-visible":
      state.mode === "normal" || state.catalog.fallback_ready === true,
    "audit-event-emitted": state.observability.audit_event_emitted === true,
    "retry-budget-bounded":
      Number.isInteger(state.resilience.retry_budget) &&
      state.resilience.retry_budget >= 0 &&
      state.resilience.retry_budget <= 5,
    "health-live": state.health.live === true,
  };
}

function replaceJsonPointer(target, pointer, value) {
  const segments = pointer
    .split("/")
    .slice(1)
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  if (!segments.length) throw new Error("real_process_gold_pointer_root");
  const key = segments.pop();
  let current = target;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current))
      throw new Error(`real_process_gold_pointer_missing:${pointer}`);
    current = current[segment];
  }
  if (!current || typeof current !== "object" || !(key in current))
    throw new Error(`real_process_gold_pointer_missing:${pointer}`);
  current[key] = value;
}

function digestCanonical(value) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
