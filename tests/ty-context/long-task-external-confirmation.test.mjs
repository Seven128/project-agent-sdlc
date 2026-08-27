import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
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

async function addFixtureProcessObservation(root, observationRef) {
  const oraclePath = path.join(root, "tests", "oracle.mjs");
  const oracle = await readFile(oraclePath, "utf8");
  const marker = '  [assertion(key + "-liveness")]: true,\n';
  assert.ok(oracle.includes(marker));
  await writeFile(
    oraclePath,
    oracle.replace(
      marker,
      `${marker}  ...(key === "first" ? { ${JSON.stringify(observationRef)}: true } : {}),\n`,
    ),
  );
}

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
  removeTemporary,
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
      if (verdict === "failed") honest.results[0].actual = false;
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
    assert.equal(submitted.actor_identity_assurance, "ed25519_verified");
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
    assert.equal(status.confirmations[0].artifact_snapshot_integrity, true);

    const accepted = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
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
    await removeTemporary(fixture.root);
  }
});

test("objective Contract Claim External Actual is Harness-recomputed and cannot be replaced by Judgment", async () => {
  const claimRef = "first.requirement.observe-first";
  const fixture = await externalFixture({
    configureExternal(currentFixture, check) {
      const assertion = check.positive_assertions.find(
        (candidate) =>
          candidate.claims.length === 1 &&
          candidate.claims[0] === "requirement.observe-first",
      );
      assert.ok(assertion);
      assertion.evidence_capabilities = [
        ...new Set([
          ...assertion.evidence_capabilities,
          "design_conformance",
          "visual_render",
        ]),
      ];
      const confirmation =
        currentFixture.contract.global.acceptance.external_confirmations[0];
      confirmation.impact_claims.push(claimRef);
      confirmation.obligations.push({
        key: "confirm-objective-contract-claim-actual",
        claim_ref: claimRef,
        applicability_ref: assertion.applicability_ref,
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: check.proof_surface,
        evidence_capabilities: [],
        expected_authority_ref: `contract-claim:${claimRef}`,
        result_kind: "actual",
      });
    },
    async beforeCompile(currentFixture) {
      const oraclePath = path.join(currentFixture.root, "tests", "oracle.mjs");
      const source = await readFile(oraclePath, "utf8");
      const machineObservation =
        '  [assertion(key + "-requirement")]: observed,\n';
      assert.ok(source.includes(machineObservation));
      await writeFile(oraclePath, source.replace(machineObservation, ""));
    },
  });
  try {
    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const preparedObligation = prepared.confirmations[0].obligations.find(
      (obligation) =>
        obligation.claim_ref === claimRef && obligation.fact_ref === null,
    );
    assert.ok(preparedObligation);
    assert.equal(preparedObligation.result_kind, "actual");
    assert.equal(preparedObligation.expected.kind, "contract_claim_actual");
    assert.equal(
      preparedObligation.expected.located_value.kind,
      "compiled_assertion",
    );
    assert.equal(preparedObligation.expected.located_value.value, true);

    const passingRecord = await buildPassingRecord(fixture, prepared);
    const wrongActual = structuredClone(passingRecord);
    const wrongActualResult = wrongActual.results.find(
      (result) => result.claim_ref === claimRef && result.fact_ref === null,
    );
    assert.ok(wrongActualResult);
    wrongActualResult.actual = false;
    resignRecord(wrongActual, fixture);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "external",
        "submit",
        fixture.workdir,
        "--confirmation",
        "fixture-external",
        "--record",
        await writeSubmissionRecord(
          fixture,
          "wrong-objective-claim-actual.json",
          wrongActual,
        ),
      ]),
      /objective_verdict_mismatch/u,
    );

    const judgmentSubstitution = structuredClone(passingRecord);
    const judgmentResult = judgmentSubstitution.results.find(
      (result) => result.claim_ref === claimRef && result.fact_ref === null,
    );
    assert.ok(judgmentResult);
    judgmentResult.result_kind = "judgment";
    delete judgmentResult.actual;
    resignRecord(judgmentSubstitution, fixture);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "external",
        "submit",
        fixture.workdir,
        "--confirmation",
        "fixture-external",
        "--record",
        await writeSubmissionRecord(
          fixture,
          "objective-claim-judgment-substitution.json",
          judgmentSubstitution,
        ),
      ]),
      /result_kind_mismatch|objective_actual_missing/u,
    );

    const submitted = await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      await writeSubmissionRecord(
        fixture,
        "passing-objective-claim-actual.json",
        passingRecord,
      ),
    ]);
    assert.equal(submitted.state, "fulfilled");
    const accepted = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(accepted.workflow_status, "delivery_accepted");
  } finally {
    await removeTemporary(fixture.root);
  }
});

