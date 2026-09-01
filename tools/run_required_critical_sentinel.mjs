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
import { reportFailures } from "./required_critical_sentinel_report.mjs";
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

function failureMessage(error) {
  return error instanceof Error
    ? (error.stack ?? error.message)
    : String(error);
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}
