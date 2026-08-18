import { spawn } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  criticalSentinelsForSuite,
  resolveLongTaskIsolatedConcurrency,
  resolveTestTimingOutput,
  resolveSuiteWallTimeBudgetMs,
  suiteWallTimeBudgetStatus,
} from "../../tools/test_suite_policy.mjs";
import {
  planLongTaskSuiteLanes,
  selectPackageSuiteFileNames,
} from "../../tools/test_suite_lane_policy.mjs";
import { prepareDeliveryFixtureSeed } from "./long-task-delivery-fixtures.mjs";
import { buildFileTimingReport } from "./test-suite-file-reporter.mjs";

const suite = process.argv[2];
if (
  suite !== "default" &&
  suite !== "long-task" &&
  suite !== "long-task-trust"
) {
  throw new Error(
    "Usage: run-package-suite.mjs <default|long-task|long-task-trust> [node-test options]",
  );
}

const testRoot = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testRoot, "../..");
const reporterModule = new URL(
  "./test-suite-file-reporter.mjs",
  import.meta.url,
).href;
const availableNames = (await readdir(testRoot))
  .filter((name) => name.endsWith(".test.mjs"))
  .sort();
const names = selectPackageSuiteFileNames(availableNames, suite);
const files = names.map((name) => path.join(testRoot, name));
const requiredCriticalSentinels = criticalSentinelsForSuite(suite);
const wallTimeBudgetMs = resolveSuiteWallTimeBudgetMs(suite);
const forwardedOptions = process.argv.slice(3);

if (files.length === 0)
  throw new Error(`No ${suite} package tests were selected.`);
assertRunnerOwnsConcurrency(forwardedOptions);

const timingTemporaryRoot = await mkdtemp(
  path.join(os.tmpdir(), `ty-context-${suite}-timing-`),
);
const isolatedConcurrency = suite !== "default"
  ? resolveLongTaskIsolatedConcurrency()
  : 1;
const lanePolicy = suite !== "default"
  ? planLongTaskSuiteLanes(names, suite, isolatedConcurrency)
  : null;
const lanes = lanePolicy?.lanes ?? [{ key: "serial", names, concurrency: 1 }];
const execution = {
  mode:
    lanePolicy && isolatedConcurrency > 1
      ? "reviewed-isolation-lanes"
      : "serial",
  isolated_concurrency: isolatedConcurrency,
  serial_rollback: "TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY=1",
  unknown_files: lanePolicy?.unknown_files ?? [],
  unknown_files_parallelized: false,
  lanes: lanes.map((lane) => ({
    key: lane.key,
    file_count: lane.names.length,
    concurrency: lane.concurrency,
  })),
};
const events = [];
const completions = [];
let fixtureSeed = null;
let cleanupError = null;
let executionError = null;
const startedAt = performance.now();

try {
  if (lanePolicy) fixtureSeed = await prepareDeliveryFixtureSeed();
  for (const [index, lane] of lanes.entries()) {
    const eventFile = path.join(
      timingTemporaryRoot,
      `${String(index).padStart(2, "0")}-${lane.key}.ndjson`,
    );
    const completion = await runLane(lane, eventFile, fixtureSeed?.root);
    completions.push(completion);
    events.push(...(await readReporterEvents(eventFile)));
    if (completion.signal || completion.code !== 0) break;
  }
} catch (error) {
  executionError =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
} finally {
  try {
    if (fixtureSeed) await fixtureSeed.cleanup();
  } catch (error) {
    cleanupError = error instanceof Error ? error.message : String(error);
  }
  try {
    await rm(timingTemporaryRoot, { recursive: true, force: true });
  } catch (error) {
    cleanupError ??= error instanceof Error ? error.message : String(error);
  }
}

const wallTimeMs = Math.round(performance.now() - startedAt);
const completionSignal =
  completions.find((entry) => entry.signal)?.signal ?? null;
const completionFailed =
  executionError !== null ||
  completions.length !== lanes.length ||
  completions.some((entry) => entry.code !== 0 || entry.signal) ||
  cleanupError !== null;
const budgetStatus = suiteWallTimeBudgetStatus(wallTimeMs, wallTimeBudgetMs);
const timing = buildFileTimingReport({
  suite,
  selectedFiles: files,
  wallTimeMs,
  execution,
  events,
  requiredCriticalSentinels,
  testStatus: completionFailed ? "failed" : "passed",
  wallTimeBudgetMs,
  wallTimeBudgetStatus: budgetStatus,
  executionError,
});
if (timing.missing_file_count > 0 && timing.test_status === "passed") {
  timing.test_status = "failed";
  timing.status = "failed";
}
if (timing.critical_sentinel_coverage.status !== "passed")
  console.error(
    `${suite} package suite failed critical semantic continuity: ${JSON.stringify(timing.critical_sentinel_coverage)}. Review the stable sentinel mapping when a stronger equivalent test intentionally replaces an invariant.`,
  );
console.log(`\n${JSON.stringify(timing)}`);

const timingOutput = resolveTestTimingOutput(repositoryRoot, suite);
if (timingOutput) {
  await mkdir(path.dirname(timingOutput), { recursive: true });
  await writeFile(timingOutput, `${JSON.stringify(timing, null, 2)}\n`, "utf8");
}

if (cleanupError) console.error(`Suite cleanup failed: ${cleanupError}`);
if (executionError) console.error(`Suite execution failed: ${executionError}`);
if (completionSignal) process.kill(process.pid, completionSignal);
else if (timing.test_status !== "passed") {
  process.exitCode = completions.find((entry) => entry.code)?.code ?? 1;
} else if (timing.wall_time_budget_status === "exceeded") {
  console.error(
    `${suite} package suite exceeded the controlled CI wall-time budget: ${wallTimeMs}ms > ${wallTimeBudgetMs}ms. Coverage was not reduced; inspect the timing artifact and update the reviewed budget only with evidence.`,
  );
  process.exitCode = 1;
}

async function runLane(lane, eventFile, fixtureSeedRoot) {
  const customReporterOptions = [
    `--test-reporter=${reporterModule}`,
    `--test-reporter-destination=${eventFile}`,
  ];
  const reporterOptions = forwardedOptions.some(
    (option) =>
      option === "--test-reporter" || option.startsWith("--test-reporter="),
  )
    ? []
    : [
        process.env.CI && process.env.TY_CONTEXT_VERBOSE_TESTS !== "1"
          ? "--test-reporter=dot"
          : "--test-reporter=spec",
        "--test-reporter-destination=stdout",
      ];
  const laneFiles = lane.names.map((name) => path.join(testRoot, name));
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "--test",
        `--test-concurrency=${lane.concurrency}`,
        ...customReporterOptions,
        ...reporterOptions,
        ...forwardedOptions,
        ...laneFiles,
      ],
      {
        env: fixtureSeedRoot
          ? {
              ...process.env,
              TY_CONTEXT_DELIVERY_FIXTURE_SEED_ROOT: fixtureSeedRoot,
            }
          : process.env,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
}

async function readReporterEvents(file) {
  try {
    const text = await readFile(file, "utf8");
    return text
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function assertRunnerOwnsConcurrency(options) {
  if (
    options.some(
      (option) =>
        option === "--test-concurrency" ||
        option.startsWith("--test-concurrency="),
    )
  )
    throw new Error(
      "run-package-suite owns --test-concurrency through the reviewed isolation policy; use TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY=1 for serial rollback.",
    );
}
