import {
  stableMeasurementDigest,
  unavailableMeasurement,
} from "./self_hosting_cost_model.mjs";
import {
  readRepositoryRegular,
  sha256,
} from "./self_hosting_cost_repository.mjs";

const baselinePath =
  "tests/ty-context/fixtures/self-hosting-cost-baseline.json";

export function aggregateMetricIndex(fixed, declared, maintenance) {
  const metrics = [];
  const add = (unit, value, key) => metrics.push({ key, unit, value });
  add("files", fixed.installed_surface.file_count, "fixed.installed_surface");
  add("bytes", fixed.installed_surface.bytes, "fixed.installed_surface");
  add(
    "bytes",
    fixed.injected_agents.runtime_projection.bytes,
    "fixed.injected_agents",
  );
  add(
    "bytes",
    fixed.default_workflow_prompt.bytes,
    "fixed.default_workflow_prompt",
  );
  add("files", fixed.default_context.files.length, "fixed.default_context");
  add("bytes", fixed.default_context.total_bytes, "fixed.default_context");
  add(
    "files",
    declared.skill_components.length,
    "declared.skill_components",
  );
  add(
    "bytes",
    sum(declared.skill_components, "bytes"),
    "declared.skill_components",
  );
  add("routes", declared.reference_routes.length, "declared.reference_routes");
  add(
    "files",
    declared.main_skill_route.components.length,
    "declared.route.main_skill",
  );
  add(
    "bytes",
    declared.main_skill_route.unique_bytes,
    "declared.route.main_skill",
  );
  for (const route of declared.reference_routes) {
    add("files", route.components.length, `declared.route.${route.route}`);
    add("bytes", route.unique_bytes, `declared.route.${route.route}`);
  }
  add(
    "files",
    declared.minimum_context_route.files.length,
    "declared.minimum_context",
  );
  add(
    "bytes",
    declared.minimum_context_route.total_bytes,
    "declared.minimum_context",
  );
  addMappingMetrics(metrics, maintenance.source_mappings);
  add(
    "files",
    maintenance.package_archive.file_count,
    "maintenance.npm_unpacked",
  );
  add(
    "bytes",
    maintenance.package_archive.unpacked_bytes,
    "maintenance.npm_unpacked",
  );
  for (const [suite, shape] of Object.entries(maintenance.test_suites.suites)) {
    add("files", shape.file_count, `maintenance.suite.${suite}`);
    for (const lane of shape.lanes) {
      add("files", lane.file_count, `maintenance.suite.${suite}.${lane.key}`);
    }
  }
  assertUniqueMetrics(metrics);
  return metrics.sort(byMetric);
}

export function mappingBlastRadius(sourceMappings) {
  return sourceMappings.mappings.map((mapping) => ({
    owner: mapping.source,
    projection: mapping.target,
    owner_file_count: mapping.totals.canonical_source.file_count,
    projection_file_count: mapping.totals.projected_expected.file_count,
  }));
}

export function structuralView(value) {
  return {
    baseline: {
      path: value.baseline.path,
      schema_version: value.baseline.schema_version,
      workload: value.baseline.workload,
      sha256: value.baseline.sha256,
    },
    current_report: value.current_report,
  };
}

export async function collectDiagnosticBaseline(
  currentMetrics,
  currentEnvironment,
) {
  const input = await readRepositoryRegular(baselinePath, { optional: true });
  if (!input) {
    return unavailableMeasurement("diagnostic_baseline_missing", {
      path: baselinePath,
    });
  }
  const value = JSON.parse(input.bytes.toString("utf8"));
  if (
    value?.schema_version !== "self-hosting-cost-baseline-v1" ||
    !Array.isArray(value.metrics)
  ) {
    throw new Error("self_hosting_diagnostic_baseline_schema_invalid");
  }
  const baselineMetrics = value.metrics.map(validateMetric).sort(byMetric);
  assertUniqueMetrics(baselineMetrics);
  const current = new Map(
    currentMetrics.map((entry) => [metricKey(entry), entry]),
  );
  const previous = new Map(
    baselineMetrics.map((entry) => [metricKey(entry), entry]),
  );
  const environmentExactMatch =
    value.environment !== undefined &&
    stableMeasurementDigest(value.environment) ===
      stableMeasurementDigest(currentEnvironment);
  const deltas = environmentExactMatch
    ? [...current]
        .filter(([key]) => previous.has(key))
        .map(([key, entry]) => ({
          ...entry,
          baseline_value: previous.get(key).value,
          delta: entry.value - previous.get(key).value,
        }))
        .sort(byMetric)
    : unavailableMeasurement("diagnostic_baseline_environment_mismatch");
  return {
    availability: "available",
    source: "tracked_diagnostic_snapshot",
    value: {
      path: baselinePath,
      sha256: sha256(input.bytes),
      candidate: value.candidate ?? null,
      candidate_provenance: value.candidate
        ? "recorded_snapshot_not_recomputed"
        : "not_provided",
      environment: value.environment ?? null,
      environment_exact_match: environmentExactMatch,
      measurement_digest: value.measurement_digest ?? null,
      measurement_digest_provenance: value.measurement_digest
        ? "recorded_snapshot_not_recomputed"
        : "not_provided",
      deltas,
      current_only: currentMetrics
        .filter((entry) => !previous.has(metricKey(entry)))
        .sort(byMetric),
      baseline_only: baselineMetrics
        .filter((entry) => !current.has(metricKey(entry)))
        .sort(byMetric),
    },
  };
}

function addMappingMetrics(metrics, mappings) {
  const add = (unit, value, key) => metrics.push({ key, unit, value });
  add("mappings", mappings.mappings.length, "maintenance.source_mappings");
  for (const [name, totals] of Object.entries(mappings.totals)) {
    add("files", totals.file_count, `maintenance.source_mappings.${name}`);
    add("bytes", totals.utf8_bytes, `maintenance.source_mappings.${name}`);
  }
}

function validateMetric(value) {
  if (
    !value ||
    typeof value.key !== "string" ||
    typeof value.unit !== "string" ||
    !Number.isFinite(value.value) ||
    value.value < 0
  ) {
    throw new Error("self_hosting_diagnostic_baseline_metric_invalid");
  }
  return { key: value.key, unit: value.unit, value: value.value };
}

function assertUniqueMetrics(metrics) {
  const keys = metrics.map(metricKey);
  if (new Set(keys).size !== keys.length) {
    throw new Error("self_hosting_metric_identity_duplicate");
  }
}

function metricKey(value) {
  return `${value.unit}\0${value.key}`;
}

function byMetric(left, right) {
  const leftKey = metricKey(left);
  const rightKey = metricKey(right);
  return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
}

function sum(entries, field) {
  return entries.reduce((total, entry) => total + entry[field], 0);
}
