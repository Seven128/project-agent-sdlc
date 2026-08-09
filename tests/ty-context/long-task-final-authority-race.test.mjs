import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, appendFile, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  clearActiveBindingCas,
  loadActiveLongTaskAuthority,
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
    await rm(signal.folder, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
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
        assert.equal(receipt.workflow_status, "needs_work");
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
        await rm(signal.folder, { recursive: true, force: true });
        await rm(fixture.root, { recursive: true, force: true });
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
    await rm(signal.folder, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

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
    await rm(fixture.root, { recursive: true, force: true });
  }
});

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
  contract.global.acceptance.external_confirmations.push({
    key: "race-blocking-confirmation",
    description:
      "The revised Authority requires a blocking external confirmation.",
    owner: "external-owner",
    kind: "functional_prerequisite",
    impact_claims: ["first.result"],
    blocks_target: true,
  });
}

async function installSlowOracle(fixture, signal) {
  await mkdir(signal.folder, { recursive: true });
  await writeFile(
    path.join(fixture.root, "tests", "oracle.mjs"),
    `import { appendFileSync, existsSync, readFileSync } from "node:fs";
appendFileSync(${JSON.stringify(signal.started)}, "started\\n");
while (!existsSync(${JSON.stringify(signal.release)})) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 20);
}
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
  await commitCandidate(fixture.root);
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
  const deadline = Date.now() + 15_000;
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

async function runCliProcess(cwd, args) {
  try {
    const result = await exec(process.execPath, [cli, ...args], {
      cwd,
      windowsHide: true,
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
