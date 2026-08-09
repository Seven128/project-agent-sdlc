import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, realpath } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { promisify } from "node:util";
import {
  decodeCheckEvidence,
  invalidEvidence,
} from "./long-task-check-evidence-decoder.js";
import type {
  CompiledCheckV2,
  CompiledObservationAuthorityV2,
  CheckRunnerExecutionContextV2,
  EnvironmentRequirementV2,
  HostExecutionAttestationV2,
  PackageProcessObservationV1,
  RawCommandExecutionV2,
} from "./long-task-delivery-types.js";
import {
  declaredEnvironmentValues,
  outputContainsDeclaredEnvironmentValue,
  runnerEnvironment,
} from "./long-task-runner-environment.js";
import { decodeProductObservationEnvelope } from "./long-task-process-observation.js";
import { resolveInsideRepository } from "./long-task-workspace.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

const OUTPUT_LIMIT = 2 * 1024 * 1024;
const PROCESS_TREE_GRACE_MS = 1_000;
const execFileAsync = promisify(execFile);

export async function executeCheckRunner(
  check: CompiledCheckV2,
  snapshotRoot: string,
  context?: CheckRunnerExecutionContextV2,
): Promise<RawCommandExecutionV2> {
  const started = Date.now();
  let processAuthorities: CompiledObservationAuthorityV2[];
  try {
    processAuthorities = processObservationAuthorities(
      check.observation_authorities ?? [],
      context?.observation_authorities ?? [],
    );
  } catch (error) {
    return invalidRawExecution(check, started, message(error));
  }
  const processObserverIssue = validateProcessObserverActivation(
    check,
    snapshotRoot,
    processAuthorities,
    context,
  );
  if (processObserverIssue)
    return invalidRawExecution(check, started, processObserverIssue);
  const unavailable = await probeEnvironment(
    check.environment_requirements,
    snapshotRoot,
  );
  if (unavailable)
    return {
      raw_execution_identity: check.raw_execution_identity,
      execution_identity: check.raw_execution_identity,
      execution_status: "blocked_external",
      exit_code: -1,
      observations: {},
      evidence_records: [],
      stdout_sha256: sha256Hex(""),
      stderr_sha256: sha256Hex(""),
      attempts: 0,
      duration_ms: Date.now() - started,
      error: unavailable,
    };
  const retryAllowed =
    check.runner.retry_policy === "transient_once" &&
    check.runner.idempotent &&
    (check.runner.effect === "read_only" ||
      check.runner.effect === "test_sandbox");
  const maximumAttempts = retryAllowed ? 2 : 1;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      const raw = await runOnce(
        check,
        snapshotRoot,
        processAuthorities,
        context?.snapshot_sha256,
      );
      const secrets = declaredEnvironmentValues(check.environment_requirements);
      let decoded = outputContainsDeclaredEnvironmentValue(raw, secrets)
        ? invalidEvidence(
            raw.exit_code,
            "check_evidence_contains_declared_environment_value",
          )
        : raw.process_observation
          ? {
              execution_status: "completed" as const,
              exit_code: raw.exit_code,
              observations: {},
              evidence_records: [],
              error: null,
            }
          : decodeCheckEvidence(check, raw.exit_code, raw.stdout, raw.stderr);
      if (raw.process_observation && raw.exit_code !== 0)
        decoded = invalidEvidence(
          raw.exit_code,
          "process_observer_nonzero_exit",
        );
      else if (
        raw.process_observation &&
        decoded.execution_status !== "completed"
      )
        decoded = invalidEvidence(
          raw.exit_code,
          "project_submitted_execution_status_disagrees_with_harness",
        );
      if (
        raw.process_observation &&
        packageObservationContainsDeclaredEnvironmentValue(
          raw.process_observation,
          secrets,
        )
      )
        decoded = invalidEvidence(
          raw.exit_code,
          "check_evidence_contains_declared_environment_value",
        );
      return {
        raw_execution_identity: check.raw_execution_identity,
        execution_identity: check.raw_execution_identity,
        ...decoded,
        stdout_sha256: sha256Hex(raw.stdout),
        stderr_sha256: sha256Hex(raw.stderr),
        attempts: attempt,
        duration_ms: Date.now() - started,
        package_observations:
          raw.process_observation?.package_observations ?? [],
        host_execution_attestation: raw.host_execution_attestation,
      };
    } catch (error) {
      const reason = message(error);
      if (attempt < maximumAttempts) continue;
      return {
        raw_execution_identity: check.raw_execution_identity,
        execution_identity: check.raw_execution_identity,
        execution_status: isProcessObservationError(reason)
          ? "invalid_evidence"
          : "infrastructure_error",
        exit_code: -1,
        observations: {},
        evidence_records: [],
        stdout_sha256: sha256Hex(""),
        stderr_sha256: sha256Hex(reason),
        attempts: attempt,
        duration_ms: Date.now() - started,
        error: reason,
        package_observations: [],
        host_execution_attestation: null,
      };
    }
  }
  throw new Error("unreachable");
}

