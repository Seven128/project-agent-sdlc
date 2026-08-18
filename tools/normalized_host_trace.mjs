import {
  availableMeasurement,
  unavailableMeasurement,
} from "./self_hosting_cost_model.mjs";
import {
  normalizeRepositoryRelativePath,
  validateOpenedFileKind,
} from "./self_hosting_cost_trace_paths.mjs";

export { normalizeRepositoryRelativePath } from "./self_hosting_cost_trace_paths.mjs";

export const NORMALIZED_HOST_TRACE_SCHEMA = "self-hosting-normalized-host-trace-v1";
export const LEGACY_HOST_TRACE_SCHEMA = "tiny-context-host-trace-v1";
export const STRICT_HOST_TRACE_SCHEMA = "tiny-context-host-trace-v2";

const HOST_SOURCE = "host_tool_trace";
const NORMALIZED_UNATTESTED_SOURCE = "normalized_unattested_host_trace";
const OPEN_KINDS = new Set(["context", "skill", "reference", "source"]);

// Invalid host observations become unavailable; Agent self-report is never a fallback.
export function normalizeHostTrace(
  traceInput,
  options = {},
) {
  const { expectedHeadCommit, expectedWorkingTreeDigest } = options ?? {};
  let trace;
  try {
    trace = typeof traceInput === "string" ? JSON.parse(traceInput) : traceInput;
  } catch {
    return unavailableHostTrace("invalid_json");
  }
  if (!isPlainObject(trace)) return unavailableHostTrace("invalid_schema");
  if (trace.source !== HOST_SOURCE) {
    return unavailableHostTrace("non_host_trace_source");
  }
  try {
    if (trace.schema_version === LEGACY_HOST_TRACE_SCHEMA) {
      return normalizeLegacyTrace(trace);
    }
    if (trace.schema_version === STRICT_HOST_TRACE_SCHEMA) {
      return normalizeStrictTrace(trace, {
        expectedHeadCommit,
        expectedWorkingTreeDigest,
      });
    }
    return unavailableHostTrace("unsupported_schema_version");
  } catch (error) {
    return unavailableHostTrace(
      error instanceof HostTraceError ? error.code : "invalid_schema",
      error instanceof HostTraceError ? error.details : undefined,
    );
  }
}

export function unavailableHostTrace(reason, details) {
  return {
    schema_version: NORMALIZED_HOST_TRACE_SCHEMA,
    source: HOST_SOURCE,
    ...unavailableMeasurement(reason, details),
  };
}

function normalizeLegacyTrace(trace) {
  requireNonnegativeInteger(trace.context_read_rounds, "context_read_rounds");
  if (!Array.isArray(trace.context_files_read)) {
    throw new HostTraceError("invalid_schema", { field: "context_files_read" });
  }
  if (trace.source_files_read !== undefined && !Array.isArray(trace.source_files_read)) {
    throw new HostTraceError("invalid_schema", { field: "source_files_read" });
  }
  const openedFiles = [
    ...normalizeLegacyPaths(trace.context_files_read, "context"),
    ...normalizeLegacyPaths(trace.source_files_read ?? [], "source"),
  ];
  const totalToolCalls = optionalLegacyCount(
    trace,
    "total_tool_calls",
    "not_provided_by_v1",
  );
  const totalTokens = optionalLegacyCount(
    trace,
    "total_tokens",
    "not_provided_by_v1",
  );
  return {
    schema_version: NORMALIZED_HOST_TRACE_SCHEMA,
    availability: "partial",
    source: HOST_SOURCE,
    source_schema_version: LEGACY_HOST_TRACE_SCHEMA,
    provenance: unavailableMeasurement(
      "host_trace_origin_not_independently_attested",
    ),
    candidate: unavailableMeasurement("candidate_binding_not_provided_by_v1"),
    opened_files: sortOpenedFiles(openedFiles),
    measurements: {
      input_tokens: unavailableMeasurement("not_provided_by_v1"),
      tool_turns: unavailableMeasurement("not_provided_by_v1"),
      wall_time_ms: unavailableMeasurement("not_provided_by_v1"),
      total_tool_calls: totalToolCalls,
      total_tokens: totalTokens,
    },
  };
}

