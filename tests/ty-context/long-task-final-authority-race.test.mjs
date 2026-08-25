import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  appendFile,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  activeRecordPath,
  clearActiveBindingCas,
  loadActiveLongTaskAuthority,
  readFinalReceipt,
  readProgressRecords,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  parseCliJson,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages/ty-context/dist/cli.js");

test("terminal publication has one Finalization Identity and CAS owner", async () => {
  const identity =
    await import("../../packages/ty-context/dist/lib/long-task-finalization-identity.js");
  const finalization =
    await import("../../packages/ty-context/dist/lib/long-task-terminal-finalization.js");
  assert.equal(typeof identity.captureFinalizationIdentity, "function");
  assert.equal(typeof identity.finalizationIdentityDigest, "function");
  assert.equal(typeof finalization.finalizeDeliveryGateCas, "function");
});

test("Final Gate rejects an Authority Revision that lands during execution", async () => {
  const fixture = await createDeliveryFixture();
  const signal = raceSignal("final");
  try {
    await installSlowOracle(fixture, signal);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const authorityA = (await loadActiveLongTaskAuthority(fixture.root))
      .authority;
    await commitCandidate(fixture.root);

    const finalProcess = runCliProcess(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    await waitForFile(signal.started);
    addProof(fixture.contract, "revision-b-proof");
    await writeContract(fixture.workdir, fixture.contract);
    const revisionB = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(revisionB.authority_revision, 2);
    await writeFile(signal.release, "release\n");

    const final = await finalProcess;
    assert.notEqual(final.exitCode, 0);
    const receipt = parseCliJson(final.stdout);
    assert.equal(receipt.workflow_status, "needs_work");
    assert.ok(
      receipt.findings.some(
        (finding) =>
          finding.code === "active_authority_changed_during_final_gate",
      ),
    );
    const activeB = (await loadActiveLongTaskAuthority(fixture.root)).authority;
    assert.equal(activeB.authority_revision, 2);
    await assert.rejects(
      () =>
        clearActiveBindingCas({
          repository_root: fixture.root,
          workdir: fixture.workdir,
          task_id: authorityA.task_id,
          authority_revision: authorityA.authority_revision,
          compiled_identity: authorityA.active_authority_identity,
          worktree_identity: authorityA.worktree_identity,
        }),
      /active_authority_clear_compare_and_swap_failed/u,
    );
    assert.equal(
      (await loadActiveLongTaskAuthority(fixture.root)).authority
        .active_authority_identity,
      activeB.active_authority_identity,
    );
  } finally {
    await removeTemporary(signal.folder);
    await removeTemporary(fixture.root);
  }
});

test("Final Gate rejects protected inputs and current-candidate runtime files changed during execution", async (t) => {
  const cases = [
    {
      name: "raw Contract",
      mutate: async (fixture) =>
        appendFile(
          path.join(fixture.workdir, "delivery-contract.yaml"),
          "\n# concurrent raw Contract mutation\n",
        ),
    },
    {
      name: "Source",
      mutate: async (fixture) =>
        appendFile(
          path.join(fixture.root, "source.md"),
          `
<!-- ty-source-background:start key=concurrent-note reason=markdown-structure -->
<a id="concurrent-source-background"></a>
<!-- ty-source-background:end -->
`,
        ),
    },
    {
      name: "controlling Context",
      mutate: async (fixture) =>
        appendFile(
          path.join(fixture.root, "project_context", "areas", "main.md"),
          "\nConcurrent controlling Context mutation.\n",
        ),
    },
    {
      name: "product runner module",
      expectedFinding: "workspace_changed_during_final_gate",
      mutate: async (fixture) =>
        appendFile(
          path.join(fixture.root, "tests", "oracle.mjs"),
          "\n// concurrent runner mutation\n",
        ),
    },
    {
      name: "verification input",
      mutate: async (fixture) =>
        writeFile(
          path.join(fixture.root, "tests", "semantic-false.json"),
          `${JSON.stringify({ first: false, second: true })}\n`,
        ),
    },
    {
      name: "workdir Outcome fragment",
      fragment: true,
      mutate: async (fixture) =>
        appendFile(
          path.join(fixture.workdir, "outcomes.yaml"),
          "\n# concurrent workdir fragment mutation\n",
        ),
    },
  ];

  for (const mutation of cases)
    await t.test(mutation.name, async () => {
      const fixture = await createDeliveryFixture();
      const signal = raceSignal(
        `protected-${mutation.name.toLowerCase().replaceAll(/[^a-z]+/gu, "-")}`,
      );
      try {
        if (mutation.fragment) {
          const outcomes = fixture.contract.outcomes;
          delete fixture.contract.outcomes;
          fixture.contract.outcome_files = ["outcomes.yaml"];
          await writeFile(
            path.join(fixture.workdir, "outcomes.yaml"),
            `${JSON.stringify(
              {
                schema_version: "long-task-outcomes-v2",
                outcomes,
              },
              null,
              2,
            )}\n`,
          );
          await writeContract(fixture.workdir, fixture.contract);
        }
        await installSlowOracle(fixture, signal);
        await runCli(fixture.root, ["enable", "long-task"]);
        await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
        await commitCandidate(fixture.root);

        const finalProcess = runCliProcess(fixture.root, [
          "long-task",
          "final-gate",
          fixture.workdir,
        ]);
        await waitForFile(signal.started);
        await mutation.mutate(fixture);
        await writeFile(signal.release, "release\n");

        const final = await finalProcess;
        assert.notEqual(final.exitCode, 0);
        const receipt = parseCliJson(final.stdout);
        assert.equal(
          receipt.workflow_status,
          "needs_work",
          JSON.stringify(final),
        );
        assert.ok(
          receipt.findings.some(
            (finding) =>
              finding.code ===
              (mutation.expectedFinding ??
                "protected_inputs_changed_during_final_gate"),
          ),
          JSON.stringify(receipt.findings),
        );
      } finally {
        await removeTemporary(signal.folder);
        await removeTemporary(fixture.root);
      }
    });
});

test("targeted verify writes no progress for an Authority that became stale", async () => {
  const fixture = await createDeliveryFixture();
  const signal = raceSignal("verify");
  try {
    await installSlowOracle(fixture, signal);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const verifyProcess = runCliProcess(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
    ]);
    await waitForFile(signal.started);
    addProof(fixture.contract, "verify-revision-b-proof");
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    await writeFile(signal.release, "release\n");

    const verified = await verifyProcess;
    assert.notEqual(verified.exitCode, 0);
    const result = parseCliJson(verified.stdout);
    assert.deepEqual(result.updated_progress_records, []);
    assert.ok(
      result.findings.some(
        (finding) => finding.code === "active_authority_changed_during_verify",
      ),
    );
    assert.deepEqual(await readProgressRecords(fixture.workdir), {});
  } finally {
    await removeTemporary(signal.folder);
    await removeTemporary(fixture.root);
  }
});

