import { spawn } from "node:child_process";
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

try {
  const { suite, id } = parseArguments(process.argv.slice(2));
  const sentinel = resolveSentinel(suite, id);
  const titleInventory = await inventorySentinelTitles(suite, sentinel);
  const result = await executeSentinel(suite, sentinel, titleInventory);
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
  return assertCriticalTestTitleInventory({
    suite: inventorySuite,
    selectedFiles,
    sentinels: [sentinel],
    rejectUnknown: false,
  });
}

async function executeSentinel(suite, sentinel, titleInventory) {
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
    completion = await runOwnerFile(ownerFile, eventFile, sentinel.id);
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
    platform: process.platform,
    reporter: `${TEST_ROOT}/test-suite-file-reporter.mjs`,
    exit_code: completion.code,
    signal: completion.signal,
    event_parse_ms: parsed.duration_ms,
    event_parse_error: parsed.error,
    cleanup_error: cleanupError,
    critical_title_inventory: titleInventory,
    unknown_files_parallelized: false,
  };
  const executionFailed =
    completion.error !== null ||
    completion.signal !== null ||
    completion.code !== 0;
  const report = buildFileTimingReport({
    suite,
    selectedFiles: [ownerFile],
    wallTimeMs: performance.now() - startedAt,
    execution,
    events: parsed.events,
    registeredCriticalSentinels: [sentinel],
    requiredCriticalSentinels: [sentinel],
    testStatus: executionFailed ? "failed" : "passed",
    executionError: completion.error,
  });
  const failures = reportFailures({
    report,
    sentinel,
    parsed,
    completion,
    cleanupError,
  });
  return { report, failures };
}

function runOwnerFile(ownerFile, eventFile, id) {
  const reporterModule = pathToFileURL(reporterPath).href;
  const namePattern = `\\[critical:${id}\\]`;
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        "--test",
        "--test-concurrency=1",
        `--test-name-pattern=${namePattern}`,
        `--test-reporter=${reporterModule}`,
        `--test-reporter-destination=${eventFile}`,
        "--test-reporter=spec",
        "--test-reporter-destination=stdout",
        ownerFile,
      ],
      {
        cwd: repositoryRoot,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    let spawnError = null;
    child.once("error", (error) => {
      spawnError = failureMessage(error);
    });
    child.once("close", (code, signal) =>
      resolve({ code, signal, error: spawnError }),
    );
  });
}

function reportFailures({
  report,
  sentinel,
  parsed,
  completion,
  cleanupError,
}) {
  const failures = [];
  if (parsed.error) failures.push(`report_read_failed:${parsed.error}`);
  if (parsed.events.length === 0) failures.push("report_missing_or_empty");
  if (completion.error) failures.push(`execution_error:${completion.error}`);
  if (completion.signal) failures.push(`execution_signal:${completion.signal}`);
  if (completion.code !== 0)
    failures.push(`execution_exit_code:${completion.code ?? "missing"}`);
  if (cleanupError) failures.push(`cleanup_failed:${cleanupError}`);
  if (report.schema_version !== "test-suite-timing-v2")
    failures.push("report_schema_invalid");
  if (report.file_count !== 1) failures.push("selected_file_count_not_one");
  if (report.missing_file_count !== 0) failures.push("selected_file_missing");
  if (report.imported_test_count !== 0)
    failures.push(`imported_tests_observed:${report.imported_test_count}`);
  if (report.unattributed_test_count !== 0)
    failures.push(
      `unattributed_tests_observed:${report.unattributed_test_count}`,
    );

  const coverage = report.critical_sentinel_coverage;
  if (coverage?.status !== "passed")
    failures.push("critical_sentinel_coverage_failed");
  if (
    coverage?.registered_count !== 1 ||
    coverage?.registered_ids?.length !== 1 ||
    coverage.registered_ids[0] !== sentinel.id
  )
    failures.push("critical_sentinel_registry_projection_invalid");
  if (
    coverage?.required_count !== 1 ||
    coverage?.required_ids?.length !== 1 ||
    coverage.required_ids[0] !== sentinel.id
  )
    failures.push("critical_sentinel_applicability_projection_invalid");
  if (
    coverage?.observed_ids?.length !== 1 ||
    coverage.observed_ids[0] !== sentinel.id
  )
    failures.push("critical_sentinel_observation_not_exact");
  appendCoverageFailures(failures, "missing", coverage?.missing_ids);
  appendCoverageFailures(failures, "unexpected", coverage?.unexpected_ids);
  appendCoverageFailures(failures, "duplicate", coverage?.duplicate_ids);
  appendCoverageFailures(failures, "misplaced", coverage?.misplaced_ids);
  appendCoverageFailures(failures, "non_passing", coverage?.non_passing_ids);
  if (report.test_status !== "passed")
    failures.push(`test_status_not_passed:${report.test_status}`);
  return failures;
}

function appendCoverageFailures(failures, kind, ids) {
  if (Array.isArray(ids) && ids.length > 0)
    failures.push(`critical_sentinel_${kind}:${ids.join(",")}`);
}

function failureMessage(error) {
  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}
