import { spawnSync } from "node:child_process";
import { REPO_ROOT, sha256 } from "./admission-shared.mjs";
import { currentExactMainCandidate } from "./admission-attestation.mjs";

export function runDeterministicAdmissionChecks(config, configSha) {
  const tracks = {};
  for (const [trackId, checks] of Object.entries(config.deterministic_checks)) {
    const results = checks.map(runCheck);
    tracks[trackId] = {
      passed: results.every((item) => item.status === 0),
      results,
    };
  }
  return {
    schema_version: "tiny-context-admission-deterministic-v1",
    config_sha256: configSha,
    candidate_git: currentExactMainCandidate(),
    environment_identity: config.environment.identity,
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
