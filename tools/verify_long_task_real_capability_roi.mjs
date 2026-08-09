import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseAdmissionEvents } from "../examples/delivery-benchmark/mechanism/runner/admission-execute.mjs";
import {
  ADMISSION_THRESHOLDS,
  CANDIDATE_GUIDANCE,
  CANDIDATE_IDENTITY_PATHS,
  CASES,
  CONTROL_GUIDANCE,
  HIDDEN_PROBE_VERSION,
  PROTOCOL_REVISION_REASON,
  REQUIRED_METRICS,
  TASK_KEY,
  WORKLOAD,
  freshAgentPrompt,
  resultSchema,
} from "./long_task_real_capability_roi_policy.mjs";
import {
  assert,
  canonical,
  deriveSummary,
  sameSet,
  scoreResult,
  sha,
  successfulExit,
  validateRun,
} from "./long_task_real_capability_roi_scoring.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = path.join(
  root,
  ".artifacts",
  "long-task-real-capability",
  "fresh-agent-paired.json",
);
const benchmarkConfigPath = path.join(
  root,
  "examples/delivery-benchmark/mechanism/admission-set.json",
);

if (process.argv.includes("--collect")) {
  await collectReport();
} else {
  await verifyReport();
}

async function collectReport() {
  const config = JSON.parse(await readFile(benchmarkConfigPath, "utf8"));
  assertEnvironment(config);
  const candidateIdentityValue = await candidateIdentity();
  const deterministicEvidence = runDeterministicEvidence(candidateIdentityValue);
  const pairs = [];
  for (
    let replicate = 1;
    replicate <= ADMISSION_THRESHOLDS.minimum_pairs;
    replicate += 1
  )
    pairs.push(await runPair(replicate, config));
  const initial = deriveSummary(pairs);
  const initialThreeInconclusive =
    initial.wins < ADMISSION_THRESHOLDS.minimum_wins ||
    initial.direction_inconsistent ||
    initial.provenance_doubt;
  if (initialThreeInconclusive)
    for (
      let replicate = ADMISSION_THRESHOLDS.minimum_pairs + 1;
      replicate <= ADMISSION_THRESHOLDS.expanded_pairs;
      replicate += 1
    )
      pairs.push(await runPair(replicate, config));
  const summary = deriveSummary(pairs);
  const report = {
    schema_version: "long-task-fresh-agent-paired-v1",
    purpose: "adherence-and-roi-only",
    safety_theorem_claimed: false,
    benchmark_protocol: "existing-codex-ephemeral-admission-execution-v3",
    hidden_probe_version: HIDDEN_PROBE_VERSION,
    protocol_revision_reason: PROTOCOL_REVISION_REASON,
    workload: WORKLOAD,
    admission_thresholds: ADMISSION_THRESHOLDS,
    requested_execution: {
      model: config.model,
      reasoning_effort: config.reasoning_effort,
      provider: config.provider,
    },
    environment_identity: config.environment.identity,
    candidate_identity: candidateIdentityValue,
    deterministic_evidence: deterministicEvidence,
    validity_floor: deterministicEvidence.passed,
    known_attack_rejection: summary.known_attack_rejection,
    valid_control_false_blocking_increased:
      summary.valid_control_false_blocking_increased,
    relative_coverage_non_degraded: summary.relative_coverage_non_degraded,
    total_roi_positive: summary.total_roi_positive,
    initial_three_inconclusive: initialThreeInconclusive,
    metrics: REQUIRED_METRICS,
    summary,
    pairs,
  };
  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify({
      schema_version: report.schema_version,
      report_path: path.relative(root, reportPath).replaceAll("\\", "/"),
      pairs: pairs.length,
      initial_three_inconclusive: initialThreeInconclusive,
      summary,
    }),
  );
}

