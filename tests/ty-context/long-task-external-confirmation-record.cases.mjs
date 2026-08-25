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

test("Record v1 is strict and cannot collapse obligations into an aggregate pass", () => {
  const timestamp = new Date().toISOString();
  const unsigned = {
    schema_version: "long-task-external-confirmation-record-v1",
    confirmation_ref: "fixture-external",
    compiled_identity: "a".repeat(64),
    authority_revision: 1,
    candidate: {
      git_head: "b".repeat(40),
      git_tree: "c".repeat(40),
      snapshot_sha256: "d".repeat(64),
    },
    actor: {
      id: "actor",
      role: "owner",
      authority_kind: "human",
    },
    session: {
      id: "session",
      target_ref: "fixture-app",
      environment_identity: "environment-v1",
      started_at: timestamp,
      completed_at: timestamp,
    },
    results: [
      {
        obligation_ref: "confirm-one",
        fact_ref: null,
        claim_ref: "first.requirement.observe-first",
        applicability_ref: "first-root-success",
        verdict: "passed",
        evidence_refs: ["evidence/one.txt"],
        rationale: "Authorized judgment.",
      },
    ],
    artifact_hashes: { "evidence/one.txt": "e".repeat(64) },
    relevant_input_identity: `whole:${"f".repeat(64)}`,
  };
  const record = signExternalConfirmationRecordV1(unsigned);
  assert.throws(
    () => parseExternalConfirmationRecordV1({ ...record, passed: true }),
    /unknown keys: passed/u,
  );
  assert.throws(
    () =>
      signExternalConfirmationRecordV1({
        ...unsigned,
        results: [unsigned.results[0], unsigned.results[0]],
      }),
    /must not contain duplicates/u,
  );
  assert.throws(
    () =>
      parseExternalConfirmationRecordV1({
        ...record,
        record_sha256: "0".repeat(64),
      }),
    /integrity mismatch/u,
  );
});

test("blocking external obligations remain pending and cannot clear Active Authority", async () => {
  const fixture = await externalFixture({ batching: true });
  try {
    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
    ]);
    assert.equal(prepared.confirmations.length, 4);
    assert.equal(prepared.sessions.length, 3);
    assert.ok(
      prepared.sessions.some(
        (session) =>
          session.confirmation_refs.join(",") ===
            "fixture-external,fixture-external-compatible" &&
          session.obligations.length === 2,
      ),
      JSON.stringify(prepared.sessions),
    );
    assert.ok(
      prepared.sessions.every(
        (session) =>
          new Set(session.obligations.map((row) => row.obligation_ref)).size ===
          session.obligations.length,
      ),
    );
    assert.equal(
      prepared.confirmations.find(
        (row) => row.confirmation_ref === "fixture-external",
      ).obligations[0].expected.statement,
      "The first outcome must be observable.",
    );
    assert.equal(
      prepared.actor_identity_boundary,
      "declared_identity_and_record_integrity_only_not_authentication",
    );

    const stop = await runCliFailure(fixture.root, [
      "long-task",
      "stop-check",
      fixture.workdir,
    ]);
    assert.equal(stop.continue, false);
    assert.equal(stop.workflow_status, "blocked_external");
    assert.equal(await pathExists(await activeRecordPath(fixture.root)), true);
  } finally {
    await removeTemporary(fixture.root);
  }
});
