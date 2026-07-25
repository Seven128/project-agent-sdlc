import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASELINE_COMMIT,
  MECHANISM_ROOT,
  REPO_ROOT,
  copyFixture,
  gitValue,
  loadExperimentSet,
  loadTask,
  pruneFixtureForTask,
  resetDirectory,
  run,
  safeId,
  sha256,
  treeHash,
  writeJson
} from "./shared.mjs";
import { applyVariantGuidance, renderAgentPrompt } from "./guidance.mjs";

export async function prepareMechanismRun(options) {
  const task = await loadTask(safeId(options.task));
  const experiments = await loadExperimentSet();
  const variant = experiments.variants[safeId(options.variant)];
  if (!variant) throw new Error(`unknown variant: ${options.variant}`);
  const track = experiments.tracks[variant.track];
  if (!track.tasks.includes(task.id) || !track.variants.includes(options.variant)) throw new Error(`variant ${options.variant} is not valid for ${task.id}`);
  if (!options.model || !options.reasoning || !options.pairId || !Number.isInteger(options.replicate) || options.replicate < 1) {
    throw new Error("prepare requires --model, --reasoning, --pair-id, and positive integer --replicate");
  }

  const outDir = await resetDirectory(options.outDir, options.force);
  const fixtureSource = path.join(MECHANISM_ROOT, "fixture");
  const fixtureSha = await treeHash(fixtureSource);
  const harnessCli = path.resolve(options.harnessCli ?? path.join(REPO_ROOT, "packages/ty-context/dist/cli.js"));
  if (!options.skipHarnessInit) {
    await cp(path.join(fixtureSource, "package.json"), path.join(outDir, "package.json"));
    run(process.execPath, [harnessCli, "init", "--adopt", "--harness-folder", ".codex"], { cwd: outDir });
    await rm(path.join(outDir, "project_context"), { recursive: true, force: true });
    await copyFixture(outDir);
    if (task.track_family === "long-task-authoring") run(process.execPath, [harnessCli, "enable", "long-task"], { cwd: outDir });
  } else {
    await copyFixture(outDir);
    await writeFallbackAgents(outDir);
  }
  await pruneFixtureForTask(outDir, task);
  if (!options.skipHarnessInit) await writeCliWrapper(outDir, harnessCli);
  if (options.variant === "context-resolve-r0") {
    await mkdir(path.join(outDir, "tools"), { recursive: true });
    await cp(path.join(MECHANISM_ROOT, "runner", "context-resolve-r0.mjs"), path.join(outDir, "tools", "context-resolve-r0.mjs"));
  }
  const instructionBytes = await applyVariantGuidance(outDir, options.variant, task);
  const prompt = renderAgentPrompt(task, options.variant);
  await mkdir(path.join(outDir, ".benchmark"), { recursive: true });
  await writeFile(path.join(outDir, ".benchmark", "prompt.md"), prompt, "utf8");
  const resultTemplate = JSON.parse(await readFile(path.join(MECHANISM_ROOT, "agent-result.example.json"), "utf8"));
  resultTemplate.task_id = task.id;
  resultTemplate.variant_id = options.variant;
  await writeJson(path.join(outDir, ".benchmark", "agent-result.json"), resultTemplate);
  await ensureGitignore(outDir);

  const sourceCommit = gitValue(REPO_ROOT, ["rev-parse", "HEAD"], BASELINE_COMMIT);
  const metadata = {
    schema_version: "tiny-context-mechanism-run-v1",
    task_id: task.id,
    variant_id: options.variant,
    track: variant.track,
    variant_role: variant.role,
    pair_id: options.pairId,
    replicate: options.replicate,
    model: options.model,
    reasoning: options.reasoning,
    baseline_commit: experiments.baseline_commit,
    source_checkout_commit: sourceCommit,
    fixture_sha256: fixtureSha,
    experiment_set_sha256: sha256(experiments),
    workflow_instruction_bytes: instructionBytes,
    harness_initialized: !options.skipHarnessInit,
    protocol_status: options.skipHarnessInit ? "calibration" : "formal",
    prepared_at: new Date().toISOString(),
    task
  };
  await writeJson(path.join(outDir, ".benchmark", "mechanism-run.json"), metadata);
  initializeGit(outDir);
  metadata.initial_commit = gitValue(outDir, ["rev-parse", "HEAD"]);
  await writeJson(path.join(outDir, ".benchmark", "mechanism-run.json"), metadata);
  return { out_dir: outDir, prompt: path.join(outDir, ".benchmark", "prompt.md"), ...metadata };
}

async function ensureGitignore(outDir) {
  const file = path.join(outDir, ".gitignore");
  const existing = await readFile(file, "utf8").catch(() => "");
  const lines = existing.split(/\r?\n/u).filter(Boolean);
  for (const entry of [".benchmark/", "node_modules/", "coverage/", "dist/"]) if (!lines.includes(entry)) lines.push(entry);
  await writeFile(file, `${lines.join("\n")}\n`, "utf8");
}

function initializeGit(outDir) {
  run("git", ["init", "-b", "main"], { cwd: outDir, allowFailure: true });
  if (!gitValue(outDir, ["branch", "--show-current"])) run("git", ["checkout", "-B", "main"], { cwd: outDir });
  run("git", ["config", "user.name", "Mechanism Benchmark Operator"], { cwd: outDir });
  run("git", ["config", "user.email", "mechanism-benchmark@example.invalid"], { cwd: outDir });
  run("git", ["add", "."], { cwd: outDir });
  run("git", ["commit", "-m", "Prepare mechanism benchmark run"], { cwd: outDir });
}

async function writeCliWrapper(outDir, harnessCli) {
  await mkdir(path.join(outDir, "tools"), { recursive: true });
  const source = `#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
const cli = ${JSON.stringify(harnessCli)};
const args = process.argv.slice(2);
const started = performance.now();
const result = spawnSync(process.execPath, [cli, ...args], { cwd: process.cwd(), encoding: "utf8", env: process.env, windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if ((args[0] === "long-task" && ["preflight", "compile"].includes(args[1]))
  || (args[0] === "design-resource" && args[1] === "preflight")) {
  const benchmarkDir = path.join(process.cwd(), ".benchmark");
  mkdirSync(benchmarkDir, { recursive: true });
  let parsed_result = null;
  try { parsed_result = JSON.parse(result.stdout); } catch {}
  appendFileSync(path.join(benchmarkDir, "ty-context-events.ndjson"), JSON.stringify({
    at: new Date().toISOString(),
    command: args.slice(0, 2).join(" "),
    argv: args,
    status: result.status,
    duration_ms: Math.round((performance.now() - started) * 10) / 10,
    parsed_result
  }) + "\\n", "utf8");
}
if (result.signal) process.kill(process.pid, result.signal);
else process.exitCode = result.status ?? 1;
`;
  await writeFile(path.join(outDir, "tools", "ty-context.mjs"), source, "utf8");
}

async function writeFallbackAgents(outDir) {
  const content = `# Tiny Context Mechanism Benchmark\n\n## Default Workflow Contract\n\nUnless an active Long-Task binding exists: read project_context/global.md, architecture.md, context.toml, the default area, manifest candidates, and one bounded project_context/** text search; decide Context Delta; use an internal plan; implement; run project checks; perform Contract Conformance and Context drift checking.\n\n## Long-Task Routing\n\nLong-Task is explicit only. One delivery has one Contract and one Final Gate. Targeted verification never accepts.\n`;
  await writeFile(path.join(outDir, "AGENTS.md"), content, "utf8");
}