async function verifyReport() {
  const config = JSON.parse(await readFile(benchmarkConfigPath, "utf8"));
  assertEnvironment(config);
  const report = JSON.parse(await readFile(reportPath, "utf8"));
  assert(report.schema_version === "long-task-fresh-agent-paired-v1", "schema");
  assert(report.purpose === "adherence-and-roi-only", "purpose");
  assert(report.safety_theorem_claimed === false, "safety_theorem_boundary");
  assert(
    report.benchmark_protocol ===
      "existing-codex-ephemeral-admission-execution-v3",
    "benchmark_protocol",
  );
  assert(
    report.hidden_probe_version === HIDDEN_PROBE_VERSION,
    "hidden_probe_version",
  );
  assert(
    report.protocol_revision_reason === PROTOCOL_REVISION_REASON,
    "protocol_revision_reason",
  );
  assert(canonical(report.workload) === canonical(WORKLOAD), "workload");
  assert(
    canonical(report.admission_thresholds) ===
      canonical(ADMISSION_THRESHOLDS),
    "admission_thresholds",
  );
  assert(
    canonical(report.requested_execution) ===
      canonical({
        model: config.model,
        reasoning_effort: config.reasoning_effort,
        provider: config.provider,
      }),
    "requested_execution",
  );
  assert(
    report.environment_identity === config.environment.identity,
    "environment_identity",
  );
  assert(
    report.candidate_identity === (await candidateIdentity()),
    "candidate_identity_stale",
  );
  const currentDeterministicEvidence = runDeterministicEvidence(
    report.candidate_identity,
  );
  assert(currentDeterministicEvidence.passed === true, "current_validity_floor");
  assert(
    canonical(
      report.deterministic_evidence?.commands?.map((command) => ({
        argv: command.argv,
        status: command.status,
      })),
    ) ===
      canonical(
        currentDeterministicEvidence.commands.map((command) => ({
          argv: command.argv,
          status: command.status,
        })),
      ),
    "deterministic_command_recomputation",
  );
  for (const [index, command] of (
    report.deterministic_evidence?.commands ?? []
  ).entries()) {
    assert(
      /^[a-f0-9]{64}$/u.test(command.stdout_sha256),
      `deterministic_stdout:${index}`,
    );
    assert(
      /^[a-f0-9]{64}$/u.test(command.stderr_sha256),
      `deterministic_stderr:${index}`,
    );
  }
  assert(report.deterministic_evidence?.passed === true, "validity_floor");
  assert(
    report.deterministic_evidence.candidate_identity ===
      report.candidate_identity,
    "deterministic_identity",
  );
  assert(Array.isArray(report.pairs), "pairs");
  assert(
    [
      ADMISSION_THRESHOLDS.minimum_pairs,
      ADMISSION_THRESHOLDS.expanded_pairs,
    ].includes(report.pairs.length),
    "pair_count",
  );
  if (report.initial_three_inconclusive)
    assert(
      report.pairs.length === ADMISSION_THRESHOLDS.expanded_pairs,
      "inconclusive_requires_expanded_pairs",
    );
  const agentIds = new Set();
  for (const [index, pair] of report.pairs.entries()) {
    assert(
      pair.task_key === TASK_KEY,
      `task_key:${index}`,
    );
    assert(pair.control?.task_key === pair.task_key, `control_pairing:${index}`);
    assert(
      pair.candidate?.task_key === pair.task_key,
      `candidate_pairing:${index}`,
    );
    assert(pair.replicate === index + 1, `replicate:${index}`);
    assert(
      canonical(pair.invocation_order) ===
        canonical((index + 1) % 2 === 1
          ? ["control", "candidate"]
          : ["candidate", "control"]),
      `invocation_order:${index}`,
    );
    validateRun(pair.control, `control:${index}`, config);
    validateRun(pair.candidate, `candidate:${index}`, config);
    assert(pair.control.agent_id !== pair.candidate.agent_id, `fresh_agents:${index}`);
    assert(!agentIds.has(pair.control.agent_id), `agent_reused:${index}:control`);
    agentIds.add(pair.control.agent_id);
    assert(!agentIds.has(pair.candidate.agent_id), `agent_reused:${index}:candidate`);
    agentIds.add(pair.candidate.agent_id);
  }
  assert(
    sameSet(report.metrics, REQUIRED_METRICS),
    "metrics_declared",
  );
  const initial = deriveSummary(
    report.pairs.slice(0, ADMISSION_THRESHOLDS.minimum_pairs),
  );
  const expectedInitialInconclusive =
    initial.wins < ADMISSION_THRESHOLDS.minimum_wins ||
    initial.direction_inconsistent ||
    initial.provenance_doubt;
  assert(
    report.initial_three_inconclusive === expectedInitialInconclusive,
    "initial_three_recomputed",
  );
  assert(
    report.pairs.length ===
      (expectedInitialInconclusive
        ? ADMISSION_THRESHOLDS.expanded_pairs
        : ADMISSION_THRESHOLDS.minimum_pairs),
    "expanded_pair_count",
  );
  const summary = deriveSummary(report.pairs);
  assert(
    canonical(summary) === canonical(report.summary),
    "summary_recomputation",
  );
  assert(
    report.validity_floor === report.deterministic_evidence.passed,
    "validity_floor_recomputed",
  );
  assert(
    report.known_attack_rejection === summary.known_attack_rejection,
    "attack_recomputed",
  );
  assert(
    report.valid_control_false_blocking_increased ===
      summary.valid_control_false_blocking_increased,
    "false_blocking_recomputed",
  );
  assert(
    report.relative_coverage_non_degraded ===
      summary.relative_coverage_non_degraded,
    "coverage_recomputed",
  );
  assert(
    report.total_roi_positive === summary.total_roi_positive,
    "roi_recomputed",
  );
  assert(report.validity_floor === true, "validity_floor_failed");
  assert(report.known_attack_rejection === true, "known_attack_rejection");
  assert(
    report.valid_control_false_blocking_increased === false,
    "false_blocking",
  );
  assert(report.relative_coverage_non_degraded === true, "coverage");
  assert(report.total_roi_positive === true, "roi");
  console.log(
    JSON.stringify({
      schema_version: "long-task-roi-verification-v1",
      fresh_agent_pairs: report.pairs.length,
      validity_floor: true,
      known_attack_rejection: true,
      total_roi_positive: true,
      provenance_doubt: summary.provenance_doubt,
    }),
  );
}

