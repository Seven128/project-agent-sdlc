import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { stopCheckDeliveryTask } from "../../packages/ty-context/dist/lib/long-task-status-v2.js";
import {
  activateDeliveryContract,
  readFinalReceipt,
  writeCompiledDeliveryContract,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  createWorkspaceSnapshot,
  captureWorkspaceFingerprint,
} from "../../packages/ty-context/dist/lib/long-task-workspace.js";
import {
  readDeliveryStatus,
  resumeDeliveryTask,
} from "../../packages/ty-context/dist/lib/long-task-status-v2.js";
import {
  commitCandidate,
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { addGlobalClaim } from "./long-task-global-evidence-sensitivity-fixture.mjs";

const exec = promisify(execFile);
const performanceBudgetProfiles = {
  "default-v1": {
    status_ms: 1000,
    resume_ms: 1000,
    preflight_ms: 2000,
    compile_ms: 2000,
    snapshot_ms: 5000,
    final_gate_ms: 10000,
    global_counterfactual_fixture_ms: 10000,
    planned_binding_fixture_ms: 10000,
    stop_harness_ms: 3000,
    large_repository_seed_ms: 60000,
    probe_total_ms: 120000,
  },
  "windows-v1": {
    status_ms: 2500,
    resume_ms: 2500,
    preflight_ms: 3000,
    compile_ms: 3000,
    snapshot_ms: 15000,
    final_gate_ms: 30000,
    global_counterfactual_fixture_ms: 15000,
    planned_binding_fixture_ms: 15000,
    stop_harness_ms: 15000,
    large_repository_seed_ms: 60000,
    probe_total_ms: 180000,
  },
};
const budgetProfile =
  process.platform === "win32" ? "windows-v1" : "default-v1";
const budgets = performanceBudgetProfiles[budgetProfile];
const probeStarted = performance.now();

const globalCounterfactual = await measureGlobalCounterfactualFixture();
const plannedBinding = await measurePlannedBindingFixture();
const fixture = await createDeliveryFixture();
const previousCwd = process.cwd();
try {
  const largeRepositorySeed = await timed(() =>
    seedLargeRepository(fixture.root),
  );
  fixture.contract.outcomes[0].product.owner.path_globs.push(
    "large/**",
    "untracked/**",
  );
  fixture.contract.outcomes[0].technical.allowed_support_paths.push(
    "large/**",
    "untracked/**",
  );
  await writeContract(fixture.workdir, fixture.contract);
  await runCli(fixture.root, ["enable", "long-task"]);
  await createDirtyMatrix(fixture.root);

  process.chdir(fixture.root);
  const preflight = await timed(() =>
    preflightDeliveryContract(fixture.workdir, fixture.root),
  );
  assert.equal(
    preflight.value.status,
    "ready",
    JSON.stringify(preflight.value.diagnostics),
  );
  const compile = await timed(() =>
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: true,
    }),
  );
  await writeCompiledDeliveryContract(compile.value);
  await activateDeliveryContract(compile.value);

  await readDeliveryStatus(fixture.workdir);
  const status = await timed(() => readDeliveryStatus(fixture.workdir));
  await resumeDeliveryTask(fixture.workdir);
  const resume = await timed(() => resumeDeliveryTask(fixture.workdir));

  const before = await captureWorkspaceFingerprint(fixture.root, [
    path.relative(fixture.root, fixture.workdir).replace(/\\/gu, "/"),
  ]);
  const snapshot = await createWorkspaceSnapshot(
    fixture.root,
    fixture.workdir,
    "performance",
  );
  try {
    assert.equal(snapshot.manifest.fingerprint.identity, before.identity);
    assert.equal(
      await readFile(path.join(snapshot.root, "large/d000/f00000.txt"), "utf8"),
      "staged\n",
    );
    assert.equal(
      await readFile(path.join(snapshot.root, "large/d000/f00001.txt"), "utf8"),
      "unstaged\n",
    );
    assert.equal(
      await readFile(path.join(snapshot.root, "large/renamed.txt"), "utf8"),
      "4\n",
    );
    assert.equal(
      await readFile(path.join(snapshot.root, "untracked/u000.txt"), "utf8"),
      "untracked\n",
    );
    await assert.rejects(
      readFile(path.join(snapshot.root, "large/d000/f00002.txt")),
    );
    assert.ok(
      (
        await lstat(path.join(snapshot.root, "packages/app/node_modules"))
      ).isSymbolicLink(),
    );
  } finally {
    await snapshot.dispose();
  }

  await commitCandidate(fixture.root);
  const stop = await timed(() => stopCheckDeliveryTask(fixture.workdir));
  assert.equal(stop.value.continue, true);
  const receipt = await readFinalReceipt(fixture.root, fixture.workdir);
  const runnerMs = uniqueExecutionDurationMs(receipt.check_results);
  const result = {
    platform: process.platform,
    budget_profile: budgetProfile,
    tracked_files: 10000,
    untracked_files: 100,
    status_ms: round(status.ms),
    resume_ms: round(resume.ms),
    preflight_ms: round(preflight.ms),
    compile_ms: round(compile.ms),
    snapshot_ms: round(snapshot.preparation_ms),
    final_gate_ms: round(stop.ms),
    global_counterfactual_fixture_ms: round(globalCounterfactual.ms),
    planned_binding_fixture_ms: round(plannedBinding.ms),
    large_repository_seed_ms: round(largeRepositorySeed.ms),
    unique_runner_invocations: new Set(
      receipt.check_results.map((entry) => entry.execution_identity),
    ).size,
    stop_total_ms: round(stop.ms),
    stop_snapshot_ms: round(receipt.snapshot_preparation_ms),
    stop_harness_ms: round(
      Math.max(0, stop.ms - runnerMs - receipt.snapshot_preparation_ms),
    ),
    probe_total_ms: round(performance.now() - probeStarted),
    budgets,
  };
  assert.ok(result.status_ms <= budgets.status_ms, JSON.stringify(result));
  assert.ok(result.resume_ms <= budgets.resume_ms, JSON.stringify(result));
  assert.ok(
    result.preflight_ms <= budgets.preflight_ms,
    JSON.stringify(result),
  );
  assert.ok(result.compile_ms <= budgets.compile_ms, JSON.stringify(result));
  assert.ok(result.snapshot_ms <= budgets.snapshot_ms, JSON.stringify(result));
  assert.ok(
    result.final_gate_ms <= budgets.final_gate_ms,
    JSON.stringify(result),
  );
  assert.ok(
    result.global_counterfactual_fixture_ms <=
      budgets.global_counterfactual_fixture_ms,
    JSON.stringify(result),
  );
  assert.ok(
    result.planned_binding_fixture_ms <= budgets.planned_binding_fixture_ms,
    JSON.stringify(result),
  );
  assert.ok(
    result.stop_harness_ms <= budgets.stop_harness_ms,
    JSON.stringify(result),
  );
  assert.ok(
    result.large_repository_seed_ms <= budgets.large_repository_seed_ms,
    JSON.stringify(result),
  );
  assert.ok(
    result.probe_total_ms <= budgets.probe_total_ms,
    JSON.stringify(result),
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  process.chdir(previousCwd);
  await rm(fixture.root, {
    recursive: true,
    force: true,
    maxRetries: 20,
    retryDelay: 100,
  });
}

