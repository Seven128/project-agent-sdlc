import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { executeCheckRunner } from "../../packages/ty-context/dist/lib/long-task-check-runner.js";
import { readCompiledDeliveryContract } from "../../packages/ty-context/dist/lib/long-task-state.js";
import {
  authorityReductionScenarios,
  inspectAuthorityRevisionCandidate,
  prepareAuthorityRevisionFixture,
} from "./long-task-authority-revision-fixture.mjs";
import {
  commitCandidate,
  createDeliveryFixture,
  pathExists,
  runCli,
  runCliFailure,
  synchronizeFixtureExecutionTargetSource,
  writeContract,
} from "./long-task-delivery-fixtures.mjs";
import {
  constantFixtureOracleSource,
  FIXTURE_GLOBAL_SCOPE_ENV,
  globalFixtureOracleSource,
  scopedFixtureOracleSource,
} from "./long-task-delegating-oracle-fixture.mjs";
import {
  fixtureProductRootArgv,
  fixtureProductRootPath,
} from "./long-task-package-machine-fixture.mjs";

test("Authority Revision separates user decisions from mechanically bounded repairs", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await prepareAuthorityRevisionFixture(fixture);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const initial = await readCompiledDeliveryContract(fixture.workdir);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    const baseline = structuredClone(fixture.contract);
    const withoutFlag = structuredClone(baseline);
    withoutFlag.outcomes[0].acceptance.checks[0].negative_assertions =
      withoutFlag.outcomes[0].acceptance.checks[0].negative_assertions.filter(
        (assertion) => assertion.key !== "negative-floor",
      );
    await writeContract(fixture.workdir, withoutFlag);
    await assert.rejects(
      () => runCli(fixture.root, ["long-task", "compile", fixture.workdir]),
      /authority_revision_requires_revise_flag/u,
    );
    for (const scenario of authorityReductionScenarios) {
      const candidate = structuredClone(baseline);
      scenario.mutate(candidate);
      await writeContract(fixture.workdir, candidate);
      const projection = await inspectAuthorityRevisionCandidate(
        fixture,
        initial,
      ).catch((error) => {
        error.message = `${scenario.name}: ${error.message}`;
        throw error;
      });
      assert.equal(
        projection.decision.user_decision_required,
        scenario.userDecisionRequired,
        scenario.name,
      );
      if (scenario.reason)
        assert.ok(
          projection.decision.approval_summary.protected_reasons.includes(
            scenario.reason,
          ),
          scenario.name,
        );
      if (scenario.userDecisionRequired) {
        assert.ok(
          projection.proposal.revision_diff[scenario.field].length > 0,
          scenario.name,
        );
        assert.equal(
          projection.proposal.user_decision_required,
          true,
          scenario.name,
        );
      } else {
        assert.notEqual(
          projection.decision.change_class,
          "protected_semantic_or_proof_change",
          scenario.name,
        );
      }
    }
    assert.equal(
      await pathExists(
        path.join(
          fixture.workdir,
          ".ty-context",
          "authority-revision-pending.json",
        ),
      ),
      false,
    );

    const uncoveredCounterfactual = structuredClone(baseline);
    uncoveredCounterfactual.outcomes[0].acceptance.counterfactual_controls = [];
    await writeContract(fixture.workdir, uncoveredCounterfactual);
    await assert.rejects(
      () =>
        runCli(fixture.root, [
          "long-task",
          "diagnose-revision",
          fixture.workdir,
        ]),
      /proof_counterfactual_required|behavioral_semantic_counterfactual_required/u,
    );

    await writeFile(
      path.join(fixture.root, "tests", "extra.mjs"),
      "export const extra = true;\n",
    );
    const addedInput = structuredClone(baseline);
    addedInput.outcomes[0].acceptance.checks[0].verification_inputs.push(
      "tests/extra.mjs",
    );
    await writeContract(fixture.workdir, addedInput);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    const added = await readCompiledDeliveryContract(fixture.workdir);
    assert.equal(added.authority_revision, 2);

    const tightened = structuredClone(addedInput);
    tightened.outcomes[0].technical.allowed_support_paths = [
      "bin/**",
      "tests/revision-oracle.mjs",
      "src/support/core/**",
      "artifacts/**",
      "tests/legacy-oracle.mjs",
    ];
    await writeContract(fixture.workdir, tightened);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    const revised = await readCompiledDeliveryContract(fixture.workdir);
    assert.deepEqual(revised.initial_task_base, initial.initial_task_base);
    assert.equal(revised.authority_revision, 3);
    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "unverified");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Authority Revision rejects a risk downgrade instead of approving it", async () => {
  const fixture = await createDeliveryFixture();
  try {
    fixture.contract.risk.requested_level = "strict";
    const outcome = fixture.contract.outcomes[0];
    const check = outcome.acceptance.checks[0];
    check.negative_assertions.push({
      key: "negative-floor",
      criterion: "The strict negative floor remains satisfied.",
      claims: [],
      observation: "result_copy",
      evidence_capabilities: ["presence"],
      operator: "equals",
      expected: false,
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    fixture.contract.risk.requested_level = "auto";
    await writeContract(fixture.workdir, fixture.contract);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
      /authority_risk_downgrade_rejected/,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("input and expected-output authority reductions cover Global and Outcome Checks", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await mkdir(path.join(fixture.root, "artifacts"), { recursive: true });
    await writeFile(
      path.join(fixture.root, "artifacts", "proof.json"),
      '{"proved":true}\n',
    );
    await writeFile(path.join(fixture.root, "src", "extra.json"), "true\n");
    await writeFile(
      path.join(fixture.root, "tests", "global-oracle.mjs"),
      globalFixtureOracleSource(),
    );
    const outcomeCheck = fixture.contract.outcomes[0].acceptance.checks[0];
    fixture.contract.outcomes[0].product.owner.path_globs.push("artifacts/**");
    fixture.contract.outcomes[0].technical.allowed_support_paths.push(
      "artifacts/**",
    );
    outcomeCheck.input_paths = ["src/state.json"];
    outcomeCheck.expected_output_paths = ["artifacts/proof.json"];
    outcomeCheck.verification_inputs = ["tests/semantic-false.json"];
    fixture.contract.global.technical.constraints.push({
      key: "stable-runtime",
      statement: "Runtime behavior remains stable.",
      applicability_refs: ["global-root-success"],
    });
    fixture.contract.global.applicability.push({
      key: "global-root-success",
      target_ref: "fixture-app",
      journey_role: "success",
      dimensions: [{ key: "fixture-state", value: "loaded" }],
      given_refs: ["fixture-loaded"],
      when_refs: ["read-outcome"],
    });
    const globalCheck = structuredClone(outcomeCheck);
    globalCheck.key = "global-check";
    globalCheck.verification_inputs = ["tests/semantic-false.json"];
    globalCheck.positive_assertions = [
      {
        key: "global-proof",
        criterion: "Runtime behavior remains stable.",
        claims: ["constraint.stable-runtime"],
        applicability_ref: "global-root-success",
        observation: "stable",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
      {
        key: "global-liveness",
        criterion: "The target remains live under semantic mutation.",
        claims: [],
        observation: "target_live",
        evidence_capabilities: ["target_runtime"],
        operator: "equals",
        expected: true,
      },
    ];
    globalCheck.negative_assertions = [];
    globalCheck.environment_requirements = [
      {
        key: "global-fixture-scope",
        kind: "env_var",
        target: FIXTURE_GLOBAL_SCOPE_ENV,
      },
    ];
    fixture.contract.global.acceptance.checks.push(globalCheck);
    await configureDirectProductScript(fixture, "tests/global-oracle.mjs", [
      outcomeCheck,
      globalCheck,
    ]);
    fixture.contract.global.acceptance.counterfactual_controls.push({
      key: "replace-global-runtime",
      binding_ref: "first.state-first",
      claims: ["constraint.stable-runtime"],
      check_key: "global-check",
      mutation: {
        type: "replace_json_value",
        path: "src/state.json",
        pointer: "/first",
        value: false,
      },
      expected_assertion_failures: ["global-proof"],
      preserved_assertions: ["global-liveness"],
    });
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    const strengthened = structuredClone(fixture.contract);
    for (const check of [
      strengthened.global.acceptance.checks[0],
      strengthened.outcomes[0].acceptance.checks[0],
    ]) {
      check.input_paths = ["src/state.json", "src/extra.json"];
      check.expected_output_paths = [
        "artifacts/proof.json",
        "artifacts/extra.json",
      ];
    }
    await writeContract(fixture.workdir, strengthened);
    await runCli(fixture.root, [
      "long-task",
      "compile",
      fixture.workdir,
      "--revise",
    ]);
    await runCli(fixture.root, ["long-task", "verify", fixture.workdir]);

    const weakened = structuredClone(strengthened);
    for (const check of [
      weakened.global.acceptance.checks[0],
      weakened.outcomes[0].acceptance.checks[0],
    ]) {
      check.input_paths = ["src/state.json"];
      check.expected_output_paths = ["artifacts/proof.json"];
    }
    await writeContract(fixture.workdir, weakened);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
      /authority_change_requires_user_decision/u,
    );
    let pending = JSON.parse(
      await readFile(
        path.join(
          fixture.workdir,
          ".ty-context/authority-revision-pending.json",
        ),
        "utf8",
      ),
    );
    assert.deepEqual(
      pending.revision_diff.input_paths_removed_or_narrowed.sort(),
      [
        "GLOBAL.global-check:src/extra.json",
        "first.first-check:src/extra.json",
      ],
    );
    assert.ok(
      pending.revision_diff.reduction_reasons.includes(
        "input_path_coverage_reduced",
      ),
    );
    assert.ok(
      pending.revision_diff.reduction_reasons.includes(
        "expected_output_requirement_weakened",
      ),
    );
    assert.ok(
      pending.revision_diff.expected_output_paths_removed_or_weakened.some(
        (entry) => entry.startsWith("GLOBAL.global-check:"),
      ),
    );
    assert.ok(
      pending.revision_diff.expected_output_paths_removed_or_weakened.some(
        (entry) => entry.startsWith("first.first-check:"),
      ),
    );

    const removed = structuredClone(strengthened);
    for (const check of [
      removed.global.acceptance.checks[0],
      removed.outcomes[0].acceptance.checks[0],
    ])
      check.expected_output_paths = [];
    await writeContract(fixture.workdir, removed);
    await assert.rejects(
      runCli(fixture.root, [
        "long-task",
        "compile",
        fixture.workdir,
        "--revise",
      ]),
      /authority_change_requires_user_decision/u,
    );
    pending = JSON.parse(
      await readFile(
        path.join(
          fixture.workdir,
          ".ty-context/authority-revision-pending.json",
        ),
        "utf8",
      ),
    );
    assert.equal(
      pending.revision_diff.expected_output_paths_removed_or_weakened.length,
      4,
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("per-Check progress accumulates and stales only on scoped inputs", async () => {
  const fixture = await createDeliveryFixture({ twoOutcomes: true });
  try {
    await writeFile(path.join(fixture.root, "src", "first.json"), "true\n");
    await writeFile(path.join(fixture.root, "src", "second.json"), "false\n");
    await writeFile(
      path.join(fixture.root, "tests", "scoped-oracle.mjs"),
      scopedFixtureOracleSource(),
    );
    await writeFile(
      path.join(fixture.root, "tests", "scoped-semantic-false.json"),
      "false\n",
    );
    await writeFile(
      path.join(fixture.root, "tests", "scoped-semantic-true.json"),
      "true\n",
    );
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: true,
        second: true,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    for (const outcome of fixture.contract.outcomes) {
      const check = outcome.acceptance.checks[0];
      check.verification_inputs = [
        "tests/oracle.mjs",
        `tests/scoped-semantic-${outcome.key === "first" ? "false" : "true"}.json`,
      ];
      check.input_paths = ["src/state.json", `src/${outcome.key}.json`];
      outcome.technical.bindings.push({
        key: `scoped-state-${outcome.key}`,
        kind: "file",
        target: `src/${outcome.key}.json`,
        carrier_paths: [`src/${outcome.key}.json`],
        existence: "existing",
      });
    }
    await configureDirectProductScript(
      fixture,
      "tests/scoped-oracle.mjs",
      fixture.contract.outcomes.map((outcome) => outcome.acceptance.checks[0]),
    );
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await runCli(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "second",
    ]);
    let status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");
    assert.equal(status.outcomes.second, "progress_failing");

    await writeFile(path.join(fixture.root, "src", "second.json"), "true\n");
    status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_passing");
    assert.equal(status.outcomes.second, "progress_stale");
    assert.equal(status.acceptance_authority, "live_final_gate_required");
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Counterfactual failure is persisted as failing Check Progress", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await writeFile(
      path.join(fixture.root, "tests", "constant-oracle.mjs"),
      constantFixtureOracleSource(),
    );
    const check = fixture.contract.outcomes[0].acceptance.checks[0];
    check.verification_inputs = [
      "tests/oracle.mjs",
      "tests/semantic-false.json",
    ];
    await configureDirectProductScript(fixture, "tests/constant-oracle.mjs", [
      check,
    ]);
    await writeContract(fixture.workdir, fixture.contract);
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    const failed = await runCliFailure(fixture.root, [
      "long-task",
      "verify",
      fixture.workdir,
      "--outcome",
      "first",
    ]);
    const result = failed.check_results.find(
      (item) => item.check_key === "first-check",
    );
    assert.equal(result.status, "invalid_evidence");
    assert.deepEqual(result.claim_proofs, []);
    assert.ok(
      result.findings.some(
        (finding) => finding.code === "counterfactual_integrity_failed",
      ),
    );
    assert.equal(
      failed.findings.filter(
        (finding) => finding.code === "counterfactual_integrity_failed",
      ).length,
      2,
    );

    const status = await runCli(fixture.root, [
      "long-task",
      "status",
      fixture.workdir,
    ]);
    assert.equal(status.outcomes.first, "progress_failing");
    assert.ok(
      status.findings.some(
        (finding) => finding.code === "counterfactual_integrity_failed",
      ),
    );
    const resume = await runCli(fixture.root, [
      "long-task",
      "resume",
      fixture.workdir,
    ]);
    assert.equal(resume.outcomes.first, "progress_failing");
    assert.ok(
      resume.recent_findings.some(
        (finding) => finding.code === "counterfactual_integrity_failed",
      ),
    );
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("Live Final Gate rejects dirty state and accepts one clean Git-tree snapshot", async () => {
  const fixture = await createDeliveryFixture();
  try {
    await runCli(fixture.root, ["enable", "long-task"]);
    await runCli(fixture.root, ["long-task", "compile", fixture.workdir]);
    await writeFile(
      path.join(fixture.root, "src", "state.json"),
      `${JSON.stringify({
        first: true,
        second: true,
        first_relations_applicable: false,
        second_relations_applicable: false,
      })}\n`,
    );
    await assert.rejects(
      () =>
        runCli(fixture.root, ["long-task", "final-gate", fixture.workdir], {
          skipCandidateCommit: true,
        }),
      /final_gate_requires_clean_candidate_commit/,
    );
    await commitCandidate(fixture.root);
    const accepted = await runCli(
      fixture.root,
      ["long-task", "final-gate", fixture.workdir],
      { skipCandidateCommit: true },
    );
    assert.equal(accepted.workflow_status, "machine_accepted");
    assert.equal(accepted.authority_scope, "audit_only");
    assert.equal(accepted.reusable_for_acceptance, false);
    assert.ok(accepted.snapshot_preparation_ms < 5000);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("runner retries only an explicitly safe infrastructure failure", async () => {
  const root = path.resolve(".");
  const base = {
    internal_id: "CHECK.fixture.retry",
    outcome_key: "fixture",
    key: "retry",
    proof_surface: "runtime_behavior",
    runner: {
      type: "node_oracle",
      target: "tests/timeout.mjs",
      argv: [],
      cwd: ".",
      timeout_ms: 100,
      effect: "read_only",
      retry_policy: "transient_once",
      idempotent: true,
      executable: process.execPath,
      executable_argv_prefix: ["-e", "setInterval(() => {}, 1000)"],
      resolved_cwd: "",
      resolved_target: "tests/timeout.mjs",
      definition_sha256: "x",
      raw_execution_identity: "x",
      execution_identity: "x",
      frozen_files: {},
      package_script: null,
    },
    verification_input_hashes: {},
    input_paths: [],
    expected_output_paths: [],
    artifact_globs: [],
    positive_assertions: [],
    negative_assertions: [],
    environment_requirements: [],
  };
  const safe = await executeCheckRunner(base, root);
  assert.equal(safe.attempts, 2);
  assert.equal(safe.execution_status, "infrastructure_error");
  const unsafe = await executeCheckRunner(
    { ...base, runner: { ...base.runner, idempotent: false } },
    root,
  );
  assert.equal(unsafe.attempts, 1);
});

async function configureDirectProductScript(fixture, script, checks) {
  const { contract } = fixture;
  const rootArgv = fixtureProductRootArgv(script, "first");
  const target = contract.task.execution_targets[0];
  target.root_entrypoint = fixtureProductRootPath();
  target.root_argv = rootArgv;
  for (const check of checks) {
    check.runner.type = "project_binary";
    check.runner.target = fixtureProductRootPath();
    check.runner.argv = [...rootArgv];
    check.runner.idempotent = true;
  }
  for (const outcome of contract.outcomes) {
    const productModule = outcome.technical.bindings.find(
      (binding) => binding.key === `product-module-${outcome.key}`,
    );
    productModule.target = script;
    productModule.carrier_paths = [script];
    outcome.product.owner.path_globs = outcome.product.owner.path_globs.filter(
      (entry) => entry !== "tests/oracle.mjs",
    );
    outcome.technical.allowed_support_paths =
      outcome.technical.allowed_support_paths.filter(
        (entry) => entry !== "tests/oracle.mjs",
      );
    if (!outcome.product.owner.path_globs.includes(script))
      outcome.product.owner.path_globs.push(script);
    if (!outcome.technical.allowed_support_paths.includes(script))
      outcome.technical.allowed_support_paths.push(script);
  }
  await synchronizeFixtureExecutionTargetSource(fixture.root, contract);
}
