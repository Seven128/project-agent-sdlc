import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
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
import {
  FIXTURE_EXTERNAL_FACT_SPECS,
  fixtureExternalFactSpecs,
  fixtureSourceStatements,
} from "./long-task-semantic-manifest-fixture.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages/ty-context/dist/cli.js");

export async function externalFixture(options = {}) {
  const fixture = await createDeliveryFixture({
    externalConfirmation: true,
    externalConfirmationCount: options.batching ? 4 : 1,
    twoOutcomes: Boolean(options.twoOutcomes),
    fixtureSeedRoot: options.fixtureSeedRoot,
  });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyRef = "project_context/authorities/fixture-product-owner.pub";
  await mkdir(path.join(fixture.root, "project_context", "authorities"), {
    recursive: true,
  });
  await writeFile(
    path.join(fixture.root, ...publicKeyRef.split("/")),
    publicKey.export({ type: "spki", format: "pem" }),
  );
  fixture.externalSigningKey = privateKey;
  fixture.externalPublicKeyRef = publicKeyRef;
  fixture.externalKeyId = "fixture-product-owner-2026";
  fixture.contract.task.target_profile.completion_authority =
    "declared_authorities";
  const check = fixture.contract.outcomes[0].acceptance.checks[0];
  const externalFactSpecs = fixtureExternalFactSpecs({
    externalConfirmation: true,
    externalConfirmationCount: options.batching ? 4 : 1,
    twoOutcomes: Boolean(options.twoOutcomes),
  });
  fixture.contract.global.acceptance.external_confirmations = options.batching
    ? batchingExternalConfirmations(check, fixture)
    : [
        externalDeclaration(check, fixture, {
          additionalFactSpecs: externalFactSpecs.filter(
            (spec) => spec.outcomeKey !== "first",
          ),
        }),
      ];
  await options.configureExternal?.(fixture, check);
  await writeContract(fixture.workdir, fixture.contract);
  await options.beforeCompile?.(fixture);
  await runCli(fixture.root, ["enable", "long-task"]);
  await options.afterEnableBeforeCompile?.(fixture);
  await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
  await commitCandidate(fixture.root);
  return fixture;
}

export function externalDeclaration(
  check,
  identity,
  {
    externalSpec = FIXTURE_EXTERNAL_FACT_SPECS[0],
    additionalFactSpecs = [],
    key = externalSpec.confirmationKey,
    owner = "release-owner",
    actorId = "fixture-product-owner",
    actorRole = "product acceptance owner",
    claimRef = `${externalSpec.outcomeKey}.semantic_fact.${externalSpec.factKey}`,
    obligationKey = "confirm-external-acceptance",
    applicabilityRef = `${externalSpec.outcomeKey}-root-success`,
    factRef = claimRef ===
    `${externalSpec.outcomeKey}.semantic_fact.${externalSpec.factKey}`
      ? externalSpec.factKey
      : null,
    proofRef = factRef === externalSpec.factKey ? externalSpec.proofKey : null,
    method = "exact_value",
    proofSurface = "runtime_behavior",
    environmentIdentity = "fixture-external-environment-v1",
    evidenceKey = "observation-capture",
    evidenceStatement = "Capture the observed target result for this obligation.",
    capabilities = factRef ? ["semantic_fact"] : [],
    expectedAuthorityRef = null,
    resultKind = factRef ? "actual" : "judgment",
  } = {},
) {
  const primaryObligation = {
    key: obligationKey,
    claim_ref: claimRef,
    applicability_ref: applicabilityRef,
    fact_ref: factRef,
    proof_ref: proofRef,
    method,
    proof_surface: proofSurface,
    evidence_capabilities: capabilities,
    expected_authority_ref:
      expectedAuthorityRef ??
      (proofRef ? `semantic-proof:${proofRef}` : `contract-claim:${claimRef}`),
    result_kind: resultKind,
    ...(resultKind === "judgment"
      ? {
          judgment_basis: {
            kind: "authorization",
            source_ref: externalSpec.sourceKey,
          },
        }
      : {}),
  };
  const additionalObligations = additionalFactSpecs.map((spec) => ({
    key: `${obligationKey}-${spec.outcomeKey}`,
    claim_ref: `${spec.outcomeKey}.semantic_fact.${spec.factKey}`,
    applicability_ref: `${spec.outcomeKey}-root-success`,
    fact_ref: spec.factKey,
    proof_ref: spec.proofKey,
    method: "exact_value",
    proof_surface: "runtime_behavior",
    evidence_capabilities: ["semantic_fact"],
    expected_authority_ref: `semantic-proof:${spec.proofKey}`,
    result_kind: "actual",
  }));
  return {
    key,
    description:
      fixtureSourceStatements[externalSpec.sourceKey] ??
      `Confirm ${claimRef} on the real target.`,
    owner,
    kind: "field_validation",
    impact_claims: [
      claimRef,
      ...additionalObligations.map((obligation) => obligation.claim_ref),
    ],
    blocks_target: true,
    actor: {
      id: actorId,
      role: actorRole,
      authority_kind: "human",
      identity_assurance: {
        scheme: "ed25519",
        key_id: identity.externalKeyId,
        public_key_ref: identity.externalPublicKeyRef,
      },
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
    obligations: [primaryObligation, ...additionalObligations],
  };
}

export function batchingExternalConfirmations(check, identity) {
  const [base, compatible, owner, environment] = FIXTURE_EXTERNAL_FACT_SPECS;
  return [
    externalDeclaration(check, identity, { externalSpec: base }),
    externalDeclaration(check, identity, {
      externalSpec: compatible,
      obligationKey: "confirm-external-compatibility",
    }),
    externalDeclaration(check, identity, {
      externalSpec: owner,
      owner: "architecture-owner",
      actorId: "fixture-architecture-owner",
      actorRole: "architecture acceptance owner",
      obligationKey: "confirm-external-architecture",
    }),
    externalDeclaration(check, identity, {
      externalSpec: environment,
      obligationKey: "confirm-external-environment",
      environmentIdentity: "fixture-external-environment-v2",
      evidenceKey: "visual-capture",
      evidenceStatement: "Capture the target result in the second environment.",
    }),
  ];
}