async function runOnce(
  check: CompiledCheckV2,
  snapshotRoot: string,
  processAuthorities: readonly CompiledObservationAuthorityV2[],
  snapshotSha256: string | undefined,
): Promise<{
  exit_code: number;
  stdout: Buffer;
  stderr: Buffer;
  process_observation: PackageProcessObservationV1 | null;
  host_execution_attestation: HostExecutionAttestationV2 | null;
}> {
  const runner = check.runner;
  const cwd = resolveInsideRepository(
    snapshotRoot,
    runner.resolved_cwd || ".",
    "runner.resolved_cwd",
  );
  const executable =
    runner.type === "project_binary"
      ? resolveInsideRepository(
          snapshotRoot,
          runner.resolved_target,
          "runner.resolved_target",
        )
      : runner.executable;
  const argv = [...runner.executable_argv_prefix, ...runner.argv];
  if (!processAuthorities.length) {
    const execution = await spawnOnce(
      executable,
      argv,
      cwd,
      runner.timeout_ms,
      runnerEnvironment(check.environment_requirements),
      false,
    );
    return {
      ...execution,
      process_observation: null,
      host_execution_attestation: null,
    };
  }

  const executionNonce = randomBytes(32).toString("hex");
  const execution = await spawnOnce(
    executable,
    argv,
    cwd,
    runner.timeout_ms,
    runnerEnvironment(check.environment_requirements, "product_observation"),
    true,
  );
  const processObservation = decodeProductObservationEnvelope({
    bytes: execution.stdout,
    authorities: processAuthorities,
  });
  const declaredRoot = resolveInsideRepository(
    snapshotRoot,
    processAuthorities[0].runtime_requirements.declared_root_entrypoint,
    "process_observer.declared_root_entrypoint",
  );
  const [actualExecutable, actualDeclaredRoot] = await Promise.all([
    realpath(executable),
    realpath(declaredRoot),
  ]);
  const directRootMatch =
    sameHostPath(actualExecutable, actualDeclaredRoot) &&
    sameStringArray(
      argv,
      processAuthorities[0].runtime_requirements.declared_root_argv ?? [],
    );
  if (!directRootMatch)
    throw new Error("process_observer_direct_root_required");
  return {
    exit_code: execution.exit_code,
    stdout: execution.stdout,
    stderr: execution.stderr,
    process_observation: processObservation,
    host_execution_attestation: {
      raw_execution_identity: check.raw_execution_identity,
      executable_path: actualExecutable,
      declared_root_entrypoint: actualDeclaredRoot,
      actual_argv: [...argv],
      declared_root_argv: [
        ...(processAuthorities[0].runtime_requirements.declared_root_argv ??
          []),
      ],
      direct_root_match: directRootMatch,
      pid: execution.pid,
      started_at: execution.started_at,
      completed_at: execution.completed_at,
      exit_code: execution.exit_code,
      snapshot_sha256: snapshotSha256!,
      observation_execution_nonce: executionNonce,
      observation_artifact_sha256: processObservation.artifact_sha256,
    },
  };
}

