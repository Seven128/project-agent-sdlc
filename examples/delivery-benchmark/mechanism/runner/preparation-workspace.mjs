import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { finalizeDelegationHarnessRuntime } from "./delegation-harness-identity.mjs";
import { resetOwnedRunDirectory } from "./owned-run-directory.mjs";
import {
  MECHANISM_ROOT,
  copyFixture,
  gitValue,
  pruneFixtureForTask,
  run,
} from "./shared.mjs";

export async function materializeMechanismWorkspace({
  options,
  task,
  fixtureSource,
  harnessCli,
  harnessRuntimePreflight,
}) {
  const outDir = await resetOwnedRunDirectory(options.outDir, {
    force: options.force,
  });
  if (options.skipHarnessInit) {
    await copyFixture(outDir);
    await writeFallbackAgents(outDir);
  } else {
    await cp(
      path.join(fixtureSource, "package.json"),
      path.join(outDir, "package.json"),
    );
    run(
      process.execPath,
      [harnessCli, "init", "--adopt", "--harness-folder", ".codex"],
      { cwd: outDir },
    );
    await rm(path.join(outDir, "project_context"), {
      recursive: true,
      force: true,
    });
    await copyFixture(outDir);
    if (task.track_family === "long-task-delegation")
      await preserveCodexHarnessLocator(outDir);
    if (
      ["long-task-authoring", "long-task-delegation"].includes(
        task.track_family,
      )
    )
      run(process.execPath, [harnessCli, "enable", "long-task"], {
        cwd: outDir,
      });
  }
  const harnessRuntimeIdentity = harnessRuntimePreflight
    ? await finalizeDelegationHarnessRuntime(outDir, harnessRuntimePreflight)
    : null;
  await pruneFixtureForTask(outDir, task);
  if (!options.skipHarnessInit) await writeCliWrapper(outDir, harnessCli);
  return { outDir, harnessRuntimeIdentity };
}

export async function installContextResolver(outDir, variant) {
  if (variant !== "context-resolve-r0") return;
  await mkdir(path.join(outDir, "tools"), { recursive: true });
  await cp(
    path.join(MECHANISM_ROOT, "runner", "context-resolve-r0.mjs"),
    path.join(outDir, "tools", "context-resolve-r0.mjs"),
  );
}

export async function writePreparedGitignore(outDir) {
  const file = path.join(outDir, ".gitignore");
  const existing = await readFile(file, "utf8").catch(() => "");
  const lines = existing.split(/\r?\n/u).filter(Boolean);
  for (const entry of [".benchmark/", "node_modules/", "coverage/", "dist/"])
    if (!lines.includes(entry)) lines.push(entry);
  await writeFile(file, `${lines.join("\n")}\n`, "utf8");
}

export function initializePreparedGit(outDir) {
  run("git", ["init", "-b", "main"], { cwd: outDir, allowFailure: true });
  if (!gitValue(outDir, ["branch", "--show-current"]))
    run("git", ["checkout", "-B", "main"], { cwd: outDir });
  run("git", ["config", "user.name", "Mechanism Benchmark Operator"], {
    cwd: outDir,
  });
  run(
    "git",
    ["config", "user.email", "mechanism-benchmark@example.invalid"],
    { cwd: outDir },
  );
  run("git", ["add", "."], { cwd: outDir });
  run("git", ["commit", "-m", "Prepare mechanism benchmark run"], {
    cwd: outDir,
  });
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

async function preserveCodexHarnessLocator(outDir) {
  const file = path.join(outDir, "package.json");
  const value = JSON.parse(await readFile(file, "utf8"));
  value.tyContext = {
    ...(value.tyContext ?? {}),
    harnessFolderName: ".codex",
  };
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
