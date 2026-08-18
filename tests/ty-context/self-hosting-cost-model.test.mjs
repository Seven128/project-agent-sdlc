import assert from "node:assert/strict";
import test from "node:test";
import {
  buildUnitHotspots,
  sortHotspots,
  stableMeasurementDigest,
  stableMeasurementProjection,
  unavailableMeasurement,
} from "../../tools/self_hosting_cost_model.mjs";
import { buildCostHotspots } from "../../tools/self_hosting_cost_hotspots.mjs";

test("unavailable measurements are explicit and cannot silently mean zero", () => {
  assert.deepEqual(unavailableMeasurement("trace_missing"), {
    availability: "unavailable",
    reason: "trace_missing",
  });
  assert.deepEqual(unavailableMeasurement("trace_missing", { source: "host" }), {
    availability: "unavailable",
    reason: "trace_missing",
    details: { source: "host" },
  });
  assert.throws(() => unavailableMeasurement(""), /reason_required/u);
});

test("hotspots sort only within one unit and use deterministic POSIX ties", () => {
  const input = [
    { unit: "bytes", value: 9, path: "z\\same.md" },
    { unit: "bytes", value: 10, key: "z\\large" },
    { unit: "bytes", value: 9, path: "a/same.md" },
  ];
  const expected = [
    { unit: "bytes", value: 10, key: "z/large" },
    { unit: "bytes", value: 9, path: "a/same.md" },
    { unit: "bytes", value: 9, path: "z/same.md" },
  ];
  assert.deepEqual(sortHotspots(input), expected);
  assert.deepEqual(sortHotspots([...input].reverse()), expected);
  assert.throws(
    () =>
      sortHotspots([
        ...input,
        { unit: "tool_turns", value: 1, key: "host" },
      ]),
    /cross_unit_hotspot_sort_forbidden/u,
  );
  assert.deepEqual(
    buildUnitHotspots([
      { unit: "tool_turns", value: 2, key: "host\\total" },
      ...input,
    ]),
    [
      { unit: "bytes", hotspots: expected },
      {
        unit: "tool_turns",
        hotspots: [{ unit: "tool_turns", value: 2, key: "host/total" }],
      },
    ],
  );
});

test("observed hotspots require provenance and complete candidate-file binding", () => {
  const fixed = {
    installed_surface: { files: [] },
    default_workflow_prompt: { bytes: 0 },
    default_context: { files: [] },
  };
  const declared = { skill_components: [] };
  const maintenance = {
    source_mappings: { mappings: [] },
    package_archive: { files: [] },
    test_suites: { suites: {}, timing: { availability: "unavailable" } },
  };
  const observed = {
    candidate: { availability: "available" },
    provenance: { availability: "available" },
    current_candidate_opened_file_bytes: {
      availability: "unavailable",
      reason: "opened_file_not_candidate_bound",
    },
    measurements: {
      input_tokens: { availability: "available", value: 10 },
    },
  };
  const blocked = buildCostHotspots(fixed, declared, observed, maintenance);
  assert.ok(
    blocked.flatMap((group) => group.hotspots).every(
      (entry) => !entry.key.startsWith("observed."),
    ),
  );
  const admitted = buildCostHotspots(
    fixed,
    declared,
    {
      ...observed,
      current_candidate_opened_file_bytes: {
        availability: "available",
        value: { files: [], total_bytes: 0 },
      },
    },
    maintenance,
  );
  assert.ok(
    admitted.flatMap((group) => group.hotspots).some(
      (entry) => entry.key === "observed.input_tokens",
    ),
  );
});

test("measurement digest excludes volatile location, clock, and tarball fields", () => {
  const left = {
    generated_at: "2026-08-19T00:00:00.000Z",
    repository_root: "C:\\Dev\\first",
    fixed: { bytes: 42, key: "project_context\\global.md" },
    observed_host: { input_tokens: 900, wall_time_ms: 1000 },
    maintenance_distribution: {
      test_suites: {
        timing: {
          availability: "unavailable",
          reason: "candidate_binding_not_provided_by_test_suite_timing_v2",
          details: { reports: [{ status: "passed", wall_time_ms: 100 }] },
        },
      },
      structural_cost_owner: {
        current_report: {
          availability: "unavailable",
          reason: "candidate_binding_not_provided_by_structural_report_v1",
          details: { sha256: "a".repeat(64), owner_status: "passed" },
        },
      },
    },
    npm_tarball: {
      filename: "package-a.tgz",
      size: 120,
      tarball_bytes: { value: 120, toolchain_bound: true },
      integrity: "sha512-a",
      files: [{ path: "package\\README.md", size: 12 }],
    },
  };
  const right = {
    npm_tarball: {
      files: [{ size: 12, path: "package/README.md" }],
      integrity: "sha512-b",
      size: 999,
      tarball_bytes: { value: 999, toolchain_bound: true },
      filename: "package-b.tgz",
    },
    observed_host: { wall_time_ms: 9000, input_tokens: 900 },
    maintenance_distribution: {
      structural_cost_owner: {
        current_report: {
          reason: "candidate_binding_not_provided_by_structural_report_v1",
          availability: "unavailable",
          details: { owner_status: "failed", sha256: "b".repeat(64) },
        },
      },
      test_suites: {
        timing: {
          reason: "candidate_binding_not_provided_by_test_suite_timing_v2",
          availability: "unavailable",
          details: { reports: [{ status: "failed", wall_time_ms: 900 }] },
        },
      },
    },
    fixed: { key: "project_context/global.md", bytes: 42 },
    repository_root: "D:\\Elsewhere\\second",
    generated_at: "2030-01-01T00:00:00.000Z",
  };
  assert.deepEqual(
    stableMeasurementProjection(left),
    stableMeasurementProjection(right),
  );
  assert.equal(stableMeasurementDigest(left), stableMeasurementDigest(right));
  assert.notEqual(
    stableMeasurementDigest(left),
    stableMeasurementDigest({ ...left, fixed: { ...left.fixed, bytes: 43 } }),
  );
  for (const files of [
    [{ path: "package/OTHER.md", size: 12 }],
    [{ path: "package/README.md", size: 13 }],
  ]) {
    assert.notEqual(
      stableMeasurementDigest(left),
      stableMeasurementDigest({
        ...left,
        npm_tarball: { ...left.npm_tarball, files },
      }),
    );
  }
});
