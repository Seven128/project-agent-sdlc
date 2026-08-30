import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { externalConfirmationRecordV2Hash } from "../../packages/ty-context/dist/index.js";
import { activeRecordPath } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  FIXTURE_EXTERNAL_PUBLIC_KEY_REF,
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  readState,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  externalDeclaration,
  externalFixture,
} from "./long-task-external-confirmation-fixture.mjs";
import {
  buildPassingRecord,
  writeSubmissionRecord,
} from "./long-task-external-confirmation-record-fixture.mjs";
import { FIXTURE_LEGACY_ORACLE_PATH } from "./long-task-package-machine-fixture.mjs";

const incidentCatalogUrl = new URL(
  "./fixtures/long-task-complete-delivery-incidents.json",
  import.meta.url,
);

export async function loadCompleteDeliveryIncidentCatalog() {
  return JSON.parse(await readFile(incidentCatalogUrl, "utf8"));
}

export function assertControlledIncidentCatalog(catalog) {
  assert.equal(
    catalog.schema_version,
    "long-task-complete-delivery-incidents-v1",
  );
  assert.deepEqual(catalog.authority_boundary, {
    source_status: "controlled_sanitized_equivalent",
    original_public_material: "unavailable",
    original_to_sanitized_mapping: "unavailable",
    authorization: "unavailable",
    representativeness: "not_established",
    allowed_use: [
      "mechanism_black_box_replay",
      "false_acceptance_regression",
      "must_allow_regression",
    ],
    prohibited_claims: [
      "original_incident_reproduction",
      "authorized_incident_evidence",
      "representative_incident_measurement",
      "real_incident_roi_evidence",
    ],
  });
  assert.deepEqual(
    catalog.scenarios.map((scenario) => scenario.key),
    [
      "starward-sanitized",
      "backend-persistence-identity",
      "cli-provider-identity",
    ],
  );
  const starward = scenarioByKey(catalog, "starward-sanitized");
  assert.deepEqual(
    starward.historical_bad_candidate.defects.map((defect) => defect.key),
    [
      "fake-data",
      "wrong-provider-api",
      "missing-real-data-chain",
      "dead-primary-control",
      "ui-ux-drift",
      "broad-acceptance-pass",
    ],
  );
  assert.deepEqual(Object.keys(starward.selected_design_snapshot.surfaces), [
    "map",
    "detail",
    "night-sky",
    "profile",
  ]);
  assert.equal(starward.product_technical_plan.length, 4);
  assert.equal(
    starward.wrong_contract_projection.omitted_source_item_ref,
    "second-observable",
  );
  assert.deepEqual(Object.keys(starward.exact_projection), [
    "first",
    "second",
    "selected_design",
  ]);
  const expectedOverlapClaimRefs = {
    "backend-persistence-identity": "second.result",
    "cli-provider-identity": "second.result",
  };
  for (const key of ["backend-persistence-identity", "cli-provider-identity"]) {
    const scenario = scenarioByKey(catalog, key);
    assert.match(scenario.paraphrase, /establish/u);
    assert.equal(
      scenario.wrong_contract_projection.omitted_source_item_ref,
      "second-observable",
    );
    assert.equal(
      scenario.wrong_contract_projection.machine_external_overlap_claim_ref,
      expectedOverlapClaimRefs[key],
    );
  }
}

export function scenarioByKey(catalog, key) {
  const scenario = catalog.scenarios.find((candidate) => candidate.key === key);
  assert.ok(scenario, `missing controlled incident scenario ${key}`);
  return scenario;
}

export async function createGenericCompleteDeliveryFixture(
  scenario,
  fixtureSeedRoot,
) {
  const fixture = await createDeliveryFixture({
    twoOutcomes: true,
    externalConfirmation: false,
    fixtureSeedRoot,
  });
  await applyScenarioSourceAndContract(fixture, scenario);
  await writeScenarioState(
    fixture,
    scenario.historical_bad_candidate.runtime_state,
  );
  await runCli(fixture.root, ["enable", "long-task"]);
  await assertCompileAttackMatrix(fixture, scenario);
  await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
  await commitCandidate(fixture.root);
  return fixture;
}

