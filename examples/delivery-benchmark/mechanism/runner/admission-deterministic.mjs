import { spawnSync } from "node:child_process";
import { REPO_ROOT, sha256 } from "./admission-shared.mjs";
import { currentExactMainCandidate } from "./admission-attestation.mjs";
import { observeDeterministicRuntimeEnvironment } from "./admission-runtime-environment.mjs";

export function runDeterministicAdmissionChecks(
  config,
  globalExecutionEnvelopeSha,
  trackConfigSha,
  options = {},
) {
  const deterministicRuntime =
    options.runtime ?? observeDeterministicRuntimeEnvironment();
  const tracks = {};
  for (const [trackId, checks] of Object.entries(config.deterministic_checks)) {
    const results = checks.map(runCheck);
    tracks[trackId] = {
      track_config_sha256: trackConfigSha[trackId],
      passed:
        deterministicRuntime.node_engine_conformant &&
        results.every((item) => item.status === 0),
      results,
    };
  }
  const deterministicRuntimePassed =
    deterministicRuntime.node_engine_conformant &&
    Object.values(tracks).every((track) => track.passed);
  return {
    schema_version: "tiny-context-admission-deterministic-v3",
    global_execution_envelope_sha256: globalExecutionEnvelopeSha,
    track_config_sha256: trackConfigSha,
    candidate_git: options.candidate ?? currentExactMainCandidate(),
    benchmark_execution_environment: {
      ...config.environment,
      provenance: "frozen-track-input",
    },
    deterministic_runtime_environment: deterministicRuntime,
    deterministic_runtime_passed: deterministicRuntimePassed,
    tracks,
  };
}

function runCheck(check) {
  const invocation = platformInvocation(check.command, check.args);
  const started = process.hrtime.bigint();
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: check.timeout_ms,
    maxBuffer: 64 * 1024 * 1024,
  });
  const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
  return {
    id: check.id,
    command: [check.command, ...check.args].join(" "),
    status: result.error ? null : result.status,
    duration_ms: Math.round(durationMs),
    stdout_sha256: sha256(result.stdout ?? ""),
    stderr_sha256: sha256(result.stderr ?? String(result.error ?? "")),
    failure: result.error?.message ?? null,
  };
}

function platformInvocation(command, args) {
  if (process.platform !== "win32" || command !== "npm")
    return { command, args };
  const shell = process.env.ComSpec || "cmd.exe";
  const line = [command, ...args].map(cmdQuote).join(" ");
  return { command: shell, args: ["/d", "/s", "/c", line] };
}

function cmdQuote(value) {
  const text = String(value);
  if (!/[\s&|<>^()"]/.test(text)) return text;
  return `"${text.replace(/"/gu, '""')}"`;
}