async function measureGlobalCounterfactualFixture() {
  const target = await createDeliveryFixture();
  try {
    await addGlobalClaim(target, { counterfactual: true });
    await runCli(target.root, ["enable", "long-task"]);
    await runCli(target.root, ["long-task", "compile", target.workdir]);
    return await timed(() =>
      runCli(target.root, ["long-task", "final-gate", target.workdir]),
    );
  } finally {
    await rm(target.root, {
      recursive: true,
      force: true,
      maxRetries: 20,
      retryDelay: 100,
    });
  }
}

async function measurePlannedBindingFixture() {
  const target = await createDeliveryFixture();
  try {
    target.contract.outcomes[0].technical.bindings[0].existence = "planned";
    await writeContract(target.workdir, target.contract);
    await runCli(target.root, ["enable", "long-task"]);
    await runCli(target.root, ["long-task", "compile", target.workdir]);
    return await timed(() =>
      runCli(target.root, ["long-task", "final-gate", target.workdir]),
    );
  } finally {
    await rm(target.root, {
      recursive: true,
      force: true,
      maxRetries: 20,
      retryDelay: 100,
    });
  }
}

async function seedLargeRepository(root) {
  await exec("git", ["config", "core.autocrlf", "false"], {
    cwd: root,
    windowsHide: true,
  });
  await writeFile(path.join(root, ".gitignore"), "**/node_modules/\n");
  for (let directory = 0; directory < 100; directory += 1) {
    const folder = path.join(root, "large", `d${pad(directory, 3)}`);
    await mkdir(folder, { recursive: true });
    await Promise.all(
      Array.from({ length: 100 }, (_, index) => {
        const id = directory * 100 + index;
        return writeFile(path.join(folder, `f${pad(id, 5)}.txt`), `${id}\n`);
      }),
    );
  }
  await exec("git", ["add", "."], {
    cwd: root,
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  });
  await exec("git", ["commit", "-m", "large fixture"], {
    cwd: root,
    windowsHide: true,
  });
  await mkdir(path.join(root, "packages/app/node_modules/dependency"), {
    recursive: true,
  });
  await writeFile(
    path.join(root, "packages/app/node_modules/dependency/index.js"),
    "module.exports = true;\n",
  );
}

async function createDirtyMatrix(root) {
  await writeFile(path.join(root, "large/d000/f00000.txt"), "staged\n");
  await exec("git", ["add", "large/d000/f00000.txt"], {
    cwd: root,
    windowsHide: true,
  });
  await writeFile(path.join(root, "large/d000/f00001.txt"), "unstaged\n");
  await rm(path.join(root, "large/d000/f00002.txt"));
  await rename(
    path.join(root, "large/d000/f00004.txt"),
    path.join(root, "large/renamed.txt"),
  );
  await exec(
    "git",
    ["add", "-A", "large/d000/f00004.txt", "large/renamed.txt"],
    {
      cwd: root,
      windowsHide: true,
    },
  );
  await exec("git", ["update-index", "--chmod=+x", "large/d000/f00005.txt"], {
    cwd: root,
    windowsHide: true,
  });
  await mkdir(path.join(root, "untracked"), { recursive: true });
  await Promise.all(
    Array.from({ length: 100 }, (_, index) =>
      writeFile(
        path.join(root, "untracked", `u${pad(index, 3)}.txt`),
        "untracked\n",
      ),
    ),
  );
}

async function timed(action) {
  const started = performance.now();
  const value = await action();
  return { value, ms: performance.now() - started };
}

function pad(value, width) {
  return String(value).padStart(width, "0");
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function uniqueExecutionDurationMs(checkResults) {
  const durations = new Map();
  for (const result of checkResults) {
    const previous = durations.get(result.execution_identity);
    assert.ok(
      previous === undefined || previous === result.duration_ms,
      `shared runner duration mismatch for ${result.execution_identity}`,
    );
    durations.set(result.execution_identity, result.duration_ms);
  }
  return [...durations.values()].reduce((sum, duration) => sum + duration, 0);
}
