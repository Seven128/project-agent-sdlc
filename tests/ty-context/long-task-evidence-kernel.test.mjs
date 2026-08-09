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

test("Population V2 evaluation stays exact while machine proof remains externally blocked", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    fixture.contract.risk.facts.full_population_operation = ["first"];
    const population = {
      check_key: "population-check",
      universe_binding_key: "state-first",
      claims: ["result"],
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
        universe_ids: ["first"],
        eligible_ids: ["first"],
        observed_ids: ["first"],
        excluded_items: [],
      },
    };
    const omitted = structuredClone(complete);
    omitted.population.observed_ids = [];
    assert.equal(evaluatePopulation(population, complete).passed, true);
    const omittedResult = evaluatePopulation(population, omitted);
    assert.equal(omittedResult.passed, false);
    assert.equal(omittedResult.reason, "eligible_population_incomplete");

    fixture.contract.global.acceptance.external_confirmations.push({
      key: "population-observer-review",
      description:
        "The unsupported population observation requires an external owner.",
      owner: "external-owner",
      kind: "functional_prerequisite",
      impact_claims: ["first.result"],
      blocks_target: true,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
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
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

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
