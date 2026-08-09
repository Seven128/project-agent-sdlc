import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  evaluateCheckEvidence,
  evaluateOutcomeCounterfactuals,
  isValidCounterfactualCheckResult,
} from "../../packages/ty-context/dist/lib/long-task-evidence-v2.js";
import { compileDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-delivery-compiler.js";
import { executeCheckRunner } from "../../packages/ty-context/dist/lib/long-task-check-runner.js";
import {
  createCounterfactualSandbox,
  removeCounterfactualSandboxRoot,
} from "../../packages/ty-context/dist/lib/long-task-counterfactual-sandbox.js";
import { validateCounterfactualBindingClaims } from "../../packages/ty-context/dist/lib/long-task-counterfactual-claim-policy.js";
import { prepareExecutionObservationGroup } from "../../packages/ty-context/dist/lib/long-task-execution-observation.js";
import { captureWorkspaceManifest } from "../../packages/ty-context/dist/lib/long-task-workspace.js";
import {
  createDeliveryFixture,
  deliveryContract,
  runCli,
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import { configurePackageObservationCase } from "./long-task-observer-trust-fixtures.mjs";
import {
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";
import {
  PROCESS_PRODUCT_STATE_PATH,
  PROCESS_PRODUCT_VERIFICATION_PATH,
  configureRepoProcessProductControl,
} from "./long-task-process-product-fixture.mjs";

const COUNTERFACTUAL_PRODUCT_PATH = "tests/counterfactual-product.mjs";

test("allowed fan-out Assertion references exist and remain disjoint from expected and preserved sets", () => {
  const contract = deliveryContract();
  const outcome = contract.outcomes[0];
  const check = outcome.acceptance.checks[0];
  const binding = outcome.technical.bindings.find(
    (candidate) => candidate.key === "state-first",
  );
  assert.ok(binding);
  const control = {
    key: "fanout-reference-policy",
    binding_key: binding.key,
    claims: ["result"],
    check_key: check.key,
    mutation: {
      type: "replace_json_value",
      path: "src/state.json",
      pointer: "/first",
      value: false,
    },
    expected_assertion_failures: ["first-result"],
    preserved_assertions: ["first-liveness"],
    allowed_fanout_assertions: ["first-relations-na"],
  };

  assert.doesNotThrow(() =>
    validateCounterfactualBindingClaims(outcome, control, binding),
  );
  assert.throws(
    () =>
      validateCounterfactualBindingClaims(
        outcome,
        {
          ...control,
          allowed_fanout_assertions: ["missing-assertion"],
        },
        binding,
      ),
    /counterfactual_assertion_unknown:first:fanout-reference-policy:missing-assertion/u,
  );
  for (const conflictingAssertion of ["first-result", "first-liveness"])
    assert.throws(
      () =>
        validateCounterfactualBindingClaims(
          outcome,
          {
            ...control,
            allowed_fanout_assertions: [conflictingAssertion],
          },
          binding,
        ),
      new RegExp(
        `counterfactual_fanout_assertion_conflict:counterfactual_assertion_unknown:first:fanout-reference-policy:${conflictingAssertion}`,
        "u",
      ),
      conflictingAssertion,
    );
});

test("Counterfactual result accepts optional fan-out failures but still requires every expected failure", () => {
  const result = (failedAssertions) => ({
    status: "assertion_failed",
    assertion_results: [
      "expected-a",
      "expected-b",
      "allowed-fanout",
      "unlisted",
    ].map((key) => ({
      key,
      passed: !failedAssertions.includes(key),
      status: failedAssertions.includes(key)
        ? "assertion_value_mismatch"
        : "passed",
    })),
    findings: failedAssertions.map((assertion_key) => ({
      code: "assertion_value_mismatch",
      assertion_key,
    })),
  });
  const expected = ["expected-a", "expected-b"];
  const allowedFanout = ["allowed-fanout"];

  assert.equal(
    isValidCounterfactualCheckResult(result(expected), expected, allowedFanout),
    true,
  );
  assert.equal(
    isValidCounterfactualCheckResult(
      result([...expected, "allowed-fanout"]),
      expected,
      allowedFanout,
    ),
    true,
  );
  assert.equal(
    isValidCounterfactualCheckResult(
      result(["expected-a", "allowed-fanout"]),
      expected,
      allowedFanout,
    ),
    false,
  );
  assert.equal(
    isValidCounterfactualCheckResult(
      result([...expected, "unlisted"]),
      expected,
      allowedFanout,
    ),
    false,
  );
});

test("claim-bearing package Counterfactual requires baseline raw and package observations", async () => {
  const { fixture, outcome, manifest } =
    await prepareStaticPackageCounterfactualCase();
  try {
    const findings = await evaluateOutcomeCounterfactuals(
      outcome,
      fixture.root,
      manifest,
    );
    assert.equal(findings.length, 1);
    assert.equal(findings[0].code, "counterfactual_integrity_failed");
    assert.equal(
      findings[0].actual.observation_impact_issue,
      "counterfactual_admitted_observation_required",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("package Counterfactual compares baseline and mutated actual through the manifest/raw bridge", async () => {
  const { fixture, outcome, manifest } =
    await prepareStaticPackageCounterfactualCase();
  try {
    const check = outcome.acceptance.checks.find(
      (candidate) => candidate.key === "first-static-check",
    );
    assert.ok(check);
    const prepared = await prepareExecutionObservationGroup({
      checks: [check],
      snapshot_root: fixture.root,
      workspace_manifest: manifest,
    });
    let raw;
    try {
      raw = await prepared.finalize(
        await executeCheckRunner(
          check,
          prepared.execution_root,
          prepared.runner_context,
        ),
      );
    } finally {
      await prepared.dispose();
    }
    assert.ok(raw.package_observations?.length);
    const baseline = await evaluateCheckEvidence(
      check,
      raw,
      fixture.root,
      outcome,
    );
    assert.equal(baseline.status, "passed", JSON.stringify(baseline.findings));
    const baselineExecutions = new Map([[check.raw_execution_identity, raw]]);

    assert.deepEqual(
      await evaluateOutcomeCounterfactuals(
        outcome,
        fixture.root,
        manifest,
        [],
        [baseline],
        baselineExecutions,
        outcome.acceptance.checks,
      ),
      [],
    );

    const unchanged = structuredClone(outcome);
    unchanged.acceptance.counterfactual_controls[0].mutation.pointer =
      "/observations/first-result";
    const findings = await evaluateOutcomeCounterfactuals(
      unchanged,
      fixture.root,
      manifest,
      [],
      [baseline],
      baselineExecutions,
      unchanged.acceptance.checks,
    );
    assert.equal(findings.length, 1);
    assert.equal(
      findings[0].actual.observation_impact_issue,
      "counterfactual_expected_fact_unchanged",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("process Counterfactual keeps the compiled closure identity and mutates only its production carrier", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await configureRepoProcessProductControl(fixture);
    const compiled = await compileDeliveryContract(
      fixture.workdir,
      fixture.root,
      { require_completion_gate: false },
    );
    const checks = compiled.outcomes.flatMap(
      (outcome) => outcome.acceptance.checks,
    );
    const manifest = await captureWorkspaceManifest(
      fixture.root,
      fixture.workdir,
    );
    const prepared = await prepareExecutionObservationGroup({
      checks,
      snapshot_root: fixture.root,
      workspace_manifest: manifest,
    });
    let raw;
    try {
      raw = await prepared.finalize(
        await executeCheckRunner(
          checks[0],
          prepared.execution_root,
          prepared.runner_context,
        ),
      );
    } finally {
      await prepared.dispose();
    }
    const outcome = compiled.outcomes[0];
    const check = outcome.acceptance.checks[0];
    const baseline = await evaluateCheckEvidence(
      check,
      raw,
      fixture.root,
      outcome,
    );
    assert.equal(baseline.status, "passed", JSON.stringify(baseline.findings));
    assert.equal(
      raw.host_execution_attestation.process_runtime_closure_identity,
      check.process_runtime_closure.closure_identity,
    );
    assert.ok(
      check.process_runtime_closure.production_carrier_files.includes(
        PROCESS_PRODUCT_STATE_PATH,
      ),
    );
    const baselineResults = [baseline];
    const baselineExecutions = new Map([[check.raw_execution_identity, raw]]);
    assert.deepEqual(
      await evaluateOutcomeCounterfactuals(
        outcome,
        fixture.root,
        manifest,
        [],
        baselineResults,
        baselineExecutions,
        checks,
      ),
      [],
    );

    const staleRaw = structuredClone(raw);
    staleRaw.host_execution_attestation.process_runtime_closure_identity =
      "f".repeat(64);
    let findings = await evaluateOutcomeCounterfactuals(
      {
        ...outcome,
        acceptance: {
          ...outcome.acceptance,
          counterfactual_controls: [
            outcome.acceptance.counterfactual_controls[0],
          ],
        },
      },
      fixture.root,
      manifest,
      [],
      baselineResults,
      new Map([[check.raw_execution_identity, staleRaw]]),
      checks,
    );
    assert.equal(findings.length, 1);
    assert.equal(
      findings[0].actual.observation_impact_issue,
      "process_runtime_closure_identity_mismatch",
    );

    const nonCarrierMutation = structuredClone(outcome);
    nonCarrierMutation.acceptance.counterfactual_controls = [
      {
        ...nonCarrierMutation.acceptance.counterfactual_controls[0],
        mutation: {
          type: "replace_json_value",
          path: PROCESS_PRODUCT_VERIFICATION_PATH,
          pointer: "/kind",
          value: "mutated-verification-input",
        },
      },
    ];
    findings = await evaluateOutcomeCounterfactuals(
      nonCarrierMutation,
      fixture.root,
      manifest,
      [],
      baselineResults,
      baselineExecutions,
      checks,
    );
    assert.equal(findings.length, 1);
    assert.equal(
      findings[0].actual.observation_impact_issue,
      "counterfactual_runtime_reachability_unproven",
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

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
      evidence_capabilities: ["target_runtime"],
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
    configureCounterfactualProduct(fixture, check);
    await synchronizeFixtureExecutionTargetSource(
      fixture.root,
      fixture.contract,
    );
    await writeContract(fixture.workdir, fixture.contract);
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
      await evaluateCounterfactualsWithCurrentBaseline(
        compiled.outcomes[0],
        fixture,
      ),
      [],
    );
    const artifactFailure = structuredClone(compiled.outcomes[0]);
    artifactFailure.acceptance.checks[0].artifact_globs = [
      "artifacts/missing-proof.json",
    ];
    let findings = await evaluateCounterfactualsWithCurrentBaseline(
      artifactFailure,
      fixture,
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
    populationFailure.acceptance.counterfactual_controls = [
      populationFailure.acceptance.counterfactual_controls[0],
    ];
    findings = await evaluateCounterfactualsWithCurrentBaseline(
      populationFailure,
      fixture,
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
      findings = await evaluateCounterfactualsWithCurrentBaseline(
        candidate,
        fixture,
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
      await writeFile(
        path.join(fixture.root, "tests/helper.mjs"),
        "export {};\n",
      );
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
          /verification_input_overlaps_implementation|counterfactual_mutates_verification_input|process_runtime_input_verification_role_forbidden/u.test(
            error.stderr ?? "",
          ),
        target,
      );
    } finally {
      await rm(fixture.root, { recursive: true, force: true });
    }
  }
});

test("Counterfactual sparse sandbox includes only declared frozen Context inputs", async () => {
  const fixture = await createDeliveryFixture();
  try {
    const declaredContext = "project_context/global.md";
    const undeclaredContext = "project_context/architecture.md";
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context/compiled-contract.json"),
        "utf8",
      ),
    );
    const outcome = compiled.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.input_paths.push(declaredContext);
    const control = outcome.acceptance.counterfactual_controls[0];
    const binding = outcome.technical.bindings.find(
      (item) => item.key === control.binding_key,
    );
    const manifest = await captureWorkspaceManifest(
      fixture.root,
      fixture.workdir,
    );
    assert.ok(!manifest.files.some((file) => file.path === declaredContext));

    const sandbox = await createCounterfactualSandbox(
      fixture.root,
      check,
      control,
      binding.carrier_paths,
      manifest,
      compiled.context_snapshot.files,
    );
    try {
      assert.equal(
        await readFile(path.join(sandbox.root, declaredContext), "utf8"),
        await readFile(path.join(fixture.root, declaredContext), "utf8"),
      );
      await assert.rejects(
        readFile(path.join(sandbox.root, undeclaredContext), "utf8"),
        (error) => error?.code === "ENOENT",
      );
    } finally {
      await sandbox.dispose();
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
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
      evidence_capabilities: ["target_runtime"],
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

async function prepareStaticPackageCounterfactualCase() {
  const fixture = await createDeliveryFixture();
  try {
    await configurePackageObservationCase(fixture, {
      carrierPath: "dist/counterfactual-package-state.json",
      bindingPath: "dist/counterfactual-package-state.json",
      mutationPath: "dist/counterfactual-package-state.json",
      inputPaths: ["dist/counterfactual-package-state.json"],
      artifactGlobs: [],
      diagnosticArtifactPaths: ["artifacts/counterfactual-diagnostic.json"],
    });
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const compiled = JSON.parse(
      await readFile(
        path.join(fixture.workdir, ".ty-context/compiled-contract.json"),
        "utf8",
      ),
    );
    const outcome = structuredClone(compiled.outcomes[0]);
    outcome.acceptance.counterfactual_controls =
      outcome.acceptance.counterfactual_controls.filter(
        (control) => control.check_key === "first-static-check",
      );
    assert.equal(outcome.acceptance.counterfactual_controls.length, 1);
    return {
      fixture,
      outcome,
      manifest: await captureWorkspaceManifest(fixture.root, fixture.workdir),
    };
  } catch (error) {
    await rm(fixture.root, { recursive: true, force: true });
    throw error;
  }
}

async function writeOracle(root, mode) {
  await writeFile(
    path.join(root, "src", "counterfactual-mode.json"),
    `${JSON.stringify({ mode })}\n`,
  );
  await writeFile(
    path.join(root, ...COUNTERFACTUAL_PRODUCT_PATH.split("/")),
    `import { readFile } from "node:fs/promises";
let mode = "valid";
try { mode = JSON.parse(await readFile(new URL("../src/counterfactual-mode.json", import.meta.url), "utf8")).mode; } catch {}
if (mode === "timeout") await new Promise(() => {});
if (mode === "blocked") {
  console.log(JSON.stringify({ schema_version: "long-task-check-result-v3", execution_status: "blocked_external", reason: "fixture" }));
  process.exit(0);
}
if (mode === "invalid") {
  console.log("not-json");
  process.exit(0);
}
let state = { first: false, first_relations_applicable: false };
try { state = JSON.parse(await readFile(new URL("../src/state.json", import.meta.url), "utf8")); } catch {}
const observed = state.first === true;
const assertion = (key) => "assertion.first.first-check." + key;
const observations = {
  "fact.first.observable": observed,
  [assertion("first-result")]: observed,
  [assertion("first-requirement")]: observed,
  [assertion("first-obligation")]: observed,
  [assertion("first-architecture")]: observed,
  [assertion("first-liveness")]: mode === "observation-type" ? "not-a-boolean" : true,
  [assertion("first-relations-na")]: state.first_relations_applicable === true,
  [assertion("other-stays-true")]: mode !== "extra-failure"
};
if (mode === "observation-missing") delete observations[assertion("first-result")];
console.log(JSON.stringify({ schema_version: "ty-context-product-observation-v1", observations }));
`,
  );
}

async function evaluateCounterfactualsWithCurrentBaseline(outcome, fixture) {
  const manifest = await captureWorkspaceManifest(
    fixture.root,
    fixture.workdir,
  );
  const check = outcome.acceptance.checks[0];
  const prepared = await prepareExecutionObservationGroup({
    checks: [check],
    snapshot_root: fixture.root,
    workspace_manifest: manifest,
  });
  let raw;
  try {
    raw = await prepared.finalize(
      await executeCheckRunner(
        check,
        prepared.execution_root,
        prepared.runner_context,
      ),
    );
  } finally {
    await prepared.dispose();
  }
  const baseline = await evaluateCheckEvidence(
    check,
    raw,
    fixture.root,
    outcome,
  );
  return evaluateOutcomeCounterfactuals(
    outcome,
    fixture.root,
    manifest,
    [],
    [baseline],
    new Map([[check.raw_execution_identity, raw]]),
    outcome.acceptance.checks,
  );
}

function configureCounterfactualProduct(fixture, check) {
  const rootArgv = fixtureProductRootArgv(COUNTERFACTUAL_PRODUCT_PATH, "first");
  const target = fixture.contract.task.execution_targets[0];
  const outcome = fixture.contract.outcomes[0];
  target.root_entrypoint = fixtureProductRootPath();
  target.root_argv = rootArgv;
  check.runner.type = "project_binary";
  check.runner.target = fixtureProductRootPath();
  check.runner.argv = [...rootArgv];
  check.verification_inputs = ["tests/semantic-false.json"];
  check.input_paths.push("src/counterfactual-mode.json");
  outcome.product.owner.path_globs.push(COUNTERFACTUAL_PRODUCT_PATH);
  outcome.technical.allowed_support_paths.push(COUNTERFACTUAL_PRODUCT_PATH);
  outcome.technical.bindings.push(
    {
      key: "counterfactual-product-module",
      kind: "file",
      target: COUNTERFACTUAL_PRODUCT_PATH,
      carrier_paths: [COUNTERFACTUAL_PRODUCT_PATH],
      existence: "existing",
    },
    {
      key: "counterfactual-mode",
      kind: "file",
      target: "src/counterfactual-mode.json",
      carrier_paths: ["src/counterfactual-mode.json"],
      existence: "existing",
    },
  );
}
