import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { generateClaims } from "../../packages/ty-context/dist/lib/long-task-claim-definitions.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";

test("browser Playwright cannot machine-close declared obligations", async (t) => {
  for (const weak of [false, true])
    await t.test(weak ? "weak observability" : "standard risk", async () => {
      const fixture = await createDeliveryFixture();
      try {
        await configureMachinePlaywright(fixture, { weak });
        await assertUnsupportedMachineObserver(fixture);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }
    });
});

test("a complete project-authored UI Counterfactual cannot admit the browser observer", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await configureMachinePlaywright(fixture, { weak: true });
    const outcome = fixture.contract.outcomes[0];
    assert.ok(outcome.acceptance.counterfactual_controls.length > 0);
    assert.ok(
      outcome.acceptance.counterfactual_controls.some((control) =>
        control.claims.includes("semantic_fact.fact.first.observable"),
      ),
    );
    await assertUnsupportedMachineObserver(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("unsupported browser obligations can proceed only as blocking External Confirmation", async () => {
  const fixture = await createDeliveryFixture();
  try {
    routeUnsupportedBrowserToExternalConfirmation(fixture.contract);
    await writeContract(fixture.workdir, fixture.contract);

    const preflight = await preflightDeliveryContract(
      fixture.workdir,
      fixture.root,
    );
    assert.equal(preflight.status, "ready", JSON.stringify(preflight));

    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.deepEqual(status.outcomes, { first: "blocked_external" });
    assert.deepEqual(status.stages, { first: "blocked_external" });

    const final = await runCliFailure(fixture.root, [
      "long-task",
      "final-gate",
      fixture.workdir,
    ]);
    assert.equal(
      final.workflow_status,
      "blocked_external",
      JSON.stringify(final, null, 2),
    );
    assert.notEqual(final.workflow_status, "machine_accepted");
    assert.notEqual(final.workflow_status, "machine_accepted_external_pending");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

async function configureMachinePlaywright(fixture, { weak }) {
  await writeFile(
    path.join(fixture.root, "tests", "ui.spec.ts"),
    [
      "// Project-authored browser diagnostics are intentionally non-authoritative.",
      "// [ac:first-result]",
      "// [ac:first-semantic-fact]",
      "// [ac:first-requirement]",
      "// [ac:first-obligation]",
      "// [ac:first-architecture]",
      "// [ac:first-relations-na]",
      "// [ac:first-liveness]",
      "",
    ].join("\n"),
  );
  const outcome = fixture.contract.outcomes[0];
  const target = fixture.contract.task.execution_targets[0];
  target.runtime_family = "browser";
  target.capabilities = ["browser-runtime", "cold-start", "production-root"];

  const check = outcome.acceptance.checks[0];
  check.proof_surface = "ui_browser";
  check.runner = {
    type: "playwright_test",
    target: "tests/ui.spec.ts",
    argv: [],
    cwd: ".",
    timeout_ms: 30_000,
    effect: "test_sandbox",
    retry_policy: "none",
    idempotent: false,
  };
  check.verification_inputs = ["tests/ui.spec.ts", "tests/semantic-false.json"];
  check.input_paths = [];
  check.artifact_globs = ["artifacts/proof.json"];
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    assertion.observation = `playwright.case.${assertion.key}.passed`;
    assertion.evidence_capabilities = assertion.claims.length
      ? ["interaction_trace", "target_runtime"]
      : ["target_runtime"];
    assertion.operator = "equals";
    assertion.expected = true;
  }
  outcome.semantic_fact_bindings.proofs[0].proof_surface = "ui_browser";
  outcome.product.requirements[0].required_proof_surfaces = ["ui_browser"];
  for (const obligation of outcome.technical.obligations)
    obligation.required_proof_surfaces = ["ui_browser"];
  if (weak) fixture.contract.risk.facts.weak_observability = ["first"];
  await synchronizeFixtureExecutionTargetSource(fixture.root, fixture.contract);
  await writeContract(fixture.workdir, fixture.contract);
}

async function assertUnsupportedMachineObserver(fixture) {
  await writeContract(fixture.workdir, fixture.contract);
  const preflight = await preflightDeliveryContract(
    fixture.workdir,
    fixture.root,
  );
  assert.equal(preflight.status, "not_ready");
  const diagnostic = preflight.diagnostics.find(
    (item) =>
      item.code === "unsupported_observer_requires_external_confirmation",
  );
  assert.ok(diagnostic, JSON.stringify(preflight));
  assert.match(JSON.stringify(diagnostic), /browser|ui_browser/u);
  await assert.rejects(
    compileDeliveryContract(fixture.workdir, fixture.root, {
      require_completion_gate: false,
    }),
    /unsupported_observer_requires_external_confirmation/u,
  );
}

function routeUnsupportedBrowserToExternalConfirmation(contract) {
  const outcome = contract.outcomes[0];
  const semanticClaim = "semantic_fact.fact.first.observable";
  const semanticProductClaim = `first.${semanticClaim}`;
  const impactClaims = generateClaims(outcome)
    .map((claim) => claim.id)
    .filter((claim) => claim !== semanticProductClaim);
  outcome.product.requirements[0].required_proof_surfaces = ["ui_browser"];
  for (const obligation of outcome.technical.obligations)
    obligation.required_proof_surfaces = ["ui_browser"];
  const check = outcome.acceptance.checks[0];
  for (const assertion of [
    ...check.positive_assertions,
    ...check.negative_assertions,
  ]) {
    assertion.claims = assertion.claims.filter(
      (claim) => claim === semanticClaim,
    );
    if (!assertion.claims.length) delete assertion.applicability_ref;
  }
  const semanticCounterfactual =
    outcome.acceptance.counterfactual_controls.find((control) =>
      control.claims.includes(semanticClaim),
    );
  semanticCounterfactual.claims = [semanticClaim];
  semanticCounterfactual.expected_assertion_failures = ["first-semantic-fact"];
  semanticCounterfactual.allowed_fanout_assertions = [
    "first-result",
    "first-requirement",
    "first-obligation",
    "first-architecture",
  ];
  outcome.acceptance.counterfactual_controls = [semanticCounterfactual];
  contract.global.acceptance.external_confirmations = [
    {
      key: "browser-observation-confirmation",
      description:
        "Confirm the unsupported browser observations outside machine authority.",
      owner: "external-browser-owner",
      kind: "functional_prerequisite",
      impact_claims: impactClaims,
      blocks_target: true,
    },
  ];
}
