import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CASE_IDS,
  MAINTENANCE_RUNTIME_OWNER_PATHS,
  MAINTENANCE_TEST_PATHS,
  REAL_PROCESS_RUN_SCHEMA,
} from "../../../../tools/long_task_real_process_roi_policy.mjs";
import {
  canonical,
  measuredMetric,
  sha256,
  unverifiedMetric,
} from "../../../../tools/long_task_real_process_roi_scoring.mjs";
import {
  createWorkloadFixture,
  measureContractShape,
  removeFixture,
} from "./fixture-adapter.mjs";

const repositoryRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const workloadPath = path.join(
  repositoryRoot,
  "examples",
  "delivery-benchmark",
  "real-process-workload",
  "workload.json",
);

export async function executeVariantRepeat(options) {
  const {
    harnessRoot,
    outputDir,
    repeat,
    variant,
    environmentIdentity,
    workloadSha256,
    packageSha256,
    candidateTree,
  } = options;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  await mkdir(outputDir, { recursive: true });
  const workload = JSON.parse(await readFile(workloadPath, "utf8"));
  const maintenance = await measureMaintenanceSurface(harnessRoot);
  const cases = [];
  const recoveries = [];
  const commandRecords = [];
  let correctShape = null;
  let compiledContractBytes = 0;
  let migrationMs = 0;
  let verifySnapshotMs = 0;
  let finalSnapshotMs = 0;
  let uniqueRawExecutionMs = 0;
  let counterfactualWallMs = 0;
  let preflightRepairRounds = 0;
  let recoveryAuthoringMs = 0;
  let closureCopyMs = 0;
  let closureCopyBytes = 0;

  for (const caseId of CASE_IDS) {
    const caseOutput = path.join(outputDir, "cases", caseId);
    await mkdir(caseOutput, { recursive: true });
    const caseStarted = performance.now();
    const fixture = await createWorkloadFixture({
      harnessRoot,
      variantId: variant.id,
      caseId,
      repeat,
    });
    migrationMs += fixture.migration_ms;
    try {
      if (caseId === "correct-control")
        correctShape = await measureContractShape(fixture);
      const lifecycle = await executeLifecycle({
        harnessRoot,
        fixture,
        outputDir: caseOutput,
        commandRecords,
        relativeRoot: outputDir,
        timeoutMs: workload.resource_limits.command_timeout_ms,
        commitMessage: `roi-${variant.id}-${repeat}-${caseId}`,
        snapshotLabel: `roi-${variant.id}-${repeat}-${caseId}`,
      });
      if (lifecycle.preflight.status !== 0) preflightRepairRounds += 1;
      compiledContractBytes = Math.max(
        compiledContractBytes,
        lifecycle.compiled_contract_bytes,
      );
      verifySnapshotMs += lifecycle.snapshot?.preparation_ms ?? 0;
      uniqueRawExecutionMs += lifecycle.runner_ms;
      finalSnapshotMs += lifecycle.final_snapshot_ms;
      counterfactualWallMs += lifecycle.counterfactual_upper_bound_ms;
      closureCopyMs += lifecycle.closure_copy_ms;
      closureCopyBytes += lifecycle.closure_copy_bytes;
      const caseCommands = commandRecords.filter((record) =>
        record.relative_path.startsWith(`cases/${caseId}/`),
      );
      const counterfactuals =
        caseId === "correct-control"
          ? fixture.counterfactuals.map((control) => ({
              ...control,
              workflow_observed_passed:
                control.passed === true &&
                lifecycle.terminal === "machine_accepted",
            }))
          : [];
      const caseRecord = {
        case_id: caseId,
        kind: caseId === "correct-control" ? "control" : "attack",
        mode: fixture.mode,
        workflow_status: lifecycle.terminal,
        authority_boundary:
          variant.id === "a"
            ? "legacy-project-self-report"
            : variant.id === "b"
              ? "isolated-envelope-with-contract-owned-runtime"
              : "source-backed-isolated-process-runtime-closure",
        owner_diagnostic: lifecycle.owner_diagnostic,
        gold: fixture.gold,
        counterfactuals,
        raw_execution: {
          maximum_envelopes_per_execution: 1,
          minimum_observations_per_envelope: 6,
          observed_main_execution_count: uniqueExecutionCount(
            lifecycle.parsed_final?.check_results ??
              lifecycle.verify?.parsed?.check_results,
          ),
        },
        lifecycle: {
          authoring_ms: round(fixture.authoring_ms),
          preflight_ms: lifecycle.preflight.duration_ms,
          compile_ms: lifecycle.compile.duration_ms,
          verify_ms: lifecycle.verify?.duration_ms ?? 0,
          final_gate_ms: lifecycle.final?.duration_ms ?? 0,
          snapshot_ms: round(lifecycle.snapshot?.preparation_ms ?? 0),
          measurement_overhead_ms: lifecycle.closure_copy_ms,
          total_ms: round(
            Math.max(
              0,
              performance.now() - caseStarted - lifecycle.closure_copy_ms,
            ),
          ),
        },
        command_record_refs: caseCommands.map((record) => record.relative_path),
        final_result_sha256: sha256(canonical(lifecycle.parsed_final)),
      };
      await writeFile(
        path.join(caseOutput, "case-result.json"),
        `${JSON.stringify(caseRecord, null, 2)}\n`,
      );
      cases.push(caseRecord);
    } finally {
      await removeFixture(fixture);
    }
  }

  for (const attack of cases.filter((item) => item.kind === "attack")) {
    const recoveryOutput = path.join(
      outputDir,
      "recoveries",
      `after-${attack.case_id}`,
    );
    await mkdir(recoveryOutput, { recursive: true });
    const recoveryStarted = performance.now();
    const fixture = await createWorkloadFixture({
      harnessRoot,
      variantId: variant.id,
      caseId: "correct-control",
      repeat,
    });
    recoveryAuthoringMs += fixture.authoring_ms;
    migrationMs += fixture.migration_ms;
    try {
      const lifecycle = await executeLifecycle({
        harnessRoot,
        fixture,
        outputDir: recoveryOutput,
        commandRecords,
        relativeRoot: outputDir,
        timeoutMs: workload.resource_limits.command_timeout_ms,
        commitMessage: `roi-${variant.id}-${repeat}-recovery-${attack.case_id}`,
        snapshotLabel: `roi-${variant.id}-${repeat}-recovery-${attack.case_id}`,
      });
      if (lifecycle.preflight.status !== 0) preflightRepairRounds += 1;
      compiledContractBytes = Math.max(
        compiledContractBytes,
        lifecycle.compiled_contract_bytes,
      );
      verifySnapshotMs += lifecycle.snapshot?.preparation_ms ?? 0;
      uniqueRawExecutionMs += lifecycle.runner_ms;
      finalSnapshotMs += lifecycle.final_snapshot_ms;
      counterfactualWallMs += lifecycle.counterfactual_upper_bound_ms;
      closureCopyMs += lifecycle.closure_copy_ms;
      closureCopyBytes += lifecycle.closure_copy_bytes;
      const commandPrefix = `recoveries/after-${attack.case_id}/`;
      const recovery = {
        source_attack_case_id: attack.case_id,
        workflow_status: lifecycle.terminal,
        gold: fixture.gold,
        counterfactuals: fixture.counterfactuals.map((control) => ({
          ...control,
          workflow_observed_passed:
            control.passed === true &&
            lifecycle.terminal === "machine_accepted",
        })),
        raw_execution: {
          maximum_envelopes_per_execution: 1,
          minimum_observations_per_envelope: 6,
          observed_main_execution_count: uniqueExecutionCount(
            lifecycle.parsed_final?.check_results ??
              lifecycle.verify?.parsed?.check_results,
          ),
        },
        lifecycle: {
          authoring_ms: round(fixture.authoring_ms),
          preflight_ms: lifecycle.preflight.duration_ms,
          compile_ms: lifecycle.compile.duration_ms,
          verify_ms: lifecycle.verify?.duration_ms ?? 0,
          final_gate_ms: lifecycle.final?.duration_ms ?? 0,
          measurement_overhead_ms: lifecycle.closure_copy_ms,
          total_ms: round(
            Math.max(
              0,
              performance.now() - recoveryStarted - lifecycle.closure_copy_ms,
            ),
          ),
        },
        command_record_refs: commandRecords
          .filter((record) => record.relative_path.startsWith(commandPrefix))
          .map((record) => record.relative_path),
      };
      await writeFile(
        path.join(recoveryOutput, "recovery-result.json"),
        `${JSON.stringify(recovery, null, 2)}\n`,
      );
      recoveries.push(recovery);
    } finally {
      await removeFixture(fixture);
    }
  }

  if (!correctShape)
    throw new Error("real_process_roi_correct_contract_shape_missing");
  const falseCompletionCount = cases.filter(
    (item) =>
      item.kind === "attack" &&
      item.gold.conformant === false &&
      item.workflow_status === "machine_accepted",
  ).length;
  const correctCase = cases.find((item) => item.case_id === "correct-control");
  const correctAttempts = [correctCase, ...recoveries];
  const falseBlockingCount = correctAttempts.filter(
    (item) => item.workflow_status !== "machine_accepted",
  ).length;
  const processExecutionCount =
    sum(cases.map((item) => item.raw_execution.observed_main_execution_count)) +
    sum(
      recoveries.map(
        (item) => item.raw_execution.observed_main_execution_count,
      ),
    );
  const compileCommands = commandRecords.filter(
    (record) => record.label === "compile",
  );
  const verifyCommands = commandRecords.filter(
    (record) => record.label === "verify",
  );
  const finalCommands = commandRecords.filter(
    (record) => record.label === "final-gate",
  );
  const peakRss = Math.max(
    process.memoryUsage().rss,
    ...commandRecords.map((record) => record.peak_rss_bytes),
  );
  const totalElapsed = Math.max(0, performance.now() - started - closureCopyMs);
  const metrics = {
    authoring_active_ms: measuredMetric(
      sum(cases.map((item) => item.lifecycle.authoring_ms)) +
        recoveryAuthoringMs,
      "ms",
      "host monotonic time from fixture materialization through Contract/product binding",
    ),
    authoring_token_count: unverifiedMetric(
      "tokens",
      "no authoritative model/provider usage event exists in deterministic lifecycle replay",
    ),
    contract_bytes: measuredMetric(
      correctShape.contract_bytes,
      "bytes",
      "UTF-8 bytes of the correct-control Delivery Contract",
    ),
    effective_yaml_lines: measuredMetric(
      correctShape.effective_yaml_lines,
      "lines",
      "non-empty, non-comment lines in the correct-control Delivery Contract",
    ),
    manual_source_reference_count: measuredMetric(
      correctShape.manual_source_reference_count,
      "count",
      "literal source_ref fields in the correct-control Delivery Contract",
    ),
    preflight_repair_rounds: measuredMetric(
      preflightRepairRounds,
      "count",
      "failed Preflight invocations before each case terminal",
    ),
    compile_wall_ms: measuredMetric(
      sum(compileCommands.map((record) => record.duration_ms)),
      "ms",
      "sum of host monotonic Compile command wall times",
    ),
    compile_peak_rss_bytes: measuredMetric(
      maxOrZero(compileCommands.map((record) => record.peak_rss_bytes)),
      "bytes",
      "maximum sampled resident bytes of a Compile child process; host RSS fallback is recorded when sampling is unavailable",
    ),
    compiled_contract_bytes: measuredMetric(
      compiledContractBytes,
      "bytes",
      "largest compiled Contract artifact in the repeat",
    ),
    authority_bytes: measuredMetric(
      compiledContractBytes,
      "bytes",
      "largest exact serialized compiled-contract.json authority projection produced by Compile in the repeat",
    ),
    verify_wall_ms: measuredMetric(
      sum(verifyCommands.map((record) => record.duration_ms)),
      "ms",
      "sum of host monotonic targeted Verify wall times",
    ),
    verify_snapshot_ms: measuredMetric(
      verifySnapshotMs,
      "ms",
      "sum of package createWorkspaceSnapshot preparation_ms probes immediately before Verify",
    ),
    unique_raw_execution_ms: measuredMetric(
      uniqueRawExecutionMs,
      "ms",
      "deduplicated raw execution duration_ms from current lifecycle results",
    ),
    counterfactual_wall_ms: measuredMetric(
      counterfactualWallMs,
      "ms",
      "conservative Verify residual after independently measured snapshot and deduplicated main raw execution; includes Counterfactual plus Harness residual",
    ),
    counterfactual_incremental_ms: measuredMetric(
      counterfactualWallMs,
      "ms",
      "same conservative signed upper bound; no unsupported production timing hook is added",
    ),
    closure_copy_ms: measuredMetric(
      closureCopyMs,
      "ms",
      "host monotonic time to copy each compiled process_runtime_closure.allowed_runtime_files set into an owned audit probe directory after Compile",
    ),
    closure_copy_bytes: measuredMetric(
      closureCopyBytes,
      "bytes",
      "exact bytes copied from compiled process runtime closures by the owned audit probe",
    ),
    final_gate_wall_ms: measuredMetric(
      sum(finalCommands.map((record) => record.duration_ms)),
      "ms",
      "sum of host monotonic sole Final Gate wall times",
    ),
    final_gate_snapshot_ms: measuredMetric(
      finalSnapshotMs,
      "ms",
      "sum of Final Receipt snapshot_preparation_ms",
    ),
    rework_count: measuredMetric(
      recoveries.length + preflightRepairRounds,
      "count",
      "actual fresh correct-lifecycle recoveries after each frozen wrong candidate plus unexpected Preflight repair rounds",
    ),
    modification_rounds: measuredMetric(
      recoveries.length,
      "count",
      "fresh correct Source/Contract/product materializations executed after the four frozen wrong candidates",
    ),
    false_completion_count: measuredMetric(
      falseCompletionCount,
      "count",
      "independent-gold wrong candidates that reached machine_accepted",
    ),
    false_completion_rate: measuredMetric(
      round(falseCompletionCount / (CASE_IDS.length - 1)),
      "ratio",
      "false completion count divided by four frozen wrong candidates",
    ),
    false_blocking_count: measuredMetric(
      falseBlockingCount,
      "count",
      "independent-gold conformant main control and recovery lifecycles that did not reach machine_accepted",
    ),
    false_blocking_rate: measuredMetric(
      round(falseBlockingCount / correctAttempts.length),
      "ratio",
      "false blocking count divided by the main correct control plus four fresh recovery controls",
    ),
    correct_path_total_ms: measuredMetric(
      correctCase.lifecycle.total_ms,
      "ms",
      "correct-control authoring through current Final Gate terminal",
    ),
    total_elapsed_ms: measuredMetric(
      totalElapsed,
      "ms",
      "all frozen attacks, gold checks, correct control and lifecycle commands in the repeat, excluding the separately reported audit-only closure-copy probe",
    ),
    migration_ms: measuredMetric(
      migrationMs,
      "ms",
      "explicit Source execution-target synchronization projection time; zero only where the historical variant has no such projection",
    ),
    maintenance_minutes: unverifiedMetric(
      "minutes",
      "no independent human maintenance time log exists; file/command artifacts remain available for audit",
    ),
    runtime_owner_file_count: measuredMetric(
      maintenance.runtime_file_count,
      "count",
      "existing files from the frozen runtime-owner path set at the exact variant revision",
    ),
    runtime_owner_loc: measuredMetric(
      maintenance.runtime_loc,
      "lines",
      "non-empty physical lines across the frozen runtime-owner path set at the exact variant revision",
    ),
    test_file_count: measuredMetric(
      maintenance.test_file_count,
      "count",
      "existing files from the frozen observer/counterfactual test path set at the exact variant revision",
    ),
    test_loc: measuredMetric(
      maintenance.test_loc,
      "lines",
      "non-empty physical lines across the frozen observer/counterfactual test path set at the exact variant revision",
    ),
    peak_rss_bytes: measuredMetric(
      peakRss,
      "bytes",
      "maximum sampled child or executor resident memory across the repeat",
    ),
    spawned_process_count: measuredMetric(
      commandRecords.length + processExecutionCount,
      "count",
      "benchmark command children plus observed Harness main raw executions",
    ),
    process_execution_count: measuredMetric(
      processExecutionCount,
      "count",
      "observed Harness main raw executions across attacks, correct control and recovery lifecycles",
    ),
    stdout_bytes: measuredMetric(
      sum(commandRecords.map((record) => record.stdout_bytes)),
      "bytes",
      "exact captured stdout byte count for lifecycle commands",
    ),
  };
  const rawArtifactIdentity = sha256(
    canonical({ command_records: commandRecords, cases, recoveries }),
  );
  const result = {
    schema_version: REAL_PROCESS_RUN_SCHEMA,
    run_id: `${variant.id}-repeat-${String(repeat).padStart(2, "0")}`,
    variant_id: variant.id,
    repeat,
    invocation_position: options.invocationPosition,
    safety_eligible: variant.safety_eligible,
    comparison_role: variant.comparison_role,
    candidate_identity: {
      commit: variant.commit,
      tree: candidateTree,
      clean: true,
      package_sha256: packageSha256,
      workload_sha256: workloadSha256,
    },
    environment_identity: environmentIdentity,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    provenance_doubt_reasons: [],
    metrics,
    cases,
    recoveries,
    lifecycle_evidence: {
      raw_artifact_sha256: rawArtifactIdentity,
      command_count: commandRecords.length,
      raw_artifacts_are_non_authority: true,
    },
  };
  await writeFile(
    path.join(outputDir, "commands.ndjson"),
    `${commandRecords.map((record) => JSON.stringify(record)).join("\n")}\n`,
  );
  await writeFile(
    path.join(outputDir, "run.json"),
    `${JSON.stringify(result, null, 2)}\n`,
  );
  return result;
}

