import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import {
  MECHANISM_ROOT,
  guidanceText,
  readTrackedJson,
  sha256,
  writeJson,
} from "./admission-shared.mjs";
import { scoreAdmissionInvocation } from "./admission-score.mjs";
import { currentExactMainCandidate } from "./admission-attestation.mjs";

export async function runAdmissionPair({
  trackId,
  pairId,
  replicate,
  artifactDirectory,
  config,
  configSha,
}) {
  const track = config.tracks[trackId];
  if (!track) throw new Error(`admission_track_unknown:${trackId}`);
  assertPairIdentity(pairId, replicate);
  assertRuntimeEnvironment(config.environment);
  const pair = {
    pair_id: pairId,
    replicate,
    requested_model: config.model,
    requested_reasoning_effort: config.reasoning_effort,
    requested_provider: config.provider,
    fixture_identity: track.fixture_identity,
    environment_identity: config.environment.identity,
    candidate_git: currentExactMainCandidate(),
    baseline: {},
    candidate: {},
  };
  const modes = Object.keys(track.modes);
  for (const mode of modes) {
    const order = variantOrder(replicate, mode);
    for (const variantId of order) {
      const invocationDirectory = path.join(
        artifactDirectory,
        `${mode}-${variantId}`,
      );
      await mkdir(invocationDirectory);
      const invocation = await runInvocation({
        trackId,
        track,
        mode,
        variantId,
        pairId,
        replicate,
        invocationDirectory,
        config,
        configSha,
      });
      pair[variantId][mode] = invocation;
    }
  }
  return pair;
}

async function runInvocation(options) {
  const modeConfig = options.track.modes[options.mode];
  const variant = options.track.variants[options.variantId];
  const task = await readTrackedJson(modeConfig.task.path);
  const hidden = await readTrackedJson(modeConfig.hidden.path);
  const guidance = await guidanceText(variant.guidance[options.mode]);
  const prompt = buildPrompt(guidance, task);
  const promptSha = sha256(prompt);
  const traceIdentity = sha256(
    [
      options.configSha,
      options.trackId,
      options.pairId,
      options.replicate,
      options.mode,
      options.variantId,
      promptSha,
    ].join("\0"),
  );
  const schema = path.join(MECHANISM_ROOT, modeConfig.schema.path);
  const execution = await executeCodex({
    prompt,
    schema,
    model: options.config.model,
    reasoning: options.config.reasoning_effort,
    provider: options.config.provider,
    timeoutMs: options.config.environment.timeout_ms,
  });
  const trace = {
    schema_version: "tiny-context-fresh-agent-trace-v2",
    trace_identity: traceIdentity,
    pair_id: options.pairId,
    replicate: options.replicate,
    track: options.trackId,
    mode: options.mode,
    variant: options.variantId,
    requested_execution: execution.requested_execution,
    effective_execution: execution.effective_execution,
    provenance_doubt_reasons: execution.provenance_doubt_reasons,
    provider_fixture_identity: options.config.provider_fixture_identity,
    environment_identity: options.config.environment.identity,
    config_sha256: options.configSha,
    prompt_sha256: promptSha,
    guidance_bundle_sha256: variant.guidance[options.mode].bundle_sha256,
    task_sha256: modeConfig.task.sha256,
    schema_sha256: modeConfig.schema.sha256,
    duration_ms: execution.duration_ms,
    input_tokens: execution.usage.input_tokens,
    cached_input_tokens: execution.usage.cached_input_tokens,
    output_tokens: execution.usage.output_tokens,
    reasoning_output_tokens: execution.usage.reasoning_output_tokens,
    total_tokens:
      execution.usage.input_tokens +
      execution.usage.output_tokens +
      execution.usage.reasoning_output_tokens,
    tool_calls: execution.tool_calls,
    exit_status: execution.exit_status,
    environment_doubt: execution.environment_doubt,
    stderr_sha256: sha256(execution.stderr),
  };
  const score = scoreAdmissionInvocation(
    options.trackId,
    options.mode,
    execution.result,
    trace,
    hidden,
  );
  await Promise.all([
    writeJson(
      path.join(options.invocationDirectory, "result.json"),
      execution.result,
    ),
    writeJson(path.join(options.invocationDirectory, "trace.json"), trace),
    writeJson(path.join(options.invocationDirectory, "score.json"), score),
    writeFile(
      path.join(options.invocationDirectory, "events.jsonl"),
      execution.stdout,
      { encoding: "utf8", flag: "wx" },
    ),
    writeFile(
      path.join(options.invocationDirectory, "stderr.txt"),
      execution.stderr,
      { encoding: "utf8", flag: "wx" },
    ),
  ]);
  return { result: execution.result, trace, score };
}

