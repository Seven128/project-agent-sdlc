import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  externalConfirmationRecordHash,
  parseExternalConfirmationRecordV1,
  signExternalConfirmationRecordV1,
} from "../../packages/ty-context/dist/index.js";
import { externalConfirmationRecordPath } from "../../packages/ty-context/dist/lib/long-task-external-confirmation-state.js";
import {
  activeRecordPath,
  runtimePath,
} from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages/ty-context/dist/cli.js");

import {
  batchingExternalConfirmations,
  externalDeclaration,
  externalFixture,
} from "./long-task-external-confirmation-fixture.mjs";
import {
  buildPassingRecord,
  invalidRecordMutations,
  resignRecord,
  writeSubmissionRecord,
} from "./long-task-external-confirmation-record-fixture.mjs";
import {
  finalizationSignal,
  finalizationSignalEnvironment,
  installSlowOracle,
  raceSignal,
  removeTemporary,
  runCliProcess,
  waitForProcessExit,
  waitForStartedProcess,
} from "./long-task-external-confirmation-race-fixture.mjs";

test("every candidate change stales a blocking external record", async () => {
  const fixture = await externalFixture();
  try {
    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
    ]);
    await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      await writeSubmissionRecord(
        fixture,
        "passing-record.json",
        await buildPassingRecord(fixture, prepared),
      ),
    ]);

    await mkdir(path.join(fixture.root, "notes"), { recursive: true });
    await writeFile(
      path.join(fixture.root, "notes", "unrelated.md"),
      "unrelated\n",
    );
    await commitCandidate(fixture.root);
    const unrelatedChanged = await runCli(fixture.root, [
      "long-task",
      "external",
      "status",
      fixture.workdir,
    ]);
    assert.equal(unrelatedChanged.confirmations[0].state, "stale");
    assert.equal(
      unrelatedChanged.confirmations[0].carried_forward_from_candidate,
      false,
    );
    assert.ok(
      unrelatedChanged.confirmations[0].issues.includes(
        "candidate_identity_stale",
      ),
    );

    const revoked = await runCli(fixture.root, [
      "long-task",
      "external",
      "revoke",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    assert.equal(revoked.status, "revoked");
  } finally {
    await removeTemporary(fixture.root);
  }
});

test("Final Gate rejects an External Confirmation record changed during runner execution", async () => {
  const signal = raceSignal("external-record");
  const fixture = await externalFixture({
    beforeCompile: async (candidate) => installSlowOracle(candidate, signal),
  });
  try {
    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
    ]);
    await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      await writeSubmissionRecord(
        fixture,
        "passing-record.json",
        await buildPassingRecord(fixture, prepared),
      ),
    ]);

    const finalProcess = runCliProcess(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    const oraclePid = await waitForStartedProcess(signal.started);
    await writeFile(
      externalConfirmationRecordPath(fixture.workdir, "fixture-external"),
      "{}\n",
    );
    await writeFile(signal.release, "release\n");

    const final = await finalProcess;
    await waitForProcessExit(oraclePid);
    assert.notEqual(final.exitCode, 0);
    const receipt = JSON.parse(final.stdout);
    assert.equal(receipt.workflow_status, "needs_work");
    assert.ok(
      receipt.findings.some(
        (finding) =>
          finding.code === "protected_inputs_changed_during_final_gate",
      ),
      JSON.stringify(receipt.findings),
    );
    assert.equal(await pathExists(await activeRecordPath(fixture.root)), true);
  } finally {
    await removeTemporary(signal.folder);
    await removeTemporary(fixture.root);
  }
});