export async function createStarwardCompleteDeliveryFixture(
  scenario,
  fixtureSeedRoot,
) {
  return externalFixture({
    twoOutcomes: true,
    fixtureSeedRoot,
    configureExternal(fixture) {
      const outcome = fixture.contract.outcomes[0];
      outcome.product.requirements.push({
        key: "selected-design",
        statement: scenario.source["fixture-external"],
        required_proof_surfaces: ["ui_browser"],
        applicability_refs: ["first-root-success"],
      });
      const selectedDesignSource = fixture.contract.source_claims.find(
        (claim) => claim.key === "fixture-external",
      );
      assert.ok(selectedDesignSource);
      selectedDesignSource.disposition = {
        type: "claim",
        refs: ["first.requirement.selected-design"],
      };
      selectedDesignSource.judgment_basis = {
        kind: "authorization",
        claim_ref: "first.requirement.selected-design",
        applicability_refs: ["first-root-success"],
      };
      const confirmation =
        fixture.contract.global.acceptance.external_confirmations[0];
      confirmation.description = scenario.source["fixture-external"];
      confirmation.owner = "product-owner";
      confirmation.actor.id = "product-owner";
      confirmation.actor.role = "authorized product design owner";
      confirmation.environment_identity =
        "starward-controlled-selected-design-v1";
      confirmation.impact_claims.push("first.requirement.selected-design");
      confirmation.evidence_requirements = [
        {
          key: "selected-design-judgment",
          statement:
            "Judge the map, detail, night-sky, and profile surfaces against the controlled selected-design snapshot.",
        },
      ];
      confirmation.obligations.push({
        key: "confirm-selected-design",
        claim_ref: "first.requirement.selected-design",
        applicability_ref: "first-root-success",
        fact_ref: null,
        proof_ref: null,
        method: "exact_value",
        proof_surface: "ui_browser",
        evidence_capabilities: [],
        expected_authority_ref:
          "contract-claim:first.requirement.selected-design",
        result_kind: "judgment",
        judgment_basis: {
          kind: "authorization",
          source_ref: "fixture-external",
        },
      });
    },
    async beforeCompile(fixture) {
      await applyScenarioSourceAndContract(fixture, scenario);
      await writeScenarioState(
        fixture,
        scenario.historical_bad_candidate.runtime_state,
      );
    },
    async afterEnableBeforeCompile(fixture) {
      await assertSourceOmissionAttack(fixture, scenario);
    },
  });
}

export async function exerciseBadThenCorrectMachineCandidate(
  fixture,
  scenario,
) {
  const bad = await runCliFailure(
    fixture.root,
    ["long-task", "final-gate", fixture.workdir],
    { skipCandidateCommit: true },
  );
  assertExactFailureLocalization(bad, "second");
  await writeScenarioState(fixture, scenario.corrected_candidate.runtime_state);
  await commitCandidate(fixture.root);
  const accepted = await runCli(
    fixture.root,
    ["long-task", "final-gate", fixture.workdir],
    { skipCandidateCommit: true },
  );
  assert.equal(accepted.workflow_status, "machine_accepted");
  assertMachineChecksPassed(accepted);
  return { bad, accepted };
}

export async function exerciseStarwardExternalClosure(fixture, scenario) {
  const bad = await runCliFailure(
    fixture.root,
    ["long-task", "final-gate", fixture.workdir],
    { skipCandidateCommit: true },
  );
  assertExactFailureLocalization(bad, "second");
  assert.notEqual(bad.workflow_status, "machine_accepted");
  assert.notEqual(bad.workflow_status, "delivery_accepted");

  await writeScenarioState(fixture, scenario.corrected_candidate.runtime_state);
  await commitCandidate(fixture.root);
  const machineComplete = await runCliFailure(
    fixture.root,
    ["long-task", "final-gate", fixture.workdir],
    { skipCandidateCommit: true },
  );
  assert.equal(machineComplete.workflow_status, "blocked_external");
  assertMachineChecksPassed(machineComplete);

  const prepared = await runCli(fixture.root, [
    "long-task",
    "external",
    "prepare",
    fixture.workdir,
    "--confirmation",
    "fixture-external",
  ]);
  assert.equal(prepared.acceptance_effect, "none");
  assert.equal(prepared.confirmations[0].actor.id, "product-owner");
  const forged = await buildPassingRecord(fixture, prepared, {
    evidenceText:
      "implementation-agent-authored arbitrary approval text; no owner signature\n",
    rationale:
      "The implementation agent assigned itself the product-owner label and marked the judgment passed.",
  });
  forged.attestation.signature_base64 = Buffer.alloc(64).toString("base64");
  forged.record_sha256 = externalConfirmationRecordV2Hash(forged);
  await assert.rejects(
    runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      await writeSubmissionRecord(fixture, "forged-product-owner.json", forged),
    ]),
    /attestation_signature_invalid/u,
  );
  assert.equal(await pathExists(await activeRecordPath(fixture.root)), true);

  const signed = await buildPassingRecord(fixture, prepared, {
    evidenceText:
      "authorized product owner judged the controlled selected-design snapshot\n",
    rationale:
      "The declared product owner judged the exact current candidate against the controlled selected-design snapshot.",
  });
  const submitted = await runCli(fixture.root, [
    "long-task",
    "external",
    "submit",
    fixture.workdir,
    "--confirmation",
    "fixture-external",
    "--record",
    await writeSubmissionRecord(fixture, "signed-product-owner.json", signed),
  ]);
  assert.equal(submitted.state, "fulfilled");
  assert.equal(submitted.actor_identity_assurance, "ed25519_verified");
  assert.equal(submitted.signature_verified, true);

  const accepted = await runCli(
    fixture.root,
    ["long-task", "final-gate", fixture.workdir],
    { skipCandidateCommit: true },
  );
  assert.equal(accepted.workflow_status, "delivery_accepted");
  assert.equal(accepted.external_confirmation_results[0].state, "fulfilled");
  return { bad, machineComplete, accepted };
}

