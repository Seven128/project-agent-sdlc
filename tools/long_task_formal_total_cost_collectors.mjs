import { REAL_PROCESS_SCHEMAS } from "./long_task_real_process_schema_policy.mjs";
import { assert } from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  assertTimestamp,
  parseJson,
} from "./long_task_formal_total_cost_shared.mjs";

const { FORMAL_TOTAL_COST_COLLECTOR_CATALOG_SCHEMA } = REAL_PROCESS_SCHEMAS;

export function validateFormalCollectorCatalog({
  bundle,
  window,
  precollectionFrozenAt,
  scenarios,
}) {
  const collectorFiles = [...bundle.files.entries()].filter(
    ([, source]) => source.entry.role === "collector",
  );
  const catalogs = collectorFiles.filter(
    ([sourcePath]) => sourcePath === "collectors/catalog.json",
  );
  assert(catalogs.length === 1, "formal_collector_catalog_count");
  const catalog = parseJson(
    catalogs[0][1].bytes,
    "formal_collector_catalog_json",
  );
  assertExactKeys(
    catalog,
    ["collectors", "frozen_at", "schema_version"],
    "formal_collector_catalog_fields",
  );
  const frozenAt = assertTimestamp(
    catalog.frozen_at,
    "formal_collector_catalog_frozen_at",
  );
  assert(
    catalog.schema_version === FORMAL_TOTAL_COST_COLLECTOR_CATALOG_SCHEMA &&
      frozenAt <= window.started &&
      (precollectionFrozenAt === null || frozenAt <= precollectionFrozenAt) &&
      Array.isArray(catalog.collectors) &&
      catalog.collectors.length > 0 &&
      catalog.collectors.length <= 16,
    "formal_collector_catalog",
  );
  const collectors = new Map();
  const usedImplementations = new Set();
  for (const declaration of catalog.collectors) {
    assertExactKeys(
      declaration,
      [
        "collector_id",
        "implementation_ref",
        "output_protocol",
        "runtime_kind",
        "supported_source_kinds",
      ],
      `formal_collector_fields:${declaration.collector_id}`,
    );
    assert(
      typeof declaration.collector_id === "string" &&
        declaration.collector_id.length > 0 &&
        !collectors.has(declaration.collector_id) &&
        declaration.runtime_kind === "node-direct" &&
        declaration.output_protocol === "runner-fresh-child-only-file-v1" &&
        typeof declaration.implementation_ref === "string" &&
        declaration.implementation_ref.startsWith("collectors/") &&
        declaration.implementation_ref !== "collectors/catalog.json" &&
        Array.isArray(declaration.supported_source_kinds) &&
        declaration.supported_source_kinds.length > 0 &&
        declaration.supported_source_kinds.every(
          (value) => typeof value === "string" && value.length > 0,
        ) &&
        new Set(declaration.supported_source_kinds).size ===
          declaration.supported_source_kinds.length,
      `formal_collector:${declaration.collector_id}`,
    );
    const implementation = bundle.files.get(declaration.implementation_ref);
    assert(
      implementation?.entry.role === "collector" &&
        implementation.bytes.length > 0 &&
        !usedImplementations.has(declaration.implementation_ref),
      `formal_collector_implementation:${declaration.collector_id}`,
    );
    usedImplementations.add(declaration.implementation_ref);
    collectors.set(declaration.collector_id, {
      ...declaration,
      implementation_sha256: implementation.entry.sha256,
      implementation,
    });
  }
  for (const [sourcePath] of collectorFiles)
    assert(
      sourcePath === "collectors/catalog.json" ||
        usedImplementations.has(sourcePath),
      `formal_collector_source_unused:${sourcePath}`,
    );
  for (const scenario of scenarios.values()) {
    const collector = collectors.get(scenario.collector_id);
    assert(collector, `formal_scenario_collector:${scenario.scenario_id}`);
    const required = requiredSourceKinds(scenario.measurement_profile);
    assert(
      required.every((sourceKind) =>
        collector.supported_source_kinds.includes(sourceKind),
      ),
      `formal_scenario_collector_capability:${scenario.scenario_id}`,
    );
  }
  return collectors;
}

function requiredSourceKinds(profile) {
  const kinds = [];
  for (const value of [
    profile.human_time,
    profile.raw_prompt,
    profile.provider_event,
    ...Object.values(profile.meters),
  ])
    if (value.presence === "required") kinds.push(value.source_kind);
  return [...new Set(kinds)].sort();
}
