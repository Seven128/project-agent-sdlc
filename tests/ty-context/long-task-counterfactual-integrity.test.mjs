import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  evaluateOutcomeCounterfactuals,
  isValidCounterfactualCheckResult,
} from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import { removeCounterfactualSandboxRoot } from "../../packages/ty-context/dist/lib/long-task-counterfactual-sandbox.js";
import {
  createDeliveryFixture,
  runCli,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  preserveFixtureSemanticOracle,
  preservedFixtureOracleDelegationPrelude,
} from "./long-task-delegating-oracle-fixture.mjs";

test("Counterfactual accepts only the exact designated Assertion failure", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.runner.timeout_ms = 2000;
    check.positive_assertions.push({
      key: "other-stays-true",
      criterion: "The unrelated observation remains true.",
      claims: [],
      observation: "other",
      evidence_capabilities: ["state_delta"],
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
    await preserveFixtureSemanticOracle(fixture);
    await writeOracle(fixture.root, "valid");
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context/compiled-contract.json"),
        "utf8",
      ),
    );

    assert.deepEqual(
      await evaluateOutcomeCounterfactuals(compiled.outcomes[0], fixture.root),
      [],
    );
    const artifactFailure = structuredClone(compiled.outcomes[0]);
    artifactFailure.acceptance.checks[0].artifact_globs = [
      "artifacts/missing-proof.json",
    ];
    let findings = await evaluateOutcomeCounterfactuals(
      artifactFailure,
      fixture.root,
    );
    assert.equal(findings.length, 2);
    const mainArtifactFinding = findings.find((finding) =>
      finding.message.includes("replace-state-semantics"),
    );
    const relationArtifactFinding = findings.find((finding) =>
      finding.message.includes("make-first-relations-applicable"),
    );
    assert.deepEqual(mainArtifactFinding.actual.finding_codes.sort(), [
      "artifact_missing",
      "assertion_value_mismatch",
      "assertion_value_mismatch",
      "assertion_value_mismatch",
      "assertion_value_mismatch",
      "assertion_value_mismatch",
    ]);
    assert.deepEqual(relationArtifactFinding.actual.finding_codes.sort(), [
      "artifact_missing",
      "assertion_value_mismatch",
      "evidence_capability_invalid",
    ]);

    const populationFailure = structuredClone(compiled.outcomes[0]);
    populationFailure.acceptance.population = {
      check_key: check.key,
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
    findings = await evaluateOutcomeCounterfactuals(
      populationFailure,
      fixture.root,
    );
    assert.equal(findings.length, 1);
    assert.deepEqual(findings[0].actual.finding_codes.sort(), [
      "assertion_value_mismatch",
      "assertion_value_mismatch",
      "assertion_value_mismatch",
      "assertion_value_mismatch",
      "assertion_value_mismatch",
      "population_coverage_failed",
    ]);

    for (const mode of [
      "timeout",
      "blocked",
      "invalid",
      "observation-missing",
      "observation-type",
      "extra-failure",
    ]) {
      await writeOracle(fixture.root, mode);
      const candidate = structuredClone(compiled.outcomes[0]);
      if (mode === "timeout")
        candidate.acceptance.checks[0].runner.timeout_ms = 120;
      findings = await evaluateOutcomeCounterfactuals(
        candidate,
        fixture.root,
      );
      assert.equal(findings.length, 2, mode);
      assert.ok(
        findings.every(
          (finding) => finding.code === "counterfactual_integrity_failed",
        ),
        mode,
      );
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Counterfactual cannot delete the runner or a declared helper", async () => {
  for (const target of ["tests/oracle.mjs", "tests/helper.mjs"]) {
    const fixture = await createDeliveryFixture();
    try {
      await writeFile(path.join(fixture.root, "tests/helper.mjs"), "export {};\n");
      const outcome = fixture.contract.outcomes[0];
      const check = outcome.acceptance.checks[0];
      const semanticControls = structuredClone(
        outcome.acceptance.counterfactual_controls,
      );
      check.verification_inputs.push("tests/helper.mjs");
      outcome.product.owner.path_globs.push("tests/**");
      outcome.technical.allowed_support_paths.push("tests/**");
      outcome.technical.bindings[0].carrier_paths.push(target);
      outcome.acceptance.counterfactual_controls = [
        ...semanticControls,
        {
          key: "delete-verifier-input",
          binding_key: "state-first",
          claims: ["obligation.implement-first"],
          check_key: check.key,
          mutation: { type: "remove_paths", paths: [target] },
          expected_assertion_failures: ["first-result"],
        },
      ];
      await writeContract(fixture.workdir, fixture.contract);
      await runCli(fixture.root, ["enable", "long-task"]);
      await assert.rejects(
        runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
        (error) =>
          /verification_input_overlaps_implementation|counterfactual_mutates_verification_input/u.test(
            error.stderr ?? "",
          ),
        target,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Counterfactual Claims must belong to the designated sensitive Assertion", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const semanticControls = structuredClone(
      outcome.acceptance.counterfactual_controls,
    );
    outcome.technical.obligations.push({
      key: "unrelated",
      statement: "Preserve an unrelated obligation.",
      required_proof_surfaces: ["runtime_behavior"],
      applicability_refs: ["first-root-success"],
    });
    outcome.acceptance.checks[0].positive_assertions.push({
      key: "unrelated-proof",
      criterion: "The unrelated obligation remains observable.",
      claims: ["obligation.unrelated"],
      applicability_ref: "first-root-success",
      observation: "other",
      evidence_capabilities: ["state_delta"],
      operator: "equals",
      expected: true,
    });
    outcome.acceptance.counterfactual_controls = [
      ...semanticControls,
      {
        key: "unrelated-claim",
        binding_key: "state-first",
        claims: ["obligation.unrelated"],
        check_key: "first-check",
        mutation: {
          type: "replace_file",
          path: "src/state.json",
          fixture_path: "tests/semantic-false.json",
        },
        expected_assertion_failures: ["first-result"],
        preserved_assertions: ["first-liveness"],
      },
    ];
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await assert.rejects(
      runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /counterfactual_binding_claim_unrelated:first:unrelated-claim/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Counterfactual rejects AC not-executed and skipped failures", () => {
  for (const code of [
    "acceptance_case_not_executed",
    "acceptance_case_skipped",
  ]) {
    const result = {
      status: "assertion_failed",
      assertion_results: [
        {
          key: "ac-sensitive",
          passed: false,
          status: code,
        },
      ],
      findings: [
        {
          code,
          assertion_key: "ac-sensitive",
        },
      ],
    };
    assert.equal(
      isValidCounterfactualCheckResult(result, ["ac-sensitive"]),
      false,
      code,
    );
  }
});

test("Counterfactual sandbox cleanup retries transient filesystem locks", async () => {
  const attempts = [];
  const waits = [];
  await removeCounterfactualSandboxRoot(
    "fixture-counterfactual-root",
    async (target, options) => {
      attempts.push({ target, options });
      if (attempts.length < 3)
        throw Object.assign(new Error("fixture lock"), { code: "EBUSY" });
    },
    async (milliseconds) => {
      waits.push(milliseconds);
    },
  );

  assert.equal(attempts.length, 3);
  assert.deepEqual(
    attempts.map(({ target }) => target),
    Array(3).fill("fixture-counterfactual-root"),
  );
  assert.deepEqual(attempts[0].options, { recursive: true, force: true });
  assert.deepEqual(waits, [100, 200]);

  await assert.rejects(
    removeCounterfactualSandboxRoot(
      "fixture-counterfactual-root",
      async () => {
        throw Object.assign(new Error("permanent failure"), { code: "EACCES" });
      },
      async () => {
        assert.fail("permanent failures must not be retried");
      },
    ),
    /permanent failure/u,
  );
});

async function writeOracle(root, mode) {
  const prelude =
    mode === "timeout"
      ? "await new Promise(() => {});"
      : mode === "blocked"
        ? 'console.log(JSON.stringify({schema_version:"long-task-check-result-v3",execution_status:"blocked_external",reason:"fixture"})); process.exit(0);'
        : mode === "invalid"
          ? 'console.log("not-json"); process.exit(0);'
          : "";
  const other = mode === "extra-failure" ? "false" : "true";
  const resultObservation =
    mode === "observation-missing"
      ? ""
      : mode === "observation-type"
        ? 'result:"not-a-boolean",'
        : "result,";
  await writeFile(
    path.join(root, "tests/oracle.mjs"),
    `${preservedFixtureOracleDelegationPrelude({
      beforeDelegation: prelude,
    })}
const observedResult = result.observations.result;
${resultObservation ? `result.observations.result = ${
      mode === "observation-type" ? '"not-a-boolean"' : "observedResult"
    };` : "delete result.observations.result;"}
result.observations.other = ${other};
result.observations.population = {
  universe_ids: ["first"],
  eligible_ids: ["first"],
  observed_ids: observedResult ? ["first"] : [],
  excluded_items: []
};
result.evidence_records.push({
  assertion_key: "other-stays-true",
  capability: "state_delta",
  before_sha256: "2".repeat(64),
  after_sha256: "3".repeat(64),
  changed_fields: ["other"]
});
console.log(JSON.stringify(result));
`,
  );
}
