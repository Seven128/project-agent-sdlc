import path from "node:path";
import { FORMAL_CLOCK_POLICY } from "./long_task_real_process_schema_policy.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  shaPattern,
} from "./long_task_formal_total_cost_shared.mjs";

export const formalProcessSupervisorTcbPaths = Object.freeze([
  "tools/formal_process_supervisor.mjs",
  "tools/formal_process_supervisor_protocol.mjs",
  "tools/formal_process_supervisor_native_types.cs",
  "tools/formal_process_supervisor_native_run.cs",
  "tools/formal_process_supervisor_native_helpers.cs",
  "tools/windows_job_process_supervisor.ps1",
]);

export function deriveFormalRuntimeTcbIdentity({
  environment,
  benchmarkImplementationIdentity,
}) {
  const supervisorEntries = selectSupervisorEntries(
    benchmarkImplementationIdentity,
  );
  const projection = {
    schema_version: "formal-runtime-tcb-identity-v1",
    runtime: {
      platform: environment.platform,
      arch: environment.arch,
      node: environment.node,
      node_exec_path: environment.node_exec_path,
    },
    containment: {
      platform: "windows-job-object-v1",
      assignment: "create-suspended-assign-before-resume",
      descendant_cleanup: "job-active-processes-zero-before-result",
      cumulative_cpu: "job-total-user-plus-kernel-100ns",
      stream_capture: "bounded-concurrent-pipes-overflow-terminates-job",
    },
    clock_policy: FORMAL_CLOCK_POLICY,
    supervisor_entries: supervisorEntries,
    benchmark_implementation_identity_sha256:
      benchmarkImplementationIdentity.identity_sha256,
  };
  return Object.freeze({
    ...projection,
    identity_sha256: sha256(canonical(projection)),
  });
}

export function validateFormalRuntimeTcbIdentity({
  identity,
  environment,
  benchmarkImplementationIdentity,
  requireCurrentRuntime = false,
}) {
  assertExactKeys(
    identity,
    [
      "benchmark_implementation_identity_sha256",
      "clock_policy",
      "containment",
      "identity_sha256",
      "runtime",
      "schema_version",
      "supervisor_entries",
    ],
    "formal_runtime_tcb_fields",
  );
  const expected = deriveFormalRuntimeTcbIdentity({
    environment,
    benchmarkImplementationIdentity,
  });
  assert(
    canonical(identity) === canonical(expected) &&
      shaPattern.test(identity.identity_sha256),
    "formal_runtime_tcb_identity",
  );
  if (requireCurrentRuntime)
    assert(
      process.platform === identity.runtime.platform &&
        process.arch === identity.runtime.arch &&
        process.version === identity.runtime.node &&
        normalizePath(process.execPath) ===
          normalizePath(identity.runtime.node_exec_path),
      "formal_runtime_tcb_current_runtime",
    );
  return identity;
}

function selectSupervisorEntries(identity) {
  assert(
    identity &&
      Array.isArray(identity.entries) &&
      shaPattern.test(identity.identity_sha256 ?? ""),
    "formal_runtime_tcb_benchmark_identity",
  );
  const entries = identity.entries
    .filter((entry) => formalProcessSupervisorTcbPaths.includes(entry.path))
    .map((entry) => ({
      path: entry.path,
      bytes: entry.bytes,
      sha256: entry.sha256,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
  assert(
    entries.length === formalProcessSupervisorTcbPaths.length &&
      entries.every(
        (entry) =>
          Number.isSafeInteger(entry.bytes) &&
          entry.bytes > 0 &&
          shaPattern.test(entry.sha256),
      ),
    "formal_runtime_tcb_supervisor_entries",
  );
  return entries;
}

function normalizePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
