import {
  FORMAL_CLOCK_POLICY,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import { assert, canonical } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertSameSet,
  assertTimestamp,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA } = REAL_PROCESS_SCHEMAS;
const profileKeys = Object.freeze([
  "human_time",
  "meters",
  "provider_event",
  "raw_prompt",
]);
const meterSourceKinds = Object.freeze({
  provider_input_token: "invocation-correlated-provider-event-v1",
  provider_output_token: "invocation-correlated-provider-event-v1",
  provider_cached_input_token: "invocation-correlated-provider-event-v1",
  compute_ms: "windows-job-object-accounting-v1",
  storage_byte_hour: "runner-exact-byte-duration-v1",
});

export function validateFormalScenarioCatalog({
  bundle,
  window,
  accountingPolicy,
  precollectionFrozenAt,
}) {
  const catalogs = [...bundle.files.entries()].filter(
    ([, source]) => source.entry.role === "scenario_catalog",
  );
  assert(catalogs.length === 1, "formal_scenario_catalog_count");
  const [catalogPath, source] = catalogs[0];
  const catalog = parseJson(
    source.bytes,
    `formal_scenario_catalog_json:${catalogPath}`,
  );
  assertExactKeys(
    catalog,
    ["clock_policy", "frozen_at", "scenarios", "schema_version"],
    "formal_scenario_catalog_fields",
  );
  const frozenAt = assertTimestamp(
    catalog.frozen_at,
    "formal_scenario_catalog_frozen_at",
  );
  assert(
    catalog.schema_version === FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA &&
      frozenAt <= window.started &&
      (precollectionFrozenAt === null || frozenAt <= precollectionFrozenAt) &&
      Array.isArray(catalog.scenarios) &&
      canonical(catalog.clock_policy) === canonical(FORMAL_CLOCK_POLICY),
    "formal_scenario_catalog",
  );
  const expected = expectedScenarioDefinitions(accountingPolicy);
  assertSameSet(
    catalog.scenarios.map((scenario) => scenario.scenario_id),
    [...expected.keys()],
    "formal_scenario_catalog_set",
  );
  const scenarios = new Map();
  const usedTaskSources = new Set();
  const usedGoldSources = new Set();
  for (const scenario of catalog.scenarios) {
    assertExactKeys(
      scenario,
      [
        "aggregation",
        "attempt_policy",
        "category",
        "collector_id",
        "comparison_variants",
        "cycle_multiplier",
        "execution_timeout_ms",
        "external_source_requirement",
        "gold_source_ref",
        "kind",
        "measurement_profile",
        "output_protocol",
        "pair_count",
        "scenario_id",
        "scenario_kind",
        "stratum",
        "task_source_ref",
      ],
      `formal_scenario_fields:${scenario.scenario_id}`,
    );
    const expectedBase = expected.get(scenario.scenario_id);
    assert(
      canonical(pickScenarioAccountingFields(scenario)) ===
        canonical(expectedBase) &&
        typeof scenario.collector_id === "string" &&
        scenario.collector_id.length > 0 &&
        scenario.output_protocol === "runner-fresh-child-only-file-v1" &&
        Number.isSafeInteger(scenario.execution_timeout_ms) &&
        scenario.execution_timeout_ms > 0,
      `formal_scenario_definition:${scenario.scenario_id}`,
    );
    assertExactKeys(
      scenario.attempt_policy,
      ["maximum_attempts", "selection"],
      `formal_scenario_attempt_policy:${scenario.scenario_id}`,
    );
    assert(
      scenario.attempt_policy.maximum_attempts === 1 &&
        scenario.attempt_policy.selection === "only-attempt",
      `formal_scenario_attempt_policy:${scenario.scenario_id}`,
    );
    validateMeasurementProfile(
      scenario.measurement_profile,
      scenario.scenario_id,
    );
    validateExternalSourceRequirement(scenario);
    const task = bundle.files.get(scenario.task_source_ref);
    const gold = bundle.files.get(scenario.gold_source_ref);
    assert(
      task?.entry.role === "scenario_source" &&
        task.bytes.length > 0 &&
        gold?.entry.role === "scenario_gold" &&
        gold.bytes.length > 0,
      `formal_scenario_sources:${scenario.scenario_id}`,
    );
    usedTaskSources.add(scenario.task_source_ref);
    usedGoldSources.add(scenario.gold_source_ref);
    scenarios.set(scenario.scenario_id, {
      ...scenario,
      clock_policy: catalog.clock_policy,
      task,
      gold,
    });
  }
  for (const [sourcePath, item] of bundle.files) {
    if (item.entry.role === "scenario_source")
      assert(
        usedTaskSources.has(sourcePath),
        `formal_scenario_source_unused:${sourcePath}`,
      );
    if (item.entry.role === "scenario_gold")
      assert(
        usedGoldSources.has(sourcePath),
        `formal_scenario_gold_unused:${sourcePath}`,
      );
  }
  return scenarios;
}

function validateMeasurementProfile(profile, scenarioId) {
  assertExactKeys(
    profile,
    profileKeys,
    `formal_scenario_measurement_profile_fields:${scenarioId}`,
  );
  validatePresence(
    profile.human_time,
    "runner-interaction-recorder-v1",
    `${scenarioId}:human_time`,
  );
  assert(
    profile.human_time.presence === "required",
    `formal_scenario_human_time_required:${scenarioId}`,
  );
  validatePresence(
    profile.raw_prompt,
    "runner-captured-raw-prompt-v1",
    `${scenarioId}:raw_prompt`,
  );
  validatePresence(
    profile.provider_event,
    "invocation-correlated-provider-event-v1",
    `${scenarioId}:provider_event`,
  );
  assertExactKeys(
    profile.meters,
    Object.keys(meterSourceKinds),
    `formal_scenario_meter_profile_fields:${scenarioId}`,
  );
  for (const [meter, sourceKind] of Object.entries(meterSourceKinds))
    validatePresence(
      profile.meters[meter],
      sourceKind,
      `${scenarioId}:${meter}`,
    );
  const providerRequired = profile.provider_event.presence === "required";
  assert(
    [
      "provider_input_token",
      "provider_output_token",
      "provider_cached_input_token",
    ].every(
      (meter) =>
        (profile.meters[meter].presence === "required") === providerRequired,
    ) && (profile.raw_prompt.presence === "required") === providerRequired,
    `formal_scenario_provider_profile_consistency:${scenarioId}`,
  );
}

