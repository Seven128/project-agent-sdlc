import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
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
  resignRecord,
  writeSubmissionRecord,
} from "./long-task-external-confirmation-record-fixture.mjs";
import { mutateFixtureSemanticManifest } from "./long-task-semantic-fact-test-support.mjs";
import {
  FIXTURE_EXTERNAL_FACT_SPECS,
  fixtureSourceStatements,
} from "./long-task-semantic-manifest-fixture.mjs";
import { digestCanonical } from "./long-task-semantic-refresh-fixture.mjs";
import { decodeEvidenceCapabilityRecords } from "../../packages/ty-context/dist/lib/long-task-evidence-capability-policy.js";
import { evaluatePopulation } from "../../packages/ty-context/dist/lib/long-task-assertions-v2.js";

test("design-conformance evidence has a strict target, condition and artifact shape", () => {
  const record = {
    assertion_key: "map-default-conformance",
    capability: "design_conformance",
    design_target_ref: "map-default",
    target_ref: "mobile-native",
    condition_keys: ["phone", "dark", "default"],
    actual_artifact_path: "artifacts/map-actual.png",
    comparison_artifact_path: "artifacts/map-diff.json",
  };
  assert.deepEqual(decodeEvidenceCapabilityRecords([record]), [record]);
  const missingComparison = structuredClone(record);
  delete missingComparison.comparison_artifact_path;
  assert.throws(
    () => decodeEvidenceCapabilityRecords([missingComparison]),
    /check_evidence_records_invalid:evidence_records\[0\]\.shape/u,
  );
});

