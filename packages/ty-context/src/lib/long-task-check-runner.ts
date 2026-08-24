import { randomBytes } from "node:crypto";
import { access, realpath } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import {
  decodeCheckEvidence,
  invalidEvidence,
} from "./long-task-check-evidence-decoder.js";
import { spawnCommandOnce } from "./long-task-command-process.js";
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
        context?.process_runtime_closure_identity,
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
  processRuntimeClosureIdentity: string | undefined,
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
    const execution = await spawnCommandOnce(
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
  const execution = await spawnCommandOnce(
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
      process_runtime_closure_identity: processRuntimeClosureIdentity!,
    },
  };
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
    !context.process_runtime_closure_identity ||
    !check.process_runtime_closure ||
    context.process_runtime_closure_identity !==
      check.process_runtime_closure.closure_identity
  )
    return "process_runtime_closure_identity_mismatch";
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
