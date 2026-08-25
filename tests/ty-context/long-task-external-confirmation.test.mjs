import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

import "./long-task-external-confirmation-record.cases.mjs";
import "./long-task-external-confirmation-freshness.cases.mjs";
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
  runCliProcess,
  waitForFile,
} from "./long-task-external-confirmation-race-fixture.mjs";

test("[critical:external-fulfillment-current-authority] fresh exact per-obligation record closes through delivery_accepted", async () => {
  const fixture = await externalFixture();
  try {
    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const repeatedPreparation = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    assert.equal(
      repeatedPreparation.confirmations[0].challenge,
      prepared.confirmations[0].challenge,
    );
    let passingRecord = await buildPassingRecord(fixture, prepared);

    for (const scenario of invalidRecordMutations()) {
      const record = structuredClone(passingRecord);
      scenario.mutate(record);
      if (scenario.rehash) resignRecord(record, fixture);
      const recordPath = await writeSubmissionRecord(
        fixture,
        `invalid-${scenario.name}.json`,
        record,
      );
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
        scenario.expected,
        scenario.name,
      );
    }

    for (const verdict of ["failed", "unable"]) {
      const currentPreparation = await runCli(fixture.root, [
        "long-task",
        "external",
        "prepare",
        fixture.workdir,
        "--confirmation",
        "fixture-external",
      ]);
      const honest = await buildPassingRecord(fixture, currentPreparation);
      honest.results[0].verdict = verdict;
      honest.results[0].rationale =
        verdict === "failed"
          ? "The declared actor observed a mismatch."
          : "The declared actor could not complete this exact observation.";
      resignRecord(honest, fixture);
      const submitted = await runCliFailure(fixture.root, [
        "long-task",
        "external",
        "submit",
        fixture.workdir,
        "--confirmation",
        "fixture-external",
        "--record",
        await writeSubmissionRecord(fixture, `${verdict}-record.json`, honest),
      ]);
      assert.equal(submitted.state, verdict);
      await assert.rejects(
        runCli(fixture.root, ["long-task", "close", fixture.workdir]),
        /close_live_final_gate_failed:needs_work/u,
      );
      await runCli(fixture.root, [
        "long-task",
        "external",
        "revoke",
        fixture.workdir,
        "--confirmation",
        "fixture-external",
      ]);
    }

    passingRecord = await buildPassingRecord(
      fixture,
      await runCli(fixture.root, [
        "long-task",
        "external",
        "prepare",
        fixture.workdir,
        "--confirmation",
        "fixture-external",
      ]),
    );

    const recordPath = await writeSubmissionRecord(
      fixture,
      "passing-record.json",
      passingRecord,
    );
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
    assert.equal(
      submitted.actor_identity_assurance,
      "ed25519_verified",
    );
    assert.equal(submitted.signature_verified, true);
    assert.equal(submitted.challenge_current, true);
    assert.equal(submitted.artifact_snapshot_integrity, true);

    const mutableEvidenceRef = passingRecord.results[0].evidence_refs[0];
    await writeFile(
      path.join(fixture.root, ...mutableEvidenceRef.split("/")),
      "mutated after authenticated submission\n",
    );

    const status = await runCli(fixture.root, [
      "long-task",
      "external",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.confirmations[0].state, "fulfilled");
    assert.equal(
      status.confirmations[0].artifact_snapshot_integrity,
      true,
    );

    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ], { skipCandidateCommit: true });
    assert.equal(accepted.workflow_status, "delivery_accepted");
    await runCli(fixture.root, [
      "long-task",
      "external",
      "revoke",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const revokedStatus = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(revokedStatus.final_result, "last_gate_inputs_stale");
    assert.equal(revokedStatus.final_workflow_status, null);
    assert.equal(revokedStatus.target_state, "not_accepted");
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
      /challenge_not_current/u,
    );
    const rotated = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const refreshedRecord = await buildPassingRecord(fixture, rotated);
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
        "refreshed-passing-record.json",
        refreshedRecord,
      ),
    ]);

    const closed = await runCli(fixture.root, [
      "long-task",
      "close",
      fixture.workdir,
    ]);
    assert.equal(closed.workflow_status, "delivery_accepted");
    assert.equal(closed.acceptance_scope, "declared_delivery_authority");
    assert.equal(closed.closed_scope, "complete_long_task_authority");
    assert.equal(closed.external_confirmation_results[0].state, "fulfilled");
    assert.equal(closed.native_goal_effect, "none");
    assert.equal(await pathExists(await activeRecordPath(fixture.root)), false);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