async function spawnOnce(
  executable: string,
  argv: string[],
  cwd: string,
  timeoutMs: number,
  environment: NodeJS.ProcessEnv,
  containProcessTree: boolean,
): Promise<{
  exit_code: number;
  stdout: Buffer;
  stderr: Buffer;
  pid: number;
  started_at: string;
  completed_at: string;
}> {
  return new Promise((resolve, reject) => {
    const startedAt = new Date().toISOString();
    const child = spawn(executable, argv, {
      cwd,
      shell: false,
      windowsHide: true,
      env: environment,
      detached: containProcessTree && process.platform !== "win32",
    });
    const pid = child.pid ?? -1;
    let stopTreeMonitor = false;
    let treeMonitorError: unknown = null;
    const observedDescendants = new Set<number>();
    const treeMonitor =
      containProcessTree && pid > 0
        ? observeDescendantProcesses(
            pid,
            observedDescendants,
            () => stopTreeMonitor,
          ).catch((error) => {
            treeMonitorError = error;
          })
        : Promise.resolve();
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let size = 0;
    let settled = false;
    let terminationReason: Error | null = null;
    let terminationTask: Promise<void> | null = null;
    let forceTimer: NodeJS.Timeout | null = null;
    let abandonTimer: NodeJS.Timeout | null = null;
    const capture = (target: Buffer[]) => (chunk: Buffer) => {
      size += chunk.length;
      if (size > OUTPUT_LIMIT) {
        terminate("command_output_limit_exceeded");
        return;
      }
      target.push(Buffer.from(chunk));
    };
    child.stdout.on("data", capture(stdout));
    child.stderr.on("data", capture(stderr));
    child.on("error", (error) => {
      if (!settled) {
        settled = true;
        stopTreeMonitor = true;
        clearTimeout(timer);
        if (forceTimer) clearTimeout(forceTimer);
        if (abandonTimer) clearTimeout(abandonTimer);
        const spawnError = new Error(`command_spawn_error:${message(error)}`);
        if (containProcessTree && pid > 0)
          void terminateProcessTree(pid, true, [...observedDescendants])
            .catch(() => undefined)
            .finally(() => reject(spawnError));
        else reject(spawnError);
      }
    });
    const timer = setTimeout(() => {
      terminate("command_timeout");
    }, timeoutMs);
    if (pid < 0) terminate("command_spawn_pid_unavailable");
    child.on("close", async (code) => {
      stopTreeMonitor = true;
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      if (abandonTimer) clearTimeout(abandonTimer);
      if (settled) return;
      settled = true;
      if (terminationReason) {
        try {
          await terminationTask;
          await treeMonitor;
          if (containProcessTree)
            await forceProcessTreeQuiescence(pid, observedDescendants);
        } catch {
          // The original bounded termination reason remains the public error;
          // cleanup is best-effort after the hard process-tree kill attempt.
        }
        reject(terminationReason);
        return;
      }
      if (containProcessTree) {
        try {
          await treeMonitor;
          if (treeMonitorError) throw treeMonitorError;
          await assertProcessTreeQuiescent(pid, observedDescendants);
        } catch (error) {
          await terminateProcessTree(pid, true, [...observedDescendants]).catch(
            () => undefined,
          );
          reject(error);
          return;
        }
      }
      resolve({
        exit_code: code ?? -1,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
        pid,
        started_at: startedAt,
        completed_at: new Date().toISOString(),
      });
    });
    function terminate(reason: string): void {
      if (settled || terminationReason) return;
      terminationReason = new Error(reason);
      stopTreeMonitor = true;
      if (containProcessTree)
        terminationTask = terminateProcessTree(pid, false).catch((error) => {
          treeMonitorError ??= error;
        });
      else {
        child.kill();
        terminationTask = Promise.resolve();
      }
      forceTimer = setTimeout(() => {
        if (containProcessTree)
          terminationTask = terminateProcessTree(pid, true, [
            ...observedDescendants,
          ]).catch((error) => {
            treeMonitorError ??= error;
          });
        else child.kill("SIGKILL");
      }, PROCESS_TREE_GRACE_MS);
      forceTimer.unref();
      abandonTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        child.stdout.destroy();
        child.stderr.destroy();
        const cleanup = containProcessTree
          ? forceProcessTreeQuiescence(pid, observedDescendants).catch(
              () => undefined,
            )
          : Promise.resolve();
        void cleanup.finally(() => reject(terminationReason!));
      }, PROCESS_TREE_GRACE_MS * 2);
      abandonTimer.unref();
    }
  });
}

