import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { validateCounterfactualObservationImpact } from "../../packages/ty-context/dist/lib/long-task-evidence-sensitivity-policy.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  assertActivationReady,
  assertActivationRejects,
  counterfactual,
} from "./long-task-evidence-sensitivity-fixtures.mjs";

test("Counterfactual observation impact enforces expected, preserved, unlisted, and allowed fan-out sets", () => {
  const baseline = {
    expected: "expected-before",
    preserved: "preserved-before",
    unlisted: "unlisted-before",
    fanout: "fanout-before",
  };
  const validate = (mutated) =>
    validateCounterfactualObservationImpact({
      baseline_by_fact: baseline,
      mutated_by_fact: { ...baseline, ...mutated },
      expected_affected_fact_refs: ["expected"],
      preserved_fact_refs: ["preserved"],
      allowed_fanout_fact_refs: ["fanout"],
      target_live: true,
      carrier_role: "product",
    });

  assert.equal(validate({ expected: "expected-after" }), null);
  assert.equal(validate({}), "counterfactual_expected_fact_unchanged");
  assert.equal(
    validate({
      expected: "expected-after",
      preserved: "preserved-after",
    }),
    "counterfactual_unexpected_fact_impact",
  );
  assert.equal(
    validate({ expected: "expected-after", unlisted: "unlisted-after" }),
    "counterfactual_unexpected_fact_impact",
  );
  assert.equal(
    validate({ expected: "expected-after", fanout: "fanout-after" }),
    null,
  );
});

test("behavioral Claim proof needs semantic replacement even with an unrelated Artifact", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const control =
      fixture.contract.outcomes[0].acceptance.counterfactual_controls[0];
    control.claims = [
      "semantic_fact.fact.first.observable",
      "semantic_fact.fact.first.architecture-boundary",
    ];
    control.expected_assertion_failures = [
      "first-semantic-fact",
      "first-architecture-semantic-fact",
    ];
    assert.ok(
      fixture.contract.outcomes[0].acceptance.checks[0].artifact_globs.length,
    );
    await assertActivationRejects(fixture, {
      code: "behavioral_semantic_counterfactual_required",
      includes: ["first-check", "first-result"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("carrier removal cannot substitute for a behavioral semantic witness", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const control =
      fixture.contract.outcomes[0].acceptance.counterfactual_controls[0];
    control.mutation = { type: "remove_paths", paths: ["src/state.json"] };
    await assertActivationRejects(fixture, {
      code: "behavioral_semantic_counterfactual_required",
      includes: ["first-result"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a semantic witness on another Check cannot satisfy the current Check", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const first = outcome.acceptance.checks[0];
    const second = structuredClone(first);
    const otherApplicability = structuredClone(outcome.applicability[0]);
    otherApplicability.key = "first-other-check-success";
    otherApplicability.dimensions = [
      { key: "fixture-state", value: "other-loaded" },
    ];
    outcome.applicability.push(otherApplicability);
    outcome.product.result_applicability_refs.push(otherApplicability.key);
    const architectureFactBinding =
      outcome.semantic_fact_bindings.facts.find((binding) =>
        binding.fact_ref.endsWith(".architecture-boundary"),
      );
    const architectureFactAssertion = first.positive_assertions.find(
      (assertion) => assertion.key === "first-architecture-semantic-fact",
    );
    assert.ok(architectureFactBinding);
    assert.ok(architectureFactAssertion);
    architectureFactBinding.applicability_ref = otherApplicability.key;
    architectureFactAssertion.applicability_ref = otherApplicability.key;
    second.key = "second-check";
    process.env.TY_CONTEXT_SENSITIVITY_OTHER_CHECK ??= "fixture-other-check";
    second.environment_requirements = [
      {
        key: "other-check-scope",
        kind: "env_var",
        target: "TY_CONTEXT_SENSITIVITY_OTHER_CHECK",
      },
    ];
    second.positive_assertions = second.positive_assertions.filter(
      (assertion) => ["first-result", "first-liveness"].includes(assertion.key),
    );
    const otherResultAssertion = second.positive_assertions.find(
      (assertion) => assertion.key === "first-result",
    );
    assert.ok(otherResultAssertion);
    otherResultAssertion.applicability_ref = otherApplicability.key;
    second.negative_assertions = [];
    outcome.acceptance.checks.push(second);
    const semanticControl = outcome.acceptance.counterfactual_controls[0];
    const otherCheckControl = structuredClone(semanticControl);
    semanticControl.claims = [
      "semantic_fact.fact.first.observable",
      "semantic_fact.fact.first.architecture-boundary",
    ];
    semanticControl.expected_assertion_failures = [
      "first-semantic-fact",
      "first-architecture-semantic-fact",
    ];
    otherCheckControl.key = "other-check-behavior";
    otherCheckControl.check_key = second.key;
    otherCheckControl.claims = ["result"];
    otherCheckControl.expected_assertion_failures = ["first-result"];
    outcome.acceptance.counterfactual_controls.push(otherCheckControl);
    await assertActivationRejects(fixture, {
      code: "behavioral_semantic_counterfactual_required",
      includes: ["first-check", "first-result"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("every behavioral Assertion needs an attributable semantic witness", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const control =
      fixture.contract.outcomes[0].acceptance.counterfactual_controls[0];
    control.claims = control.claims.filter(
      (claim) => claim !== "requirement.observe-first",
    );
    control.expected_assertion_failures =
      control.expected_assertion_failures.filter(
        (assertion) => assertion !== "first-requirement",
      );
    await assertActivationRejects(fixture, {
      code: "behavioral_semantic_counterfactual_required",
      includes: ["first-requirement"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("semantic replacement must preserve an independent target liveness witness", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.outcomes[0].acceptance.counterfactual_controls[0].preserved_assertions =
      [];
    await assertActivationRejects(fixture, {
      code: "behavioral_counterfactual_liveness_witness_required",
      includes: ["first-result"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a presence-only assertion is not a target liveness witness", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const liveness =
      fixture.contract.outcomes[0].acceptance.checks[0].positive_assertions.find(
        (assertion) => assertion.key === "first-liveness",
      );
    liveness.evidence_capabilities = ["presence"];
    await assertActivationRejects(fixture, {
      code: "behavioral_counterfactual_liveness_witness_required",
      includes: ["first-result"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a result witness remains rooted in at least one atomic non-result Claim", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const original = outcome.acceptance.counterfactual_controls[0];
    original.claims = original.claims.filter((claim) => claim !== "result");
    original.expected_assertion_failures =
      original.expected_assertion_failures.filter(
        (assertion) => assertion !== "first-result",
      );
    outcome.acceptance.counterfactual_controls.push(
      counterfactual({
        key: "result-only-witness",
        checkKey: "first-check",
        claims: ["result"],
        assertionKeys: ["first-result"],
      }),
    );
    await assertActivationRejects(fixture, {
      code: "structured_result_counterfactual_non_result_required",
      includes: ["first-result"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("a currently bad carrier may compile but cannot pass the Final Gate", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: false,
        second: false,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await writeContract(fixture.workdir, fixture.contract);
    await assert.doesNotReject(
      import("../../packages/ty-context/dist/lib/long-task-delivery-compiler.js").then(
        ({ compileDeliveryContract }) =>
          compileDeliveryContract(fixture.workdir, fixture.root, {
            require_completion_gate: false,
          }),
      ),
    );
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const rejected = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(rejected.workflow_status, "needs_work");
    assert.notEqual(rejected.workflow_status, "machine_accepted");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("one semantic Counterfactual may cover multiple related Claims", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await assertActivationReady(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
