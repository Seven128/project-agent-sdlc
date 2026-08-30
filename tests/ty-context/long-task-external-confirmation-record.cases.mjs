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
import * as externalConfirmationAttestation from "../../packages/ty-context/dist/lib/long-task-external-confirmation-attestation.js";
import * as externalConfirmationChallenge from "../../packages/ty-context/dist/lib/long-task-external-confirmation-challenge.js";
import * as externalConfirmationShape from "../../packages/ty-context/dist/lib/long-task-external-confirmation-shape.js";
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
import { FIXTURE_EXTERNAL_FACT_SPECS } from "./long-task-semantic-manifest-fixture.mjs";
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

test("blocking fulfillment has a closed authenticated V2 record owner", async () => {
  assert.equal(
    typeof externalConfirmationShape.parseExternalConfirmationRecordV2,
    "function",
  );
  assert.equal(
    typeof externalConfirmationShape.externalConfirmationV2SignablePayload,
    "function",
  );
  assert.equal(
    typeof externalConfirmationAttestation.verifyExternalConfirmationAttestation,
    "function",
  );
  assert.equal(
    typeof externalConfirmationChallenge.readOrCreateExternalConfirmationChallenge,
    "function",
  );
  assert.equal(
    typeof externalConfirmationChallenge.rotateExternalConfirmationChallenge,
    "function",
  );
});

test("Record v1 remains audit-readable but cannot fulfill a blocking obligation", async () => {
  const fixture = await externalFixture();
  try {
    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
    ]);
    const v2 = await buildPassingRecord(fixture, prepared);
    const legacy = signExternalConfirmationRecordV1({
      schema_version: "long-task-external-confirmation-record-v1",
      confirmation_ref: v2.confirmation_ref,
      compiled_identity: v2.compiled_identity,
      authority_revision: v2.authority_revision,
      candidate: v2.candidate,
      actor: v2.actor,
      session: v2.session,
      results: v2.results.map(({ result_kind: _kind, ...result }) => result),
      artifact_hashes: Object.fromEntries(
        Object.entries(v2.artifact_snapshots).map(([ref, snapshot]) => [
          ref,
          snapshot.sha256,
        ]),
      ),
      relevant_input_identity: v2.relevant_input_identity,
    });
    const submission = await writeSubmissionRecord(
      fixture,
      "legacy-record.json",
      legacy,
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
        submission,
      ]),
      /legacy_unattested/u,
    );
    await writeFile(
      externalConfirmationRecordPath(fixture.workdir, "fixture-external"),
      `${JSON.stringify(legacy, null, 2)}\n`,
    );
    const status = await runCli(fixture.root, [
      "long-task",
      "external",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.confirmations[0].state, "legacy_unattested");
    assert.equal(status.confirmations[0].signature_verified, false);
    const final = await runCliFailure(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(final.workflow_status, "needs_work");
    assert.notEqual(final.workflow_status, "delivery_accepted");
    assert.equal(await pathExists(await activeRecordPath(fixture.root)), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("tampering with a frozen artifact snapshot invalidates blocking fulfillment", async () => {
  const fixture = await externalFixture();
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
      await writeSubmissionRecord(fixture, "artifact-tamper.json", record),
    ]);
    const snapshot = Object.values(record.artifact_snapshots)[0];
    assert.ok(snapshot);
    await writeFile(
      runtimePath(fixture.workdir, snapshot.store_ref),
      "tampered immutable snapshot\n",
    );

    const status = await runCli(fixture.root, [
      "long-task",
      "external",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.confirmations[0].state, "stale");
    assert.equal(status.confirmations[0].artifact_snapshot_integrity, false);

    const final = await runCliFailure(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(final.workflow_status, "needs_work");
    assert.equal(await pathExists(await activeRecordPath(fixture.root)), true);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
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
    const firstExternalObligation = prepared.confirmations.find(
      (row) => row.confirmation_ref === "fixture-external",
    ).obligations[0];
    assert.equal(
      firstExternalObligation.fact_ref,
      FIXTURE_EXTERNAL_FACT_SPECS[0].factKey,
    );
    assert.equal(
      firstExternalObligation.proof_ref,
      FIXTURE_EXTERNAL_FACT_SPECS[0].proofKey,
    );
    assert.equal(firstExternalObligation.expected.kind, "semantic_fact");
    assert.equal(firstExternalObligation.expected.statement, null);
    assert.equal(firstExternalObligation.expected.located_value.value, true);
    assert.equal(
      prepared.actor_identity_boundary,
      "detached_ed25519_required_for_blocking_fulfillment",
    );
    assert.equal(prepared.acceptance_effect, "none");
    assert.equal(
      prepared.notice,
      "Preparation output does not establish acceptance.",
    );
    assert.ok(
      prepared.confirmations.every(
        (confirmation) =>
          confirmation.identity_assurance.scheme === "ed25519" &&
          confirmation.challenge.length === 43 &&
          /^[a-f0-9]{64}$/u.test(confirmation.signable_canonical_digest),
      ),
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