export async function applyScenarioSourceAndContract(fixture, scenario) {
  const sourcePath = path.join(fixture.root, "source.md");
  let source = await readFile(sourcePath, "utf8");
  for (const [key, statement] of Object.entries(scenario.source))
    source = replaceSourceItemText(source, key, statement);
  const externalSource = fixture.contract.source_claims.find(
    (claim) => claim.key === "fixture-external",
  );
  if (externalSource?.disposition?.type === "claim")
    source = replaceSourceItemKind(source, "fixture-external", "requirement");
  await writeFile(sourcePath, source);

  fixture.contract.task.title = `${scenario.key} controlled replay`;
  fixture.contract.task.goal =
    "Close every exact machine obligation and any separately declared authenticated external judgment.";
  for (const key of [
    "first-observable",
    "second-observable",
    "fixture-architecture",
    ...(scenario.source["fixture-external"] ? ["fixture-external"] : []),
  ]) {
    const claim = fixture.contract.source_claims.find((row) => row.key === key);
    assert.ok(claim, `${scenario.key} missing Source claim ${key}`);
    claim.statement = scenario.source[key];
  }
  for (const [index, outcomeKey] of ["first", "second"].entries()) {
    const outcome = fixture.contract.outcomes[index];
    const statement = scenario.source[`${outcomeKey}-observable`];
    outcome.title = `${scenario.key} ${outcomeKey}`;
    outcome.product.observable_result = statement;
    outcome.product.owner.label = `${scenario.key}-implementation-owner`;
    outcome.product.requirements.find(
      (row) => row.key === `observe-${outcomeKey}`,
    ).statement = statement;
    outcome.technical.obligations.find(
      (row) => row.key === `implement-${outcomeKey}`,
    ).statement = `Implement and preserve: ${statement}`;
    const check = outcome.acceptance.checks[0];
    check.positive_assertions.find(
      (row) => row.key === `${outcomeKey}-result`,
    ).criterion = statement;
    check.positive_assertions.find(
      (row) => row.key === `${outcomeKey}-requirement`,
    ).criterion = statement;
    check.positive_assertions.find(
      (row) => row.key === `${outcomeKey}-obligation`,
    ).criterion = `The declared implementation owner satisfies: ${statement}`;
  }
  const architecture = fixture.contract.outcomes[0].technical.obligations.find(
    (row) => row.key === "architecture-first",
  );
  architecture.statement = scenario.source["fixture-architecture"];
  fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.find(
    (row) => row.key === "first-architecture",
  ).criterion = scenario.source["fixture-architecture"];
  const selectedDesign = fixture.contract.outcomes[0].product.requirements.find(
    (row) => row.key === "selected-design",
  );
  if (selectedDesign)
    selectedDesign.statement = scenario.source["fixture-external"];
  for (const confirmation of fixture.contract.global.acceptance
    .external_confirmations ?? [])
    if (scenario.source["fixture-external"])
      confirmation.description = scenario.source["fixture-external"];
  await writeContract(fixture.workdir, fixture.contract);
}

