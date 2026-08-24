import path from "node:path";
import { fileURLToPath } from "node:url";

const terminalTypes = new Set(["test:pass", "test:fail"]);

export default async function* fileEventReporter(source) {
  for await (const event of source) {
    const serialized = serializeEvent(event);
    if (serialized) yield `${JSON.stringify(serialized)}\n`;
  }
}

export function buildFileTimingReport({
  suite,
  selectedFiles,
  wallTimeMs,
  execution,
  events,
  requiredCriticalSentinels = [],
  registeredCriticalSentinels = requiredCriticalSentinels,
  testStatus = null,
  wallTimeBudgetMs = null,
  wallTimeBudgetStatus = "not_configured",
  executionError = null,
}) {
  const selected = selectedFiles.map((file) => path.resolve(file));
  const stateByFile = new Map(
    selected.map((file) => [fileKey(file), createFileState(file)]),
  );
  for (const event of events) {
    if (event?.type === "test:summary") {
      const file = selectedEventFile(event.data, stateByFile);
      if (file) stateByFile.get(fileKey(file)).summary = event.data;
      continue;
    }
    if (!terminalTypes.has(event?.type)) continue;
    const file = selectedEventFile(event.data, stateByFile);
    if (!file) continue;
    const state = stateByFile.get(fileKey(file));
    const status = terminalStatus(event);
    const durationMs = numericDuration(event.data?.details?.duration_ms);
    if (isFileWrapper(event.data, file)) {
      state.wrapper_status = status;
      state.wrapper_duration_ms = durationMs;
      continue;
    }
    state.tests.push({
      name: String(event.data?.name ?? "<unnamed>"),
      status,
      duration_ms: durationMs,
      line: integerOrNull(event.data?.line),
      column: integerOrNull(event.data?.column),
      failure_message: boundedFailureMessage(
        event.data?.details?.failure_message,
      ),
    });
  }

  const files = selected.map((file) =>
    finalizeFile(stateByFile.get(fileKey(file))),
  );
  const counts = countStatuses(files.flatMap((entry) => entry.tests));
  const missingFileCount = files.filter(
    (entry) => entry.status === "missing",
  ).length;
  const criticalSentinelCoverage = buildCriticalSentinelCoverage(
    files,
    registeredCriticalSentinels,
    requiredCriticalSentinels,
  );
  const executionStatus =
    testStatus ??
    (files.some(
      (entry) => entry.status === "failed" || entry.status === "cancelled",
    )
      ? "failed"
      : missingFileCount > 0
        ? "failed"
        : "passed");
  const observedStatus =
    executionStatus === "passed" && criticalSentinelCoverage.status !== "passed"
      ? "failed"
      : executionStatus;
  const status =
    observedStatus === "passed" && wallTimeBudgetStatus === "exceeded"
      ? "budget_exceeded"
      : observedStatus;
  return {
    schema_version: "test-suite-timing-v2",
    suite,
    file_count: files.length,
    test_count: files.reduce((total, entry) => total + entry.test_count, 0),
    passed_count: counts.passed,
    failed_count: counts.failed,
    skipped_count: counts.skipped,
    cancelled_count: counts.cancelled,
    missing_file_count: missingFileCount,
    wall_time_ms: Math.round(wallTimeMs),
    status,
    test_status: observedStatus,
    wall_time_budget_ms: wallTimeBudgetMs,
    wall_time_budget_status: wallTimeBudgetStatus,
    execution_error: boundedFailureMessage(executionError),
    execution,
    result_cache_used: false,
    unknown_files_parallelized: execution.unknown_files_parallelized === true,
    critical_sentinel_coverage: criticalSentinelCoverage,
    slowest_files: [...files]
      .sort(
        (left, right) =>
          right.duration_ms - left.duration_ms ||
          left.file.localeCompare(right.file),
      )
      .slice(0, 10)
      .map(({ file, duration_ms, status: fileStatus, test_count }) => ({
        file,
        duration_ms,
        status: fileStatus,
        test_count,
      })),
    test_identities: files.flatMap((entry) =>
      entry.tests.map(
        (record, index) =>
          `${entry.file}::${record.name}::${record.line ?? ""}:${record.column ?? ""}::${index + 1}`,
      ),
    ),
    files,
  };
}

