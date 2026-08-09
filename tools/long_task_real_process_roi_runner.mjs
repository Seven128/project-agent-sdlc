import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  ADMISSION_THRESHOLDS,
  REAL_PROCESS_ATTESTATION_SCHEMA,
  REAL_PROCESS_MANIFEST_SCHEMA,
  REAL_PROCESS_ROI_SCHEMA,
  VARIANT_IDS,
  repeatOrder,
  variantDefinitions,
} from "./long_task_real_process_roi_policy.mjs";
import {
  canonical,
  deriveRealProcessRoiSummary,
  expansionDecision,
  sha256,
  validateRunRecord,
} from "./long_task_real_process_roi_scoring.mjs";
import { npmCommandSpec } from "./npm_command_spec.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workloadRoot = path.join(
  root,
  "examples",
  "delivery-benchmark",
  "real-process-workload",
);
const workloadPath = path.join(workloadRoot, "workload.json");
const semanticGoldPath = path.join(workloadRoot, "semantic-gold.json");
const executorPath = path.join(workloadRoot, "runner", "workload-executor.mjs");
const workloadIdentityPaths = Object.freeze([
  "examples/delivery-benchmark/real-process-workload/workload.json",
  "examples/delivery-benchmark/real-process-workload/semantic-gold.json",
  "examples/delivery-benchmark/real-process-workload/product/facts.mjs",
  "examples/delivery-benchmark/real-process-workload/product/product.mjs",
  "examples/delivery-benchmark/real-process-workload/product/config/state.json",
]);
const benchmarkImplementationPaths = Object.freeze([
  "tools/long_task_real_process_roi_policy.mjs",
  "tools/long_task_real_process_roi_runner.mjs",
  "tools/long_task_real_process_roi_scoring.mjs",
  "tools/verify_long_task_real_process_roi.mjs",
  "examples/delivery-benchmark/real-process-workload/runner/gold.mjs",
  "examples/delivery-benchmark/real-process-workload/runner/fixture-adapter.mjs",
  "examples/delivery-benchmark/real-process-workload/runner/workload-executor.mjs",
]);
const defaultArtifactRoot = path.join(
  root,
  ".artifacts",
  "long-task-real-capability",
  "real-process-workload",
);

export async function prepareRealProcessRoiPlan({
  candidate,
  repositoryRoot = root,
}) {
  const candidateCommit = await resolveCommit(repositoryRoot, candidate);
  const variants = variantDefinitions(candidateCommit);
  if (
    candidateCommit === variants.a.commit ||
    candidateCommit === variants.b.commit
  )
    throw new Error("real_process_roi_candidate_must_be_post_b");
  await assertHistoricalIdentities(repositoryRoot, variants);
  await assertCandidateDescendsFromB(repositoryRoot, candidateCommit);
  const candidateTree = await gitText(repositoryRoot, [
    "rev-parse",
    `${candidateCommit}^{tree}`,
  ]);
  const head = await resolveCommit(repositoryRoot, "HEAD");
  const candidateIsHead = candidateCommit === head;
  const worktreeClean =
    candidateIsHead &&
    (await gitText(repositoryRoot, ["status", "--short"])) === "";
  const workloadIdentity = await sourceIdentity(
    repositoryRoot,
    workloadIdentityPaths,
  );
  const benchmarkImplementationIdentity = await sourceIdentity(
    repositoryRoot,
    benchmarkImplementationPaths,
  );
  const workloadSha256 = workloadIdentity.identity_sha256;
  const goldBytes = await readFile(semanticGoldPath);
  const environment = await environmentRecord(repositoryRoot);
  const environmentIdentity = sha256(canonical(environment));
  const frozenConfig = {
    schema_version: "long-task-real-process-roi-frozen-config-v1",
    purpose: "real-process-lifecycle-roi-only",
    safety_theorem_claimed: false,
    candidate_must_be_clean_commit: true,
    candidate_must_equal_head: true,
    candidate_is_head: candidateIsHead,
    candidate_worktree_clean: worktreeClean,
    variants,
    candidate_tree: candidateTree,
    workload_sha256: workloadSha256,
    workload_identity: workloadIdentity,
    benchmark_implementation_identity: benchmarkImplementationIdentity,
    semantic_gold_sha256: digest(goldBytes),
    environment,
    environment_identity: environmentIdentity,
    admission_thresholds: ADMISSION_THRESHOLDS,
    authoring_token_policy: {
      required_for_positive_roi: true,
      authoritative_source:
        "host/provider usage event bound to the exact authoring invocation",
      surrogate_tokenizer_permitted: false,
      missing_value_status: "required-unverified",
      consequence: "positive ROI qualification is invalid",
    },
    initial_repeats: ADMISSION_THRESHOLDS.minimum_repeats,
    maximum_repeats: ADMISSION_THRESHOLDS.expanded_repeats,
    repeat_orders: Array.from(
      { length: ADMISSION_THRESHOLDS.expanded_repeats },
      (_, index) => repeatOrder(index + 1),
    ),
    artifacts_are_non_authority: true,
    a_safety_eligible: false,
  };
  return {
    candidateCommit,
    candidateTree,
    candidateIsHead,
    worktreeClean,
    workloadSha256,
    environmentIdentity,
    variants,
    frozenConfig,
  };
}