async function forceProcessTreeQuiescence(
  rootPid: number,
  observed: ReadonlySet<number>,
): Promise<void> {
  await terminateProcessTree(rootPid, true, [...observed]);
  const deadline = Date.now() + PROCESS_TREE_GRACE_MS;
  while (Date.now() < deadline) {
    const liveObserved = [rootPid, ...observed].some(processIdExists);
    const groupAlive =
      process.platform !== "win32" && processGroupExists(rootPid);
    if (!liveObserved && !groupAlive) return;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, process.platform === "win32" ? 100 : 25),
    );
  }
  throw new Error("process_observer_descendant_process_alive");
}

async function observeDescendantProcesses(
  rootPid: number,
  observed: Set<number>,
  stopped: () => boolean,
): Promise<void> {
  do {
    for (const pid of await descendantProcessIds(rootPid)) observed.add(pid);
    if (stopped()) return;
    await new Promise<void>((resolve) =>
      setTimeout(resolve, process.platform === "win32" ? 100 : 25),
    );
  } while (!stopped());
}

async function assertProcessTreeQuiescent(
  rootPid: number,
  observed: ReadonlySet<number>,
): Promise<void> {
  const finalDescendants = await descendantProcessIds(rootPid);
  const descendants = [...new Set([...observed, ...finalDescendants])].filter(
    processIdExists,
  );
  const processGroupAlive =
    process.platform !== "win32" && processGroupExists(rootPid);
  if (!descendants.length && !processGroupAlive) return;
  await terminateProcessTree(rootPid, true, descendants);
  throw new Error("process_observer_descendant_process_alive");
}

function processIdExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (nodeErrorCode(error) === "ESRCH") return false;
    throw error;
  }
}

async function terminateProcessTree(
  rootPid: number,
  force: boolean,
  knownDescendants?: readonly number[],
): Promise<void> {
  if (!Number.isSafeInteger(rootPid) || rootPid <= 0) return;
  if (process.platform === "win32") {
    const targets = [
      rootPid,
      ...[...new Set(knownDescendants ?? [])]
        .filter((pid) => pid !== rootPid)
        .reverse(),
    ];
    for (const pid of targets)
      await execFileAsync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
        timeout: PROCESS_TREE_GRACE_MS,
      }).catch(() => undefined);
    return;
  }
  const signal: NodeJS.Signals = force ? "SIGKILL" : "SIGTERM";
  try {
    process.kill(-rootPid, signal);
  } catch (error) {
    if (nodeErrorCode(error) !== "ESRCH") throw error;
  }
  const descendants = knownDescendants ?? (await descendantProcessIds(rootPid));
  for (const pid of [...descendants].reverse())
    try {
      process.kill(pid, signal);
    } catch (error) {
      if (nodeErrorCode(error) !== "ESRCH") throw error;
    }
}