test("candidate mutation after Receipt staging rolls back acceptance and retains Authority", async () => {
  const fixture = await createDeliveryFixture();
  const signal = await finalizationSignal("after_receipt_stage");
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const closing = runCliProcess(
      fixture.root,
      ["long-task", "close", fixture.workdir],
      { env: finalizationSignalEnvironment(signal) },
    );
    await waitForFile(signal.started);
    await appendFile(path.join(fixture.root, "src", "state.json"), "\n");
    await writeFile(signal.release, "release\n");

    const result = await closing;
    assert.notEqual(result.exitCode, 0);
    const receipt = await readFinalReceipt(fixture.root, fixture.workdir);
    assert.equal(receipt.workflow_status, "needs_work");
    assert.notEqual(receipt.workflow_status, "machine_accepted");
    assert.ok((await loadActiveLongTaskAuthority(fixture.root)).authority);
  } finally {
    await removeTemporary(signal.folder);
    await removeTemporary(fixture.root);
  }
});

test("Authority mutation between Receipt publish and clear is rolled back", async () => {
  const fixture = await createDeliveryFixture();
  const signal = await finalizationSignal("after_receipt_publish");
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const activeFile = await activeRecordPath(fixture.root);
    const original = await readFile(activeFile, "utf8");
    const closing = runCliProcess(
      fixture.root,
      ["long-task", "close", fixture.workdir],
      { env: finalizationSignalEnvironment(signal) },
    );
    await waitForFile(signal.started);
    const mutated = JSON.parse(original);
    mutated.activated_at = new Date(
      Date.parse(mutated.activated_at) + 1_000,
    ).toISOString();
    await writeFile(activeFile, `${JSON.stringify(mutated)}\n`);
    await writeFile(signal.release, "release\n");

    const result = await closing;
    assert.notEqual(result.exitCode, 0);
    const receipt = await readFinalReceipt(fixture.root, fixture.workdir);
    assert.equal(receipt.workflow_status, "needs_work");
    assert.equal(await readFile(activeFile, "utf8"), original);
    assert.ok((await loadActiveLongTaskAuthority(fixture.root)).authority);
  } finally {
    await removeTemporary(signal.folder);
    await removeTemporary(fixture.root);
  }
});