async function executeCodex({
  prompt,
  schema,
  model,
  reasoning,
  provider,
  timeoutMs,
}) {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-context-admission-"),
  );
  let cleanupFailure = null;
  try {
    const started = process.hrtime.bigint();
    const run = spawnSync(
      "codex",
      [
        "exec",
        "--ephemeral",
        "--ignore-user-config",
        "--ignore-rules",
        "--skip-git-repo-check",
        "-s",
        "read-only",
        "-C",
        temporary,
        "-m",
        model,
        "-c",
        `model_reasoning_effort=\"${reasoning}\"`,
        "-c",
        `model_provider=\"${provider}\"`,
        "--output-schema",
        schema,
        "--json",
        "-",
      ],
      {
        cwd: temporary,
        input: prompt,
        encoding: "utf8",
        windowsHide: true,
        timeout: timeoutMs,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    if (run.error) throw run.error;
    if (run.status !== 0)
      throw new Error(
        `fresh_agent_execution_failed:${run.status}:stdout=${run.stdout}:stderr=${run.stderr}`,
      );
    const parsed = parseAdmissionEvents(run.stdout, {
      model,
      reasoning_effort: reasoning,
      provider,
    });
    return {
      result: parsed.result,
      usage: parsed.usage,
      tool_calls: parsed.tool_calls,
      duration_ms: Math.round(durationMs),
      stdout: run.stdout,
      stderr: run.stderr ?? "",
      exit_status: run.status,
      environment_doubt: parsed.environment_doubt,
      requested_execution: parsed.requested_execution,
      effective_execution: parsed.effective_execution,
      provenance_doubt_reasons: parsed.provenance_doubt_reasons,
    };
  } finally {
    try {
      await rm(temporary, { recursive: true, force: false });
    } catch (error) {
      cleanupFailure = error instanceof Error ? error.message : String(error);
    }
    if (cleanupFailure)
      throw new Error(`fresh_agent_temp_cleanup_failed:${cleanupFailure}`);
  }
}

export function parseAdmissionEvents(stdout, requestedExecution) {
  const events = stdout
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const messages = events.filter(
    (event) =>
      event.type === "item.completed" && event.item?.type === "agent_message",
  );
  const turns = events.filter((event) => event.type === "turn.completed");
  if (messages.length !== 1 || turns.length !== 1)
    throw new Error("fresh_agent_trace_incomplete");
  const usage = turns[0].usage;
  for (const field of [
    "input_tokens",
    "cached_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
  ])
    if (!Number.isInteger(usage?.[field]))
      throw new Error(`fresh_agent_usage_missing:${field}`);
  const toolTypes = new Set([
    "command_execution",
    "mcp_tool_call",
    "web_search",
    "file_change",
  ]);
  const toolCalls = new Set(
    events
      .filter(
        (event) =>
          ["item.started", "item.completed"].includes(event.type) &&
          toolTypes.has(event.item?.type),
      )
      .map((event) => event.item.id),
  ).size;
  const effectiveExecution = {
    model: effectiveField(
      events,
      requestedExecution.model,
      ["model", "model_id"],
      "model",
    ),
    reasoning_effort: effectiveField(
      events,
      requestedExecution.reasoning_effort,
      ["reasoning_effort", "model_reasoning_effort"],
      "reasoning_effort",
    ),
    provider: effectiveField(
      events,
      requestedExecution.provider,
      ["provider", "model_provider"],
      "provider",
    ),
  };
  const provenanceDoubtReasons = Object.entries(effectiveExecution)
    .filter(([, observation]) => observation.status !== "verified")
    .map(([field, observation]) => `${field}:${observation.status}`);
  return {
    result: JSON.parse(messages[0].item.text),
    usage,
    tool_calls: toolCalls,
    requested_execution: requestedExecution,
    effective_execution: effectiveExecution,
    provenance_doubt_reasons: provenanceDoubtReasons,
    environment_doubt: provenanceDoubtReasons.length > 0,
  };
}

function effectiveField(events, requested, fieldNames, label) {
  const observed = [];
  for (const event of events) {
    if (
      ![
        "execution.metadata",
        "thread.started",
        "turn.started",
        "turn.completed",
      ].includes(event.type)
    )
      continue;
    for (const field of fieldNames) {
      const value = event[field] ?? event.execution?.[field];
      if (typeof value === "string" && value.trim())
        observed.push({ value, event_type: event.type, field });
    }
  }
  const values = [...new Set(observed.map((item) => item.value))];
  if (!values.length)
    return { status: "unverified", value: null, evidence: [] };
  if (values.length !== 1 || values[0] !== requested)
    return { status: "mismatch", value: values, evidence: observed };
  return {
    status: "verified",
    value: values[0],
    evidence: observed.map((item) => `${item.event_type}.${item.field}`),
    label,
  };
}

function buildPrompt(guidance, task) {
  return `You are an independent measured fresh Agent. Use the supplied policy as the sole project-governance authority for this exercise. Do not use tools, inspect files, search for hidden probes, or infer unstated project decisions. Analyze every case independently and return only JSON matching the provided schema.\n\nPOLICY GUIDANCE\n${guidance}\nTASK FIXTURE\n${JSON.stringify(task, null, 2)}\n`;
}

function variantOrder(replicate, mode) {
  const baselineFirst = (replicate + (mode === "simple" ? 1 : 0)) % 2 === 1;
  return baselineFirst ? ["baseline", "candidate"] : ["candidate", "baseline"];
}

function assertPairIdentity(pairId, replicate) {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(pairId))
    throw new Error(`admission_pair_id_invalid:${pairId}`);
  if (!Number.isInteger(replicate) || replicate < 1)
    throw new Error(`admission_replicate_invalid:${replicate}`);
}

function assertRuntimeEnvironment(environment) {
  const codex = spawnSync("codex", ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const failures = [];
  if (process.platform !== environment.platform) failures.push("platform");
  if (process.arch !== environment.arch) failures.push("arch");
  if (Number(process.versions.node.split(".")[0]) !== environment.node_major)
    failures.push("node_major");
  if (codex.status !== 0 || codex.stdout.trim() !== environment.codex_cli)
    failures.push("codex_cli");
  if (failures.length)
    throw new Error(`admission_environment_mismatch:${failures.join(",")}`);
}
