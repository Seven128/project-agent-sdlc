import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, sign } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  externalConfirmationRecordV2Hash,
  externalConfirmationV2SignablePayload,
  parseExternalConfirmationRecordV2,
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

export async function buildPassingRecord(fixture, prepared, options = {}) {
  const evidenceRelative = path
    .relative(
      fixture.root,
      path.join(fixture.workdir, ".ty-context", "evidence", "observed.txt"),
    )
    .replaceAll("\\", "/");
  const evidencePath = path.join(fixture.root, ...evidenceRelative.split("/"));
  await mkdir(path.dirname(evidencePath), { recursive: true });
  const evidence = Buffer.from(
    options.evidenceText ?? "fixture externally observed\n",
    "utf8",
  );
  await writeFile(evidencePath, evidence);
  const timestamp = new Date().toISOString();
  const confirmation = prepared.confirmations[0];
  const evidenceSha256 = createHash("sha256").update(evidence).digest("hex");
  const record = {
    schema_version: "long-task-external-confirmation-record-v2",
    confirmation_ref: confirmation.confirmation_ref,
    compiled_identity: prepared.compiled_identity,
    authority_revision: prepared.authority_revision,
    candidate: prepared.candidate,
    challenge: confirmation.challenge,
    actor: confirmation.actor,
    session: {
      id: prepared.sessions[0].suggested_session_id,
      target_ref: confirmation.target_ref,
      environment_identity: confirmation.environment_identity,
      started_at: timestamp,
      completed_at: timestamp,
    },
    results: [
      {
        obligation_ref: confirmation.obligations[0].obligation_ref,
        fact_ref: confirmation.obligations[0].fact_ref,
        claim_ref: confirmation.obligations[0].claim_ref,
        applicability_ref: confirmation.obligations[0].applicability_ref,
        result_kind: confirmation.obligations[0].result_kind,
        verdict: "passed",
        evidence_refs: [evidenceRelative],
        rationale:
          options.rationale ??
          "The declared product acceptance owner observed the exact expected outcome.",
      },
    ],
    artifact_snapshots: {
      [evidenceRelative]: {
        sha256: evidenceSha256,
        size_bytes: evidence.length,
        media_type: "text/plain; charset=utf-8",
        store_ref: `external-confirmations/artifacts/${evidenceSha256}`,
      },
    },
    relevant_input_identity: confirmation.relevant_input_identity,
    attestation: {
      scheme: "ed25519",
      key_id: confirmation.identity_assurance.key_id,
      signature_base64: Buffer.alloc(64).toString("base64"),
    },
    record_sha256: "0".repeat(64),
  };
  resignRecord(record, fixture);
  return parseExternalConfirmationRecordV2(record);
}

export async function writeSubmissionRecord(fixture, name, record) {
  const recordPath = path.join(fixture.workdir, ".ty-context", name);
  await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`);
  return recordPath;
}

export function invalidRecordMutations() {
  return [
    {
      name: "missing-result",
      mutate: (record) => (record.results = []),
      rehash: true,
      expected: /results.*must not be empty/u,
    },
    {
      name: "extra-result",
      mutate: (record) =>
        record.results.push({
          ...structuredClone(record.results[0]),
          obligation_ref: "unexpected-obligation",
        }),
      rehash: true,
      expected: /obligation_result_set_mismatch/u,
    },
    {
      name: "wrong-actor",
      mutate: (record) => (record.actor.id = "undeclared-actor"),
      rehash: true,
      expected: /declared_actor_identity_mismatch/u,
    },
    {
      name: "wrong-target",
      mutate: (record) => (record.session.target_ref = "other-target"),
      rehash: true,
      expected: /target_ref_mismatch/u,
    },
    {
      name: "wrong-environment",
      mutate: (record) =>
        (record.session.environment_identity = "other-environment"),
      rehash: true,
      expected: /environment_identity_mismatch/u,
    },
    {
      name: "wrong-applicability",
      mutate: (record) =>
        (record.results[0].applicability_ref = "other-applicability"),
      rehash: true,
      expected: /obligation_identity_mismatch/u,
    },
    {
      name: "stale-authority",
      mutate: (record) => (record.authority_revision += 1),
      rehash: true,
      expected: /authority_revision_stale/u,
    },
    {
      name: "stale-candidate",
      mutate(record) {
        record.candidate.snapshot_sha256 = "0".repeat(64);
        record.relevant_input_identity = `whole:${"0".repeat(64)}`;
      },
      rehash: true,
      expected: /candidate_identity_stale|relevant_input_identity_stale/u,
    },
    {
      name: "stale-challenge",
      mutate: (record) => (record.challenge = "A".repeat(43)),
      rehash: true,
      expected: /challenge_not_current/u,
    },
    {
      name: "forged-signature",
      mutate: (record) => {
        const signature = Buffer.from(
          record.attestation.signature_base64,
          "base64",
        );
        signature[0] ^= 0xff;
        record.attestation.signature_base64 = signature.toString("base64");
      },
      rehash: false,
      expected: /attestation_signature_invalid/u,
    },
    {
      name: "bad-artifact",
      mutate: (record) =>
        (record.artifact_snapshots[record.results[0].evidence_refs[0]].sha256 =
          "0".repeat(64)),
      rehash: true,
      expected: /artifact_store_ref_mismatch|artifact_content_mismatch/u,
    },
    {
      name: "insufficient-evidence-set",
      mutate: (record) =>
        record.results[0].evidence_refs.push("evidence/missing.txt"),
      rehash: true,
      expected: /artifact_snapshot_set_mismatch/u,
    },
    {
      name: "bad-record-hash",
      mutate: (record) => (record.record_sha256 = "0".repeat(64)),
      rehash: false,
      expected: /record_sha256.*integrity mismatch/u,
    },
  ];
}

export function resignRecord(record, fixture) {
  record.record_sha256 = externalConfirmationRecordV2Hash(record);
  record.attestation.signature_base64 = sign(
    null,
    Buffer.from(externalConfirmationV2SignablePayload(record), "utf8"),
    fixture.externalSigningKey,
  ).toString("base64");
}