export async function dryRunRealProcessRoi(options) {
  const plan = await prepareRealProcessRoiPlan(options);
  return {
    schema_version: "long-task-real-process-roi-dry-run-v1",
    executable: plan.worktreeClean,
    reason: plan.worktreeClean
      ? null
      : plan.candidateIsHead
        ? "candidate_head_worktree_dirty"
        : "candidate_must_equal_clean_head",
    candidate_commit: plan.candidateCommit,
    candidate_tree: plan.candidateTree,
    workload_sha256: plan.workloadSha256,
    benchmark_implementation_sha256:
      plan.frozenConfig.benchmark_implementation_identity.identity_sha256,
    environment_identity: plan.environmentIdentity,
    variants: plan.variants,
    initial_schedule: plan.frozenConfig.repeat_orders.slice(
      0,
      ADMISSION_THRESHOLDS.minimum_repeats,
    ),
    expansion_schedule: plan.frozenConfig.repeat_orders.slice(
      ADMISSION_THRESHOLDS.minimum_repeats,
    ),
    expansion_rule:
      "expand 3 to 5 for CV > 20%, inconsistent paired direction, a primary metric within 5 percentage points of threshold, or environment/provenance doubt",
  };
}

export async function collectRealProcessRoi({
  candidate,
  repositoryRoot = root,
  artifactRoot = defaultArtifactRoot,
  keepWorktrees = false,
}) {
  const plan = await prepareRealProcessRoiPlan({ candidate, repositoryRoot });
  if (!plan.worktreeClean)
    throw new Error("real_process_roi_candidate_worktree_dirty");
  const runSetId = `${compactTimestamp()}-${plan.candidateCommit.slice(0, 12)}-${plan.workloadSha256.slice(0, 12)}`;
  const runSetRoot = path.resolve(artifactRoot, runSetId);
  await mkdir(path.resolve(artifactRoot), { recursive: true });
  await mkdir(runSetRoot, { recursive: false });
  await Promise.all([
    writeJson(path.join(runSetRoot, "frozen-config.json"), plan.frozenConfig),
    writeJson(
      path.join(runSetRoot, "environment.json"),
      plan.frozenConfig.environment,
    ),
    materializeSourceIdentity({
      repositoryRoot,
      runSetRoot,
      prefix: "workload",
      identity: plan.frozenConfig.workload_identity,
    }),
    materializeSourceIdentity({
      repositoryRoot,
      runSetRoot,
      prefix: "benchmark-implementation",
      identity: plan.frozenConfig.benchmark_implementation_identity,
    }),
  ]);
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-real-process-roi-"),
  );
  const prepared = {};
  const registeredCheckouts = new Set();
  const runs = [];
  const setupRecords = [];
  let collectionError = null;
  try {
    for (const variantId of VARIANT_IDS) {
      const variant = plan.variants[variantId];
      const checkout = path.join(temporaryRoot, `variant-${variantId}`);
      const setup = await prepareVariant({
        repositoryRoot,
        checkout,
        variant,
        outputDir: path.join(runSetRoot, "setup", variantId),
        registeredCheckouts,
      });
      prepared[variantId] = setup;
      setupRecords.push(setup.record);
    }
    for (
      let repeat = 1;
      repeat <= ADMISSION_THRESHOLDS.minimum_repeats;
      repeat += 1
    )
      await executeRepeat({ repeat, plan, prepared, runSetRoot, runs });
    const initialExpansion = expansionDecision(runs, plan.frozenConfig);
    if (
      initialExpansion.required_repeats ===
      ADMISSION_THRESHOLDS.expanded_repeats
    )
      for (
        let repeat = ADMISSION_THRESHOLDS.minimum_repeats + 1;
        repeat <= ADMISSION_THRESHOLDS.expanded_repeats;
        repeat += 1
      )
        await executeRepeat({ repeat, plan, prepared, runSetRoot, runs });

    const summary = deriveRealProcessRoiSummary(runs, plan.frozenConfig);
    const aggregate = {
      schema_version: REAL_PROCESS_ROI_SCHEMA,
      run_set_id: runSetId,
      purpose: plan.frozenConfig.purpose,
      safety_theorem_claimed: false,
      artifacts_are_non_authority: true,
      candidate_identity: {
        commit: plan.candidateCommit,
        tree: plan.candidateTree,
      },
      workload_sha256: plan.workloadSha256,
      benchmark_implementation_sha256:
        plan.frozenConfig.benchmark_implementation_identity.identity_sha256,
      environment_identity: plan.environmentIdentity,
      setup: setupRecords,
      summary,
      run_refs: runs.map((run) =>
        relative(
          runSetRoot,
          path.join(
            runSetRoot,
            "raw",
            run.variant_id,
            `repeat-${String(run.repeat).padStart(2, "0")}`,
            "run.json",
          ),
        ),
      ),
    };
    await writeJson(path.join(runSetRoot, "aggregate.json"), aggregate);
    const manifest = await buildArtifactManifest(runSetRoot);
    await writeJson(path.join(runSetRoot, "manifest.json"), manifest);
    const manifestBytes = await readFile(
      path.join(runSetRoot, "manifest.json"),
    );
    const aggregateBytes = await readFile(
      path.join(runSetRoot, "aggregate.json"),
    );
    const attestation = {
      schema_version: REAL_PROCESS_ATTESTATION_SCHEMA,
      run_set_id: runSetId,
      candidate_commit: plan.candidateCommit,
      candidate_tree: plan.candidateTree,
      workload_sha256: plan.workloadSha256,
      benchmark_implementation_sha256:
        plan.frozenConfig.benchmark_implementation_identity.identity_sha256,
      environment_identity: plan.environmentIdentity,
      manifest_sha256: digest(manifestBytes),
      aggregate_sha256: digest(aggregateBytes),
      admission_verdict: summary.admission_verdict,
      total_roi_positive: summary.total_roi_positive,
      a_safety_eligible: false,
      artifacts_are_non_authority: true,
      raw_promoted_to_gate: false,
    };
    await writeJson(path.join(runSetRoot, "attestation.json"), attestation);
    return { runSetRoot, aggregate, manifest, attestation };
  } catch (error) {
    collectionError = error;
  } finally {
    if (!keepWorktrees)
      await finalizeRealProcessRoiResources({
        repositoryRoot,
        checkouts: registeredCheckouts,
        temporaryRoot,
        primaryError: collectionError,
      });
  }
  throw collectionError;
}

