import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import {
  planLongTaskSuiteLanes,
  selectPackageSuiteFileNames,
} from "./test_suite_lane_policy.mjs";
import {
  CRITICAL_TEST_SENTINELS,
  LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY,
  LONG_TASK_EXCLUSIVE_TEST_FILES,
  LONG_TASK_FOCUSED_TESTS,
  LONG_TASK_ISOLATED_TEST_FILES,
  LONG_TASK_PURE_TEST_FILES,
  LONG_TASK_TRUST_TEST_FILES,
} from "./test_suite_policy.mjs";
import { parsePackJson, runCommand } from "./release_publish_helpers.mjs";
import { unavailableMeasurement } from "./self_hosting_cost_model.mjs";

export async function collectPackageArchive(repository) {
  const [npmVersion, packed] = await Promise.all([
    runCommand("npm", ["--version"], { cwd: repository, capture: true }),
    runCommand(
      "npm",
      [
        "pack",
        "--dry-run",
        "--ignore-scripts",
        "--json",
        "--workspace",
        "project-tiny-context-harness",
      ],
      { cwd: repository, capture: true },
    ),
  ]);
  const pack = parsePackJson(packed.stdout);
  const files = [...(pack.files ?? [])]
    .map((entry) => ({
      path: normalizePath(entry.path),
      bytes: requireNonnegativeNumber(entry.size, "npm_pack_file_size"),
      mode: entry.mode ?? null,
    }))
    .sort(byPath);
  return {
    status: "measured_toolchain_bound",
    package: `${pack.name}@${pack.version}`,
    npm_version: npmVersion.stdout.trim(),
    file_count: files.length,
    unpacked_bytes: requireNonnegativeNumber(
      pack.unpackedSize,
      "npm_pack_unpacked_size",
    ),
    tarball_bytes: {
      value: requireNonnegativeNumber(pack.size, "npm_pack_size"),
      toolchain_bound: true,
      excluded_from_stable_measurement_digest: true,
    },
    files,
  };
}

export async function collectTestSuiteShape(repository, timingPaths = []) {
  const testRoot = path.join(repository, "tests", "ty-context");
  const available = (await readdir(testRoot))
    .filter((name) => name.endsWith(".test.mjs"))
    .sort();
  const suites = Object.fromEntries(
    ["default", "long-task", "long-task-trust"].map((suite) => {
      const files = selectPackageSuiteFileNames(available, suite);
      const lanes =
        suite === "default"
          ? [{ key: "serial", file_count: files.length, concurrency: 1 }]
          : planLongTaskSuiteLanes(
              files,
              suite,
              LONG_TASK_DEFAULT_ISOLATED_CONCURRENCY,
            ).lanes.map((lane) => ({
              key: lane.key,
              file_count: lane.names.length,
              concurrency: lane.concurrency,
            }));
      return [suite, { file_count: files.length, files, lanes }];
    }),
  );
  return {
    status: "measured_policy_shape",
    population: {
      all_direct_test_files: available.length,
      long_task_pure: LONG_TASK_PURE_TEST_FILES.length,
      long_task_isolated: LONG_TASK_ISOLATED_TEST_FILES.length,
      long_task_exclusive: LONG_TASK_EXCLUSIVE_TEST_FILES.length,
      long_task_trust: LONG_TASK_TRUST_TEST_FILES.length,
      long_task_focused: LONG_TASK_FOCUSED_TESTS.length,
      critical_sentinels: CRITICAL_TEST_SENTINELS.length,
    },
    suites,
    timing: await collectTimingInputs(repository, timingPaths),
  };
}

