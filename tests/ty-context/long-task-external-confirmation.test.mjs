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
import { executionTargetSourceStatement } from "../../packages/ty-context/dist/lib/long-task-source-target-index.js";
import { activeRecordPath } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  addProductionControlBinding,
  commitCandidate,
  completeControl,
  createDeliveryFixture,
  pathExists,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("../..", import.meta.url));
const cli = path.join(repository, "packages/ty-context/dist/cli.js");

async function addFixtureProcessObservation(
  root,
  observationRef,
  value = true,
) {
  const oraclePath = path.join(root, "tests", "oracle.mjs");
  const oracle = await readFile(oraclePath, "utf8");
  const marker = '  [assertion(key + "-liveness")]: true,\n';
  assert.ok(oracle.includes(marker));
  await writeFile(
    oraclePath,
    oracle.replace(
      marker,
      `${marker}  ...(key === "first" ? { ${JSON.stringify(observationRef)}: ${JSON.stringify(value)} } : {}),\n`,
    ),
  );
}

async function machineSelectedAdvisoryFixture(options = {}) {
  const fixture = await createDeliveryFixture({
    twoOutcomes: options.twoOutcomes === true,
  });
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const advisoryPublicKeyRef = "project_context/authorities/advisory-owner.pub";
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
  const additionalProcessObservations = [];
  const machineAssertion = machineCheck.positive_assertions.find(
    (candidate) => candidate.key === "first-result",
  );
  const machineLiveness = machineCheck.positive_assertions.find(
    (candidate) => candidate.key === "first-liveness",
  );
  assert.ok(machineAssertion);
  assert.ok(machineLiveness);
  machineAssertion.evidence_capabilities = ["target_runtime"];
  let advisoryRawNegativeAssertion = null;
  const removeDefaultStrictProof = () => {
    outcome.product.control_relation_closure = {
      state: "specified",
      statement:
        "The sole strict control has no cross-Control relation to declare.",
      applicability_refs: ["first-root-success"],
    };
    const relationAssertion = machineCheck.negative_assertions.find(
      (assertion) => assertion.key === "first-relations-na",
    );
    assert.ok(relationAssertion);
    machineCheck.positive_assertions.push({
      ...relationAssertion,
      criterion: outcome.product.control_relation_closure.statement,
      observation: "strict_relation_closure",
      expected: true,
    });
    additionalProcessObservations.push({
      ref: "strict_relation_closure",
      value: true,
    });
    machineCheck.negative_assertions = [];
    outcome.acceptance.counterfactual_controls =
      outcome.acceptance.counterfactual_controls.filter(
        (control) => control.key !== "make-first-relations-applicable",
      );
  };
  if (options.missingStrictProof) {
    fixture.contract.risk.requested_level = "strict";
    const strictControl = completeControl({
      key: "strict-control",
      surface: "fixture-main",
      region: "main",
      location: "root",
      control_type: "action",
      label_content: "Strict control",
      user_task: "Exercise the strict path",
      visibility: "visible",
      availability: "available",
      trigger: "activate",
      input: "none",
      validation: "exact",
      default_value: "ready",
      interaction: "activate once",
      navigation_result: "remain",
      loading_state: "loading",
      empty_state: "empty",
      success_state: "success",
      failure_state: "failure",
      recovery: "retry",
      permission: "allowed",
      feedback: "visible",
      accessibility: "named",
    });
    const strictPeer = structuredClone(strictControl);
    strictPeer.key = "strict-peer";
    outcome.product.controls.push(strictControl, strictPeer);
    addProductionControlBinding(fixture.contract, {
      controlKey: "strict-control",
      surfaceRef: "fixture-main",
      rootClaimRef: "control.strict-control.navigation_result",
    });
    addProductionControlBinding(fixture.contract, {
      controlKey: "strict-peer",
      surfaceRef: "fixture-main",
      rootClaimRef: "control.strict-peer.navigation_result",
    });
    outcome.product.control_relations = [
      {
        key: "strict-relation",
        statement:
          "The strict control and peer retain one exact declared relation.",
        control_refs: ["strict-control", "strict-peer"],
        required_proof_surfaces: ["runtime_behavior"],
        applicability_refs: ["first-root-success"],
      },
    ];
    machineCheck.positive_assertions.push({
      key: "strict-relation-proof",
      criterion: outcome.product.control_relations[0].statement,
      claims: ["control_relation.strict-relation"],
      applicability_ref: "first-root-success",
      observation: "strict_control_relation",
      evidence_capabilities: ["target_runtime"],
      operator: "equals",
      expected: true,
    });
    additionalProcessObservations.push({
      ref: "strict_control_relation",
      value: true,
    });
    const controlAssertions = machineCheck.positive_assertions.filter(
      (assertion) =>
        assertion.key.startsWith("strict-control-") ||
        assertion.key.startsWith("strict-peer-"),
    );
    additionalProcessObservations.push(
      ...controlAssertions.map((assertion) => ({
        ref: assertion.observation,
        value: assertion.expected,
      })),
    );
    const controlAssertionKeys = new Set(
      controlAssertions.map((assertion) => assertion.key),
    );
    for (const control of outcome.acceptance.counterfactual_controls) {
      control.claims = control.claims.filter(
        (claim) => !claim.startsWith("control.strict-control."),
      );
      control.expected_assertion_failures =
        control.expected_assertion_failures.filter(
          (assertionRef) => !controlAssertionKeys.has(assertionRef),
        );
      control.preserved_assertions = [
        ...new Set([...control.preserved_assertions, ...controlAssertionKeys]),
      ];
    }
    removeDefaultStrictProof();
  }
  if (options.advisoryRawNegative && !options.missingStrictProof) {
    fixture.contract.risk.requested_level = "strict";
    const relationAssertion = machineCheck.negative_assertions.find(
      (assertion) => assertion.key === "first-relations-na",
    );
    assert.ok(relationAssertion);
    advisoryRawNegativeAssertion = {
      ...structuredClone(relationAssertion),
      key: "advisory-control-relation-negative",
      evidence_capabilities: ["data_state"],
    };
    machineCheck.negative_assertions = machineCheck.negative_assertions.filter(
      (assertion) => assertion.key !== relationAssertion.key,
    );
    outcome.acceptance.counterfactual_controls =
      outcome.acceptance.counterfactual_controls.filter(
        (control) => control.key !== "make-first-relations-applicable",
      );
  }
  const advisoryCheck = {
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
  outcome.acceptance.checks.push(advisoryCheck);
  if (options.advisoryStageGateOnly) {
    machineCheck.journey_roles = ["success"];
    advisoryCheck.journey_roles = ["success", "stage_gate"];
  }
  if (options.advisoryRawNegative) {
    assert.ok(advisoryRawNegativeAssertion);
    advisoryCheck.negative_assertions.push(advisoryRawNegativeAssertion);
  }
  if (options.advisoryRawConformance) {
    fixture.contract.risk.facts.weak_observability = ["first"];
    const conformanceCheck = {
      ...structuredClone(machineCheck),
      key: "advisory-global-conformance",
      journey_roles: ["conformance"],
      positive_assertions: [
        {
          ...structuredClone(machineLiveness),
          key: "advisory-global-conformance-liveness",
          claims: [],
        },
      ],
      negative_assertions: [],
    };
    conformanceCheck.runner.effect = "read_only";
    fixture.contract.global.acceptance.checks.push(conformanceCheck);
  }
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
  if (advisoryRawNegativeAssertion) {
    const confirmation =
      fixture.contract.global.acceptance.external_confirmations[0];
    confirmation.impact_claims.push("first.control_relation_closure");
    confirmation.obligations.push({
      key: "confirm-first-control-relation-negative",
      claim_ref: "first.control_relation_closure",
      applicability_ref: "first-root-success",
      fact_ref: null,
      proof_ref: null,
      method: "exact_value",
      proof_surface: "data_state",
      evidence_capabilities: ["data_state"],
      expected_authority_ref:
        "contract-claim:first.control_relation_closure",
      result_kind: "actual",
    });
  }
  if (options.missingSecondRequiredTarget) {
    const secondTarget = {
      ...structuredClone(fixture.contract.task.execution_targets[0]),
      key: "fixture-secondary",
      description: "The second required product root.",
    };
    fixture.contract.task.execution_targets.push(secondTarget);
    fixture.contract.task.target_profile.required_target_refs.push(
      secondTarget.key,
    );
    fixture.contract.risk.facts.critical_user_path = ["first"];
    const sourceKey = "fixture-secondary-execution-target";
    const statement = executionTargetSourceStatement(secondTarget);
    fixture.contract.source_claims.push({
      key: sourceKey,
      source_ref: "source.md#fixture-source",
      statement,
      disposition: {
        type: "claim",
        refs: [`execution_target.${secondTarget.key}`],
      },
    });
    const sourcePath = path.join(fixture.root, "source.md");
    const source = await readFile(sourcePath, "utf8");
    await writeFile(
      sourcePath,
      `${source.trimEnd()}\n\n<!-- ty-source-item:start key=${sourceKey} kind=technical_obligation aspect=architecture -->\n${statement}\n<!-- ty-source-item:end -->\n`,
    );
  }
  await addFixtureProcessObservation(
    fixture.root,
    "assertion.first.first-result-data-advisory-check.first-liveness",
  );
  for (const observation of additionalProcessObservations)
    await addFixtureProcessObservation(
      fixture.root,
      observation.ref,
      observation.value,
    );
  await writeContract(fixture.workdir, fixture.contract);
  await runCli(fixture.root, ["enable", "long-task"]);
  return fixture;
}

async function rawCliOutcome(cwd, args) {
  try {
    const result = await exec(process.execPath, [cli, ...args], {
      cwd,
      windowsHide: true,
    });
    return { ok: true, value: JSON.parse(result.stdout) };
  } catch (error) {
    let value = null;
    try {
      value = JSON.parse(error.stdout);
    } catch {}
    return {
      ok: false,
      value,
      message: `${error.message}\n${error.stdout ?? ""}\n${error.stderr ?? ""}`,
    };
  }
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

for (const scenario of [
  {
    name: "missing second required target proof",
    options: { missingSecondRequiredTarget: true },
    expected:
      /(?:critical_path|stage_gate)_required_target_proof_missing:first:fixture-secondary/u,
  },
  {
    name: "missing strict negative proof",
    options: { missingStrictProof: true },
    expected: /strict_negative_assertion_required:first/u,
    compile_expected: /delivery_contract_invalid:/u,
  },
])
  test(`raw blocks_target cannot hide ${scenario.name} from Preflight, Compile, or Final Gate`, async () => {
    const fixture = await machineSelectedAdvisoryFixture(scenario.options);
    try {
      const preflight = await rawCliOutcome(fixture.root, [
        "long-task",
        "preflight",
        fixture.workdir,
      ]);
      const compile = await rawCliOutcome(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
      ]);
      let final = null;
      if (compile.ok) {
        await commitCandidate(fixture.root);
        final = await rawCliOutcome(fixture.root, [
          "long-task",
          "final-gate",
          fixture.workdir,
        ]);
      }
      assert.notEqual(
        final?.value?.workflow_status,
        "machine_accepted",
        JSON.stringify(final?.value),
      );
      assert.equal(preflight.ok, false, JSON.stringify(preflight.value));
      assert.match(
        JSON.stringify(preflight.value ?? preflight.message),
        scenario.expected,
      );
      assert.equal(compile.ok, false, JSON.stringify(compile.value));
      assert.match(
        JSON.stringify(compile.value ?? compile.message),
        scenario.compile_expected ?? scenario.expected,
      );
    } finally {
      await removeTemporary(fixture.root);
    }
  });

for (const scenario of [
  {
    name: "stage_gate role",
    options: { advisoryStageGateOnly: true },
    expected: /stage_gate_target_runtime_result_required:first:first/u,
  },
  {
    name: "strict negative Assertion",
    options: { advisoryRawNegative: true },
    expected: /strict_negative_assertion_required:first/u,
  },
  {
    name: "global conformance role",
    options: { twoOutcomes: true, advisoryRawConformance: true },
    expected:
      /conformance_target_runtime_evidence_required:advisory-global-conformance/u,
  },
])
  test(`an effective advisory raw ${scenario.name} cannot supply Machine completion policy`, async () => {
    const fixture = await machineSelectedAdvisoryFixture(scenario.options);
    try {
      const preflight = await rawCliOutcome(fixture.root, [
        "long-task",
        "preflight",
        fixture.workdir,
      ]);
      const compile = await rawCliOutcome(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
      ]);
      assert.equal(preflight.ok, false, JSON.stringify(preflight.value));
      assert.equal(compile.ok, false, JSON.stringify(compile.value));
      assert.match(
        JSON.stringify(preflight.value ?? preflight.message),
        scenario.expected,
      );
      assert.match(
        JSON.stringify(compile.value ?? compile.message),
        scenario.expected,
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

    await runCli(fixture.root, [
      "long-task",
      "external",
      "revoke",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const artifactPrepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const artifactRecord = await buildPassingRecord(fixture, artifactPrepared);
    const advisoryArtifactResult = artifactRecord.results.find(
      (result) =>
        result.obligation_ref === "confirm-mixed-first-result-advisory",
    );
    assert.ok(advisoryArtifactResult);
    const advisoryEvidenceRelative = path
      .relative(
        fixture.root,
        path.join(
          fixture.workdir,
          ".ty-context",
          "evidence",
          "advisory-only.txt",
        ),
      )
      .replaceAll("\\", "/");
    const advisoryEvidence = Buffer.from(
      "fixture advisory-only evidence\n",
      "utf8",
    );
    await writeFile(
      path.join(fixture.root, ...advisoryEvidenceRelative.split("/")),
      advisoryEvidence,
    );
    const advisoryEvidenceSha256 = createHash("sha256")
      .update(advisoryEvidence)
      .digest("hex");
    advisoryArtifactResult.evidence_refs = [advisoryEvidenceRelative];
    artifactRecord.artifact_snapshots[advisoryEvidenceRelative] = {
      sha256: advisoryEvidenceSha256,
      size_bytes: advisoryEvidence.length,
      media_type: "text/plain; charset=utf-8",
      store_ref: `external-confirmations/artifacts/${advisoryEvidenceSha256}`,
    };
    resignRecord(artifactRecord, fixture);
    const artifactSubmitted = await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      await writeSubmissionRecord(
        fixture,
        "mixed-role-scoped-artifact-record.json",
        artifactRecord,
      ),
    ]);
    assert.equal(artifactSubmitted.state, "fulfilled");
    assert.equal(artifactSubmitted.advisory_state, "fulfilled");

    const mismatchedRecord = structuredClone(artifactRecord);
    const mismatchedAdvisoryResult = mismatchedRecord.results.find(
      (result) =>
        result.obligation_ref === "confirm-mixed-first-result-advisory",
    );
    assert.ok(mismatchedAdvisoryResult);
    mismatchedAdvisoryResult.evidence_refs = [
      `${advisoryEvidenceRelative}.missing`,
    ];
    delete mismatchedRecord.artifact_snapshots[advisoryEvidenceRelative];
    resignRecord(mismatchedRecord, fixture);
    await writeFile(
      externalConfirmationRecordPath(fixture.workdir, "fixture-external"),
      `${JSON.stringify(mismatchedRecord, null, 2)}\n`,
    );
    const mismatchedAdvisory = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(mismatchedAdvisory.workflow_status, "delivery_accepted");
    assert.ok(
      mismatchedAdvisory.findings.some(
        (finding) => finding.code === "external_confirmation_advisory_invalid",
      ),
    );

    await writeFile(
      externalConfirmationRecordPath(fixture.workdir, "fixture-external"),
      `${JSON.stringify(artifactRecord, null, 2)}\n`,
    );
    const advisoryArtifactPath = path.join(
      fixture.workdir,
      ".ty-context",
      ...artifactRecord.artifact_snapshots[
        advisoryEvidenceRelative
      ].store_ref.split("/"),
    );
    await writeFile(advisoryArtifactPath, "tampered advisory evidence\n");
    const staleAdvisory = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(staleAdvisory.workflow_status, "delivery_accepted");
    assert.ok(
      staleAdvisory.findings.some(
        (finding) => finding.code === "external_confirmation_advisory_stale",
      ),
    );

    await rm(advisoryArtifactPath);
    const missingAdvisory = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(missingAdvisory.workflow_status, "delivery_accepted");
    assert.ok(
      missingAdvisory.findings.some(
        (finding) => finding.code === "external_confirmation_advisory_invalid",
      ),
    );
  } finally {
    await removeTemporary(fixture.root);
  }
});
