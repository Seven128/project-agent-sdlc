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
import { activeRecordPath } from "../../packages/ty-context/dist/lib/long-task-state.js";
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
  installSlowOracle,
  raceSignal,
  removeTemporary,
  runCliProcess,
  waitForFile,
} from "./long-task-external-confirmation-race-fixture.mjs";

test("relevant changes stale a record while soundly unrelated changes preserve it", async () => {
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
    const preserved = await runCli(fixture.root, [
      "long-task",
      "external",
      "status",
      fixture.workdir,
    ]);
    assert.equal(preserved.confirmations[0].state, "fulfilled");
    assert.equal(
      preserved.confirmations[0].carried_forward_from_candidate,
      true,
    );

    const statePath = path.join(fixture.root, "src", "state.json");
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.external_relevant_change = true;
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
    await commitCandidate(fixture.root);
    const stale = await runCli(fixture.root, [
      "long-task",
      "external",
      "status",
      fixture.workdir,
    ]);
    assert.equal(stale.confirmations[0].state, "stale");
    assert.ok(
      stale.confirmations[0].issues.includes("relevant_input_identity_stale"),
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
    await waitForFile(signal.started);
    await writeFile(
      externalConfirmationRecordPath(fixture.workdir, "fixture-external"),
      "{}\n",
    );
    await writeFile(signal.release, "release\n");

    const final = await finalProcess;
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
