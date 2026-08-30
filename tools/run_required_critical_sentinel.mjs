import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CRITICAL_TEST_SENTINELS,
  TEST_ROOT,
  criticalSentinelsForSuite,
} from "./test_suite_policy.mjs";
import { selectPackageTestNames } from "./test_suite_selection.mjs";
import { assertCriticalTestTitleInventory } from "./test_title_inventory.mjs";
import { spawnCommandOnce } from "../packages/ty-context/dist/lib/long-task-command-process.js";
import {
  buildFileTimingReport,
  readReporterEvents,
} from "../tests/ty-context/test-suite-file-reporter.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const reporterPath = path.join(
  repositoryRoot,
  TEST_ROOT,
  "test-suite-file-reporter.mjs",
);
const REGISTRATION_PROJECTION_TIMEOUT_MS = 300_000;

try {
  const { suite, id } = parseArguments(process.argv.slice(2));
  const sentinel = resolveSentinel(suite, id);
  const inventory = await inventorySentinelTitles(suite, sentinel);
  const result = await executeSentinel(suite, sentinel, inventory);
  console.log(JSON.stringify(result.report));
  if (result.failures.length > 0)
    throw new Error(
      `required_critical_sentinel_failed:${id}:${result.failures.join("|")}`,
    );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

function parseArguments(args) {
  if (args.length !== 2 || args.some((argument) => argument.startsWith("--")))
    throw new Error(
      "Usage: node tools/run_required_critical_sentinel.mjs <suite> <id>",
    );
  const [suite, id] = args;
  if (!suite || !id)
    throw new Error(
      "Usage: node tools/run_required_critical_sentinel.mjs <suite> <id>",
    );
  return { suite, id };
}

function resolveSentinel(suite, id) {
  const registered = CRITICAL_TEST_SENTINELS.filter((entry) => entry.id === id);
  if (registered.length !== 1)
    throw new Error(`required_critical_sentinel_unknown:${id}`);
  const [sentinel] = registered;
  if (!sentinel.required_suites.includes(suite))
    throw new Error(`required_critical_sentinel_wrong_suite:${suite}:${id}`);
  const applicable = criticalSentinelsForSuite(suite).filter(
    (entry) => entry.id === id,
  );
  if (applicable.length !== 1)
    throw new Error(
      `required_critical_sentinel_wrong_platform:${process.platform}:${suite}:${id}`,
    );
  return applicable[0];
}

async function inventorySentinelTitles(suite, sentinel) {
  const testRoot = path.join(repositoryRoot, TEST_ROOT);
  const availableNames = (await readdir(testRoot))
    .filter((name) => name.endsWith(".test.mjs"))
    .sort(compareUtf8);
  const inventorySuite = sentinel.required_suites.includes("long-task")
    ? "long-task"
    : suite;
  const selectedFiles = selectPackageTestNames(
    availableNames,
    inventorySuite,
  ).map((name) => path.join(testRoot, name));
  const titleInventory = await assertCriticalTestTitleInventory({
    suite: inventorySuite,
    selectedFiles,
    sentinels: [sentinel],
    rejectUnknown: false,
  });
  const registeredSentinels = CRITICAL_TEST_SENTINELS.filter((entry) =>
    entry.required_suites.includes(inventorySuite),
  );
  const applicableSentinels = criticalSentinelsForSuite(inventorySuite);
  return {
    applicableSentinels,
    inventorySuite,
    registeredSentinels,
    selectedFiles,
    titleInventory,
  };
}

async function executeSentinel(suite, sentinel, inventory) {
  const ownerFile = path.join(repositoryRoot, TEST_ROOT, sentinel.file);
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-required-sentinel-"),
  );
  const eventFile = path.join(temporaryRoot, "events.ndjson");
  const startedAt = performance.now();
  let completion = {
    code: null,
    signal: null,
    error: null,
  };
  let parsed = {
    events: [],
    duration_ms: 0,
    error: "required_sentinel_report_not_read",
  };
  let cleanupError = null;

  try {
    completion = await runRegistrationPopulation(
      inventory.selectedFiles,
      eventFile,
      sentinel.id,
    );
    parsed = await readReporterEvents(eventFile);
  } finally {
    try {
      await rm(temporaryRoot, { recursive: true, force: true });
    } catch (error) {
      cleanupError = failureMessage(error);
    }
  }

  const execution = {
    mode: "required-critical-sentinel",
    concurrency: 1,
    owner_file: `${TEST_ROOT}/${sentinel.file}`,
    registration_population_suite: inventory.inventorySuite,
    selected_file_count: inventory.selectedFiles.length,
    platform: process.platform,
    reporter: `${TEST_ROOT}/test-suite-file-reporter.mjs`,
    exit_code: completion.code,
    signal: completion.signal,
    event_parse_ms: parsed.duration_ms,
    event_parse_error: parsed.error,
    cleanup_error: cleanupError,
    timeout_ms: REGISTRATION_PROJECTION_TIMEOUT_MS,
    require_exact_file_summaries: true,
    critical_title_inventory: inventory.titleInventory,
    unknown_files_parallelized: false,
  };
  const executionFailed =
    completion.error !== null ||
    completion.signal !== null ||
    completion.code !== 0;
  const timing = buildFileTimingReport({
    suite: "required-critical-sentinel-registration-projection",
    selectedFiles: inventory.selectedFiles,
    wallTimeMs: performance.now() - startedAt,
    execution,
    events: parsed.events,
    registeredCriticalSentinels: inventory.registeredSentinels,
    applicableCriticalSentinels: inventory.applicableSentinels,
    requiredCriticalSentinels: [sentinel],
    declaredCriticalOccurrences: inventory.titleInventory.critical_occurrences,
    testStatus: executionFailed ? "failed" : "passed",
    executionError: completion.error,
  });
  const report = {
    schema_version: "required-critical-sentinel-report-v1",
    result_scope: "registration-projection",
    complete_suite: false,
    requested_suite: suite,
    population_suite: inventory.inventorySuite,
    target_id: sentinel.id,
    verified_ids: [sentinel.id],
    registry_runtime_observation_complete: false,
    semantic_test_population_executed: false,
    timing,
  };
  const failures = reportFailures({
    report,
    sentinel,
    inventory,
    parsed,
    completion,
    cleanupError,
  });
  report.projection_status = failures.length === 0 ? "passed" : "failed";
  return { report, failures };
}

