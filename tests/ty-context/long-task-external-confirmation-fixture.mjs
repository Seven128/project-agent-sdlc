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

export async function externalFixture(options = {}) {
  const fixture = await createDeliveryFixture();
  fixture.contract.task.target_profile.completion_authority =
    "declared_authorities";
  const check = fixture.contract.outcomes[0].acceptance.checks[0];
  fixture.contract.global.acceptance.external_confirmations = options.batching
    ? batchingExternalConfirmations(check)
    : [externalDeclaration(check)];
  await writeContract(fixture.workdir, fixture.contract);
  await options.beforeCompile?.(fixture);
  await runCli(fixture.root, ["enable", "long-task"]);
  await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
  await commitCandidate(fixture.root);
  return fixture;
}

export function externalDeclaration(
  check,
  {
    key = "fixture-external",
    owner = "release-owner",
    actorId = "fixture-product-owner",
    actorRole = "product acceptance owner",
    claimRef = "first.requirement.observe-first",
    obligationKey = "confirm-observe-first",
    environmentIdentity = "fixture-external-environment-v1",
    evidenceKey = "observation-capture",
    evidenceStatement = "Capture the observed target result for this obligation.",
    capabilities = [],
  } = {},
) {
  return {
    key,
    description: `Confirm ${claimRef} on the real target.`,
    owner,
    kind: "field_validation",
    impact_claims: [claimRef],
    blocks_target: true,
    actor: {
      id: actorId,
      role: actorRole,
      authority_kind: "human",
    },
    target_ref: "fixture-app",
    environment_identity: environmentIdentity,
    scenario: structuredClone(check.scenario),
    evidence_requirements: [
      {
        key: evidenceKey,
        statement: evidenceStatement,
      },
    ],
    obligations: [
      {
        key: obligationKey,
        claim_ref: claimRef,
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "runtime_behavior",
        evidence_capabilities: capabilities,
        expected_authority_ref: `contract-claim:${claimRef}`,
        result_kind: "judgment",
      },
    ],
  };
}

export function batchingExternalConfirmations(check) {
  return [
    externalDeclaration(check),
    externalDeclaration(check, {
      key: "fixture-external-compatible",
      claimRef: "first.obligation.implement-first",
      obligationKey: "confirm-implement-first",
    }),
    externalDeclaration(check, {
      key: "fixture-external-owner",
      owner: "architecture-owner",
      actorId: "fixture-architecture-owner",
      actorRole: "architecture acceptance owner",
      claimRef: "first.obligation.architecture-first",
      obligationKey: "confirm-architecture-first",
    }),
    externalDeclaration(check, {
      key: "fixture-external-environment",
      claimRef: "first.result",
      obligationKey: "confirm-result",
      environmentIdentity: "fixture-external-environment-v2",
      evidenceKey: "visual-capture",
      evidenceStatement: "Capture the target result in the second environment.",
      capabilities: ["target_runtime"],
    }),
  ];
}
