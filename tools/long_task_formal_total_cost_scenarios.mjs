import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_roi_policy.mjs";
import {
  assert,
  canonical,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertSameSet,
  assertTimestamp,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA } = REAL_PROCESS_SCHEMAS;

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
    ["frozen_at", "scenarios", "schema_version"],
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
      Array.isArray(catalog.scenarios),
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
        "category",
        "comparison_variants",
        "cycle_multiplier",
        "gold_source_ref",
        "kind",
        "pair_count",
        "scenario_id",
        "scenario_kind",
        "stratum",
        "task_source_ref",
      ],
      `formal_scenario_fields:${scenario.scenario_id}`,
    );
    assert(
      canonical(scenario) === canonical(expected.get(scenario.scenario_id)),
      `formal_scenario_definition:${scenario.scenario_id}`,
    );
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
    scenarios.set(scenario.scenario_id, { ...scenario, task, gold });
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