async function descendantProcessIds(rootPid: number): Promise<number[]> {
  let stdout: string;
  try {
    const result =
      process.platform === "win32"
        ? await execFileAsync(
            "powershell.exe",
            [
              "-NoLogo",
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              'Get-CimInstance Win32_Process | ForEach-Object { "$($_.ProcessId) $($_.ParentProcessId)" }',
            ],
            {
              encoding: "utf8",
              windowsHide: true,
              timeout: 5_000,
              maxBuffer: OUTPUT_LIMIT,
            },
          )
        : await execFileAsync("ps", ["-A", "-o", "pid=,ppid="], {
            encoding: "utf8",
            timeout: 5_000,
            maxBuffer: OUTPUT_LIMIT,
          });
    stdout = result.stdout;
  } catch (error) {
    throw new Error(
      `process_observer_process_tree_inspection_unavailable:${message(error)}`,
    );
  }
  const children = new Map<number, number[]>();
  for (const line of stdout.split(/\r?\n/u)) {
    const [pidText, parentText] = line.trim().split(/\s+/u);
    const pid = Number.parseInt(pidText ?? "", 10);
    const parent = Number.parseInt(parentText ?? "", 10);
    if (!Number.isSafeInteger(pid) || !Number.isSafeInteger(parent)) continue;
    const row = children.get(parent);
    if (row) row.push(pid);
    else children.set(parent, [pid]);
  }
  const result: number[] = [];
  const pending = [...(children.get(rootPid) ?? [])];
  const seen = new Set<number>();
  while (pending.length) {
    const pid = pending.shift()!;
    if (seen.has(pid)) continue;
    seen.add(pid);
    result.push(pid);
    pending.push(...(children.get(pid) ?? []));
  }
  return result;
}

function processGroupExists(rootPid: number): boolean {
  try {
    process.kill(-rootPid, 0);
    return true;
  } catch (error) {
    if (nodeErrorCode(error) === "ESRCH") return false;
    throw error;
  }
}

function nodeErrorCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}

function validateProcessObserverActivation(
  check: CompiledCheckV2,
  snapshotRoot: string,
  authorities: readonly CompiledObservationAuthorityV2[],
  context: CheckRunnerExecutionContextV2 | undefined,
): string | null {
  if (!authorities.length) return null;
  if (!context?.snapshot_sha256)
    return "process_observer_snapshot_identity_required";
  if (
    check.environment_requirements.some(
      (requirement) =>
        requirement.kind === "env_var" &&
        (requirement.target.toUpperCase() === "TY_CONTEXT_OBSERVATION_OUTPUT" ||
          requirement.target.toUpperCase() ===
            "TY_CONTEXT_OBSERVATION_CHALLENGE" ||
          requirement.target.toUpperCase() === "TY_CONTEXT_CHECK_PROTOCOL"),
    )
  )
    return "process_observer_reserved_environment_requirement";
  if (
    check.runner.type !== "project_binary" ||
    check.execution_target.entrypoint !== "root"
  )
    return "process_observer_direct_root_required";
  const executable = resolveInsideRepository(
    snapshotRoot,
    check.runner.resolved_target,
    "process_observer.runner_target",
  );
  const actualArgv = [
    ...check.runner.executable_argv_prefix,
    ...check.runner.argv,
  ];
  for (const authority of authorities) {
    const requirements = authority.runtime_requirements;
    if (
      requirements.runtime_family !== "process" ||
      requirements.target_role !== "product" ||
      requirements.entrypoint !== "root" ||
      requirements.runner_type !== "project_binary" ||
      requirements.resolved_runner_target !== check.runner.resolved_target ||
      requirements.declared_root_argv === null ||
      !sameStringArray(requirements.resolved_runner_argv, check.runner.argv) ||
      !sameStringArray(requirements.declared_root_argv, actualArgv) ||
      check.runner.executable_argv_prefix.length !== 0 ||
      !requirements.direct_root_match
    )
      return "process_observer_direct_root_required";
    const declaredRoot = resolveInsideRepository(
      snapshotRoot,
      requirements.declared_root_entrypoint,
      "process_observer.declared_root_entrypoint",
    );
    if (!sameHostPath(executable, declaredRoot))
      return "process_observer_direct_root_required";
  }
  return null;
}