function normalizeStrictTrace(
  trace,
  { expectedHeadCommit, expectedWorkingTreeDigest },
) {
  requireExactKeys(trace, [
    "schema_version",
    "source",
    "candidate",
    "opened_files",
    "usage",
    "tool_turns",
    "wall_time_ms",
  ]);
  if (!validGitObjectId(expectedHeadCommit) || !validSha256(expectedWorkingTreeDigest)) {
    throw new HostTraceError("candidate_expectation_missing_or_invalid");
  }
  if (!isPlainObject(trace.candidate)) {
    throw new HostTraceError("invalid_schema", { field: "candidate" });
  }
  requireExactKeys(trace.candidate, ["head_commit", "working_tree_digest"]);
  if (!validGitObjectId(trace.candidate.head_commit)) {
    throw new HostTraceError("invalid_schema", { field: "candidate.head_commit" });
  }
  if (!validSha256(trace.candidate.working_tree_digest)) {
    throw new HostTraceError("invalid_schema", {
      field: "candidate.working_tree_digest",
    });
  }
  if (
    trace.candidate.head_commit !== expectedHeadCommit.toLowerCase() ||
    trace.candidate.working_tree_digest !== expectedWorkingTreeDigest.toLowerCase()
  ) {
    throw new HostTraceError("candidate_mismatch", {
      expected_head_commit: expectedHeadCommit.toLowerCase(),
      actual_head_commit: trace.candidate.head_commit,
      expected_working_tree_digest: expectedWorkingTreeDigest.toLowerCase(),
      actual_working_tree_digest: trace.candidate.working_tree_digest,
    });
  }
  if (!Array.isArray(trace.opened_files)) {
    throw new HostTraceError("invalid_schema", { field: "opened_files" });
  }
  const openedFiles = trace.opened_files.map((entry, index) =>
    normalizeStrictOpenedFile(entry, index),
  );
  rejectConflictingKinds(openedFiles);
  if (!isPlainObject(trace.usage)) {
    throw new HostTraceError("invalid_schema", { field: "usage" });
  }
  requireExactKeys(trace.usage, ["input_tokens"]);
  requireNonnegativeInteger(trace.usage.input_tokens, "usage.input_tokens");
  requireNonnegativeInteger(trace.tool_turns, "tool_turns");
  requireNonnegativeInteger(trace.wall_time_ms, "wall_time_ms");
  return {
    schema_version: NORMALIZED_HOST_TRACE_SCHEMA,
    availability: "available",
    source: HOST_SOURCE,
    source_schema_version: STRICT_HOST_TRACE_SCHEMA,
    provenance: unavailableMeasurement(
      "host_trace_origin_not_independently_attested",
    ),
    candidate: {
      availability: "available",
      head_commit: trace.candidate.head_commit,
      working_tree_digest: trace.candidate.working_tree_digest,
    },
    opened_files: sortOpenedFiles(openedFiles),
    measurements: {
      input_tokens: availableMeasurement(
        trace.usage.input_tokens,
        NORMALIZED_UNATTESTED_SOURCE,
      ),
      tool_turns: availableMeasurement(
        trace.tool_turns,
        NORMALIZED_UNATTESTED_SOURCE,
      ),
      wall_time_ms: availableMeasurement(
        trace.wall_time_ms,
        NORMALIZED_UNATTESTED_SOURCE,
      ),
      total_tool_calls: unavailableMeasurement("not_provided_by_v2"),
      total_tokens: unavailableMeasurement("not_provided_by_v2"),
    },
  };
}

function normalizeLegacyPaths(paths, kind) {
  return paths.map((rawPath, index) => {
    let normalized;
    try {
      normalized = normalizeRepositoryRelativePath(rawPath);
      validateOpenedFileKind(kind, normalized);
    } catch (error) {
      throw new HostTraceError(error?.code ?? "unsafe_opened_file_path", {
        index,
        kind,
      });
    }
    return { kind, path: normalized };
  });
}

function normalizeStrictOpenedFile(entry, index) {
  if (!isPlainObject(entry)) {
    throw new HostTraceError("invalid_schema", { field: `opened_files[${index}]` });
  }
  requireExactKeys(entry, ["kind", "path"]);
  if (!OPEN_KINDS.has(entry.kind)) {
    throw new HostTraceError("invalid_opened_file_kind", { index });
  }
  let normalized;
  try {
    normalized = normalizeRepositoryRelativePath(entry.path);
    validateOpenedFileKind(entry.kind, normalized);
  } catch (error) {
    throw new HostTraceError(error?.code ?? "unsafe_opened_file_path", {
      index,
      kind: entry.kind,
    });
  }
  return { kind: entry.kind, path: normalized };
}

function rejectConflictingKinds(entries) {
  const kindByPath = new Map();
  for (const entry of entries) {
    const prior = kindByPath.get(entry.path);
    if (prior !== undefined && prior !== entry.kind) {
      throw new HostTraceError("conflicting_opened_file_kinds");
    }
    kindByPath.set(entry.path, entry.kind);
  }
}

function optionalLegacyCount(trace, field, absentReason) {
  if (!Object.hasOwn(trace, field)) return unavailableMeasurement(absentReason);
  requireNonnegativeInteger(trace[field], field);
  return availableMeasurement(trace[field], HOST_SOURCE);
}

function sortOpenedFiles(entries) {
  return [...entries].sort((left, right) => {
    const kindOrder = compareText(left.kind, right.kind);
    return kindOrder === 0 ? compareText(left.path, right.path) : kindOrder;
  });
}

function requireNonnegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new HostTraceError("invalid_schema", { field });
  }
}

function requireExactKeys(value, expected) {
  const actual = Object.keys(value).sort(compareText);
  const wanted = [...expected].sort(compareText);
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    throw new HostTraceError("invalid_schema", { field: "object_keys" });
  }
}

function validGitObjectId(value) {
  return typeof value === "string" && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(value);
}

function validSha256(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function compareText(left, right) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

class HostTraceError extends Error {
  constructor(code, details) {
    super(code);
    this.code = code;
    this.details = details;
  }
}
