import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preflightDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-authoring-preflight.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import {
  createDeliveryFixture,
  runCli,
  runCliFailure,
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { mutateFixtureSemanticManifest } from "./long-task-semantic-fact-test-support.mjs";
import { FIXTURE_EXTERNAL_FACT_SPECS } from "./long-task-semantic-manifest-fixture.mjs";

test("browser Playwright cannot machine-close declared obligations", async (t) => {
  await t.test("standard risk", async () => {
    await assertPlaywrightCannotMachineClose({ weak: false });
  });
  await t.test("weak observability", async () => {
    await assertPlaywrightCannotMachineClose({ weak: true });
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
  const fixture = await createDeliveryFixture({ externalConfirmation: true });
  try {
    await routeUnsupportedBrowserToExternalConfirmation(fixture);
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

async function assertPlaywrightCannotMachineClose({ weak }) {
  const fixture = await createDeliveryFixture();
  try {
    await configureMachinePlaywright(fixture, { weak });
    await assertUnsupportedMachineObserver(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

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

async function routeUnsupportedBrowserToExternalConfirmation(fixture) {
  const { contract } = fixture;
  contract.task.target_profile.completion_authority = "declared_authorities";
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  assert.ok(
    check.positive_assertions.some(
      (assertion) =>
        assertion.key === "first-result" && assertion.claims.includes("result"),
    ),
    "browser External work must not erase the objective Machine result Claim",
  );
  const externalSpec = FIXTURE_EXTERNAL_FACT_SPECS[0];
  const externalClaimRef = `first.semantic_fact.${externalSpec.factKey}`;
  const proofBinding = outcome.semantic_fact_bindings.proofs.find(
    (binding) => binding.proof_ref === externalSpec.proofKey,
  );
  const sourceClaim = contract.source_claims.find(
    (claim) => claim.key === externalSpec.sourceKey,
  );
  assert.ok(proofBinding);
  assert.ok(sourceClaim);
  proofBinding.proof_surface = "ui_browser";
  contract.global.acceptance.external_confirmations = [
    {
      key: externalSpec.confirmationKey,
      description: sourceClaim.statement,
      owner: "external-browser-owner",
      kind: "functional_prerequisite",
      impact_claims: [externalClaimRef],
      blocks_target: true,
      actor: {
        id: "fixture-browser-observer",
        role: "authenticated browser observer",
        authority_kind: "external_system",
      },
      target_ref: "fixture-app",
      environment_identity: "fixture-browser-environment-v1",
      scenario: structuredClone(check.scenario),
      evidence_requirements: [
        {
          key: "browser-observation",
          statement: "Capture the exact browser result for every obligation.",
        },
      ],
      obligations: [
        {
          key: "confirm-external-browser-fact",
          claim_ref: externalClaimRef,
          applicability_ref: "first-root-success",
          fact_ref: externalSpec.factKey,
          proof_ref: externalSpec.proofKey,
          method: proofBinding.method,
          proof_surface: "ui_browser",
          evidence_capabilities: [...proofBinding.evidence_capabilities],
          expected_authority_ref: `semantic-proof:${externalSpec.proofKey}`,
          result_kind: "actual",
        },
      ],
    },
  ];
  await mutateFixtureSemanticManifest(fixture, (manifest) => {
    const proof = manifest.proof_obligations.find(
      (candidate) => candidate.key === externalSpec.proofKey,
    );
    assert.ok(proof);
    proof.proof_surface = "ui_browser";
  });
}