export async function collectStructuralOwner(repository, reportPath) {
  const baselinePath =
    "tests/ty-context/fixtures/structural-closure-cost-baseline.json";
  const baseline = await readJsonRegular(repository, baselinePath);
  const owner = {
    baseline: {
      path: baselinePath,
      schema_version: baseline.schema_version,
      workload: baseline.workload,
      sha256: await fileSha256(repository, baselinePath),
      thresholds_copied_into_self_hosting_report: false,
    },
  };
  if (!reportPath)
    return {
      ...owner,
      current_report: unavailableMeasurement("structural_report_not_supplied"),
    };
  const value = await readJsonRegular(repository, reportPath, { optional: true });
  if (!value)
    return {
      ...owner,
      current_report: unavailableMeasurement("structural_report_missing", {
        path: normalizePath(reportPath),
      }),
    };
  if (value.schema_version !== "structural-closure-cost-report-v1")
    throw new Error("self_hosting_structural_report_schema_invalid");
  return {
    ...owner,
    current_report: unavailableMeasurement(
      "candidate_binding_not_provided_by_structural_report_v1",
      {
        path: normalizePath(reportPath),
        sha256: await fileSha256(repository, reportPath),
        owner_status: value.status,
        profile: value.baseline?.profile ?? null,
        workload: value.baseline?.workload ?? null,
        copied_thresholds: false,
        stable_metrics: structuralMetricProjection(value.metrics),
      },
    ),
  };
}

function structuralMetricProjection(metrics) {
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    return unavailableMeasurement("structural_metrics_not_present");
  }
  return {
    cardinality: numericProjection(metrics.cardinality, [
      "K_fact",
      "K_rule",
      "M_value",
      "M_total",
      "N_dag",
    ]),
    bytes: numericProjection(metrics.bytes, [
      "source",
      "contract",
      "evidence",
      "default_context",
    ]),
    duplicate_saved_bytes: {
      source: optionalNonnegativeNumber(
        metrics.duplicate_blocks?.source?.saved_bytes,
      ),
      contract: optionalNonnegativeNumber(
        metrics.duplicate_blocks?.contract?.saved_bytes,
      ),
    },
    revision_blast_radius: numericProjection(metrics.revision_blast_radius, [
      "changed_files",
      "changed_lines",
      "changed_bytes",
    ]),
  };
}

function numericProjection(value, keys) {
  return Object.fromEntries(
    keys.map((key) => [key, optionalNonnegativeNumber(value?.[key])]),
  );
}

function optionalNonnegativeNumber(value) {
  return Number.isFinite(value) && value >= 0 ? value : null;
}

async function collectTimingInputs(repository, timingPaths) {
  if (timingPaths.length === 0)
    return unavailableMeasurement("test_timing_not_supplied");
  const reports = [];
  for (const timingPath of [...new Set(timingPaths)].sort()) {
    const value = await readJsonRegular(repository, timingPath);
    if (value.schema_version !== "test-suite-timing-v2")
      throw new Error(`self_hosting_test_timing_schema_invalid:${timingPath}`);
    reports.push({
      path: normalizePath(timingPath),
      suite: value.suite,
      file_count: value.file_count,
      test_count: value.test_count,
      wall_time_ms: value.wall_time_ms,
      status: value.status,
      candidate_binding: "unavailable_in_test_suite_timing_v2",
      files: [...(value.files ?? [])]
        .map((entry) => ({
          path: normalizePath(entry.file),
          duration_ms: entry.duration_ms,
          test_count: entry.test_count,
          status: entry.status,
        }))
        .sort(byPath),
    });
  }
  return unavailableMeasurement(
    "candidate_binding_not_provided_by_test_suite_timing_v2",
    { reports },
  );
}

async function readJsonRegular(repository, relative, { optional = false } = {}) {
  const absolute = containedPath(repository, relative);
  let info;
  try {
    info = await lstat(absolute);
  } catch (error) {
    if (optional && error?.code === "ENOENT") return null;
    throw error;
  }
  if (info.isSymbolicLink() || !info.isFile())
    throw new Error(`self_hosting_input_not_regular:${normalizePath(relative)}`);
  return JSON.parse(await readFile(absolute, "utf8"));
}

async function fileSha256(repository, relative) {
  return createHash("sha256")
    .update(await readFile(containedPath(repository, relative)))
    .digest("hex");
}

function containedPath(repository, relative) {
  const target = path.resolve(repository, ...normalizePath(relative).split("/"));
  const relation = path.relative(repository, target);
  if (relation === ".." || relation.startsWith(`..${path.sep}`) || path.isAbsolute(relation))
    throw new Error(`self_hosting_path_outside_repository:${relative}`);
  return target;
}

function normalizePath(value) {
  return String(value).replaceAll("\\", "/").replace(/^\.\//u, "");
}

function requireNonnegativeNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(label);
  return value;
}

function byPath(left, right) {
  return left.path < right.path ? -1 : left.path > right.path ? 1 : 0;
}
