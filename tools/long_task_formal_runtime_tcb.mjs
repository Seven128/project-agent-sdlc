import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { formalProcessSupervisorTcbPaths } from "./formal_process_supervisor_protocol.mjs";
import {
  FORMAL_NODE_LAUNCH_POLICY,
  FORMAL_PROVIDER_NODE_LAUNCH_PROTOCOL,
  FORMAL_PROVIDER_PROTOCOL_PATH,
  FORMAL_PROVIDER_RESPONSE_PATH,
  FORMAL_PROVIDER_WORKER_ENVIRONMENT_POLICY,
  FORMAL_PROVIDER_WORKER_PATH,
  assertFormalProviderLaunchEnvelope,
} from "./long_task_formal_provider_protocol.mjs";
import { FORMAL_CLOCK_POLICY } from "./long_task_real_process_schema_policy.mjs";
import {
  deriveFormalProviderAdapterIdentity,
  FORMAL_PROVIDER_ADAPTER_PATH,
} from "./long_task_formal_provider_capture.mjs";
import {
  assert,
  canonical,
  sha256,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  assertExactKeys,
  shaPattern,
} from "./long_task_formal_total_cost_shared.mjs";
const execFileAsync = promisify(execFile);
export { formalProcessSupervisorTcbPaths };
export async function deriveFormalRuntimeTcbIdentity({
  environment,
  benchmarkImplementationIdentity,
  providerModel = process.env.TY_CONTEXT_FORMAL_OPENAI_MODEL ?? null,
}) {
  const host = await probeFormalWindowsHost();
  const launchEnvelope = assertFormalProviderLaunchEnvelope();
  assert(
    environment.platform === "win32" &&
      environment.platform === process.platform &&
      environment.arch === process.arch &&
      environment.node === process.version &&
      normalizePath(environment.node_exec_path) ===
        normalizePath(process.execPath),
    "formal_runtime_tcb_environment",
  );
  const supervisorEntries = selectSupervisorEntries(
    benchmarkImplementationIdentity,
  );
  const providerAdapter = deriveFormalProviderAdapterIdentity({
    benchmarkImplementationIdentity,
    environment: {
      TY_CONTEXT_FORMAL_OPENAI_MODEL: providerModel,
    },
  });
  const providerWorker = selectImplementationEntry(
    benchmarkImplementationIdentity,
    FORMAL_PROVIDER_WORKER_PATH,
  );
  const providerProtocol = selectImplementationEntry(
    benchmarkImplementationIdentity,
    FORMAL_PROVIDER_PROTOCOL_PATH,
  );
  const providerResponse = selectImplementationEntry(
    benchmarkImplementationIdentity,
    FORMAL_PROVIDER_RESPONSE_PATH,
  );
  const projection = {
    schema_version: "formal-runtime-tcb-identity-v2",
    runtime: {
      platform: environment.platform,
      arch: environment.arch,
      node: environment.node,
      node_exec_path: environment.node_exec_path,
      node_executable_sha256: host.node_executable_sha256,
      node_launch: {
        policy: FORMAL_NODE_LAUNCH_POLICY,
        protocol: FORMAL_PROVIDER_NODE_LAUNCH_PROTOCOL,
        exec_argv: Object.freeze([]),
        unsupported_environment_keys_absent:
          launchEnvelope.unsupported_environment_keys_absent,
        provider_worker: {
          executable_path: process.execPath,
          executable_sha256: host.node_executable_sha256,
          worker_path: providerWorker.path,
          worker_sha256: providerWorker.sha256,
          response_path: providerResponse.path,
          response_sha256: providerResponse.sha256,
          protocol_path: providerProtocol.path,
          protocol_sha256: providerProtocol.sha256,
          shell: false,
          environment_policy: FORMAL_PROVIDER_WORKER_ENVIRONMENT_POLICY,
        },
      },
    },
    powershell: host.powershell,
    dotnet: host.dotnet,
    windows: host.windows,
    stopwatch_frequency: host.stopwatch_frequency,
    containment: {
      platform: "windows-job-object-v1",
      assignment: "create-suspended-assign-before-resume",
      descendant_cleanup: "job-active-processes-zero-before-result",
      cumulative_cpu: "job-total-user-plus-kernel-100ns",
      stream_capture: "bounded-concurrent-pipes-overflow-terminates-job",
    },
    clock_policy: FORMAL_CLOCK_POLICY,
    supervisor_entries: supervisorEntries,
    provider_adapter: providerAdapter,
    provider_service_tcb: "external",
    benchmark_implementation_identity_sha256:
      benchmarkImplementationIdentity.identity_sha256,
  };
  return Object.freeze({
    ...projection,
    identity_sha256: sha256(canonical(projection)),
  });
}
export async function validateFormalRuntimeTcbIdentity({
  identity,
  environment,
  benchmarkImplementationIdentity,
}) {
  assertExactKeys(
    identity,
    [
      "benchmark_implementation_identity_sha256",
      "clock_policy",
      "containment",
      "dotnet",
      "identity_sha256",
      "powershell",
      "provider_adapter",
      "provider_service_tcb",
      "runtime",
      "schema_version",
      "stopwatch_frequency",
      "supervisor_entries",
      "windows",
    ],
    "formal_runtime_tcb_fields",
  );
  const expected = await deriveFormalRuntimeTcbIdentity({
    environment,
    benchmarkImplementationIdentity,
    providerModel: identity.provider_adapter?.model ?? null,
  });
  assert(
    canonical(identity) === canonical(expected) &&
      shaPattern.test(identity.identity_sha256),
    "formal_runtime_tcb_identity",
  );
  return identity;
}
export async function probeFormalWindowsHost() {
  if (process.platform !== "win32")
    throw new Error("formal_process_supervisor_platform_unsupported");
  const where = await execFileAsync("where.exe", ["pwsh.exe"], {
    windowsHide: true,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1024 * 1024,
  });
  const first = where.stdout
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .find(Boolean);
  if (!first || !path.isAbsolute(first))
    throw new Error("formal_runtime_tcb_powershell_unavailable");
  const powershellPath = await realpath(first);
  const probeScript = [
    "$ErrorActionPreference='Stop'",
    "$r=[ordered]@{",
    "powershell_version=$PSVersionTable.PSVersion.ToString()",
    "psedition=[string]$PSVersionTable.PSEdition",
    "dotnet_framework=[Runtime.InteropServices.RuntimeInformation]::FrameworkDescription",
    "clr_version=[Environment]::Version.ToString()",
    "windows_os=[Runtime.InteropServices.RuntimeInformation]::OSDescription",
    "windows_version=[Environment]::OSVersion.Version.ToString()",
    "windows_build=[Environment]::OSVersion.Version.Build",
    "stopwatch_frequency=[Diagnostics.Stopwatch]::Frequency",
    "}",
    "$r|ConvertTo-Json -Compress",
  ].join("\n");
  const probe = await execFileAsync(
    powershellPath,
    ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", probeScript],
    {
      windowsHide: true,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
    },
  );
  let value;
  try {
    value = JSON.parse(probe.stdout);
  } catch (error) {
    throw new Error("formal_runtime_tcb_host_probe_json", { cause: error });
  }
  if (
    !value ||
    typeof value.powershell_version !== "string" ||
    typeof value.psedition !== "string" ||
    typeof value.dotnet_framework !== "string" ||
    typeof value.clr_version !== "string" ||
    typeof value.windows_os !== "string" ||
    typeof value.windows_version !== "string" ||
    !Number.isSafeInteger(value.windows_build) ||
    !Number.isSafeInteger(value.stopwatch_frequency) ||
    value.stopwatch_frequency <= 0
  )
    throw new Error("formal_runtime_tcb_host_probe");
  const [powershellBytes, nodeBytes] = await Promise.all([
    readFile(powershellPath),
    readFile(process.execPath),
  ]);
  return Object.freeze({
    powershell: Object.freeze({
      executable_path: powershellPath,
      executable_sha256: digest(powershellBytes),
      version: value.powershell_version,
      psedition: value.psedition,
    }),
    dotnet: Object.freeze({
      framework_description: value.dotnet_framework,
      clr_version: value.clr_version,
    }),
    windows: Object.freeze({
      os_description: value.windows_os,
      version: value.windows_version,
      build: value.windows_build,
    }),
    stopwatch_frequency: value.stopwatch_frequency,
    node_executable_sha256: digest(nodeBytes),
  });
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

function selectImplementationEntry(identity, repositoryPath) {
  assert(
    identity &&
      Array.isArray(identity.entries) &&
      shaPattern.test(identity.identity_sha256 ?? ""),
    "formal_runtime_tcb_benchmark_identity",
  );
  const entry = identity.entries.find(
    (candidate) => candidate.path === repositoryPath,
  );
  assert(
    entry &&
      Number.isSafeInteger(entry.bytes) &&
      entry.bytes > 0 &&
      shaPattern.test(entry.sha256),
    "formal_runtime_tcb_provider_entry",
  );
  return Object.freeze({
    path: entry.path,
    bytes: entry.bytes,
    sha256: entry.sha256,
  });
}

function normalizePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