test("Machine-selected optional Claim keeps equivalent External advisory through Live Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const advisoryPublicKeyRef =
      "project_context/authorities/advisory-owner.pub";
    await mkdir(path.join(fixture.root, "project_context", "authorities"), {
      recursive: true,
    });
    await writeFile(
      path.join(fixture.root, ...advisoryPublicKeyRef.split("/")),
      publicKey.export({ type: "spki", format: "pem" }),
    );
    fixture.externalSigningKey = privateKey;
    fixture.contract.task.target_profile.completion_authority =
      "declared_authorities";
    const outcome = fixture.contract.outcomes[0];
    const machineCheck = outcome.acceptance.checks[0];
    const machineAssertion = machineCheck.positive_assertions.find(
      (candidate) => candidate.key === "first-result",
    );
    assert.ok(machineAssertion);
    const machineLiveness = machineCheck.positive_assertions.find(
      (candidate) => candidate.key === "first-liveness",
    );
    assert.ok(machineLiveness);
    machineAssertion.evidence_capabilities = ["target_runtime"];
    const externalCheck = {
      ...structuredClone(machineCheck),
      key: "first-result-data-advisory-check",
      proof_surface: "data_state",
      positive_assertions: [
        {
          ...structuredClone(machineAssertion),
          key: "first-result-data-advisory-assertion",
          evidence_capabilities: [
            "data_state",
            "design_conformance",
            "target_runtime",
            "visual_render",
          ],
        },
        structuredClone(machineLiveness),
      ],
      negative_assertions: [],
    };
    outcome.acceptance.checks.push(externalCheck);
    fixture.contract.global.acceptance.external_confirmations = [
      {
        key: "first-result-data-advisory",
        description:
          "Observe the exact first result on an advisory data surface.",
        owner: "release-owner",
        kind: "field_validation",
        impact_claims: ["first.result"],
        blocks_target: true,
        actor: {
          id: "fixture-product-owner",
          role: "product acceptance owner",
          authority_kind: "human",
          identity_assurance: {
            scheme: "ed25519",
            key_id: "advisory-owner-2026",
            public_key_ref: advisoryPublicKeyRef,
          },
        },
        target_ref: "fixture-app",
        environment_identity: "fixture-external-environment-v1",
        scenario: structuredClone(machineCheck.scenario),
        evidence_requirements: [
          {
            key: "data-result",
            statement: "Capture the exact first result on the data surface.",
          },
        ],
        obligations: [
          {
            key: "confirm-first-result-data-advisory",
            claim_ref: "first.result",
            applicability_ref: "first-root-success",
            fact_ref: null,
            proof_ref: null,
            method: "exact_value",
            proof_surface: "data_state",
            evidence_capabilities: ["target_runtime"],
            expected_authority_ref: "contract-claim:first.result",
            result_kind: "actual",
          },
        ],
      },
    ];
    await addFixtureProcessObservation(
      fixture.root,
      "assertion.first.first-result-data-advisory-check.first-liveness",
    );
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await commitCandidate(fixture.root);

    const accepted = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    ).catch((error) => {
      const receipt = JSON.parse(error.stdout);
      assert.fail(
        JSON.stringify({
          workflow_status: receipt.workflow_status,
          stage_results: receipt.stage_results,
          findings: receipt.findings,
          external_confirmation_results: receipt.external_confirmation_results,
        }),
      );
    });
    assert.equal(accepted.workflow_status, "machine_accepted");

    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
      "--confirmation",
      "first-result-data-advisory",
    ]);
    assert.equal(prepared.confirmations[0].obligations.length, 1);
    assert.equal(
      prepared.confirmations[0].obligations[0].completion_role,
      "advisory",
    );
    assert.equal(
      prepared.confirmations[0].obligations[0].acceptance_effect,
      "none",
    );
    const passingRecord = await buildPassingRecord(fixture, prepared);
    const submitted = await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "first-result-data-advisory",
      "--record",
      await writeSubmissionRecord(
        fixture,
        "passing-advisory-record.json",
        passingRecord,
      ),
    ]);
    assert.equal(submitted.blocks_target, false);
    assert.equal(submitted.state, "fulfilled");
    assert.equal(submitted.advisory_state, "fulfilled");
    const fulfilledAdvisory = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(fulfilledAdvisory.workflow_status, "machine_accepted");
    assert.notEqual(fulfilledAdvisory.workflow_status, "delivery_accepted");

    const invalidRecord = structuredClone(passingRecord);
    invalidRecord.results[0].result_kind = "judgment";
    delete invalidRecord.results[0].actual;
    resignRecord(invalidRecord, fixture);
    await writeFile(
      externalConfirmationRecordPath(
        fixture.workdir,
        "first-result-data-advisory",
      ),
      `${JSON.stringify(invalidRecord, null, 2)}\n`,
    );
    const invalidAdvisory = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(invalidAdvisory.workflow_status, "machine_accepted");
    assert.ok(
      invalidAdvisory.findings.some(
        (finding) => finding.code === "external_confirmation_advisory_invalid",
      ),
    );

    const staleRecord = structuredClone(passingRecord);
    staleRecord.authority_revision += 1;
    resignRecord(staleRecord, fixture);
    await writeFile(
      externalConfirmationRecordPath(
        fixture.workdir,
        "first-result-data-advisory",
      ),
      `${JSON.stringify(staleRecord, null, 2)}\n`,
    );
    const staleAdvisory = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(staleAdvisory.workflow_status, "machine_accepted");
    assert.ok(
      staleAdvisory.findings.some(
        (finding) => finding.code === "external_confirmation_advisory_stale",
      ),
    );
  } finally {
    await removeTemporary(fixture.root);
  }
});