async function materializeSourceIdentity({
  repositoryRoot,
  runSetRoot,
  prefix,
  identity,
}) {
  for (const entry of identity.entries) {
    const source = path.resolve(repositoryRoot, ...entry.path.split("/"));
    const target = path.resolve(
      runSetRoot,
      "inputs",
      prefix,
      ...entry.path.split("/"),
    );
    const relativeTarget = path.relative(runSetRoot, target);
    if (
      path.isAbsolute(relativeTarget) ||
      relativeTarget.split(path.sep).includes("..")
    )
      throw new Error(`real_process_roi_input_escape:${entry.path}`);
    const bytes = await readFile(source);
    if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256)
      throw new Error(`real_process_roi_input_identity_changed:${entry.path}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
}

export async function buildArtifactManifest(runSetRoot) {
  const excluded = new Set(
    ["manifest.json", "attestation.json"].map((name) =>
      path.resolve(runSetRoot, name),
    ),
  );
  const files = (await listFiles(runSetRoot))
    .filter((file) => !excluded.has(path.resolve(file)))
    .sort();
  const entries = [];
  for (const file of files) {
    const info = await stat(file);
    if (info.size > 64 * 1024 * 1024)
      throw new Error(
        `real_process_roi_artifact_file_budget:${relative(runSetRoot, file)}`,
      );
    const bytes = await readFile(file);
    entries.push({
      path: relative(runSetRoot, file),
      bytes: info.size,
      sha256: digest(bytes),
    });
  }
  return {
    schema_version: REAL_PROCESS_MANIFEST_SCHEMA,
    root: ".",
    excludes: ["manifest.json", "attestation.json"],
    entries,
    materialized_set_sha256: sha256(canonical(entries)),
  };
}

async function executeRepeat({ repeat, plan, prepared, runSetRoot, runs }) {
  const order = repeatOrder(repeat);
  for (const [position, variantId] of order.entries()) {
    const setup = prepared[variantId];
    const outputDir = path.join(
      runSetRoot,
      "raw",
      variantId,
      `repeat-${String(repeat).padStart(2, "0")}`,
    );
    await mkdir(outputDir, { recursive: true });
    const options = {
      harnessRoot: setup.checkout,
      outputDir,
      repeat,
      invocationPosition: position + 1,
      variant: plan.variants[variantId],
      environmentIdentity: plan.environmentIdentity,
      workloadSha256: plan.workloadSha256,
      packageSha256: setup.package_sha256,
      candidateTree: setup.tree,
    };
    const optionsPath = path.join(outputDir, "executor-options.json");
    await writeJson(optionsPath, options);
    const execution = await spawnCaptured(
      process.execPath,
      [executorPath, optionsPath],
      {
        cwd: root,
        timeoutMs: 60 * 60 * 1000,
        outputDir,
        label: "executor",
      },
    );
    if (execution.status !== 0)
      throw new Error(
        `real_process_roi_executor_failed:${variantId}:${repeat}:${execution.status}:${execution.stderr_sha256}`,
      );
    const run = JSON.parse(
      await readFile(path.join(outputDir, "run.json"), "utf8"),
    );
    validateRunRecord(run, plan.frozenConfig);
    runs.push(run);
  }
}

async function prepareVariant({
  repositoryRoot,
  checkout,
  variant,
  outputDir,
  registeredCheckouts,
}) {
  await mkdir(outputDir, { recursive: true });
  const records = [];
  records.push(
    await spawnCaptured(
      "git",
      ["worktree", "add", "--detach", checkout, variant.commit],
      {
        cwd: repositoryRoot,
        timeoutMs: 120000,
        outputDir,
        label: "git-worktree-add",
      },
    ),
  );
  if (records.at(-1).status !== 0)
    throw new Error(`real_process_roi_worktree_add_failed:${variant.id}`);
  registeredCheckouts.add(checkout);
  const npmCi = realProcessRoiNpmCommandSpec(["ci"]);
  records.push(
    await spawnCaptured(npmCi.command, npmCi.args, {
      cwd: checkout,
      timeoutMs: 10 * 60 * 1000,
      outputDir,
      label: "npm-ci",
    }),
  );
  if (records.at(-1).status !== 0)
    throw new Error(`real_process_roi_npm_ci_failed:${variant.id}`);
  const packageBuild = realProcessRoiNpmCommandSpec([
    "run",
    "build",
    "--workspace",
    "project-tiny-context-harness",
  ]);
  records.push(
    await spawnCaptured(packageBuild.command, packageBuild.args, {
      cwd: checkout,
      timeoutMs: 10 * 60 * 1000,
      outputDir,
      label: "package-build",
    }),
  );
  if (records.at(-1).status !== 0)
    throw new Error(`real_process_roi_build_failed:${variant.id}`);
  const packDir = path.join(outputDir, "pack");
  await mkdir(packDir, { recursive: true });
  const packagePack = realProcessRoiNpmCommandSpec([
    "pack",
    "--workspace",
    "project-tiny-context-harness",
    "--pack-destination",
    packDir,
  ]);
  records.push(
    await spawnCaptured(packagePack.command, packagePack.args, {
      cwd: checkout,
      timeoutMs: 10 * 60 * 1000,
      outputDir,
      label: "package-pack",
    }),
  );
  if (records.at(-1).status !== 0)
    throw new Error(`real_process_roi_pack_failed:${variant.id}`);
  const packages = (await readdir(packDir)).filter((name) =>
    name.endsWith(".tgz"),
  );
  if (packages.length !== 1)
    throw new Error(
      `real_process_roi_package_count:${variant.id}:${packages.length}`,
    );
  const packageBytes = await readFile(path.join(packDir, packages[0]));
  const tree = await gitText(checkout, ["rev-parse", "HEAD^{tree}"]);
  const status = await gitText(checkout, ["status", "--short"]);
  if (status !== "")
    throw new Error(`real_process_roi_prepared_worktree_dirty:${variant.id}`);
  const record = {
    variant_id: variant.id,
    commit: variant.commit,
    tree,
    package_path: relative(outputDir, path.join(packDir, packages[0])),
    package_sha256: digest(packageBytes),
    setup_commands: records,
  };
  await writeJson(path.join(outputDir, "setup.json"), record);
  return {
    checkout,
    tree,
    package_sha256: record.package_sha256,
    record,
  };
}

export function realProcessRoiNpmCommandSpec(args, options = {}) {
  return npmCommandSpec(args, options);
}

async function spawnCaptured(executable, args, options) {
  const { cwd, timeoutMs, outputDir, label } = options;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const child = spawn(executable, args, {
    cwd,
    env: process.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  const stdout = [];
  const stderr = [];
  let spawnError = null;
  child.once("error", (error) => {
    spawnError = error;
    stderr.push(Buffer.from(String(error.stack ?? error)));
  });
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const closed = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: null, signal: "timeout" });
    }, timeoutMs);
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal });
    });
  });
  const stdoutBytes = Buffer.concat(stdout);
  const stderrBytes = Buffer.concat(stderr);
  const record = {
    schema_version: "long-task-real-process-host-command-v1",
    label,
    argv: [executable, ...args],
    cwd,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: round(performance.now() - started),
    status: closed.status,
    signal: closed.signal,
    spawn_error: spawnError ? String(spawnError.message ?? spawnError) : null,
    stdout_bytes: stdoutBytes.length,
    stderr_bytes: stderrBytes.length,
    stdout_sha256: digest(stdoutBytes),
    stderr_sha256: digest(stderrBytes),
  };
  await Promise.all([
    writeFile(path.join(outputDir, `${label}.stdout.log`), stdoutBytes),
    writeFile(path.join(outputDir, `${label}.stderr.log`), stderrBytes),
    writeJson(path.join(outputDir, `${label}.command.json`), record),
  ]);
  return record;
}

async function assertHistoricalIdentities(repositoryRoot, variants) {
  for (const variant of Object.values(variants)) {
    const actual = await resolveCommit(repositoryRoot, variant.commit);
    if (actual !== variant.commit)
      throw new Error(`real_process_roi_variant_identity:${variant.id}`);
  }
  if (variants.a.safety_eligible !== false)
    throw new Error("real_process_roi_a_safety_role");
}

async function assertCandidateDescendsFromB(repositoryRoot, candidate) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-ancestry-"));
  try {
    const result = await spawnCaptured(
      "git",
      [
        "merge-base",
        "--is-ancestor",
        variantDefinitions(candidate).b.commit,
        candidate,
      ],
      {
        cwd: repositoryRoot,
        timeoutMs: 10000,
        outputDir: temporary,
        label: "candidate-ancestry",
      },
    );
    if (result.status !== 0)
      throw new Error("real_process_roi_candidate_not_descendant_of_b");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function environmentRecord(repositoryRoot) {
  return {
    schema_version: "long-task-real-process-environment-v1",
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    node_exec_path: process.execPath,
    cpu_model: os.cpus()[0]?.model ?? "unknown",
    cpu_count: os.cpus().length,
    total_memory_bytes: os.totalmem(),
    git_version: await gitText(repositoryRoot, ["--version"]),
    runner_class:
      process.env.GITHUB_ACTIONS === "true"
        ? "github-hosted-or-self-hosted"
        : "local",
    timing_clock: "performance.now monotonic",
    order_policy:
      "balanced Latin-square first three; frozen near-balanced fourth/fifth",
  };
}

async function sourceIdentity(repositoryRoot, paths) {
  const entries = [];
  for (const relativePath of paths) {
    const bytes = await readFile(
      path.join(repositoryRoot, ...relativePath.split("/")),
    );
    entries.push({
      path: relativePath,
      bytes: bytes.length,
      sha256: digest(bytes),
    });
  }
  return {
    entries,
    identity_sha256: sha256(canonical(entries)),
  };
}

async function resolveCommit(repositoryRoot, revision) {
  if (typeof revision !== "string" || !revision)
    throw new Error("real_process_roi_candidate_required");
  return gitText(repositoryRoot, ["rev-parse", `${revision}^{commit}`]);
}

async function gitText(cwd, args) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-git-"));
  try {
    const result = await spawnCaptured("git", args, {
      cwd,
      timeoutMs: 30000,
      outputDir: temporary,
      label: "git",
    });
    if (result.status !== 0)
      throw new Error(`real_process_roi_git_failed:${args.join(":")}`);
    return (
      await readFile(path.join(temporary, "git.stdout.log"), "utf8")
    ).trim();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function removeWorktree(repositoryRoot, checkout) {
  const resolved = path.resolve(checkout);
  const temporaryRoot = path.resolve(os.tmpdir());
  if (
    resolved === temporaryRoot ||
    !resolved
      .toLowerCase()
      .startsWith(`${temporaryRoot.toLowerCase()}${path.sep}`)
  )
    throw new Error("real_process_roi_worktree_cleanup_scope");
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-cleanup-"));
  try {
    const result = await spawnCaptured(
      "git",
      ["worktree", "remove", "--force", resolved],
      {
        cwd: repositoryRoot,
        timeoutMs: 120000,
        outputDir: temporary,
        label: "git-worktree-remove",
      },
    );
    if (result.status !== 0)
      throw new Error("real_process_roi_worktree_remove_failed");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function cleanupRealProcessRoiWorktrees(
  repositoryRoot,
  checkouts,
) {
  const failures = [];
  for (const checkout of new Set(checkouts))
    try {
      await removeWorktree(repositoryRoot, checkout);
    } catch (error) {
      failures.push(error);
    }
  if (failures.length)
    throw new AggregateError(
      failures,
      "real_process_roi_worktree_cleanup_failed",
    );
}

export async function finalizeRealProcessRoiResources({
  repositoryRoot,
  checkouts,
  temporaryRoot,
  primaryError = null,
  cleanupWorktrees = cleanupRealProcessRoiWorktrees,
  removeTemporaryRoot = (target) =>
    rm(target, { recursive: true, force: true }),
}) {
  const failures = primaryError ? [primaryError] : [];
  try {
    await cleanupWorktrees(repositoryRoot, checkouts);
  } catch (error) {
    failures.push(error);
  }
  try {
    await removeTemporaryRoot(temporaryRoot);
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(
      failures,
      "real_process_roi_collection_resource_cleanup_failed",
      { cause: primaryError ?? failures[0] },
    );
}

async function listFiles(rootPath) {
  const output = [];
  for (const entry of await readdir(rootPath, { withFileTypes: true })) {
    const target = path.join(rootPath, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(target)));
    else if (entry.isFile()) output.push(target);
  }
  return output;
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relative(rootPath, target) {
  return path.relative(rootPath, target).replaceAll("\\", "/");
}

function compactTimestamp() {
  return new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/gu, "")
    .slice(0, 14);
}

function round(value) {
  return Math.round(value * 10_000) / 10_000;
}

export const realProcessRoiPaths = Object.freeze({
  repository_root: root,
  workload_root: workloadRoot,
  workload_path: workloadPath,
  semantic_gold_path: semanticGoldPath,
  executor_path: executorPath,
  default_artifact_root: defaultArtifactRoot,
});