export async function assertCompileAttackMatrix(fixture, scenario) {
  const legal = await captureSynchronizedLegalContract(fixture);
  await assertSourceOmissionAttack(fixture, scenario, legal);

  const weak = structuredClone(legal.contract);
  weak.outcomes[1].acceptance.checks[0].positive_assertions.find(
    (row) => row.key === scenario.wrong_contract_projection.weak_assertion_ref,
  ).evidence_capabilities = [
    scenario.wrong_contract_projection.weak_evidence_capability,
  ];
  await writeContract(fixture.workdir, weak);
  await expectCompileRejection(fixture, [
    /proof_adequacy_capability_missing:second:second-check:second-result:target_runtime/u,
  ]);
  await restoreLegalContract(fixture, legal);

  const overlap = structuredClone(legal.contract);
  overlap.task.target_profile.completion_authority = "declared_authorities";
  const overlapOutcome = overlap.outcomes[1];
  const machineCheck = overlapOutcome.acceptance.checks[0];
  const machineAssertion = machineCheck.positive_assertions.find((assertion) =>
    assertion.claims.includes("result"),
  );
  const machineLiveness = machineCheck.positive_assertions.find(
    (assertion) => assertion.key === "second-liveness",
  );
  assert.ok(machineAssertion);
  assert.ok(machineLiveness);
  const externalCheck = {
    ...structuredClone(machineCheck),
    key: "second-machine-overlap-external-check",
    proof_surface: "data_state",
    positive_assertions: [
      {
        ...structuredClone(machineAssertion),
        key: "second-machine-overlap-external-assertion",
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
  overlapOutcome.acceptance.checks.push(externalCheck);
  const identity = {
    externalKeyId: "fixture-owner-2026",
    externalPublicKeyRef: FIXTURE_EXTERNAL_PUBLIC_KEY_REF,
  };
  const confirmation = externalDeclaration(
    externalCheck,
    identity,
    {
      key: "fixture-machine-overlap-external",
      actorId: "product-owner",
      actorRole: "declared product owner",
      claimRef:
        scenario.wrong_contract_projection.machine_external_overlap_claim_ref,
      obligationKey: "overlap-second-machine-obligation",
      applicabilityRef: "second-root-success",
      factRef: null,
      proofRef: null,
      proofSurface: "data_state",
      capabilities: ["target_runtime"],
      resultKind: "actual",
    },
  );
  confirmation.scenario.given[0].key = "machine-overlap-different-given";
  overlap.global.acceptance.external_confirmations = [confirmation];
  await writeContract(fixture.workdir, overlap);
  await expectCompileRejection(fixture, [
    /machine_external_authority_conflict/u,
  ]);
  await restoreLegalContract(fixture, legal);
}

export async function assertSourceOmissionAttack(
  fixture,
  scenario,
  legalOverride = null,
) {
  const legal =
    legalOverride ?? (await captureSynchronizedLegalContract(fixture));
  const omitted = scenario.wrong_contract_projection.omitted_source_item_ref;
  const broad = structuredClone(legal.contract);
  broad.source_claims = broad.source_claims.filter(
    (claim) => claim.key !== omitted,
  );
  await writeContract(fixture.workdir, broad);
  await expectCompileRejection(fixture, [
    new RegExp(`source_item_unmapped:${escapeRegExp(omitted)}`, "u"),
  ]);
  await restoreLegalContract(fixture, legal);
}

export function assertExactFailureLocalization(receipt, outcomeKey) {
  assert.equal(receipt.workflow_status, "needs_work");
  const findings = receipt.findings ?? [];
  const requirement = findings.find(
    (finding) => finding.assertion_key === `${outcomeKey}-requirement`,
  );
  assert.ok(requirement, `${outcomeKey} requirement finding missing`);
  assert.ok(requirement.source_claim_keys.includes(`${outcomeKey}-observable`));
  assert.ok(
    requirement.source_fragment_refs.some((ref) =>
      ref.startsWith(`${outcomeKey}-observable#fragment:`),
    ),
  );
  assert.deepEqual(requirement.claim_keys, [
    `requirement.observe-${outcomeKey}`,
  ]);
  assert.ok(
    requirement.proof_obligation_refs.includes(
      `assertion.${outcomeKey}.${outcomeKey}-check.${outcomeKey}-requirement`,
    ),
  );
  assert.ok(
    requirement.expected_authority_refs.includes(
      `contract-claim:${outcomeKey}.requirement.observe-${outcomeKey}`,
    ),
  );
  assertOwnerAndRerun(requirement, outcomeKey);

  const fact = findings.find(
    (finding) => finding.assertion_key === `${outcomeKey}-semantic-fact`,
  );
  assert.ok(fact, `${outcomeKey} semantic Fact finding missing`);
  assert.deepEqual(fact.fact_refs, [`fact.${outcomeKey}.observable`]);
  assert.ok(
    fact.proof_obligation_refs.includes(`proof.${outcomeKey}.observable.exact`),
  );
  assert.ok(
    fact.expected_authority_refs.includes(
      `semantic-proof:proof.${outcomeKey}.observable.exact`,
    ),
  );
  assertOwnerAndRerun(fact, outcomeKey);
}

function assertOwnerAndRerun(finding, outcomeKey) {
  assert.match(finding.implementation_owner.label, /implementation-owner/u);
  assert.equal(finding.verification_owner.kind, "machine_check");
  assert.equal(finding.verification_owner.outcome_key, outcomeKey);
  assert.equal(finding.verification_owner.check_key, `${outcomeKey}-check`);
  assert.ok(finding.rerun_obligation_refs.length > 0);
}

function assertMachineChecksPassed(receipt) {
  assert.ok(receipt.check_results.length > 0);
  assert.ok(
    receipt.check_results.every((result) => result.status === "passed"),
  );
  const outcomeStatuses = Object.values(receipt.outcome_results);
  if (receipt.workflow_status === "blocked_external") {
    assert.ok(
      outcomeStatuses.every((status) =>
        ["passed", "blocked_external"].includes(status),
      ),
    );
    assert.ok(outcomeStatuses.includes("blocked_external"));
    assert.ok(
      receipt.findings.every(
        (finding) => finding.code === "external_confirmation_pending",
      ),
    );
  } else assert.ok(outcomeStatuses.every((status) => status === "passed"));
}

async function writeScenarioState(fixture, desired) {
  const state = await readState(fixture.root);
  Object.assign(state, desired);
  await writeFile(
    path.join(fixture.root, "src/state.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );
}

function replaceSourceItemText(source, key, statement) {
  const pattern = new RegExp(
    `(<!-- ty-source-item:start key=${escapeRegExp(key)}\\b[^>]*-->\\r?\\n)[\\s\\S]*?(\\r?\\n<!-- ty-source-item:end -->)`,
    "u",
  );
  assert.match(source, pattern, `missing marked Source item ${key}`);
  return source.replace(pattern, `$1${statement}$2`);
}

function replaceSourceItemKind(source, key, kind) {
  const pattern = new RegExp(
    `<!-- ty-source-item:start key=${escapeRegExp(key)}\\b[^>]*-->`,
    "u",
  );
  const marker = source.match(pattern)?.[0];
  assert.ok(marker, `missing marked Source item ${key}`);
  const updated = marker.replace(/\bkind=[^\s>]+/u, `kind=${kind}`);
  assert.notEqual(updated, marker, `missing Source item kind ${key}`);
  return source.replace(marker, updated);
}

async function captureSynchronizedLegalContract(fixture) {
  await writeContract(fixture.workdir, fixture.contract);
  const root = path.dirname(fixture.workdir);
  const synchronizedPaths = [
    path.join(
      root,
      ...fixture.contract.semantic_fact_manifest.source_path.split("/"),
    ),
    path.join(root, "tests", "oracle.mjs"),
    path.join(root, ...FIXTURE_LEGACY_ORACLE_PATH.split("/")),
    path.join(root, ...FIXTURE_EXTERNAL_PUBLIC_KEY_REF.split("/")),
  ];
  return {
    contract: structuredClone(fixture.contract),
    bytes: Buffer.from(
      await readFile(path.join(fixture.workdir, "delivery-contract.yaml")),
    ),
    synchronized_files: await Promise.all(
      synchronizedPaths.map(async (file) => ({
        file,
        bytes: await readOptionalBytes(file),
      })),
    ),
  };
}

async function restoreLegalContract(fixture, legal) {
  fixture.contract = structuredClone(legal.contract);
  for (const entry of legal.synchronized_files) {
    if (entry.bytes === null) await rm(entry.file, { force: true });
    else await writeFile(entry.file, entry.bytes);
  }
  const contractPath = path.join(fixture.workdir, "delivery-contract.yaml");
  await writeFile(contractPath, legal.bytes);
  assert.deepEqual(
    await readFile(contractPath),
    legal.bytes,
    "legal Contract bytes must be restored exactly between attacks",
  );
  for (const entry of legal.synchronized_files)
    assert.deepEqual(
      await readOptionalBytes(entry.file),
      entry.bytes,
      `synchronized legal fixture bytes must be restored exactly: ${path.basename(entry.file)}`,
    );
}

async function readOptionalBytes(file) {
  try {
    return Buffer.from(await readFile(file));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function expectCompileRejection(fixture, expected) {
  let error;
  try {
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
  } catch (candidate) {
    error = candidate;
  }
  assert.ok(error, "expected real CLI Compile rejection");
  const diagnostic = `${error.stderr ?? ""}\n${error.message ?? ""}`;
  for (const pattern of expected) assert.match(diagnostic, pattern);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