test("mixed advisory and blocking obligations keep blocking role at obligation granularity", async () => {
  const fixture = await externalFixture({
    configureExternal(currentFixture, machineCheck) {
      const machineAssertion = machineCheck.positive_assertions.find(
        (candidate) => candidate.key === "first-result",
      );
      const machineLiveness = machineCheck.positive_assertions.find(
        (candidate) => candidate.key === "first-liveness",
      );
      assert.ok(machineAssertion);
      assert.ok(machineLiveness);
      machineAssertion.evidence_capabilities = ["target_runtime"];
      currentFixture.contract.outcomes[0].acceptance.checks.push({
        ...structuredClone(machineCheck),
        key: "mixed-result-data-advisory-check",
        proof_surface: "data_state",
        positive_assertions: [
          {
            ...structuredClone(machineAssertion),
            key: "mixed-result-data-advisory-assertion",
            evidence_capabilities: [
              "data_state",
              "design_conformance",
              "target_runtime",
              "visual_render",
            ],
          },
          structuredClone(machineLiveness),
        ],
        negative_assertions: [],
      });
      const confirmation =
        currentFixture.contract.global.acceptance.external_confirmations[0];
      confirmation.impact_claims.push("first.result");
      confirmation.obligations.push({
        key: "confirm-mixed-first-result-advisory",
        claim_ref: "first.result",
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "data_state",
        evidence_capabilities: ["target_runtime"],
        expected_authority_ref: "contract-claim:first.result",
        result_kind: "actual",
      });
    },
    async beforeCompile(currentFixture) {
      await addFixtureProcessObservation(
        currentFixture.root,
        "assertion.first.mixed-result-data-advisory-check.first-liveness",
      );
    },
  });
  try {
    const pending = await runCliFailure(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(pending.workflow_status, "blocked_external");
    assert.equal(pending.external_confirmation_results[0].blocks_target, true);
    assert.deepEqual(
      pending.external_confirmation_results[0]
        .effective_advisory_obligation_refs,
      ["confirm-mixed-first-result-advisory"],
    );
    assert.equal(
      pending.external_confirmation_results[0]
        .effective_blocking_obligation_refs.length,
      1,
    );

    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const roles = prepared.confirmations[0].obligations
      .map((obligation) => [
        obligation.obligation_ref,
        obligation.completion_role,
        obligation.acceptance_effect,
      ])
      .sort((left, right) => left[0].localeCompare(right[0]));
    assert.deepEqual(roles, [
      ["confirm-external-acceptance", "blocking", "required"],
      ["confirm-mixed-first-result-advisory", "advisory", "none"],
    ]);
    const record = await buildPassingRecord(fixture, prepared);
    const advisoryResult = record.results.find(
      (result) =>
        result.obligation_ref === "confirm-mixed-first-result-advisory",
    );
    assert.ok(advisoryResult);
    advisoryResult.actual = false;
    advisoryResult.verdict = "failed";
    resignRecord(record, fixture);
    const submitted = await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      await writeSubmissionRecord(
        fixture,
        "mixed-blocking-advisory-record.json",
        record,
      ),
    ]);
    assert.equal(submitted.blocks_target, true);
    assert.equal(submitted.state, "fulfilled");
    assert.equal(submitted.advisory_state, "failed");

    const accepted = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(accepted.workflow_status, "delivery_accepted");
    assert.ok(
      accepted.findings.some(
        (finding) => finding.code === "external_confirmation_advisory_failed",
      ),
    );
  } finally {
    await removeTemporary(fixture.root);
  }
});