async function executeLifecycle({
  harnessRoot,
  fixture,
  outputDir,
  commandRecords,
  relativeRoot,
  timeoutMs,
  commitMessage,
  snapshotLabel,
}) {
  const cli = path.join(
    harnessRoot,
    "packages",
    "ty-context",
    "dist",
    "cli.js",
  );
  const invoke = (label, executable, args) =>
    executeCommand({
      label,
      executable,
      args,
      cwd: fixture.root,
      outputDir,
      timeoutMs,
      commandRecords,
      relativeRoot,
    });
  const staged = await invoke("git-add", "git", ["add", "-A"]);
  if (staged.status !== 0)
    throw new Error(`real_process_roi_git_add_failed:${staged.status}`);
  const committed = await invoke("git-commit", "git", [
    "commit",
    "--allow-empty",
    "-m",
    commitMessage,
  ]);
  if (committed.status !== 0)
    throw new Error(`real_process_roi_git_commit_failed:${committed.status}`);

  const preflight = await invoke("preflight", process.execPath, [
    cli,
    "long-task",
    "preflight",
    fixture.workdir,
  ]);
  let compile = emptyCommandResult("compile-not-run");
  let snapshot = null;
  let verify = null;
  let final = null;
  let compiledContractBytes = 0;
  let closureCopy = { duration_ms: 0, bytes: 0 };
  if (preflight.status === 0) {
    compile = await invoke("compile", process.execPath, [
      cli,
      "long-task",
      "compile",
      fixture.workdir,
    ]);
  }
  if (compile.status === 0) {
    compiledContractBytes = await compiledBytes(fixture.workdir);
    closureCopy = await measureCompiledProcessClosure({
      workdir: fixture.workdir,
      repositoryRoot: fixture.root,
      outputDir: path.join(outputDir, "closure-copy-probe"),
    });
    snapshot = await measureWorkspaceSnapshot({
      harnessRoot,
      fixture,
      label: snapshotLabel,
    });
    verify = await invoke("verify", process.execPath, [
      cli,
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    final = await invoke("final-gate", process.execPath, [
      cli,
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
  }

  const parsedFinal = final?.parsed ?? verify?.parsed ?? null;
  const runnerMs = uniqueExecutionDurationMs(
    parsedFinal?.check_results ?? verify?.parsed?.check_results,
  );
  const verifyRunnerMs = uniqueExecutionDurationMs(
    verify?.parsed?.check_results,
  );
  const verifySnapshotMs = snapshot?.preparation_ms ?? 0;
  return {
    preflight,
    compile,
    verify,
    final,
    snapshot,
    parsed_final: parsedFinal,
    compiled_contract_bytes: compiledContractBytes,
    closure_copy_ms: closureCopy.duration_ms,
    closure_copy_bytes: closureCopy.bytes,
    runner_ms: runnerMs,
    final_snapshot_ms: numericField(parsedFinal, "snapshot_preparation_ms"),
    counterfactual_upper_bound_ms:
      verify && verify.status === 0
        ? round(
            Math.max(0, verify.duration_ms - verifySnapshotMs - verifyRunnerMs),
          )
        : 0,
    terminal: workflowStatus({ preflight, compile, verify, final }),
    owner_diagnostic: ownerDiagnostic({ preflight, compile, verify, final }),
  };
}

function emptyCommandResult(label) {
  return {
    label,
    duration_ms: 0,
    status: null,
    parsed: null,
  };
}

async function executeCommand({
  label,
  executable,
  args,
  cwd,
  outputDir,
  timeoutMs,
  commandRecords,
  relativeRoot,
}) {
  const index = commandRecords.length + 1;
  const base = `${String(index).padStart(3, "0")}-${safe(label)}`;
  const stdoutPath = path.join(outputDir, `${base}.stdout.log`);
  const stderrPath = path.join(outputDir, `${base}.stderr.log`);
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const child = spawn(executable, args, {
    cwd,
    env: process.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let spawnError = null;
  child.once("error", (error) => {
    spawnError = error;
    const bytes = Buffer.from(String(error.stack ?? error));
    stderr.push(bytes);
    stderrBytes += bytes.length;
  });
  child.stdout.on("data", (chunk) => {
    stdout.push(chunk);
    stdoutBytes += chunk.length;
  });
  child.stderr.on("data", (chunk) => {
    stderr.push(chunk);
    stderrBytes += chunk.length;
  });
  let peakRss = process.memoryUsage().rss;
  let sampleInFlight = false;
  const sampler = setInterval(async () => {
    if (sampleInFlight) return;
    sampleInFlight = true;
    try {
      peakRss = Math.max(peakRss, await residentBytes(child.pid));
    } finally {
      sampleInFlight = false;
    }
  }, 100);
  const timedOut = new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: null, signal: "timeout" });
    }, timeoutMs);
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal });
    });
  });
  const closed = await timedOut;
  clearInterval(sampler);
  peakRss = Math.max(peakRss, await residentBytes(child.pid));
  const stdoutBuffer = Buffer.concat(stdout);
  const stderrBuffer = Buffer.concat(stderr);
  await Promise.all([
    writeFile(stdoutPath, stdoutBuffer),
    writeFile(stderrPath, stderrBuffer),
  ]);
  const parsed = parseJsonOutput(stdoutBuffer.toString("utf8"));
  const record = {
    schema_version: "long-task-real-process-command-v1",
    index,
    label,
    argv: [executable, ...args],
    cwd,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: round(performance.now() - started),
    status: closed.status,
    signal: closed.signal,
    spawn_error: spawnError ? String(spawnError.message ?? spawnError) : null,
    peak_rss_bytes: peakRss,
    stdout_bytes: stdoutBytes,
    stderr_bytes: stderrBytes,
    stdout_sha256: digest(stdoutBuffer),
    stderr_sha256: digest(stderrBuffer),
    stdout_path: relative(relativeRoot, stdoutPath),
    stderr_path: relative(relativeRoot, stderrPath),
    relative_path: relative(
      relativeRoot,
      path.join(outputDir, `${base}.command.json`),
    ),
  };
  await writeFile(
    path.join(outputDir, `${base}.command.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  commandRecords.push(record);
  return { ...record, parsed };
}

async function measureWorkspaceSnapshot({ harnessRoot, fixture, label }) {
  const module = await import(
    pathToFileURL(
      path.join(
        harnessRoot,
        "packages",
        "ty-context",
        "dist",
        "lib",
        "long-task-workspace.js",
      ),
    ).href
  );
  const snapshot = await module.createWorkspaceSnapshot(
    fixture.root,
    fixture.workdir,
    label,
  );
  try {
    return { preparation_ms: round(snapshot.preparation_ms) };
  } finally {
    await snapshot.dispose();
  }
}

async function compiledBytes(workdir) {
  const files = await listFiles(workdir);
  const compiled = files.filter((file) =>
    /compiled(?:-contract)?\.json$/u.test(path.basename(file)),
  );
  let total = 0;
  for (const file of compiled) total += (await stat(file)).size;
  return total;
}

async function measureCompiledProcessClosure({
  workdir,
  repositoryRoot,
  outputDir,
}) {
  const compiled = (await listFiles(workdir)).filter((file) =>
    /compiled(?:-contract)?\.json$/u.test(path.basename(file)),
  );
  const closureFiles = new Set();
  for (const file of compiled) {
    const value = JSON.parse(await readFile(file, "utf8"));
    collectClosureFiles(value, closureFiles);
  }
  const started = performance.now();
  let bytes = 0;
  for (const relativePath of [...closureFiles].sort()) {
    if (
      path.isAbsolute(relativePath) ||
      relativePath.split(/[\\/]/u).includes("..")
    )
      throw new Error(`real_process_roi_closure_path_invalid:${relativePath}`);
    const source = path.resolve(repositoryRoot, ...relativePath.split("/"));
    const target = path.resolve(outputDir, ...relativePath.split("/"));
    const sourcePrefix =
      `${path.resolve(repositoryRoot)}${path.sep}`.toLowerCase();
    const targetPrefix = `${path.resolve(outputDir)}${path.sep}`.toLowerCase();
    if (
      !source.toLowerCase().startsWith(sourcePrefix) ||
      !target.toLowerCase().startsWith(targetPrefix)
    )
      throw new Error(`real_process_roi_closure_path_escape:${relativePath}`);
    const content = await readFile(source);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
    bytes += content.length;
  }
  return { duration_ms: round(performance.now() - started), bytes };
}

function collectClosureFiles(value, result) {
  if (Array.isArray(value)) {
    for (const item of value) collectClosureFiles(item, result);
    return;
  }
  if (!value || typeof value !== "object") return;
  const paths = value.process_runtime_closure?.allowed_runtime_files;
  if (Array.isArray(paths))
    for (const item of paths)
      if (typeof item === "string" && item.length > 0) result.add(item);
  for (const item of Object.values(value)) collectClosureFiles(item, result);
}

async function measureMaintenanceSurface(harnessRoot) {
  const runtime = await measurePathSet(
    harnessRoot,
    MAINTENANCE_RUNTIME_OWNER_PATHS,
  );
  const tests = await measurePathSet(harnessRoot, MAINTENANCE_TEST_PATHS);
  return {
    runtime_file_count: runtime.files,
    runtime_loc: runtime.loc,
    test_file_count: tests.files,
    test_loc: tests.loc,
  };
}

async function measurePathSet(rootPath, paths) {
  let files = 0;
  let loc = 0;
  for (const relativePath of paths) {
    try {
      const contents = await readFile(
        path.join(rootPath, ...relativePath.split("/")),
        "utf8",
      );
      files += 1;
      loc += contents
        .split(/\r?\n/u)
        .filter((line) => line.trim().length > 0).length;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  return { files, loc };
}

async function listFiles(root) {
  const output = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(target)));
    else if (entry.isFile()) output.push(target);
  }
  return output;
}

function workflowStatus({ preflight, compile, verify, final }) {
  if (preflight.status !== 0) return "preflight_rejected";
  if (compile.status !== 0) return "compile_rejected";
  const status =
    final?.parsed?.workflow_status ?? verify?.parsed?.workflow_status ?? null;
  if (typeof status === "string") return status;
  if (final?.status !== 0 || verify?.status !== 0) return "needs_work";
  return "terminal_status_missing";
}

function ownerDiagnostic({ preflight, compile, verify, final }) {
  const selected = [preflight, compile, verify, final]
    .filter(Boolean)
    .find((command) => command.status !== 0);
  return selected
    ? JSON.stringify(selected.parsed ?? { status: selected.status })
    : null;
}

function parseJsonOutput(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const lines = trimmed.split(/\r?\n/u).reverse();
    for (const line of lines)
      try {
        return JSON.parse(line);
      } catch {
        // Continue to the preceding line.
      }
    return null;
  }
}

function uniqueExecutionDurationMs(checkResults) {
  const seen = new Map();
  for (const result of checkResults ?? []) {
    const key = result.execution_identity ?? result.internal_id;
    const duration = Number(result.duration_ms ?? 0);
    if (key && Number.isFinite(duration) && duration >= 0 && !seen.has(key))
      seen.set(key, duration);
  }
  return sum([...seen.values()]);
}

function uniqueExecutionCount(checkResults) {
  return new Set(
    (checkResults ?? [])
      .map((result) => result.execution_identity ?? result.internal_id)
      .filter(
        (identity) => typeof identity === "string" && identity.length > 0,
      ),
  ).size;
}

function numericField(value, key) {
  const number = Number(value?.[key] ?? 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

async function residentBytes(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return process.memoryUsage().rss;
  try {
    if (process.platform === "linux") {
      const status = await readFile(`/proc/${pid}/status`, "utf8");
      const match = status.match(/^VmRSS:\s+(\d+)\s+kB$/mu);
      if (match) return Number(match[1]) * 1024;
    } else if (process.platform === "win32") {
      const result = spawnSync(
        "tasklist",
        ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"],
        { encoding: "utf8", windowsHide: true, timeout: 5000 },
      );
      const fields = result.stdout?.match(/"([^"]*)"/gu) ?? [];
      const memory = fields.at(-1)?.replaceAll(/[^0-9]/gu, "");
      if (memory) return Number(memory) * 1024;
    } else {
      const result = spawnSync("ps", ["-o", "rss=", "-p", String(pid)], {
        encoding: "utf8",
        timeout: 5000,
      });
      const rss = Number(result.stdout.trim());
      if (Number.isFinite(rss) && rss > 0) return rss * 1024;
    }
  } catch {
    // The command may already have exited; use the executor RSS fallback.
  }
  return process.memoryUsage().rss;
}

function relative(root, target) {
  return path.relative(root, target).replaceAll("\\", "/");
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function maxOrZero(values) {
  return values.length ? Math.max(...values) : 0;
}

function sum(values) {
  return round(values.reduce((total, value) => total + Number(value || 0), 0));
}

function safe(value) {
  return String(value).replaceAll(/[^A-Za-z0-9_.-]+/gu, "-");
}

function round(value) {
  return Math.round(value * 10_000) / 10_000;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const optionsPath = process.argv[2];
  if (!optionsPath)
    throw new Error("real_process_roi_executor_options_required");
  const options = JSON.parse(await readFile(path.resolve(optionsPath), "utf8"));
  const result = await executeVariantRepeat(options);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