function buildCriticalSentinelCoverage(
  files,
  registeredSentinels,
  requiredSentinels,
) {
  const registered = new Map(
    registeredSentinels.map((entry) => [entry.id, entry]),
  );
  const required = new Map(requiredSentinels.map((entry) => [entry.id, entry]));
  for (const id of required.keys())
    if (!registered.has(id))
      throw new Error(
        `Applicable critical sentinel ${id} is absent from the suite registry.`,
      );
  const occurrences = new Map();
  for (const file of files) {
    for (const record of file.tests) {
      for (const id of criticalTags(record.name)) {
        const records = occurrences.get(id) ?? [];
        records.push({ file: file.file, status: record.status });
        occurrences.set(id, records);
      }
    }
  }

  const registeredIds = [...registered.keys()].sort();
  const requiredIds = [...required.keys()].sort();
  const nonApplicableIds = registeredIds.filter((id) => !required.has(id));
  const nonApplicable = new Set(nonApplicableIds);
  const nonApplicableObservedIds = nonApplicableIds.filter((id) =>
    occurrences.has(id),
  );
  const observedIds = [...occurrences.keys()]
    .filter((id) => !nonApplicable.has(id))
    .sort();
  const missingIds = requiredIds.filter((id) => !occurrences.has(id));
  const unexpectedIds = observedIds.filter((id) => !registered.has(id));
  const duplicateIds = observedIds.filter(
    (id) => (occurrences.get(id)?.length ?? 0) !== 1,
  );
  const misplacedIds = requiredIds.filter((id) =>
    (occurrences.get(id) ?? []).some(
      (record) => record.file !== required.get(id).file,
    ),
  );
  const nonPassingIds = observedIds.filter((id) =>
    (occurrences.get(id) ?? []).some((record) => record.status !== "passed"),
  );
  const status =
    missingIds.length === 0 &&
    unexpectedIds.length === 0 &&
    duplicateIds.length === 0 &&
    misplacedIds.length === 0 &&
    nonPassingIds.length === 0
      ? "passed"
      : "failed";
  return {
    status,
    registered_count: registeredIds.length,
    registered_ids: registeredIds,
    required_count: requiredIds.length,
    required_ids: requiredIds,
    non_applicable_ids: nonApplicableIds,
    non_applicable_observed_ids: nonApplicableObservedIds,
    observed_ids: observedIds,
    missing_ids: missingIds,
    unexpected_ids: unexpectedIds,
    duplicate_ids: duplicateIds,
    misplaced_ids: misplacedIds,
    non_passing_ids: nonPassingIds,
  };
}

function criticalTags(name) {
  return [
    ...String(name).matchAll(/\[critical:([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\]/gu),
  ].map((match) => match[1]);
}

function serializeEvent(event) {
  if (terminalTypes.has(event?.type)) {
    const data = event.data ?? {};
    return {
      type: event.type,
      data: {
        file: data.file ?? null,
        name: data.name ?? null,
        nesting: data.nesting ?? null,
        testId: data.testId ?? null,
        testNumber: data.testNumber ?? null,
        line: data.line ?? null,
        column: data.column ?? null,
        skip: data.skip ?? false,
        todo: data.todo ?? false,
        details: {
          duration_ms: numericDuration(data.details?.duration_ms),
          type: data.details?.type ?? null,
          failure_type: data.details?.error?.failureType ?? null,
          failure_message: boundedFailureMessage(data.details?.error?.message),
        },
      },
    };
  }
  if (event?.type === "test:summary")
    return {
      type: event.type,
      data: {
        file: event.data?.file ?? null,
        duration_ms: numericDuration(event.data?.duration_ms),
        success: event.data?.success === true,
        counts: event.data?.counts ?? null,
      },
    };
  return null;
}

function createFileState(file) {
  return {
    absolute: file,
    tests: [],
    summary: null,
    wrapper_status: null,
    wrapper_duration_ms: null,
  };
}

function finalizeFile(state) {
  const counts = countStatuses(state.tests);
  const status =
    counts.failed > 0 || state.wrapper_status === "failed"
      ? "failed"
      : counts.cancelled > 0 || state.wrapper_status === "cancelled"
        ? "cancelled"
        : counts.skipped > 0 || state.wrapper_status === "skipped"
          ? "skipped"
          : state.tests.length > 0 || state.wrapper_status === "passed"
            ? "passed"
            : "missing";
  const durationMs =
    numericDuration(state.summary?.duration_ms) ||
    state.wrapper_duration_ms ||
    state.tests.reduce((total, record) => total + record.duration_ms, 0);
  return {
    file: path.basename(state.absolute),
    status,
    duration_ms: durationMs,
    test_count: state.tests.length,
    tests: state.tests,
  };
}

function selectedEventFile(data, stateByFile) {
  for (const candidate of [data?.file, data?.name]) {
    if (typeof candidate !== "string" || candidate.length === 0) continue;
    const resolved = resolveCandidate(candidate);
    if (resolved && stateByFile.has(fileKey(resolved))) return resolved;
    const byName = [...stateByFile.values()].filter(
      (state) => path.basename(state.absolute) === path.basename(candidate),
    );
    if (byName.length === 1) return byName[0].absolute;
  }
  return null;
}

function resolveCandidate(candidate) {
  try {
    if (candidate.startsWith("file:"))
      return path.resolve(fileURLToPath(candidate));
    if (path.isAbsolute(candidate)) return path.resolve(candidate);
  } catch {}
  return null;
}

function isFileWrapper(data, selectedFile) {
  if (data?.nesting !== 0 || typeof data?.name !== "string") return false;
  const resolved = resolveCandidate(data.name);
  return resolved
    ? fileKey(resolved) === fileKey(selectedFile)
    : data.name === path.basename(selectedFile);
}

function terminalStatus(event) {
  if (event.data?.skip || event.data?.todo) return "skipped";
  if (event.type === "test:pass") return "passed";
  return String(event.data?.details?.failure_type ?? "")
    .toLowerCase()
    .includes("cancel")
    ? "cancelled"
    : "failed";
}

function countStatuses(records) {
  const result = { passed: 0, failed: 0, skipped: 0, cancelled: 0 };
  for (const record of records) result[record.status] += 1;
  return result;
}

function numericDuration(value) {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : 0;
}

function integerOrNull(value) {
  return Number.isInteger(value) ? value : null;
}

function boundedFailureMessage(value) {
  return typeof value === "string" && value.length > 0
    ? value.slice(0, 2000)
    : null;
}

function fileKey(file) {
  const normalized = path.normalize(path.resolve(file));
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