test("Finalization revalidates External record and artifact identities after evaluation", async (t) => {
  for (const target of ["record", "artifact"])
    await t.test(target, async () => {
      const fixture = await externalFixture();
      const signal = await finalizationSignal(
        "after_finalization_evaluation",
      );
      try {
        const prepared = await runCli(fixture.root, [
          "long-task",
          "external",
          "prepare",
          fixture.workdir,
        ]);
        const record = await buildPassingRecord(fixture, prepared);
        await runCli(fixture.root, [
          "long-task",
          "external",
          "submit",
          fixture.workdir,
          "--confirmation",
          "fixture-external",
          "--record",
          await writeSubmissionRecord(
            fixture,
            `passing-${target}.json`,
            record,
          ),
        ]);

        const finalProcess = runCliProcess(
          fixture.root,
          ["long-task", "final-gate", fixture.workdir],
          { env: finalizationSignalEnvironment(signal) },
        );
        await waitForFile(signal.started);
        if (target === "record") {
          await writeFile(
            externalConfirmationRecordPath(
              fixture.workdir,
              "fixture-external",
            ),
            "{}\n",
          );
        } else {
          const snapshot = Object.values(record.artifact_snapshots)[0];
          assert.ok(snapshot);
          await writeFile(
            runtimePath(fixture.workdir, snapshot.store_ref),
            "tampered after finalization evaluation\n",
          );
        }
        await writeFile(signal.release, "release\n");

        const final = await finalProcess;
        assert.notEqual(final.exitCode, 0);
        const receipt = JSON.parse(final.stdout);
        assert.equal(receipt.workflow_status, "needs_work");
        assert.notEqual(receipt.workflow_status, "delivery_accepted");
        assert.ok(
          receipt.findings.some((finding) =>
            finding.code.startsWith("finalization_"),
          ),
          JSON.stringify(receipt.findings),
        );
        assert.equal(
          await pathExists(await activeRecordPath(fixture.root)),
          true,
        );
      } finally {
        await rm(signal.folder, { recursive: true, force: true });
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
});

test("External submit cannot interleave with Finalization and succeeds after lock release", async () => {
  const fixture = await externalFixture();
  const signal = await finalizationSignal("after_finalization_evaluation");
  try {
    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
    ]);
    const recordPath = await writeSubmissionRecord(
      fixture,
      "submit-vs-finalize.json",
      await buildPassingRecord(fixture, prepared),
    );
    const finalProcess = runCliProcess(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { env: finalizationSignalEnvironment(signal) },
    );
    await waitForFile(signal.started);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "external",
        "submit",
        fixture.workdir,
        "--confirmation",
        "fixture-external",
        "--record",
        recordPath,
      ]),
      /lock_unavailable/u,
    );
    await writeFile(signal.release, "release\n");
    const final = await finalProcess;
    assert.notEqual(final.exitCode, 0);
    assert.equal(JSON.parse(final.stdout).workflow_status, "blocked_external");
    assert.equal(await pathExists(await activeRecordPath(fixture.root)), true);

    const submitted = await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      recordPath,
    ]);
    assert.equal(submitted.state, "fulfilled");
  } finally {
    await rm(signal.folder, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("revoke after Final Integrity serializes and invalidates the accepted audit Receipt", async () => {
  const fixture = await externalFixture();
  const signal = await finalizationSignal("after_finalization_evaluation");
  try {
    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
    ]);
    await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      await writeSubmissionRecord(
        fixture,
        "revoke-vs-finalize.json",
        await buildPassingRecord(fixture, prepared),
      ),
    ]);
    const finalProcess = runCliProcess(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { env: finalizationSignalEnvironment(signal) },
    );
    await waitForFile(signal.started);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "external",
        "revoke",
        fixture.workdir,
        "--confirmation",
        "fixture-external",
      ]),
      /lock_unavailable/u,
    );
    await writeFile(signal.release, "release\n");
    const final = await finalProcess;
    assert.equal(final.exitCode, 0, final.stderr);
    assert.equal(JSON.parse(final.stdout).workflow_status, "delivery_accepted");

    await runCli(fixture.root, [
      "long-task",
      "external",
      "revoke",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.final_result, "last_gate_inputs_stale");
    assert.equal(status.final_workflow_status, null);
    assert.equal(await pathExists(await activeRecordPath(fixture.root)), true);
  } finally {
    await rm(signal.folder, { recursive: true, force: true });
    await rm(fixture.root, { recursive: true, force: true });
  }
});
