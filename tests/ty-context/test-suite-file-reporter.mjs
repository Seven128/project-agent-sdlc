import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const terminalTypes = new Set(["test:pass", "test:fail"]);

export default async function* fileEventReporter(source) {
  for await (const event of source) {
    const serialized = serializeEvent(event);
    if (serialized) yield `${JSON.stringify(serialized)}\n`;
  }
}

export async function readReporterEvents(file) {
  const startedAt = performance.now();
  const events = [];
  try {
    const text = await readFile(file, "utf8");
    const lines = text.split(/\r?\n/u);
    for (const [index, line] of lines.entries()) {
      if (line.length === 0) continue;
      try {
        events.push(JSON.parse(line));
      } catch (error) {
        throw new Error(
          `test_reporter_event_parse_failed:${path.basename(file)}:${index + 1}:${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return {
      events,
      duration_ms: elapsedMilliseconds(startedAt),
      error: null,
    };
  } catch (error) {
    return {
      events,
      duration_ms: elapsedMilliseconds(startedAt),
      error: boundedFailureMessage(
        error instanceof Error ? (error.stack ?? error.message) : String(error),
      ),
    };
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
  applicableCriticalSentinels = requiredCriticalSentinels,
  declaredCriticalOccurrences = null,
  testStatus = null,
  wallTimeBudgetMs = null,
  wallTimeBudgetStatus = "not_configured",
  executionError = null,
}) {
  const selected = selectedFiles.map((file) => path.resolve(file));
  const selectedRoot = commonDirectory(selected);
  const stateByFile = new Map(
    selected.map((file) => [fileKey(file), createFileState(file)]),
  );
  const importedStateByFile = new Map();
  const unattributedTests = [];
  for (const event of events) {
    if (event?.type === "test:summary") {
      const file = selectedEventFile(event.data, stateByFile);
      if (file) {
        const state = stateByFile.get(fileKey(file));
        state.summary_terminal_count += 1;
        state.summary = event.data;
      }
      continue;
    }
    if (!terminalTypes.has(event?.type)) continue;
    const file = terminalEventFile(event.data, stateByFile);
    const status = terminalStatus(event);
    const durationMs = numericDuration(event.data?.details?.duration_ms);
    if (file && isFileWrapper(event.data, file)) {
      const state = stateByFile.get(fileKey(file));
      if (!state) continue;
      state.wrapper_status = status;
      state.wrapper_duration_ms = durationMs;
      continue;
    }
    const record = {
      name: String(event.data?.name ?? "<unnamed>"),
      status,
      duration_ms: durationMs,
      line: integerOrNull(event.data?.line),
      column: integerOrNull(event.data?.column),
      failure_message: boundedFailureMessage(
        event.data?.details?.failure_message,
      ),
    };
    if (!file) {
      unattributedTests.push(record);
      continue;
    }
    const selectedState = stateByFile.get(fileKey(file));
    if (selectedState) {
      selectedState.tests.push(record);
      continue;
    }
    const key = fileKey(file);
    const importedState =
      importedStateByFile.get(key) ?? createFileState(file, "imported");
    importedState.tests.push(record);
    importedStateByFile.set(key, importedState);
  }

  const files = selected.map((file) =>
    finalizeFile(stateByFile.get(fileKey(file)), selectedRoot),
  );
  const importedFiles = [...importedStateByFile.values()]
    .map((state) => finalizeFile(state, selectedRoot))
    .sort((left, right) => compareUtf8(left.file, right.file));
  const selectedTests = files.flatMap((entry) => entry.tests);
  const importedTests = importedFiles.flatMap((entry) => entry.tests);
  const executedTests = [
    ...selectedTests,
    ...importedTests,
    ...unattributedTests,
  ];
  const counts = countStatuses(executedTests);
  const missingFileCount = files.filter(
    (entry) => entry.status === "missing",
  ).length;
  const fileSummaryIntegrity = buildFileSummaryIntegrity(
    files,
    execution?.require_exact_file_summaries === true,
  );
  const criticalSentinelCoverage = buildCriticalSentinelCoverage(
    [
      ...files,
      ...importedFiles,
      { file: "<unattributed>", tests: unattributedTests },
    ],
    registeredCriticalSentinels,
    requiredCriticalSentinels,
    applicableCriticalSentinels,
    declaredCriticalOccurrences,
  );
  const executionStatus =
    testStatus ??
    (counts.failed > 0 || counts.cancelled > 0
      ? "failed"
      : missingFileCount > 0
        ? "failed"
        : "passed");
  const observedStatus =
    executionStatus === "passed" &&
    (criticalSentinelCoverage.status !== "passed" ||
      (fileSummaryIntegrity.required &&
        fileSummaryIntegrity.status !== "passed"))
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
    imported_file_count: importedFiles.length,
    selected_test_count: selectedTests.length,
    imported_test_count: importedTests.length,
    unattributed_test_count: unattributedTests.length,
    executed_test_count: executedTests.length,
    test_count: executedTests.length,
    passed_count: counts.passed,
    failed_count: counts.failed,
    skipped_count: counts.skipped,
    cancelled_count: counts.cancelled,
    missing_file_count: missingFileCount,
    file_summary_integrity: fileSummaryIntegrity,
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
          compareUtf8(left.file, right.file),
      )
      .slice(0, 10)
      .map(({ file, duration_ms, status: fileStatus, test_count }) => ({
        file,
        duration_ms,
        status: fileStatus,
        test_count,
      })),
    test_identities: [
      ...testIdentities(files),
      ...testIdentities(importedFiles),
      ...unattributedTests.map(
        (record, index) =>
          `<unattributed>::${record.name}::${record.line ?? ""}:${record.column ?? ""}::${index + 1}`,
      ),
    ],
    imported_files: importedFiles,
    unattributed_tests: unattributedTests,
    files,
  };
}

function buildCriticalSentinelCoverage(
  files,
  registeredSentinels,
  requiredSentinels,
  applicableSentinels,
  declaredOccurrences,
) {
  const registered = new Map(
    registeredSentinels.map((entry) => [entry.id, entry]),
  );
  const required = new Map(requiredSentinels.map((entry) => [entry.id, entry]));
  const applicable = new Map(
    applicableSentinels.map((entry) => [entry.id, entry]),
  );
  for (const id of applicable.keys())
    if (!registered.has(id))
      throw new Error(
        `Applicable critical sentinel ${id} is absent from the suite registry.`,
      );
  for (const id of required.keys())
    if (!applicable.has(id))
      throw new Error(
        `Required critical sentinel ${id} is not applicable to this projection.`,
      );
  const occurrences = new Map();
  for (const file of files) {
    for (const record of file.tests) {
      for (const id of criticalTags(record.name)) {
        const records = occurrences.get(id) ?? [];
        records.push({
          file: file.file,
          name: record.name,
          line: record.line,
          column: record.column,
          source_kind: file.source_kind ?? "unattributed",
          status: record.status,
        });
        occurrences.set(id, records);
      }
    }
  }

  const registeredIds = [...registered.keys()].sort(compareUtf8);
  const requiredIds = [...required.keys()].sort(compareUtf8);
  const applicableIds = [...applicable.keys()].sort(compareUtf8);
  const nonApplicableIds = registeredIds.filter((id) => !applicable.has(id));
  const notSelectedIds = applicableIds.filter((id) => !required.has(id));
  const nonApplicableObservedIds = nonApplicableIds.filter((id) =>
    occurrences.has(id),
  );
  const observedIds = [...occurrences.keys()].sort(compareUtf8);
  const missingIds = requiredIds.filter((id) => !occurrences.has(id));
  const unexpectedIds = observedIds.filter((id) => !registered.has(id));
  const duplicateIds = observedIds.filter(
    (id) => (occurrences.get(id)?.length ?? 0) !== 1,
  );
  const misplacedIds = registeredIds.filter(
    (id) =>
      occurrences.has(id) &&
      (occurrences.get(id) ?? []).some(
        (record) =>
          record.source_kind !== "selected" ||
          record.file !== registered.get(id).file,
      ),
  );
  const nonPassingIds = requiredIds.filter((id) =>
    (occurrences.get(id) ?? []).some((record) => record.status !== "passed"),
  );
  const declaredById = declarationMap(declaredOccurrences);
  const declarationMismatchIds =
    declaredById === null
      ? []
      : registeredIds.filter(
          (id) =>
            occurrences.has(id) &&
            !runtimeMatchesDeclaration(
              occurrences.get(id) ?? [],
              declaredById.get(id) ?? [],
            ),
        );
  const status =
    missingIds.length === 0 &&
    unexpectedIds.length === 0 &&
    duplicateIds.length === 0 &&
    misplacedIds.length === 0 &&
    nonPassingIds.length === 0 &&
    declarationMismatchIds.length === 0
      ? "passed"
      : "failed";
  return {
    status,
    registered_count: registeredIds.length,
    registered_ids: registeredIds,
    required_count: requiredIds.length,
    required_ids: requiredIds,
    applicable_count: applicableIds.length,
    applicable_ids: applicableIds,
    not_selected_ids: notSelectedIds,
    non_applicable_ids: nonApplicableIds,
    non_applicable_observed_ids: nonApplicableObservedIds,
    observed_ids: observedIds,
    missing_ids: missingIds,
    unexpected_ids: unexpectedIds,
    duplicate_ids: duplicateIds,
    misplaced_ids: misplacedIds,
    non_passing_ids: nonPassingIds,
    declaration_binding_status:
      declaredById === null
        ? "not_provided"
        : declarationMismatchIds.length === 0
          ? "passed"
          : "failed",
    declaration_mismatch_ids: declarationMismatchIds,
  };
}

function declarationMap(declaredOccurrences) {
  if (declaredOccurrences === null) return null;
  if (!Array.isArray(declaredOccurrences))
    throw new Error("Critical declaration inventory must be an array.");
  const result = new Map();
  for (const occurrence of declaredOccurrences) {
    const rows = result.get(occurrence.id) ?? [];
    rows.push(occurrence);
    result.set(occurrence.id, rows);
  }
  return result;
}

function runtimeMatchesDeclaration(runtimeRows, declarationRows) {
  if (runtimeRows.length !== 1 || declarationRows.length !== 1) return false;
  const [runtime] = runtimeRows;
  const [declaration] = declarationRows;
  return (
    runtime.source_kind === "selected" &&
    runtime.file === declaration.file &&
    runtime.name === declaration.title &&
    runtime.line === declaration.line &&
    runtime.column === declaration.column
  );
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

function createFileState(file, sourceKind = "selected") {
  return {
    absolute: file,
    source_kind: sourceKind,
    tests: [],
    summary: null,
    summary_terminal_count: 0,
    wrapper_status: null,
    wrapper_duration_ms: null,
  };
}

function finalizeFile(state, selectedRoot) {
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
    file: displayFile(state.absolute, selectedRoot),
    source_kind: state.source_kind,
    status,
    duration_ms: durationMs,
    test_count: state.tests.length,
    summary_counts: state.summary?.counts ?? null,
    summary_terminal_count: state.summary_terminal_count,
    tests: state.tests,
  };
}

function buildFileSummaryIntegrity(files, required) {
  const missingFiles = files
    .filter((entry) => entry.summary_terminal_count === 0)
    .map((entry) => entry.file);
  const duplicateFiles = files
    .filter((entry) => entry.summary_terminal_count > 1)
    .map((entry) => entry.file);
  return {
    required,
    status:
      missingFiles.length === 0 && duplicateFiles.length === 0
        ? "passed"
        : "failed",
    missing_files: missingFiles,
    duplicate_files: duplicateFiles,
  };
}

function terminalEventFile(data, stateByFile) {
  if (typeof data?.file === "string" && data.file.length > 0) {
    const resolved = resolveCandidate(data.file);
    return resolved;
  }
  if (data?.nesting !== 0 || typeof data?.name !== "string") return null;
  const resolved = resolveCandidate(data.name);
  if (resolved) return resolved;
  return selectedFileByBasename(data.name, stateByFile);
}

function selectedEventFile(data, stateByFile) {
  if (typeof data?.file === "string" && data.file.length > 0) {
    const resolved = resolveCandidate(data.file);
    return resolved && stateByFile.has(fileKey(resolved)) ? resolved : null;
  }
  if (typeof data?.name === "string" && data.name.length > 0) {
    const resolved = resolveCandidate(data.name);
    if (resolved && stateByFile.has(fileKey(resolved))) return resolved;
    return selectedFileByBasename(data.name, stateByFile);
  }
  return null;
}

function selectedFileByBasename(candidate, stateByFile) {
  const byName = [...stateByFile.values()].filter(
    (state) => path.basename(state.absolute) === path.basename(candidate),
  );
  return byName.length === 1 ? byName[0].absolute : null;
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

function elapsedMilliseconds(startedAt) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function testIdentities(files) {
  return files.flatMap((entry) =>
    entry.tests.map(
      (record, index) =>
        `${entry.file}::${record.name}::${record.line ?? ""}:${record.column ?? ""}::${index + 1}`,
    ),
  );
}

function commonDirectory(files) {
  if (files.length === 0) return process.cwd();
  let common = path.dirname(files[0]);
  for (const file of files.slice(1)) {
    const candidate = path.dirname(file);
    while (
      fileKey(candidate) !== fileKey(common) &&
      !fileKey(candidate).startsWith(`${fileKey(common)}${path.sep}`)
    ) {
      const parent = path.dirname(common);
      if (parent === common) return path.dirname(files[0]);
      common = parent;
    }
  }
  return common;
}

function displayFile(file, selectedRoot) {
  const relative = path.relative(selectedRoot, file);
  return relative.length > 0 &&
    !path.isAbsolute(relative) &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`)
    ? relative.split(path.sep).join("/")
    : path.basename(file);
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
