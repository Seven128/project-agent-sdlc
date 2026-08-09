import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import YAML from "yaml";
import {
  createDeliveryFixture,
  deliveryContract,
  synchronizeFixtureExecutionTargetSource,
} from "./long-task-delivery-fixtures.mjs";
import { assertActivationRejects } from "./long-task-evidence-sensitivity-fixtures.mjs";

test("Population cannot substitute for an attributable per-applicability Assertion", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  check.positive_assertions = check.positive_assertions.filter(
    (assertion) => assertion.key !== "first-obligation",
  );
  outcome.acceptance.population = {
    check_key: check.key,
    universe_binding_key: "state-first",
    claims: ["obligation.implement-first"],
    observations: {
      universe_ids: "population.universe_ids",
      eligible_ids: "population.eligible_ids",
      observed_ids: "population.observed_ids",
      excluded_items: "population.excluded_items",
    },
    exclusion_rules: [],
  };
  assert.throws(
    () => parseDeliveryContractText(YAML.stringify(contract)),
    /product_claim_required_surfaces_missing:first:obligation\.implement-first:first-root-success:runtime_behavior/u,
  );
});

test("Population does not waive semantic sensitivity for its behavioral Assertion", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    outcome.acceptance.population = {
      check_key: check.key,
      universe_binding_key: "state-first",
      claims: ["obligation.implement-first"],
      observations: {
        universe_ids: "population.universe_ids",
        eligible_ids: "population.eligible_ids",
        observed_ids: "population.observed_ids",
        excluded_items: "population.excluded_items",
      },
      exclusion_rules: [],
    };
    const control = outcome.acceptance.counterfactual_controls[0];
    control.claims = ["semantic_fact.fact.first.observable"];
    control.expected_assertion_failures = ["first-semantic-fact"];
    await assertActivationRejects(fixture, {
      code: "behavioral_semantic_counterfactual_required",
      includes: ["first-obligation"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("unsupported Playwright machine observation requires External Confirmation", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    await writeFile(
      path.join(fixture.root, "tests", "ui.spec.ts"),
      `import { test, expect } from "@playwright/test";
test("first-result", async () => { expect(true).toBe(true); });
test("first-requirement", async () => { expect(true).toBe(true); });
test("first-architecture", async () => { expect(true).toBe(true); });
test("first-semantic-fact", async () => { expect(true).toBe(true); });
test("first-relations-na", async () => { expect(true).toBe(true); });
`,
    );
    outcome.technical.obligations = outcome.technical.obligations.filter(
      (obligation) => obligation.key === "architecture-first",
    );
    outcome.technical.obligations[0].required_proof_surfaces = ["ui_browser"];
    outcome.product.requirements[0].required_proof_surfaces = ["ui_browser"];
    fixture.contract.task.execution_targets[0].runtime_family = "browser";
    fixture.contract.task.execution_targets[0].capabilities = [
      "browser-runtime",
      "cold-start",
      "production-root",
    ];
    check.proof_surface = "ui_browser";
    check.runner.type = "playwright_test";
    check.runner.target = "tests/ui.spec.ts";
    check.runner.argv = [];
    check.runner.effect = "test_sandbox";
    check.runner.idempotent = false;
    check.verification_inputs = [
      "tests/ui.spec.ts",
      "tests/semantic-false.json",
    ];
    check.artifact_globs = ["artifacts/proof.json"];
    check.positive_assertions = [
      {
        key: "first-result",
        criterion: "The browser result is observable.",
        claims: ["result"],
        applicability_ref: "first-root-success",
        observation: "playwright.case.first-result.passed",
        evidence_capabilities: ["interaction_trace", "target_runtime"],
        operator: "equals",
        expected: true,
      },
      {
        key: "first-requirement",
        criterion: "The browser requirement is observable.",
        claims: ["requirement.observe-first"],
        applicability_ref: "first-root-success",
        observation: "playwright.case.first-requirement.passed",
        evidence_capabilities: ["interaction_trace", "target_runtime"],
        operator: "equals",
        expected: true,
      },
      {
        key: "first-architecture",
        criterion: "The architecture owner remains valid.",
        claims: ["obligation.architecture-first"],
        applicability_ref: "first-root-success",
        observation: "playwright.case.first-architecture.passed",
        evidence_capabilities: ["interaction_trace", "target_runtime"],
        operator: "equals",
        expected: true,
      },
      {
        key: "first-semantic-fact",
        criterion:
          "The atomic browser-visible semantic Fact remains Source-bound.",
        claims: ["semantic_fact.fact.first.observable"],
        applicability_ref: "first-root-success",
        observation: "playwright.case.first-semantic-fact.passed",
        evidence_capabilities: ["semantic_fact"],
        operator: "equals",
        expected: true,
      },
      {
        key: "first-liveness",
        criterion: "The browser target remains live.",
        claims: [],
        observation: "target_live",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
    ];
    check.negative_assertions = [
      {
        key: "first-relations-na",
        criterion: "The no-Control relation closure is enforced.",
        claims: ["control_relation_closure"],
        applicability_ref: "first-root-success",
        observation: "playwright.case.first-relations-na.passed",
        evidence_capabilities: ["interaction_trace", "target_runtime"],
        operator: "equals",
        expected: true,
      },
    ];
    outcome.acceptance.counterfactual_controls = [
      {
        key: "semantic-fact-only",
        binding_key: "state-first",
        claims: ["semantic_fact.fact.first.observable"],
        check_key: check.key,
        mutation: {
          type: "replace_json_value",
          path: "src/state.json",
          pointer: "/first",
          value: false,
        },
        expected_assertion_failures: ["first-semantic-fact"],
        preserved_assertions: ["first-liveness"],
      },
    ];
    await synchronizeFixtureExecutionTargetSource(
      fixture.root,
      fixture.contract,
    );
    await assertActivationRejects(fixture, {
      code: "unsupported_observer_requires_external_confirmation",
      includes: ["proof.first.observable.exact", "browser", "ui_browser"],
    });
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