async function runRegistrationPopulation(selectedFiles, eventFile, id) {
  const reporterModule = pathToFileURL(reporterPath).href;
  const namePattern = `\\[critical:${id}\\]`;
  try {
    const execution = await spawnCommandOnce(
      process.execPath,
      [
        "--test",
        "--test-concurrency=1",
        `--test-name-pattern=${namePattern}`,
        `--test-reporter=${reporterModule}`,
        `--test-reporter-destination=${eventFile}`,
        "--test-reporter=spec",
        "--test-reporter-destination=stdout",
        ...selectedFiles,
      ],
      repositoryRoot,
      REGISTRATION_PROJECTION_TIMEOUT_MS,
      process.env,
      true,
    );
    if (execution.stdout.length > 0) process.stdout.write(execution.stdout);
    if (execution.stderr.length > 0) process.stderr.write(execution.stderr);
    return { code: execution.exit_code, signal: null, error: null };
  } catch (error) {
    return { code: null, signal: null, error: failureMessage(error) };
  }
}

function reportFailures({
  report,
  sentinel,
  inventory,
  parsed,
  completion,
  cleanupError,
}) {
  const failures = [];
  const timing = report.timing;
  if (parsed.error) failures.push(`report_read_failed:${parsed.error}`);
  if (parsed.events.length === 0) failures.push("report_missing_or_empty");
  if (completion.error) failures.push(`execution_error:${completion.error}`);
  if (completion.signal) failures.push(`execution_signal:${completion.signal}`);
  if (completion.code !== 0)
    failures.push(`execution_exit_code:${completion.code ?? "missing"}`);
  if (cleanupError) failures.push(`cleanup_failed:${cleanupError}`);
  if (report.schema_version !== "required-critical-sentinel-report-v1")
    failures.push("projection_report_schema_invalid");
  if (
    report.result_scope !== "registration-projection" ||
    report.complete_suite !== false ||
    report.registry_runtime_observation_complete !== false ||
    report.semantic_test_population_executed !== false
  )
    failures.push("projection_report_scope_invalid");
  if (!sameStrings(report.verified_ids, [sentinel.id]))
    failures.push("projection_report_verified_ids_invalid");
  if (timing.schema_version !== "test-suite-timing-v2")
    failures.push("timing_report_schema_invalid");
  if (timing.file_count !== inventory.selectedFiles.length)
    failures.push(
      `selected_file_count_mismatch:${timing.file_count}:${inventory.selectedFiles.length}`,
    );
  if (timing.missing_file_count !== 0) failures.push("selected_file_missing");
  if (
    timing.file_summary_integrity?.required !== true ||
    timing.file_summary_integrity?.status !== "passed"
  )
    failures.push("selected_file_summary_integrity_failed");
  if (timing.imported_test_count !== 0)
    failures.push(`imported_tests_observed:${timing.imported_test_count}`);
  if (timing.unattributed_test_count !== 0)
    failures.push(
      `unattributed_tests_observed:${timing.unattributed_test_count}`,
    );

  const coverage = timing.critical_sentinel_coverage;
  if (coverage?.status !== "passed")
    failures.push("critical_sentinel_coverage_failed");
  if (
    coverage?.registered_count !== inventory.registeredSentinels.length ||
    !sameStrings(
      coverage?.registered_ids,
      inventory.registeredSentinels.map((entry) => entry.id).sort(compareUtf8),
    )
  )
    failures.push("critical_sentinel_registry_projection_invalid");
  if (
    coverage?.required_count !== 1 ||
    coverage?.required_ids?.length !== 1 ||
    coverage.required_ids[0] !== sentinel.id
  )
    failures.push("critical_sentinel_applicability_projection_invalid");
  if (
    coverage?.applicable_count !== inventory.applicableSentinels.length ||
    !sameStrings(
      coverage?.applicable_ids,
      inventory.applicableSentinels.map((entry) => entry.id).sort(compareUtf8),
    ) ||
    !coverage.applicable_ids.includes(sentinel.id)
  )
    failures.push("critical_sentinel_platform_projection_invalid");
  if (
    !isExactPartition(
      coverage?.registered_ids,
      coverage?.applicable_ids,
      coverage?.non_applicable_ids,
    ) ||
    !isExactPartition(
      coverage?.applicable_ids,
      coverage?.required_ids,
      coverage?.not_selected_ids,
    )
  )
    failures.push("critical_sentinel_projection_partition_invalid");
  if (
    !Array.isArray(coverage?.observed_ids) ||
    !coverage.observed_ids.includes(sentinel.id)
  )
    failures.push("critical_sentinel_observation_not_exact");
  appendCoverageFailures(failures, "missing", coverage?.missing_ids);
  appendCoverageFailures(failures, "unexpected", coverage?.unexpected_ids);
  appendCoverageFailures(failures, "duplicate", coverage?.duplicate_ids);
  appendCoverageFailures(failures, "misplaced", coverage?.misplaced_ids);
  appendCoverageFailures(failures, "non_passing", coverage?.non_passing_ids);
  if (timing.test_status !== "passed")
    failures.push(`test_status_not_passed:${timing.test_status}`);
  return failures;
}

function appendCoverageFailures(failures, kind, ids) {
  if (Array.isArray(ids) && ids.length > 0)
    failures.push(`critical_sentinel_${kind}:${ids.join(",")}`);
}

function sameStrings(left, right) {
  return (
    Array.isArray(left) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function isExactPartition(whole, left, right) {
  if (!Array.isArray(whole) || !Array.isArray(left) || !Array.isArray(right))
    return false;
  const combined = [...left, ...right].sort(compareUtf8);
  return (
    new Set(whole).size === whole.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((id) => !right.includes(id)) &&
    sameStrings(whole, [...whole].sort(compareUtf8)) &&
    sameStrings(left, [...left].sort(compareUtf8)) &&
    sameStrings(right, [...right].sort(compareUtf8)) &&
    sameStrings(whole, combined)
  );
}

function failureMessage(error) {
  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}