test("failure after provisional Authority clear restores Authority and rejects Receipt", async () => {
  const fixture = await createDeliveryFixture();
  const signal = await finalizationSignal("after_authority_clear");
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const closing = runCliProcess(
      fixture.root,
      ["long-task", "close", fixture.workdir],
      { env: finalizationSignalEnvironment(signal) },
    );
    await waitForFile(signal.started);
    await appendFile(path.join(fixture.root, "src", "state.json"), "\n");
    await writeFile(signal.release, "release\n");

    const result = await closing;
    assert.notEqual(result.exitCode, 0);
    const receipt = await readFinalReceipt(fixture.root, fixture.workdir);
    assert.equal(receipt.workflow_status, "needs_work");
    assert.notEqual(receipt.workflow_status, "machine_accepted");
    assert.ok((await loadActiveLongTaskAuthority(fixture.root)).authority);
  } finally {
    await removeTemporary(signal.folder);
    await removeTemporary(fixture.root);
  }
});

test("concurrent Final Gates serialize at the existing finalization lock", async () => {
  const fixture = await createDeliveryFixture();
  const signal = await finalizationSignal("after_finalization_evaluation");
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);
    const first = runCliProcess(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { env: finalizationSignalEnvironment(signal) },
    );
    await waitForFile(signal.started);
    const second = await runCliProcess(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.notEqual(second.exitCode, 0);
    assert.match(second.stderr, /lock_unavailable/u);
    await writeFile(signal.release, "release\n");
    const accepted = await first;
    assert.equal(accepted.exitCode, 0, accepted.stderr);
    assert.equal(
      parseCliJson(accepted.stdout).workflow_status,
      "machine_accepted",
    );
    assert.ok((await loadActiveLongTaskAuthority(fixture.root)).authority);
  } finally {
    await removeTemporary(signal.folder);
    await removeTemporary(fixture.root);
  }
});

test(
  "[critical:atomic-terminal-finalization] Finalization waits for the Windows Job process tree to settle",
  { skip: process.platform !== "win32" },
  async () => {
    const fixture = await createDeliveryFixture();
    const signal = await finalizationSignal("after_finalization_evaluation");
    const settled = path.join(signal.folder, "descendant-settled.txt");
    try {
      fixture.contract.outcomes[0].acceptance.checks[0].runner.timeout_ms = 10_000;
      await writeContract(fixture.workdir, fixture.contract);
      await installDelayedDescendantOracle(fixture, settled);
      await runCli(fixture.root, ["enable", "long-task"]);
      await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
      await commitCandidate(fixture.root);

      const finalProcess = runCliProcess(
        fixture.root,
        ["long-task", "final-gate", fixture.workdir],
        { env: finalizationSignalEnvironment(signal) },
      );
      await waitForFile(signal.started);
      assert.equal(await readFile(settled, "utf8"), "settled\n");
      await writeFile(signal.release, "release\n");

      const final = await finalProcess;
      assert.equal(final.exitCode, 0, final.stderr);
      assert.equal(
        parseCliJson(final.stdout).workflow_status,
        "machine_accepted",
      );
      assert.ok((await loadActiveLongTaskAuthority(fixture.root)).authority);
    } finally {
      await removeTemporary(signal.folder);
      await removeTemporary(fixture.root);
    }
  },
);

test("Stop and close rerun current Authority instead of clearing from an old Receipt", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const acceptedA = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(acceptedA.workflow_status, "machine_accepted");

    addBlockingExternalConfirmation(fixture.contract);
    await writeContract(fixture.workdir, fixture.contract);
    const pending = await runCliFailure(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    assert.equal(pending.status, "authority_revision_pending");
    await runCli(fixture.root, [
      "long-task",
      "approve-authority-revision",
      fixture.workdir,
      "--revision",
      pending.pending_authority_revision.revision_identity,
    ]);
    const revisionB = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    await commitCandidate(fixture.root);

    const stop = await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    assert.equal(stop.reason, "live_final_gate_blocked_external");
    assert.equal(
      (await loadActiveLongTaskAuthority(fixture.root)).authority
        .active_authority_identity,
      revisionB.compiled_identity,
    );
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "close", fixture.workdir]),
      /close_live_final_gate_failed:blocked_external/u,
    );
    assert.equal(
      (await loadActiveLongTaskAuthority(fixture.root)).authority
        .active_authority_identity,
      revisionB.compiled_identity,
    );
  } finally {
    await removeTemporary(fixture.root);
  }
});

async function removeTemporary(target) {
  await rm(target, {
    recursive: true,
    force: true,
    maxRetries: 50,
    retryDelay: 200,
  });
}

function addProof(contract, key) {
  contract.outcomes[0].acceptance.checks[0].positive_assertions.push({
    key,
    criterion: "The concurrent revision proof remains true.",
    claims: [],
    observation: "negative",
    evidence_capabilities: ["presence"],
    operator: "equals",
    expected: false,
  });
}

