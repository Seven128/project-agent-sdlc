import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASELINE_COMMIT,
  MECHANISM_ROOT,
  REPO_ROOT,
  gitValue,
  loadExperimentSet,
  loadTask,
  safeId,
  sha256,
  treeHash,
  writeJson,
} from "./shared.mjs";
import { validateDelegationBenchmarkInputs } from "./delegation-benchmark-inputs.mjs";
import { preflightDelegationHarnessRuntime } from "./delegation-harness-identity.mjs";
import { collectDelegationSourceIdentity } from "./delegation-source-identity.mjs";
import { buildDelegationRunInputIdentity } from "./delegation-run-inputs.mjs";
import { applyVariantGuidance, renderAgentPrompt } from "./guidance.mjs";
import {
  initializePreparedGit,
  installContextResolver,
  materializeMechanismWorkspace,
  writePreparedGitignore,
} from "./preparation-workspace.mjs";

export async function prepareMechanismRun(options) {
  const task = await loadTask(safeId(options.task));
  const experiments = await loadExperimentSet();
  const variant = experiments.variants[safeId(options.variant)];
  if (!variant) throw new Error(`unknown variant: ${options.variant}`);
  const track = experiments.tracks[variant.track];
  if (!track.tasks.includes(task.id) || !track.variants.includes(options.variant))
    throw new Error(`variant ${options.variant} is not valid for ${task.id}`);
  validatePrepareOptions(options, task);

  const benchmarkInputs =
    task.track_family === "long-task-delegation"
      ? await validateDelegationBenchmarkInputs(track.benchmark_inputs)
      : null;
  const sourceCheckoutCandidate =
    task.track_family === "long-task-delegation"
      ? await collectDelegationSourceIdentity()
      : null;
  const fixtureSource = path.join(MECHANISM_ROOT, "fixture");
  const fixtureSha = await treeHash(fixtureSource);
  const harnessCli = path.resolve(
    options.harnessCli ?? path.join(REPO_ROOT, "packages/ty-context/dist/cli.js"),
  );
  const harnessRuntimePreflight =
    task.track_family === "long-task-delegation" && !options.skipHarnessInit
      ? await preflightDelegationHarnessRuntime(harnessCli)
      : null;
  const { outDir, harnessRuntimeIdentity } =
    await materializeMechanismWorkspace({
      options,
      task,
      fixtureSource,
      harnessCli,
      harnessRuntimePreflight,
    });
  await installContextResolver(outDir, options.variant);
  const guidance = await applyVariantGuidance(outDir, options.variant, task, {
    variantConfig: variant,
    trackConfig: track,
    calibration: options.skipHarnessInit === true,
  });
  const prompt = renderAgentPrompt(task, options.variant);
  await mkdir(path.join(outDir, ".benchmark"), { recursive: true });
  await writeFile(path.join(outDir, ".benchmark", "prompt.md"), prompt, "utf8");
  const resultTemplate = JSON.parse(
    await readFile(path.join(MECHANISM_ROOT, "agent-result.example.json"), "utf8"),
  );
  resultTemplate.task_id = task.id;
  resultTemplate.variant_id = options.variant;
  await writeJson(path.join(outDir, ".benchmark", "agent-result.json"), resultTemplate);
  await writePreparedGitignore(outDir);

  const sourceCommit =
    sourceCheckoutCandidate?.head_commit ??
    gitValue(REPO_ROOT, ["rev-parse", "HEAD"], BASELINE_COMMIT);
  const metadata = buildMechanismRunMetadata({
    options,
    task,
    experiments,
    variant,
    track,
    sourceCommit,
    sourceCheckoutCandidate,
    harnessRuntimeIdentity,
    fixtureSha,
    benchmarkInputs,
    guidance,
  });
  await writeJson(path.join(outDir, ".benchmark", "mechanism-run.json"), metadata);
  initializePreparedGit(outDir);
  metadata.initial_commit = gitValue(outDir, ["rev-parse", "HEAD"]);
  metadata.initial_tree = gitValue(outDir, ["rev-parse", "HEAD^{tree}"]);
  if (task.track_family === "long-task-delegation") {
    const identity = buildDelegationRunInputIdentity(metadata);
    metadata.run_input_identity = {
      identity,
      sha256: sha256(identity),
    };
  }
  await writeJson(path.join(outDir, ".benchmark", "mechanism-run.json"), metadata);
  return {
    out_dir: outDir,
    prompt: path.join(outDir, ".benchmark", "prompt.md"),
    ...metadata,
  };
}

function validatePrepareOptions(options, task) {
  const valid =
    options.model &&
    options.reasoning &&
    options.pairId &&
    Number.isInteger(options.replicate) &&
    options.replicate > 0 &&
    (task.track_family !== "long-task-delegation" || options.provider);
  if (!valid)
    throw new Error(
      "prepare requires --model, --reasoning, --pair-id, positive integer --replicate, and --provider for long-task delegation",
    );
}

function buildMechanismRunMetadata(input) {
  const { options, guidance } = input;
  const metadata = {
    schema_version: "tiny-context-mechanism-run-v1",
    task_id: input.task.id,
    variant_id: options.variant,
    track: input.variant.track,
    variant_role: input.variant.role,
    pair_id: options.pairId,
    replicate: options.replicate,
    model: options.model,
    reasoning: options.reasoning,
    baseline_commit:
      guidance.delegation_admission_policy?.baseline_commit ??
      input.track.baseline_commit ??
      input.experiments.baseline_commit,
    source_checkout_commit: input.sourceCommit,
    fixture_sha256: input.fixtureSha,
    experiment_set_sha256: sha256(input.experiments),
    workflow_instruction_bytes: guidance.workflow_instruction_bytes,
    harness_initialized: !options.skipHarnessInit,
    protocol_status: options.skipHarnessInit ? "calibration" : "formal",
    prepared_at: new Date().toISOString(),
    task: input.task,
  };
  assignOptional(metadata, "provider", options.provider);
  assignOptional(
    metadata,
    "source_checkout_candidate",
    input.sourceCheckoutCandidate,
  );
  assignOptional(
    metadata,
    "harness_runtime_identity",
    input.harnessRuntimeIdentity,
  );
  assignOptional(metadata, "benchmark_inputs", input.benchmarkInputs);
  if (input.benchmarkInputs)
    metadata.benchmark_inputs_sha256 = sha256(input.benchmarkInputs);
  assignOptional(
    metadata,
    "delegation_admission_policy",
    guidance.delegation_admission_policy,
  );
  assignOptional(
    metadata,
    "delegation_admission_policy_sha256",
    guidance.delegation_admission_policy_sha256,
  );
  assignOptional(
    metadata,
    "workflow_guidance_source",
    guidance.workflow_guidance_source,
  );
  return metadata;
}

function assignOptional(target, key, value) {
  if (value) target[key] = value;
}
