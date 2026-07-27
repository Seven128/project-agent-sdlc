import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { parseDeliveryContractText } from "../../packages/ty-context/dist/lib/long-task-delivery-parser.js";
import {
  addProductionControlBinding,
  completeControl,
  createDeliveryFixture,
  deliveryContract,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("Requirement Claims require coverage on an allowed proof surface", () => {
  const uncovered = deliveryContract();
  uncovered.outcomes[0].acceptance.checks[0].positive_assertions =
    uncovered.outcomes[0].acceptance.checks[0].positive_assertions.filter(
      (assertion) => assertion.key !== "first-requirement",
    );
  assert.throws(
    () => parse(uncovered),
    /product_claim_required_surfaces_missing:first:requirement\.observe-first:first-root-success:runtime_behavior/u,
  );

  const wrongSurface = deliveryContract();
  wrongSurface.outcomes[0].product.requirements[0].required_proof_surfaces = [
    "ui_browser",
  ];
  assert.throws(
    () => parse(wrongSurface),
    /requirement_proof_surface_mismatch:first:requirement\.observe-first:runtime_behavior/u,
  );
});

test("Control Claims require a production target binding and target-local proof", () => {
  const legacy = deliveryContract();
  legacy.outcomes[0].product.controls.push(
    completeControl({
      key: "submit",
      surface: "settings",
      location: "settings footer",
      trigger: "",
    }),
  );
  delete legacy.outcomes[0].product.surface_bindings;
  assert.throws(
    () => parse(legacy),
    /long_task_delivery_v2_semantic_drift_migration_required:outcomes\[0\]\.product\.surface_bindings/u,
  );

  const uncovered = deliveryContract();
  uncovered.outcomes[0].product.controls.push(
    completeControl({
      key: "submit",
      surface: "settings",
      location: "settings footer",
      trigger: "activate",
    }),
  );
  addProductionControlBinding(uncovered, {
    controlKey: "submit",
    surfaceRef: "settings",
    rootClaimRef: "control.submit.location",
  });
  assert.throws(
    () => parse(uncovered),
    /ui_surface_binding_root_control_proof_missing:first:submit-fixture-app:submit:control\.submit\.trigger/u,
  );

  const proxy = deliveryContract();
  proxy.outcomes[0].product.controls.push(
    completeControl({
      key: "submit",
      surface: "settings",
      location: "settings footer",
      trigger: "click",
    }),
  );
  proxy.task.execution_targets.push({
    key: "fixture-browser",
    description: "The browser support surface.",
    role: "support",
    runtime_family: "browser",
    root_entrypoint: "/",
    capabilities: ["browser-runtime"],
  });
  addProductionControlBinding(proxy, {
    controlKey: "submit",
    surfaceRef: "settings",
    targetRef: "fixture-browser",
    rootClaimRef: "control.submit.location",
  });
  assert.throws(
    () => parse(proxy),
    /ui_surface_binding_product_target_required:first:submit-fixture-browser:fixture-browser/u,
  );

  const covered = deliveryContract();
  covered.outcomes[0].product.controls.push(
    completeControl({
      key: "submit",
      surface: "settings",
      location: "settings footer",
      trigger: "click",
    }),
  );
  addProductionControlBinding(covered, {
    controlKey: "submit",
    surfaceRef: "settings",
    rootClaimRef: "control.submit.trigger",
  });
  assert.doesNotThrow(() => parse(covered));
});

test("Source items map to Requirements or named Acceptance Assertions, never Outcome Result", () => {
  const requirement = deliveryContract();
  assert.doesNotThrow(() => parse(requirement));

  const result = deliveryContract();
  result.source_claims[0].disposition.refs = ["first.result"];
  assert.throws(
    () => parse(result),
    /source_claim_result_overcompression:first-observable:first\.result/u,
  );

  const acceptance = deliveryContract();
  acceptance.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.first-check.first-requirement"],
  };
  assert.doesNotThrow(() => parse(acceptance));

  const missingAcceptance = deliveryContract();
  missingAcceptance.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.first-check.missing-ac"],
  };
  assert.throws(
    () => parse(missingAcceptance),
    /source_claim_acceptance_ref_unknown/u,
  );

  const crossOutcome = deliveryContract({ twoOutcomes: true });
  crossOutcome.source_claims[0].disposition = {
    type: "acceptance",
    refs: ["first.second-check.second-result"],
  };
  assert.throws(
    () => parse(crossOutcome),
    /source_claim_acceptance_ref_unknown/u,
  );
});

test("Source external-confirmation refs must resolve", () => {
  const contract = deliveryContract();
  contract.global.acceptance.external_confirmations.push({
    key: "human-review",
    description: "A human reviews the result.",
    owner: "maintainer",
    kind: "field_validation",
    impact_claims: ["first.result"],
    blocks_target: false,
  });
  contract.source_claims[0].disposition = {
    type: "external_confirmation",
    refs: ["human-review"],
  };
  assert.doesNotThrow(() => parse(contract));

  contract.source_claims[0].disposition.refs = ["missing-review"];
  assert.throws(
    () => parse(contract),
    /source_claim_external_confirmation_ref_unknown/u,
  );
});

test("one Check cannot duplicate an Observation or use playwright.passed for fine-grained Claims", () => {
  const duplicate = deliveryContract();
  const check = duplicate.outcomes[0].acceptance.checks[0];
  check.positive_assertions.push({
    key: "duplicate-observation",
    criterion: "A second assertion reuses the same broad observation.",
    claims: ["result"],
    applicability_ref: "first-root-success",
    observation: check.positive_assertions[0].observation,
    evidence_capabilities: ["state_delta"],
    operator: "equals",
    expected: true,
  });
  assert.throws(
    () => parse(duplicate),
    /assertion_observation_duplicate:first:first-check/u,
  );

  const broad = deliveryContract();
  broad.task.execution_targets[0].runtime_family = "browser";
  broad.outcomes[0].acceptance.checks[0].runner.type = "playwright_test";
  broad.outcomes[0].acceptance.checks[0].runner.target = "tests/ui.spec.ts";
  broad.outcomes[0].acceptance.checks[0].proof_surface = "runtime_behavior";
  broad.outcomes[0].acceptance.checks[0].positive_assertions[0].observation =
    "playwright.passed";
  broad.outcomes[0].acceptance.checks[0].positive_assertions[0].evidence_capabilities = [
    "interaction_trace",
    "target_runtime",
  ];
  assert.throws(
    () => parse(broad),
    /playwright_claim_assertion_invalid:first:first-check:first-result/u,
  );
});

test("Compile validates real Source anchors and blocks decisions", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.source_claims[0].source_ref = "source.md#missing-anchor";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_anchor_not_found:first-observable:source\.md#missing-anchor/u,
    );

    fixture.contract.source_claims[0] = {
      key: "first-observable",
      source_ref: "source.md#fixture-source",
      statement: "The first outcome must be observable.",
      disposition: {
        type: "decision_required",
        reason: "Choose the final product behavior.",
      },
    };
    await writeFile(
      path.join(fixture.root, "source.md"),
      `<!-- ty-source-background:start key=fixture-heading reason=markdown-structure -->
<a id="fixture-source"></a>
<!-- ty-source-background:end -->

<!-- ty-source-item:start key=first-observable kind=decision -->
The first outcome must be observable.
<!-- ty-source-item:end -->
`,
    );
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      compileDeliveryContract(fixture.workdir, fixture.root, {
        require_completion_gate: false,
      }),
      /source_claim_decision_required:first-observable/u,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

function parse(contract) {
  return parseDeliveryContractText(YAML.stringify(contract));
}