function addBlockingExternalConfirmation(contract) {
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const scenario = structuredClone(outcome.acceptance.checks[0].scenario);
  for (const check of outcome.acceptance.checks)
    for (const assertion of [
      ...check.positive_assertions,
      ...check.negative_assertions,
    ]) {
      assertion.claims = assertion.claims.filter((claim) => claim !== "result");
      if (!assertion.claims.length) delete assertion.applicability_ref;
    }
  for (const control of outcome.acceptance.counterfactual_controls)
    control.claims = control.claims.filter((claim) => claim !== "result");
  contract.global.acceptance.external_confirmations.push({
    key: "race-blocking-confirmation",
    description:
      "The revised Authority requires a blocking external confirmation.",
    owner: "external-owner",
    kind: "functional_prerequisite",
    impact_claims: ["first.result"],
    blocks_target: true,
    actor: {
      id: "race-release-owner",
      role: "release acceptance owner",
      authority_kind: "human",
    },
    target_ref: "fixture-app",
    environment_identity: "race-external-environment-v1",
    scenario,
    evidence_requirements: [
      {
        key: "race-observation",
        statement: "Capture the current external target result.",
      },
    ],
    obligations: [
      {
        key: "race-result-obligation",
        claim_ref: "first.result",
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "runtime_behavior",
        evidence_capabilities: ["target_runtime"],
        expected_authority_ref: "contract-claim:first.result",
        result_kind: "judgment",
      },
    ],
  });
}

async function installSlowOracle(fixture, signal) {
  await mkdir(signal.folder, { recursive: true });
  await writeFixtureOracle(
    fixture,
    `
appendFileSync(${JSON.stringify(signal.started)}, "started\\n");
while (!existsSync(${JSON.stringify(signal.release)})) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
}
`,
  );
  await commitCandidate(fixture.root);
}

async function installDelayedDescendantOracle(fixture, settled) {
  const childProgram = `setTimeout(() => require("node:fs").writeFileSync(${JSON.stringify(
    settled,
  )}, "settled\\n"), 750);`;
  await writeFixtureOracle(
    fixture,
    `
const descendant = spawn(process.execPath, ["-e", ${JSON.stringify(
      childProgram,
    )}], {
  detached: true,
  stdio: "ignore",
  windowsHide: true,
});
descendant.unref();
`,
  );
  await commitCandidate(fixture.root);
}

async function writeFixtureOracle(fixture, setup) {
  await writeFile(
    path.join(fixture.root, "tests", "oracle.mjs"),
    `import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
${setup}
let state = {first:false};
try { state = JSON.parse(readFileSync(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const observed = state.first === true;
const assertion = (key) => "assertion.first.first-check." + key;
console.log(JSON.stringify({
  schema_version: "ty-context-product-observation-v1",
  observations: {
    "fact.first.observable": observed,
    [assertion("first-result")]: observed,
    [assertion("first-requirement")]: observed,
    [assertion("first-obligation")]: observed,
    [assertion("first-architecture")]: observed,
    [assertion("first-liveness")]: true,
    [assertion("first-relations-na")]: state.first_relations_applicable === true
  }
}));
`,
  );
}

function raceSignal(name) {
  const folder = path.join(
    os.tmpdir(),
    `ty-context-${name}-race-${process.pid}-${Date.now()}`,
  );
  return {
    folder,
    started: path.join(folder, "started.txt"),
    release: path.join(folder, "release.txt"),
  };
}

async function waitForFile(file) {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (
      await access(file)
        .then(() => true)
        .catch(() => false)
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`race signal timeout: ${file}`);
}

const FINALIZATION_PHASES = [
  "after_finalization_evaluation",
  "after_receipt_stage",
  "after_receipt_publish",
  "after_authority_clear",
];

async function finalizationSignal(target) {
  const folder = path.join(
    os.tmpdir(),
    `ty-context-finalization-${target}-${process.pid}-${Date.now()}`,
  );
  await mkdir(folder, { recursive: true });
  for (const phase of FINALIZATION_PHASES)
    if (phase !== target)
      await writeFile(path.join(folder, `${phase}.release`), "release\n");
  return {
    folder,
    started: path.join(folder, `${target}.started`),
    release: path.join(folder, `${target}.release`),
  };
}

function finalizationSignalEnvironment(signal) {
  return {
    ...process.env,
    NODE_ENV: "test",
    TY_CONTEXT_TEST_FINALIZATION_SIGNAL_DIR: signal.folder,
  };
}

async function runCliProcess(cwd, args, options = {}) {
  try {
    const result = await exec(process.execPath, [cli, ...args], {
      cwd,
      windowsHide: true,
      ...options,
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      exitCode: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
    };
  }
}