function validatePresence(value, requiredSourceKind, label) {
  assert(
    value && typeof value === "object" && !Array.isArray(value),
    `formal_scenario_measurement_presence:${label}`,
  );
  assert(
    value.presence === "required" || value.presence === "forbidden",
    `formal_scenario_measurement_presence:${label}`,
  );
  if (value.presence === "required") {
    assertExactKeys(
      value,
      ["presence", "source_kind"],
      `formal_scenario_measurement_required_fields:${label}`,
    );
    assert(
      value.source_kind === requiredSourceKind,
      `formal_scenario_measurement_source_kind:${label}`,
    );
  } else
    assertExactKeys(
      value,
      ["presence"],
      `formal_scenario_measurement_forbidden_fields:${label}`,
    );
}

function validateExternalSourceRequirement(scenario) {
  if (scenario.kind === "cost") {
    assert(
      scenario.external_source_requirement === null,
      `formal_scenario_external_source_cost:${scenario.scenario_id}`,
    );
    return;
  }
  assertExactKeys(
    scenario.external_source_requirement,
    ["bundle_schema", "required_components", "status"],
    `formal_scenario_external_source_fields:${scenario.scenario_id}`,
  );
  assert(
    scenario.external_source_requirement.status === "external_pending" &&
      scenario.external_source_requirement.bundle_schema ===
        "level4-controlled-incident-source-bundle-v1" &&
      Array.isArray(scenario.external_source_requirement.required_components) &&
      scenario.external_source_requirement.required_components.length > 0 &&
      new Set(scenario.external_source_requirement.required_components).size ===
        scenario.external_source_requirement.required_components.length,
    `formal_scenario_external_source:${scenario.scenario_id}`,
  );
}

function pickScenarioAccountingFields(scenario) {
  return {
    scenario_id: scenario.scenario_id,
    kind: scenario.kind,
    category: scenario.category,
    stratum: scenario.stratum,
    scenario_kind: scenario.scenario_kind,
    comparison_variants: scenario.comparison_variants,
    pair_count: scenario.pair_count,
    aggregation: scenario.aggregation,
    cycle_multiplier: scenario.cycle_multiplier,
    task_source_ref: scenario.task_source_ref,
    gold_source_ref: scenario.gold_source_ref,
  };
}

export function validateFormalScenarioOutput({
  bundle,
  sourceRef,
  subject,
  variantId,
  scenarios,
  usedOutputs,
  sourcePath,
}) {
  const scenario = scenarios.get(subject.scenarioId);
  const output = bundle.files.get(sourceRef);
  assert(
    scenario &&
      output?.entry.role === "scenario_output" &&
      output.bytes.length > 0 &&
      !usedOutputs.has(sourceRef),
    `formal_scenario_output:${sourcePath}`,
  );
  usedOutputs.add(sourceRef);
  const matchesGold = output.bytes.equals(scenario.gold.bytes);
  if (subject.kind === "cost")
    assert(matchesGold, `formal_scenario_cost_gold:${sourcePath}`);
  else if (variantId === "b")
    assert(!matchesGold, `formal_scenario_incident_b_wrong:${sourcePath}`);
  else assert(matchesGold, `formal_scenario_incident_c_correct:${sourcePath}`);
}

export function assertFormalScenarioOutputsConsumed(bundle, usedOutputs) {
  for (const [sourcePath, source] of bundle.files)
    if (source.entry.role === "scenario_output")
      assert(
        usedOutputs.has(sourcePath),
        `formal_scenario_output_unused:${sourcePath}`,
      );
}

function expectedScenarioDefinitions(accountingPolicy) {
  const expected = new Map();
  for (const stratum of accountingPolicy.lifecycle_population.strata)
    for (const category of stratum.categories) {
      const scenarioId =
        accountingPolicy.lifecycle_population.scenario_ids[category];
      expected.set(scenarioId, {
        scenario_id: scenarioId,
        kind: "cost",
        category,
        stratum: stratum.key,
        scenario_kind: "fixed-b-c-same-quality-task",
        comparison_variants: ["b", "c"],
        pair_count: stratum.pair_count,
        aggregation: stratum.aggregation,
        cycle_multiplier: stratum.cycle_multiplier,
        task_source_ref: `scenarios/${scenarioId}/task.txt`,
        gold_source_ref: `scenarios/${scenarioId}/gold.bin`,
      });
    }
  const benefit = accountingPolicy.lifecycle_population.purpose_benefit;
  expected.set(benefit.scenario_id, {
    scenario_id: benefit.scenario_id,
    kind: "purpose_benefit",
    category: null,
    stratum: "incident_once",
    scenario_kind: benefit.scenario_kind,
    comparison_variants: ["b", "c"],
    pair_count: benefit.pair_count,
    aggregation: benefit.aggregation,
    cycle_multiplier: benefit.cycle_multiplier,
    task_source_ref: `scenarios/${benefit.scenario_id}/task.txt`,
    gold_source_ref: `scenarios/${benefit.scenario_id}/gold.bin`,
  });
  return expected;
}
