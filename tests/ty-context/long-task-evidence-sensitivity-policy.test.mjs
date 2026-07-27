import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  createDeliveryFixture,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  assertActivationReady,
  assertActivationRejects,
  counterfactual,
} from "./long-task-evidence-sensitivity-fixtures.mjs";

test("behavioral Claim proof needs semantic replacement even with an unrelated Artifact", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.outcomes[0].acceptance.counterfactual_controls = [];
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
    second.key = "second-check";
    second.runner.argv = ["first", "second-check"];
    outcome.acceptance.checks.push(second);
    outcome.acceptance.counterfactual_controls[0].check_key = second.key;
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
    fixture.contract.outcomes[0].acceptance.counterfactual_controls[0]
      .preserved_assertions = [];
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

test("semantic replacement fixture must actually differ from the carrier", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests", "semantic-false.json"),
      `${JSON.stringify({ first: true, second: false })}\n`,
    );
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      import("../../packages/ty-context/dist/lib/long-task-delivery-compiler.js").then(
        ({ compileDeliveryContract }) =>
          compileDeliveryContract(fixture.workdir, fixture.root, {
            require_completion_gate: false,
          }),
      ),
      /counterfactual_replacement_must_change_carrier/u,
    );
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