async function runPair(replicate, config) {
  const order = replicate % 2 === 1
    ? ["control", "candidate"]
    : ["candidate", "control"];
  const runs = {};
  for (const variant of order)
    runs[variant] = await runFreshAgent({ variant, replicate, config });
  return {
    task_key: TASK_KEY,
    replicate,
    invocation_order: order,
    control: runs.control,
    candidate: runs.candidate,
  };
}

async function runFreshAgent({ variant, replicate, config }) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-real-capability-"));
  try {
    const schemaPath = path.join(temporary, "result.schema.json");
    await writeFile(schemaPath, JSON.stringify(resultSchema()), "utf8");
    const guidance = variant === "candidate" ? CANDIDATE_GUIDANCE : CONTROL_GUIDANCE;
    const prompt = freshAgentPrompt(guidance);
    const started = process.hrtime.bigint();
    const execution = spawnSync(
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
        config.model,
        "-c",
        `model_reasoning_effort=\"${config.reasoning_effort}\"`,
        "-c",
        `model_provider=\"${config.provider}\"`,
        "--output-schema",
        schemaPath,
        "--json",
        "-",
      ],
      {
        cwd: temporary,
        input: prompt,
        encoding: "utf8",
        windowsHide: true,
        timeout: config.environment.timeout_ms,
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    const durationMs = Math.round(
      Number(process.hrtime.bigint() - started) / 1_000_000,
    );
    if (execution.error) throw execution.error;
    if (execution.status !== 0)
      throw new Error(
        `fresh_agent_execution_failed:${execution.status}:${sha(execution.stderr ?? "")}`,
      );
    const parsed = parseAdmissionEvents(execution.stdout, {
      model: config.model,
      reasoning_effort: config.reasoning_effort,
      provider: config.provider,
    });
    const score = scoreResult(parsed.result);
    const threadId = executionThreadId(execution.stdout);
    const tokenCount =
      parsed.usage.input_tokens +
      parsed.usage.output_tokens +
      parsed.usage.reasoning_output_tokens;
    return {
      task_key: TASK_KEY,
      agent_id: threadId,
      variant,
      fresh_context: true,
      hidden_probe_version: HIDDEN_PROBE_VERSION,
      completed: true,
      trace_sha256: sha(execution.stdout),
      stderr_sha256: sha(execution.stderr ?? ""),
      tool_calls: parsed.tool_calls,
      result: parsed.result,
      requested_execution: parsed.requested_execution,
      effective_execution: parsed.effective_execution,
      provenance_doubt_reasons: parsed.provenance_doubt_reasons,
      score,
      metrics: {
        first_detection_ms: durationMs,
        rework_count: CASES.length - score.correct,
        contract_compile_final_gate_ms: 0,
        target_collection_count: new Set(CASES.map((item) => item.target_family)).size,
        token_count: tokenCount,
        total_elapsed_ms: durationMs,
        authority_bytes: Buffer.byteLength(guidance, "utf8"),
        migration_ms: 0,
        maintenance_minutes: 0,
      },
      metric_basis: {
        first_detection_ms: "conservative upper bound: completed structured decision latency",
        rework_count: "independently scored incorrect case count",
        contract_compile_final_gate_ms: "not applicable to read-only classification task",
        target_collection_count: "independent distinct declared target-family count",
        token_count: "Codex turn usage event",
        total_elapsed_ms: "host monotonic wall clock",
        authority_bytes: "exact variant guidance UTF-8 bytes",
        migration_ms: "no migration in classification task",
        maintenance_minutes: "no persisted benchmark mechanism state",
      },
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

function runDeterministicEvidence(candidateIdentityValue) {
  const commands = [
    ["tests/ty-context/long-task-real-capability-closure.test.mjs"],
    ["tests/ty-context/long-task-real-capability-replay.test.mjs"],
    [
      "--test-name-pattern=package-reextracted baseline and mutated actual",
      "tests/ty-context/long-task-counterfactual-integrity.test.mjs",
    ],
  ].map((args) => {
    const run = spawnSync(process.execPath, ["--test", ...args], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      timeout: 120_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    return {
      argv: ["--test", ...args],
      status: run.status,
      stdout_sha256: sha(run.stdout ?? ""),
      stderr_sha256: sha(run.stderr ?? ""),
    };
  });
  return {
    candidate_identity: candidateIdentityValue,
    commands,
    passed: commands.every((command) => successfulExit(command.status)),
  };
}

async function candidateIdentity() {
  const hash = createHash("sha256");
  for (const relative of CANDIDATE_IDENTITY_PATHS) {
    hash.update(relative);
    hash.update("\0");
    hash.update(await readFile(path.join(root, ...relative.split("/"))));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function executionThreadId(stdout) {
  const events = stdout
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const identifiers = events
    .filter((event) => event.type === "thread.started")
    .map((event) => event.thread_id ?? event.thread?.id)
    .filter((value) => typeof value === "string" && value.length > 0);
  assert(identifiers.length === 1, "fresh_agent_thread_identity");
  return identifiers[0];
}

function assertEnvironment(config) {
  assert(process.platform === config.environment.platform, "platform");
  assert(process.arch === config.environment.arch, "arch");
  assert(Number(process.versions.node.split(".")[0]) === config.environment.node_major, "node");
  const codex = spawnSync("codex", ["--version"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  assert(successfulExit(codex.status), "codex_cli");
  assert(codex.stdout.trim() === config.environment.codex_cli, "codex_version");
}