test("strict security proof combines per-Check artifacts, negative Assertions and a valid Counterfactual", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    fixture.contract.risk.facts.security_boundary_change = ["first"];
    check.proof_surface = "security_boundary";
    outcome.product.requirements[0].required_proof_surfaces = [
      "security_boundary",
    ];
    for (const obligation of outcome.technical.obligations)
      obligation.required_proof_surfaces = ["security_boundary"];
    outcome.product.owner.path_globs.push("artifacts/**");
    outcome.technical.allowed_support_paths.push("artifacts/**");
    check.artifact_globs = ["artifacts/proof.json"];
    check.positive_assertions.push({
      key: "artifact-present",
      criterion: "The security proof artifact is produced.",
      claims: [],
      observation: "artifacts-ready",
      evidence_capabilities: ["presence"],
      operator: "equals",
      expected: true,
    });
    outcome.technical.forbidden_shortcuts.push({
      key: "self-report",
      statement: "Do not accept self-reported success.",
      applicability_refs: ["first-root-success"],
    });
    check.negative_assertions.push({
      key: "shortcut-rejected",
      criterion: "Self-reported success remains rejected.",
      claims: ["forbidden_shortcut.self-report"],
      applicability_ref: "first-root-success",
      observation: "negative_ok",
      evidence_capabilities: ["target_runtime", "presence"],
      operator: "equals",
      expected: true,
    });
    outcome.acceptance.counterfactual_controls = [
      {
        key: "replace-state-semantics",
        binding_key: "state-first",
        claims: [
          "result",
          "requirement.observe-first",
          "obligation.implement-first",
          "obligation.architecture-first",
          "forbidden_shortcut.self-report",
          "semantic_fact.fact.first.observable",
        ],
        check_key: check.key,
        mutation: {
          type: "replace_json_value",
          path: "src/state.json",
          pointer: "/first",
          value: false,
        },
        expected_assertion_failures: [
          "first-result",
          "first-requirement",
          "first-obligation",
          "first-architecture",
          "shortcut-rejected",
          "first-semantic-fact",
        ],
        preserved_assertions: ["first-liveness"],
      },
      {
        key: "make-first-relations-applicable",
        binding_key: "state-first",
        claims: ["control_relation_closure"],
        check_key: check.key,
        mutation: {
          type: "replace_json_value",
          path: "src/state.json",
          pointer: "/first_relations_applicable",
          value: true,
        },
        expected_assertion_failures: ["first-relations-na"],
        preserved_assertions: ["first-liveness"],
      },
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await writeArtifactOracle(fixture.root);

    await runCli(fixture.root, ["enable", "long-task"]);
    const compiled = await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
    ]);
    assert.equal(compiled.effective_risk, "strict");
    const accepted = await runCli(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(
      accepted.workflow_status,
      "machine_accepted",
      JSON.stringify(accepted.findings),
    );
    assert.ok(
      accepted.check_results[0].artifact_hashes["artifacts/proof.json"],
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Population V2 preserves the Machine Claim and closes only from signed objective set Actual", async () => {
  const fixture = await externalFixture({
    configureExternal: configureObjectivePopulationExternal,
  });
  try {
    const outcome = fixture.contract.outcomes[0];
    const population = {
      check_key: "population-check",
      universe_binding_key: "state-first",
      claims: [`semantic_fact.${FIXTURE_EXTERNAL_FACT_SPECS[0].factKey}`],
      observations: {
        universe_ids: "population.universe_ids",
        eligible_ids: "population.eligible_ids",
        observed_ids: "population.observed_ids",
        excluded_items: "population.excluded_items",
      },
      exclusion_rules: [],
    };
    const complete = {
      population: {
        universe_ids: [...POPULATION_IDS],
        eligible_ids: [...POPULATION_IDS],
        observed_ids: [...POPULATION_IDS].reverse(),
        excluded_items: [],
      },
    };
    const omitted = structuredClone(complete);
    omitted.population.observed_ids = [];
    assert.equal(evaluatePopulation(population, complete).passed, true);
    const omittedResult = evaluatePopulation(population, omitted);
    assert.equal(omittedResult.passed, false);
    assert.equal(omittedResult.reason, "eligible_population_incomplete");

    assert.ok(
      outcome.acceptance.checks[0].positive_assertions.some((assertion) =>
        assertion.claims.includes("result"),
      ),
      "the objective Population route must not delete the original Machine result Claim",
    );
    assert.equal(
      (
        await runCliFailure(fixture.root, [
          "long-task",
          "final-gate",
          fixture.workdir,
        ])
      ).workflow_status,
      "blocked_external",
    );

    const prepared = await runCli(fixture.root, [
      "long-task",
      "external",
      "prepare",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
    ]);
    const obligation = prepared.confirmations[0].obligations[0];
    assert.equal(obligation.method, "population_set_equality");
    assert.deepEqual(obligation.required_evidence_capabilities, [
      "population_coverage",
      "semantic_fact",
    ]);
    assert.equal(obligation.result_kind, "actual");
    assert.equal(
      prepared.confirmations[0].identity_assurance.scheme,
      "ed25519",
    );

    const incomplete = await buildPassingRecord(fixture, prepared);
    incomplete.results[0].actual = [POPULATION_IDS[0]];
    incomplete.results[0].verdict = "passed";
    resignRecord(incomplete, fixture);
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
          "population-incomplete.json",
          incomplete,
        ),
      ]),
      /objective_verdict_mismatch/u,
    );

    const passing = await buildPassingRecord(fixture, prepared);
    passing.results[0].actual = [...POPULATION_IDS].reverse();
    resignRecord(passing, fixture);
    const submitted = await runCli(fixture.root, [
      "long-task",
      "external",
      "submit",
      fixture.workdir,
      "--confirmation",
      "fixture-external",
      "--record",
      await writeSubmissionRecord(fixture, "population-complete.json", passing),
    ]);
    assert.equal(submitted.state, "fulfilled");
    let accepted;
    try {
      accepted = await runCli(
        fixture.root,
        ["long-task", "final-gate", fixture.workdir],
        { skipCandidateCommit: true },
      );
    } catch (error) {
      const failed = JSON.parse(String(error.stdout ?? "{}"));
      assert.fail(JSON.stringify(failed.findings ?? failed));
    }
    assert.equal(
      accepted.workflow_status,
      "delivery_accepted",
      JSON.stringify(accepted.findings),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

const POPULATION_IDS = ["population-item-a", "population-item-b"];
const POPULATION_SOURCE_STATEMENT =
  "The accepted population must contain exactly population-item-a and population-item-b.";

async function configureObjectivePopulationExternal(fixture, check) {
  const outcome = fixture.contract.outcomes[0];
  const externalSpec = FIXTURE_EXTERNAL_FACT_SPECS[0];
  const claimRef = `first.semantic_fact.${externalSpec.factKey}`;
  const populationApplicabilityRef = "first-population-success";
  fixture.contract.risk.facts.full_population_operation = ["first"];
  outcome.applicability.push({
    ...structuredClone(outcome.applicability[0]),
    key: populationApplicabilityRef,
    dimensions: [{ key: "fixture-state", value: "population-loaded" }],
  });

  const sourceClaim = fixture.contract.source_claims.find(
    (claim) => claim.key === externalSpec.sourceKey,
  );
  assert.ok(sourceClaim);
  sourceClaim.statement = POPULATION_SOURCE_STATEMENT;
  const sourcePath = path.join(fixture.root, "source.md");
  await writeFile(
    sourcePath,
    (await readFile(sourcePath, "utf8")).replace(
      fixtureSourceStatements[externalSpec.sourceKey],
      POPULATION_SOURCE_STATEMENT,
    ),
  );

  const populationOracle = path.join(
    fixture.root,
    "tests",
    "population-oracle.mjs",
  );
  await writeFile(
    populationOracle,
    `console.log(JSON.stringify(${JSON.stringify({
      schema_version: "long-task-check-result-v3",
      execution_status: "completed",
      observations: {
        population: {
          universe_ids: POPULATION_IDS,
          eligible_ids: POPULATION_IDS,
          observed_ids: [...POPULATION_IDS].reverse(),
          excluded_items: [],
        },
      },
      evidence_records: [],
    })}));\n`,
  );
  const packagePath = path.join(fixture.root, "package.json");
  const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
  packageJson.scripts.population = "node tests/population-oracle.mjs";
  await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

  outcome.acceptance.checks.push({
    ...structuredClone(check),
    key: "population-check",
    journey_roles: ["success"],
    proof_surface: "population_coverage",
    runner: {
      type: "package_script",
      target: "population",
      argv: [],
      cwd: ".",
      timeout_ms: 30_000,
      effect: "read_only",
      retry_policy: "none",
      idempotent: true,
    },
    verification_inputs: ["tests/population-oracle.mjs"],
    input_paths: ["src/**"],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [],
    environment_requirements: [],
  });
  outcome.acceptance.population = {
    check_key: "population-check",
    universe_binding_key: "state-first",
    claims: [`semantic_fact.${externalSpec.factKey}`],
    observations: {
      universe_ids: "population.universe_ids",
      eligible_ids: "population.eligible_ids",
      observed_ids: "population.observed_ids",
      excluded_items: "population.excluded_items",
    },
    exclusion_rules: [],
  };

  const proofBinding = outcome.semantic_fact_bindings.proofs.find(
    (binding) => binding.proof_ref === externalSpec.proofKey,
  );
  const factBinding = outcome.semantic_fact_bindings.facts.find(
    (binding) => binding.fact_ref === externalSpec.factKey,
  );
  assert.ok(proofBinding);
  assert.ok(factBinding);
  factBinding.applicability_ref = populationApplicabilityRef;
  Object.assign(proofBinding, {
    method: "population_set_equality",
    proof_surface: "population_coverage",
    evidence_capabilities: ["semantic_fact", "population_coverage"],
    authority: "external_confirmation",
    confirmation_ref: externalSpec.confirmationKey,
  });
  const confirmation = externalDeclaration(check, fixture, {
    externalSpec,
    claimRef,
    factRef: externalSpec.factKey,
    proofRef: externalSpec.proofKey,
    method: "population_set_equality",
    proofSurface: "population_coverage",
    capabilities: ["semantic_fact", "population_coverage"],
    resultKind: "actual",
    applicabilityRef: populationApplicabilityRef,
    obligationKey: "confirm-first-population-set",
    evidenceKey: "population-runtime-observation",
    evidenceStatement:
      "Capture the complete current population as an exact set Actual.",
  });
  confirmation.description = POPULATION_SOURCE_STATEMENT;
  confirmation.actor.authority_kind = "external_system";
  confirmation.actor.role = "authenticated population observer";
  fixture.contract.global.acceptance.external_confirmations = [confirmation];

  await mutateFixtureSemanticManifest(fixture, (manifest) => {
    const fact = manifest.facts.find(
      (candidate) => candidate.key === externalSpec.factKey,
    );
    const proof = manifest.proof_obligations.find(
      (candidate) => candidate.key === externalSpec.proofKey,
    );
    const property = manifest.property_dispositions.find(
      (candidate) => candidate.key === fact?.property_ref,
    );
    const oracle = manifest.oracles.find(
      (candidate) => candidate.key === proof?.oracle_ref,
    );
    assert.ok(fact);
    assert.ok(proof);
    assert.ok(property);
    assert.ok(oracle);
    property.value_kind = "set";
    property.required_methods = ["population_set_equality"];
    property.required_evidence_capabilities = [
      "semantic_fact",
      "population_coverage",
    ];
    property.rationale =
      "The authenticated observer supplies the complete objective population set.";
    fact.value_kind = "set";
    fact.expected.value = [...POPULATION_IDS];
    fact.expected.sha256 = digestCanonical(fact.expected.value);
    proof.method = "population_set_equality";
    proof.authority = "external_confirmation";
    proof.proof_surface = "population_coverage";
    proof.evidence_capabilities = ["semantic_fact", "population_coverage"];
    proof.comparison.comparator = "population_set_equal";
    proof.comparison.parameters.value = {
      comparator: "population_set_equal",
    };
    proof.comparison.parameters.sha256 = digestCanonical(
      proof.comparison.parameters.value,
    );
    proof.comparison.mode = "exact";
    proof.comparison.tolerance = null;
    proof.comparison.mask = null;
    proof.counterfactual.disposition = "external";
    proof.counterfactual.refs = [];
    proof.counterfactual.basis_refs = [externalSpec.sourceKey];
    proof.counterfactual.rationale =
      "Population coverage is externally observed as an objective Actual and recomputed by Harness.";
    for (const capability of [
      "population_set_equality",
      "population_set_equal",
    ])
      if (!oracle.capabilities.includes(capability))
        oracle.capabilities.push(capability);
  });
}

test("exit zero, handwritten status and invalid Result Protocol cannot manufacture acceptance", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests/oracle.mjs"),
      'console.log(JSON.stringify({status:"accepted",success:true}));\n',
    );
    await writeFile(
      path.join(fixture.workdir, "handwritten-status.json"),
      '{"workflow_status":"accepted"}\n',
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(failed.workflow_status, "needs_work");
    assert.ok(failed.findings.some((item) => item.code === "invalid_evidence"));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function writeArtifactOracle(root) {
  const oraclePath = path.join(root, "tests/oracle.mjs");
  const original = await readFile(oraclePath, "utf8");
  await writeFile(
    oraclePath,
    original.replace(
      "console.log(JSON.stringify({",
      `observations["assertion.first.first-check.artifact-present"] = true;
observations["assertion.first.first-check.shortcut-rejected"] = observed;
console.log(JSON.stringify({`,
    ),
  );
}