function processObservationAuthorities(
  checkAuthorities: readonly CompiledObservationAuthorityV2[],
  groupedAuthorities: readonly CompiledObservationAuthorityV2[],
): CompiledObservationAuthorityV2[] {
  const byIdentity = new Map<string, CompiledObservationAuthorityV2>();
  for (const authority of [...checkAuthorities, ...groupedAuthorities]) {
    if (authority.authority !== "package_process_json_exact") continue;
    const identity = `${authority.assertion_ref}\0${authority.obligation_ref}\0${authority.method}`;
    const existing = byIdentity.get(identity);
    if (
      existing &&
      canonicalValueJson(existing) !== canonicalValueJson(authority)
    )
      throw new Error("process_observation_authority_group_mismatch");
    byIdentity.set(identity, authority);
  }
  return [...byIdentity.values()];
}

function invalidRawExecution(
  check: CompiledCheckV2,
  started: number,
  reason: string,
): RawCommandExecutionV2 {
  return {
    raw_execution_identity: check.raw_execution_identity,
    execution_identity: check.raw_execution_identity,
    execution_status: "invalid_evidence",
    exit_code: -1,
    observations: {},
    evidence_records: [],
    stdout_sha256: sha256Hex(""),
    stderr_sha256: sha256Hex(reason),
    attempts: 0,
    duration_ms: Date.now() - started,
    error: reason,
    package_observations: [],
    host_execution_attestation: null,
  };
}

function packageObservationContainsDeclaredEnvironmentValue(
  observation: PackageProcessObservationV1,
  values: string[],
): boolean {
  if (!values.length) return false;
  const serialized = JSON.stringify(observation.observations);
  return values.some((value) => serialized.includes(value));
}

function isProcessObservationError(reason: string): boolean {
  return (
    reason.startsWith("process_observation_") ||
    reason.startsWith("process_observer_")
  );
}

function sameHostPath(left: string, right: string): boolean {
  return process.platform === "win32"
    ? path.resolve(left).toLowerCase() === path.resolve(right).toLowerCase()
    : path.resolve(left) === path.resolve(right);
}

function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

async function probeEnvironment(
  requirements: EnvironmentRequirementV2[],
  snapshotRoot: string,
): Promise<string | null> {
  for (const requirement of requirements) {
    let available = false;
    if (requirement.kind === "executable")
      available = await executableExists(requirement.target);
    else if (requirement.kind === "env_var")
      available = Boolean(process.env[requirement.target]);
    else if (requirement.kind === "file")
      available = Boolean(
        (
          await statSafe(
            resolveInsideRepository(
              snapshotRoot,
              requirement.target,
              `environment.${requirement.key}`,
            ),
          )
        )?.isFile(),
      );
    else if (requirement.kind === "directory")
      available = Boolean(
        (
          await statSafe(
            resolveInsideRepository(
              snapshotRoot,
              requirement.target,
              `environment.${requirement.key}`,
            ),
          )
        )?.isDirectory(),
      );
    else if ("host" in requirement)
      available = await loopbackAvailable(
        requirement.host,
        requirement.port,
        requirement.timeout_ms,
      );
    if (!available)
      return `environment_requirement_unavailable:${requirement.key}`;
  }
  return null;
}

async function executableExists(target: string): Promise<boolean> {
  if (path.isAbsolute(target))
    return access(target)
      .then(() => true)
      .catch(() => false);
  const names =
    process.platform === "win32"
      ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .flatMap((extension) => [target, `${target}${extension}`])
      : [target];
  for (const folder of (process.env.PATH ?? "").split(path.delimiter))
    for (const name of names)
      if (
        await access(path.join(folder, name))
          .then(() => true)
          .catch(() => false)
      )
        return true;
  return false;
}

async function loopbackAvailable(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (value: boolean): void => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function statSafe(file: string) {
  return import("node:fs/promises")
    .then(({ stat }) => stat(file))
    .catch(() => null);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
