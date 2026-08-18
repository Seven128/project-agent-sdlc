import { buildUnitHotspots } from "./self_hosting_cost_model.mjs";

export function buildCostHotspots(fixed, declared, observed, maintenance) {
  const entries = [];
  appendFixed(entries, fixed);
  appendDeclared(entries, declared);
  appendObserved(entries, observed);
  appendMaintenance(entries, maintenance);
  return buildUnitHotspots(entries);
}

function appendFixed(entries, fixed) {
  for (const file of fixed.installed_surface.files) {
    add(entries, "bytes", file.bytes, `fixed.installed/${file.path}`);
  }
  add(
    entries,
    "bytes",
    fixed.default_workflow_prompt.bytes,
    "fixed.default_workflow_prompt",
    { additive: false },
  );
  for (const file of fixed.default_context.files) {
    add(entries, "bytes", file.bytes, `fixed.default_context/${file.path}`, {
      additive: false,
    });
  }
}

function appendDeclared(entries, declared) {
  for (const file of declared.skill_components) {
    add(entries, "bytes", file.bytes, `declared.skill/${file.path}`, {
      observation: "declared_not_observed",
    });
  }
}

function appendObserved(entries, observed) {
  if (
    observed.candidate?.availability !== "available" ||
    observed.provenance?.availability !== "available" ||
    observed.current_candidate_opened_file_bytes?.availability !== "available"
  )
    return;
  for (
    const file of observed.current_candidate_opened_file_bytes?.value?.files ??
    []
  ) {
    add(entries, "bytes", file.bytes, `observed.${file.kind}/${file.path}`);
  }
  for (const [name, measurement] of Object.entries(
    observed.measurements ?? {},
  )) {
    if (measurement.availability !== "available") continue;
    add(
      entries,
      observationUnit(name),
      measurement.value,
      `observed.${name}`,
    );
  }
}

function appendMaintenance(entries, maintenance) {
  for (const mapping of maintenance.source_mappings.mappings) {
    add(
      entries,
      "projection_files",
      mapping.totals.projected_expected.file_count,
      `maintenance.projection_fanout/${mapping.source}->${mapping.target}`,
      { additive: false },
    );
    for (const file of mapping.canonical_source_files) {
      add(
        entries,
        "bytes",
        file.utf8_bytes,
        `maintenance.owner/${file.path}`,
      );
    }
    for (const file of mapping.projected_target_files) {
      if (file.actual_utf8_bytes === null) continue;
      add(
        entries,
        "bytes",
        file.actual_utf8_bytes,
        `maintenance.projection/${file.path}`,
      );
    }
  }
  for (const file of maintenance.package_archive.files) {
    add(entries, "bytes", file.bytes, `maintenance.package/${file.path}`);
  }
  for (const [suite, shape] of Object.entries(
    maintenance.test_suites.suites,
  )) {
    add(entries, "test_files", shape.file_count, `maintenance.suite/${suite}`, {
      additive: false,
    });
  }
  for (const report of maintenance.test_suites.timing.reports ?? []) {
    for (const file of report.files) {
      add(
        entries,
        "milliseconds",
        file.duration_ms,
        `maintenance.test/${file.path}`,
        { candidate_binding: "unverified" },
      );
    }
  }
}

function observationUnit(name) {
  if (name === "input_tokens" || name === "total_tokens") return "tokens";
  if (name === "wall_time_ms") return "milliseconds";
  if (name === "total_tool_calls") return "tool_calls";
  return "tool_turns";
}

function add(entries, unit, value, key, details = {}) {
  entries.push({ unit, value, key, ...details });
}
