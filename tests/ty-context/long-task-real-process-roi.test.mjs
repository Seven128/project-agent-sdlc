import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  ADMISSION_THRESHOLDS,
  BASELINE_A_COMMIT,
  CASE_IDS,
  ISOLATED_ENVELOPE_B_COMMIT,
  REAL_PROCESS_ATTESTATION_SCHEMA,
  REAL_PROCESS_ROI_SCHEMA,
  REAL_PROCESS_RUN_SCHEMA,
  REQUIRED_METRICS,
  repeatOrder,
  variantDefinitions,
} from "../../tools/long_task_real_process_roi_policy.mjs";
import {
  canonical,
  deriveRealProcessRoiSummary,
  expansionDecision,
  measuredMetric,
  sha256,
  unverifiedMetric,
  validateRunRecord,
} from "../../tools/long_task_real_process_roi_scoring.mjs";
import {
  buildArtifactManifest,
  cleanupRealProcessRoiWorktrees,
  finalizeRealProcessRoiResources,
  realProcessRoiNpmCommandSpec,
} from "../../tools/long_task_real_process_roi_runner.mjs";
import { verifyRealProcessRoiReport } from "../../tools/verify_long_task_real_process_roi.mjs";
import { evaluateProductFacts } from "../../examples/delivery-benchmark/real-process-workload/product/facts.mjs";
import {
  evaluateCounterfactualGold,
  evaluateIndependentGold,
  loadSemanticGold,
} from "../../examples/delivery-benchmark/real-process-workload/runner/gold.mjs";
import { enableRealProcessRoiLongTaskProfile } from "../../examples/delivery-benchmark/real-process-workload/runner/workload-executor.mjs";
import {
  createWorkloadFixture,
  removeFixture,
} from "../../examples/delivery-benchmark/real-process-workload/runner/fixture-adapter.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const workloadRoot = path.join(
  root,
  "examples",
  "delivery-benchmark",
  "real-process-workload",
);
const fakeCandidate = "c".repeat(40);
const fakeTree = "d".repeat(40);
const digest = (value) => createHash("sha256").update(value).digest("hex");

test("real process ROI lifecycle enables Long-Task before Preflight", async () => {
  const calls = [];
  const result = await enableRealProcessRoiLongTaskProfile(async (...args) => {
    calls.push(args);
    return { status: 0 };
  }, "C:\\fixture\\cli.js");
  assert.equal(result.status, 0);
  assert.deepEqual(calls, [
    [
      "enable-long-task",
      process.execPath,
      ["C:\\fixture\\cli.js", "enable", "long-task"],
    ],
  ]);
  await assert.rejects(
    enableRealProcessRoiLongTaskProfile(
      async () => ({ status: 1 }),
      "C:\\fixture\\cli.js",
    ),
    /real_process_roi_enable_failed:1/u,
  );
});

test("real process ROI current control is Preflight-ready after the measured enable step", async () => {
  const fixture = await createWorkloadFixture({
    harnessRoot: root,
    variantId: "c",
    caseId: "correct-control",
    repeat: 1,
  });
  const cli = path.join(root, "packages", "ty-context", "dist", "cli.js");
  try {
    await enableRealProcessRoiLongTaskProfile(
      (_label, executable, args) =>
        execute(executable, args, { cwd: fixture.root }),
      cli,
    );
    await git(fixture.root, ["add", "-A"]);
    await git(fixture.root, [
      "commit",
      "--allow-empty",
      "-m",
      "roi-enable-preflight-control",
    ]);
    const preflight = await execute(
      process.execPath,
      [cli, "long-task", "preflight", fixture.workdir],
      { cwd: fixture.root },
    );
    assert.equal(preflight.status, 0, preflight.stderr || preflight.stdout);
    const parsed = JSON.parse(preflight.stdout);
    assert.equal(parsed.status, "ready");
    assert.deepEqual(parsed.diagnostics, []);
  } finally {
    await removeFixture(fixture);
  }
});

test("real process ROI setup routes every Windows npm command through ComSpec without collecting A/B/C", () => {
  const options = {
    platform: "win32",
    environment: { ComSpec: "C:\\Windows\\System32\\cmd.exe" },
  };
  for (const args of [
    ["ci"],
    ["run", "build", "--workspace", "project-tiny-context-harness"],
    [
      "pack",
      "--workspace",
      "project-tiny-context-harness",
      "--pack-destination",
      "C:\\tmp\\pack",
    ],
  ])
    assert.deepEqual(realProcessRoiNpmCommandSpec(args, options), {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "call", "npm", ...args],
    });
});

test("partial real process ROI setup explicitly removes a registered dirty worktree", async () => {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-roi-cleanup-test-"),
  );
  const repository = path.join(temporary, "repository");
  const checkout = path.join(temporary, "partial-variant");
  try {
    await mkdir(repository, { recursive: true });
    await git(repository, ["init", "-b", "main"]);
    await git(repository, ["config", "user.email", "fixture@example.invalid"]);
    await git(repository, ["config", "user.name", "Fixture"]);
    await writeFile(path.join(repository, "fixture.txt"), "baseline\n");
    await git(repository, ["add", "fixture.txt"]);
    await git(repository, ["commit", "-m", "fixture"]);
    await git(repository, ["worktree", "add", "--detach", checkout, "HEAD"]);
    await writeFile(path.join(checkout, "partial-install.txt"), "dirty\n");

    await cleanupRealProcessRoiWorktrees(repository, [checkout]);

    const worktrees = await git(repository, [
      "worktree",
      "list",
      "--porcelain",
    ]);
    assert.equal(
      normalizePath(worktrees.stdout).includes(normalizePath(checkout)),
      false,
    );
    await assert.rejects(readFile(path.join(checkout, "partial-install.txt")));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("real process ROI finalization attempts every resource and preserves primary plus cleanup failures", async () => {
  const calls = [];
  const primaryError = new Error("collection-failed");
  const worktreeError = new Error("worktree-cleanup-failed");
  const temporaryRootError = new Error("temporary-root-cleanup-failed");
  await assert.rejects(
    finalizeRealProcessRoiResources({
      repositoryRoot: "repository",
      checkouts: new Set(["checkout"]),
      temporaryRoot: "temporary-root",
      primaryError,
      cleanupWorktrees: async (repositoryRoot, checkouts) => {
        calls.push(["worktrees", repositoryRoot, [...checkouts]]);
        throw worktreeError;
      },
      removeTemporaryRoot: async (temporaryRoot) => {
        calls.push(["temporary-root", temporaryRoot]);
        throw temporaryRootError;
      },
    }),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.cause, primaryError);
      assert.deepEqual(error.errors, [
        primaryError,
        worktreeError,
        temporaryRootError,
      ]);
      return true;
    },
  );
  assert.deepEqual(calls, [
    ["worktrees", "repository", ["checkout"]],
    ["temporary-root", "temporary-root"],
  ]);
});

test("real process ROI policy permanently excludes A from safety and balances the first three repeats", () => {
  const variants = variantDefinitions(fakeCandidate);
  assert.equal(variants.a.commit, BASELINE_A_COMMIT);
  assert.equal(variants.a.safety_eligible, false);
  assert.equal(variants.a.comparison_role, "cost-and-error-baseline-only");
  assert.equal(variants.b.commit, ISOLATED_ENVELOPE_B_COMMIT);
  assert.equal(variants.b.safety_eligible, false);
  assert.equal(variants.c.safety_eligible, true);
  assert.deepEqual(repeatOrder(1), ["a", "b", "c"]);
  assert.deepEqual(repeatOrder(2), ["b", "c", "a"]);
  assert.deepEqual(repeatOrder(3), ["c", "a", "b"]);
  for (const variant of ["a", "b", "c"])
    assert.deepEqual(
      [1, 2, 3]
        .map((repeat) => repeatOrder(repeat).indexOf(variant) + 1)
        .sort(),
      [1, 2, 3],
    );
});

test("repository process product has eight fine-grained normal/degraded facts and one bounded multi-Fact envelope", async () => {
  const gold = await loadSemanticGold();
  for (const mode of ["normal", "degraded"])
    assert.deepEqual(
      Object.values(evaluateProductFacts(structuredClone(gold[mode]))),
      Array(8).fill(true),
    );
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-product-"));
  try {
    await mkdir(path.join(temporary, "src"), { recursive: true });
    await mkdir(path.join(temporary, "config"), { recursive: true });
    await cp(
      path.join(workloadRoot, "product", "product.mjs"),
      path.join(temporary, "src", "product.mjs"),
    );
    await cp(
      path.join(workloadRoot, "product", "facts.mjs"),
      path.join(temporary, "src", "facts.mjs"),
    );
    await writeFile(
      path.join(temporary, "config", "state.json"),
      `${JSON.stringify(gold.degraded)}\n`,
    );
    const result = await execute(
      process.execPath,
      [
        path.join(temporary, "src", "product.mjs"),
        "all",
        "--facts=src/facts.mjs",
      ],
      {
        env: {
          ...process.env,
          TY_CONTEXT_FIXTURE_FIRST_SCOPE: "inherited-concurrent-fixture",
          TY_CONTEXT_FIXTURE_SECOND_SCOPE: "inherited-concurrent-fixture",
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    const envelope = JSON.parse(result.stdout);
    assert.equal(envelope.schema_version, "ty-context-product-observation-v1");
    assert.equal(Object.keys(envelope.observations).length, 14);
    assert.equal(result.stdout.trim().split(/\r?\n/u).length, 1);

    const first = await execute(
      process.execPath,
      [
        path.join(temporary, "src", "product.mjs"),
        "first",
        "--facts=src/facts.mjs",
      ],
      {
        env: {
          ...process.env,
          TY_CONTEXT_FIXTURE_FIRST_SCOPE: "first-check",
          TY_CONTEXT_FIXTURE_SECOND_SCOPE: "",
        },
      },
    );
    const second = await execute(
      process.execPath,
      [
        path.join(temporary, "src", "product.mjs"),
        "first",
        "--facts=src/facts.mjs",
      ],
      {
        env: {
          ...process.env,
          TY_CONTEXT_FIXTURE_FIRST_SCOPE: "",
          TY_CONTEXT_FIXTURE_SECOND_SCOPE: "second-check",
        },
      },
    );
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    const firstEnvelope = JSON.parse(first.stdout);
    const secondEnvelope = JSON.parse(second.stdout);
    assert.equal(Object.keys(firstEnvelope.observations).length, 7);
    assert.equal(Object.keys(secondEnvelope.observations).length, 7);
    assert.equal("fact.first.observable" in firstEnvelope.observations, true);
    assert.equal("fact.second.observable" in firstEnvelope.observations, false);
    assert.equal("fact.first.observable" in secondEnvelope.observations, false);
    assert.equal("fact.second.observable" in secondEnvelope.observations, true);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("external gold independently detects wrong product and exact Counterfactual impact", async () => {
  const gold = await loadSemanticGold();
  const wrong = structuredClone(gold.normal);
  wrong.pricing.currency = "USD";
  const result = await evaluateIndependentGold({
    state: wrong,
    caseId: "wrong-product-value",
  });
  assert.equal(result.conformant, false);
  assert.equal(
    result.facts.find((fact) => fact.fact_id === "pricing-currency-cny")
      .matches,
    false,
  );
  const workload = JSON.parse(
    await readFile(path.join(workloadRoot, "workload.json"), "utf8"),
  );
  for (const mutation of workload.counterfactuals) {
    const impact = await evaluateCounterfactualGold({
      baseline: gold.normal,
      mutation,
    });
    assert.equal(impact.passed, true);
    assert.deepEqual(impact.changed_fact_ids, mutation.affected_fact_ids);
    assert.deepEqual(impact.unexpected_changed_fact_ids, []);
    assert.equal(impact.baseline_observation_count, 8);
    assert.equal(impact.mutated_observation_count, 8);
  }
});

test("scorer applies the safety floor before ROI and qualifies a stable positive C result", () => {
  const fixture = scoringFixture();
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.a_safety_eligible, false);
  assert.equal(summary.b_known_r9_r11_false_acceptance_reproduced, true);
  assert.equal(summary.candidate_safety_floor, true);
  assert.equal(summary.expansion.required_repeats, 3);
  assert.equal(summary.wins, 3);
  assert.equal(summary.total_roi_positive, true);
  assert.equal(summary.admission_verdict, "qualified_positive_roi");
});

test("a missing authoritative authoring-token event blocks positive ROI without weakening the safety result", () => {
  const fixture = scoringFixture();
  fixture.runs[0].metrics.authoring_token_count = unverifiedMetric(
    "tokens",
    "no provider usage event",
  );
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.candidate_safety_floor, true);
  assert.equal(summary.required_metrics_verified, false);
  assert.equal(summary.total_roi_positive, false);
  assert.equal(summary.admission_verdict, "invalid_evidence");
});

test("missing B false acceptance invalidates the evidence instead of making B look safer", () => {
  const fixture = scoringFixture();
  const b = fixture.runs.find((run) => run.variant_id === "b");
  const r9 = b.cases.find(
    (item) => item.case_id === "r9-evidence-role-runtime-input",
  );
  r9.workflow_status = "compile_rejected";
  b.metrics.false_completion_count.value -= 1;
  b.metrics.false_completion_rate.value =
    b.metrics.false_completion_count.value / 4;
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.b_known_r9_r11_false_acceptance_reproduced, false);
  assert.equal(summary.evidence_valid, false);
  assert.equal(summary.admission_verdict, "invalid_evidence");
});

test("high variance or inconsistent direction expands three repeats to five", () => {
  const fixture = scoringFixture();
  const cRuns = fixture.runs.filter((run) => run.variant_id === "c");
  cRuns[1].metrics.total_elapsed_ms.value = 3000;
  const expansion = expansionDecision(fixture.runs, fixture.config);
  assert.equal(expansion.required_repeats, 5);
  assert.ok(expansion.reasons.length > 0);
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.total_roi_positive, false);
  assert.equal(summary.admission_verdict, "requires_expanded_repeats");
});

test("run validation rejects metric tampering, duplicate cases and promoted A authority", () => {
  const fixture = scoringFixture();
  const run = structuredClone(fixture.runs[0]);
  delete run.metrics.compile_wall_ms;
  assert.throws(
    () => validateRunRecord(run, fixture.config),
    /real_process_roi_invalid:metric_set/u,
  );
  const duplicate = structuredClone(fixture.runs[0]);
  duplicate.cases[1] = structuredClone(duplicate.cases[0]);
  assert.throws(
    () => validateRunRecord(duplicate, fixture.config),
    /real_process_roi_invalid:run_case_set/u,
  );
  const promoted = structuredClone(
    fixture.runs.find((candidate) => candidate.variant_id === "a"),
  );
  promoted.safety_eligible = true;
  assert.throws(
    () => validateRunRecord(promoted, fixture.config),
    /real_process_roi_invalid:run_safety_role/u,
  );
  const missingRecovery = structuredClone(fixture.runs[0]);
  missingRecovery.recoveries.pop();
  assert.throws(
    () => validateRunRecord(missingRecovery, fixture.config),
    /real_process_roi_invalid:run_recovery_set/u,
  );
  const failedRecovery = structuredClone(fixture.runs[0]);
  failedRecovery.recoveries[0].workflow_status = "needs_work";
  failedRecovery.metrics.false_blocking_count.value = 1;
  failedRecovery.metrics.false_blocking_rate.value = 0.2;
  assert.equal(
    validateRunRecord(failedRecovery, fixture.config),
    failedRecovery,
  );
});

test("report verifier recomputes raw SHA closure, summary and verdict", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-report-"));
  try {
    const fixture = scoringFixture();
    await writeJson(path.join(temporary, "frozen-config.json"), fixture.config);
    await writeJson(
      path.join(temporary, "environment.json"),
      fixture.config.environment,
    );
    await writeIdentityFixture(
      temporary,
      "workload",
      fixture.config.workload_identity,
      "workload",
    );
    await writeIdentityFixture(
      temporary,
      "benchmark-implementation",
      fixture.config.benchmark_implementation_identity,
      "implementation",
    );
    const runRefs = [];
    for (const run of fixture.runs) {
      const relative = `raw/${run.variant_id}/repeat-${String(run.repeat).padStart(2, "0")}/run.json`;
      await writeRunRawFixture(temporary, relative, run);
      runRefs.push(relative);
    }
    const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
    const setup = await writeSetupFixture(temporary, fixture.config);
    const aggregate = {
      schema_version: REAL_PROCESS_ROI_SCHEMA,
      run_set_id: "fixture-run-set",
      purpose: fixture.config.purpose,
      safety_theorem_claimed: false,
      artifacts_are_non_authority: true,
      candidate_identity: { commit: fakeCandidate, tree: fakeTree },
      workload_sha256: fixture.config.workload_sha256,
      benchmark_implementation_sha256:
        fixture.config.benchmark_implementation_identity.identity_sha256,
      environment_identity: fixture.config.environment_identity,
      setup,
      summary,
      run_refs: runRefs,
    };
    await writeJson(path.join(temporary, "aggregate.json"), aggregate);
    const manifest = await buildArtifactManifest(temporary);
    await writeJson(path.join(temporary, "manifest.json"), manifest);
    const manifestBytes = await readFile(path.join(temporary, "manifest.json"));
    const aggregateBytes = await readFile(
      path.join(temporary, "aggregate.json"),
    );
    await writeJson(path.join(temporary, "attestation.json"), {
      schema_version: REAL_PROCESS_ATTESTATION_SCHEMA,
      run_set_id: "fixture-run-set",
      candidate_commit: fakeCandidate,
      candidate_tree: fakeTree,
      workload_sha256: fixture.config.workload_sha256,
      benchmark_implementation_sha256:
        fixture.config.benchmark_implementation_identity.identity_sha256,
      environment_identity: fixture.config.environment_identity,
      manifest_sha256: digest(manifestBytes),
      aggregate_sha256: digest(aggregateBytes),
      admission_verdict: summary.admission_verdict,
      total_roi_positive: true,
      a_safety_eligible: false,
      artifacts_are_non_authority: true,
      raw_promoted_to_gate: false,
    });
    const verified = await verifyRealProcessRoiReport(temporary, {
      expectedCandidate: fakeCandidate,
    });
    assert.equal(verified.total_roi_positive, true);
    assert.equal(verified.a_safety_eligible, false);

    const caseResultPath = path.join(
      temporary,
      "raw",
      "a",
      "repeat-01",
      "cases",
      "correct-control",
      "case-result.json",
    );
    const originalCaseResult = await readFile(caseResultPath);
    const tamperedCaseResult = JSON.parse(originalCaseResult);
    tamperedCaseResult.workflow_status = "needs_work";
    await writeJson(caseResultPath, tamperedCaseResult);
    await resignManifest(temporary);
    await assert.rejects(
      verifyRealProcessRoiReport(temporary),
      /real_process_roi_invalid:run_case_record/u,
    );
    await writeFile(caseResultPath, originalCaseResult);
    await resignManifest(temporary);

    fixture.runs[0].metrics.total_elapsed_ms.value += 1;
    await writeJson(
      path.join(temporary, ...runRefs[0].split("/")),
      fixture.runs[0],
    );
    await assert.rejects(
      verifyRealProcessRoiReport(temporary),
      /real_process_roi_invalid:manifest_recomputation/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

function scoringFixture() {
  const variants = variantDefinitions(fakeCandidate);
  const workloadIdentity = sourceIdentityFixture("workload.json", "workload");
  const implementationIdentity = sourceIdentityFixture(
    "runner.mjs",
    "implementation",
  );
  const environment = { platform: process.platform };
  const environmentIdentity = sha256(canonical(environment));
  const config = {
    schema_version: "long-task-real-process-roi-frozen-config-v1",
    purpose: "real-process-lifecycle-roi-only",
    safety_theorem_claimed: false,
    artifacts_are_non_authority: true,
    candidate_must_equal_head: true,
    candidate_is_head: true,
    candidate_worktree_clean: true,
    authoring_token_policy: {
      required_for_positive_roi: true,
      authoritative_source: "fixture provider usage event",
      surrogate_tokenizer_permitted: false,
      missing_value_status: "required-unverified",
      consequence: "positive ROI qualification is invalid",
    },
    variants,
    candidate_tree: fakeTree,
    workload_sha256: workloadIdentity.identity_sha256,
    workload_identity: workloadIdentity,
    benchmark_implementation_identity: implementationIdentity,
    environment,
    environment_identity: environmentIdentity,
    admission_thresholds: ADMISSION_THRESHOLDS,
  };
  const runs = [];
  for (let repeat = 1; repeat <= 3; repeat += 1) {
    const order = repeatOrder(repeat);
    for (const [position, variantId] of order.entries())
      runs.push(
        runFixture({
          variant: variants[variantId],
          repeat,
          position: position + 1,
          workloadSha256: config.workload_sha256,
          environmentIdentity,
          total:
            variantId === "a"
              ? 1600 + repeat * 10
              : variantId === "b"
                ? 1400 + repeat * 10
                : 1000 + repeat * 10,
        }),
      );
  }
  return { config, runs };
}

function runFixture({
  variant,
  repeat,
  position,
  workloadSha256,
  environmentIdentity,
  total,
}) {
  const cases = CASE_IDS.map((caseId) => caseFixture(variant.id, caseId));
  const recoveries = CASE_IDS.filter(
    (caseId) => caseId !== "correct-control",
  ).map((caseId) => recoveryFixture(caseId));
  const falseCompletionCount = cases.filter(
    (item) =>
      item.kind === "attack" && item.workflow_status === "machine_accepted",
  ).length;
  const metricValues = {
    authoring_active_ms: 100,
    authoring_token_count: 500,
    contract_bytes: 10000,
    effective_yaml_lines: 200,
    manual_source_reference_count: 10,
    preflight_repair_rounds: 0,
    compile_wall_ms: variant.id === "c" ? 105 : 100,
    compile_peak_rss_bytes: 100000,
    compiled_contract_bytes: 12000,
    authority_bytes: 12000,
    verify_wall_ms: variant.id === "c" ? 110 : 100,
    verify_snapshot_ms: 20,
    unique_raw_execution_ms: 50,
    counterfactual_wall_ms: variant.id === "c" ? 105 : 100,
    counterfactual_incremental_ms: variant.id === "c" ? 105 : 100,
    closure_copy_ms: variant.id === "c" ? 5 : 0,
    closure_copy_bytes: variant.id === "c" ? 5000 : 0,
    final_gate_wall_ms: variant.id === "c" ? 110 : 100,
    final_gate_snapshot_ms: 20,
    rework_count: 4,
    modification_rounds: 4,
    false_completion_count: falseCompletionCount,
    false_completion_rate: falseCompletionCount / 4,
    false_blocking_count: 0,
    false_blocking_rate: 0,
    correct_path_total_ms: variant.id === "c" ? 1100 : 1000,
    total_elapsed_ms: total,
    migration_ms: variant.id === "c" ? 5 : 0,
    runtime_owner_file_count: variant.id === "c" ? 13 : 6,
    runtime_owner_loc: variant.id === "c" ? 5000 : 3000,
    test_file_count: variant.id === "c" ? 8 : 4,
    test_loc: variant.id === "c" ? 4000 : 2000,
    peak_rss_bytes: 200000,
    spawned_process_count: 20,
    process_execution_count: 18,
    stdout_bytes: 5000,
  };
  const metrics = Object.fromEntries(
    REQUIRED_METRICS.map((name) => [
      name,
      name === "maintenance_minutes"
        ? unverifiedMetric("minutes", "fixture has no human time log")
        : name === "authoring_token_count"
          ? measuredMetric(
              metricValues[name],
              "tokens",
              "fixture provider usage event",
            )
          : measuredMetric(
              metricValues[name],
              name.endsWith("_ms")
                ? "ms"
                : name.endsWith("_bytes")
                  ? "bytes"
                  : "count",
              `fixture measurement for ${name}`,
            ),
    ]),
  );
  return {
    schema_version: REAL_PROCESS_RUN_SCHEMA,
    run_id: `${variant.id}-${repeat}`,
    variant_id: variant.id,
    repeat,
    invocation_position: position,
    safety_eligible: variant.safety_eligible,
    comparison_role: variant.comparison_role,
    candidate_identity: {
      commit: variant.commit,
      tree: fakeTree,
      clean: true,
      package_sha256: digest(`package-${variant.id}`),
      workload_sha256: workloadSha256,
    },
    environment_identity: environmentIdentity,
    started_at: "2026-08-10T00:00:00.000Z",
    completed_at: "2026-08-10T00:01:00.000Z",
    provenance_doubt_reasons: [],
    metrics,
    cases,
    recoveries,
    lifecycle_evidence: {
      raw_artifact_sha256: "a".repeat(64),
      command_count: 10,
      raw_artifacts_are_non_authority: true,
    },
  };
}

function recoveryFixture(sourceAttackCaseId) {
  const control = caseFixture("c", "correct-control");
  return {
    source_attack_case_id: sourceAttackCaseId,
    workflow_status: "machine_accepted",
    gold: control.gold,
    counterfactuals: control.counterfactuals,
    raw_execution: control.raw_execution,
    lifecycle: {
      authoring_ms: 10,
      preflight_ms: 10,
      compile_ms: 10,
      verify_ms: 10,
      final_gate_ms: 10,
      total_ms: 100,
    },
    command_record_refs: [
      `recoveries/after-${sourceAttackCaseId}/command.json`,
    ],
  };
}

function caseFixture(variantId, caseId) {
  const control = caseId === "correct-control";
  const machineAccepted =
    control ||
    variantId === "a" ||
    (variantId === "b" &&
      new Set([
        "r9-evidence-role-runtime-input",
        "r10-verification-role-runtime-input",
        "r11-source-wrong-execution-root",
      ]).has(caseId));
  const facts = Array.from({ length: 8 }, (_, index) => ({
    fact_id: `fact-${index}`,
    expected: true,
    actual: control,
    matches: control,
  }));
  const goldProjection = {
    schema_version: "long-task-real-process-gold-result-v1",
    observer: "real-process-gold-v1",
    independent_of_harness: true,
    case_id: caseId,
    semantic_conformant: control,
    boundary_conformant: true,
    conformant: control,
    facts,
  };
  const counterfactuals = control
    ? ["disable-checkout", "exceed-retry-budget"].map((id) => {
        const projection = {
          schema_version: "long-task-real-process-counterfactual-gold-v1",
          id,
          passed: true,
          baseline_observation_count: 8,
          mutated_observation_count: 8,
          changed_fact_ids: [id],
          affected_changed: true,
          preserved_unchanged: true,
          unexpected_changed_fact_ids: [],
        };
        return {
          ...projection,
          result_sha256: sha256(canonical(projection)),
          workflow_observed_passed: true,
        };
      })
    : [];
  return {
    case_id: caseId,
    kind: control ? "control" : "attack",
    mode:
      caseId.includes("r9") || caseId.includes("r11") ? "degraded" : "normal",
    workflow_status: machineAccepted ? "machine_accepted" : "needs_work",
    authority_boundary:
      variantId === "a"
        ? "legacy-project-self-report"
        : variantId === "b"
          ? "isolated-envelope-with-contract-owned-runtime"
          : "source-backed-isolated-process-runtime-closure",
    owner_diagnostic: machineAccepted ? null : "expected rejection",
    gold: {
      ...goldProjection,
      result_sha256: sha256(canonical(goldProjection)),
    },
    counterfactuals,
    raw_execution: {
      maximum_envelopes_per_execution: 1,
      minimum_observations_per_envelope: 6,
      observed_main_execution_count: 2,
    },
    lifecycle: {
      authoring_ms: 10,
      preflight_ms: 10,
      compile_ms: 10,
      verify_ms: 10,
      final_gate_ms: 10,
      snapshot_ms: 2,
      total_ms: 100,
    },
    command_record_refs: [`cases/${caseId}/command.json`],
    final_result_sha256: "c".repeat(64),
  };
}

async function execute(executable, args, options = {}) {
  const child = spawn(executable, args, {
    ...options,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const status = await new Promise((resolve) => child.once("close", resolve));
  return {
    status,
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
  };
}

async function git(cwd, args) {
  const result = await execute("git", args, { cwd });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function normalizePath(value) {
  return value.replaceAll("\\", "/").toLowerCase();
}

async function resignManifest(runSetRoot) {
  const manifest = await buildArtifactManifest(runSetRoot);
  await writeJson(path.join(runSetRoot, "manifest.json"), manifest);
  const attestationPath = path.join(runSetRoot, "attestation.json");
  const attestation = JSON.parse(await readFile(attestationPath, "utf8"));
  attestation.manifest_sha256 = digest(
    await readFile(path.join(runSetRoot, "manifest.json")),
  );
  await writeJson(attestationPath, attestation);
}

async function writeSetupFixture(runSetRoot, config) {
  const records = [];
  for (const variant of Object.values(config.variants)) {
    const packageBytes = Buffer.from(`package-${variant.id}`);
    const packagePath = `setup/${variant.id}/pack/${variant.id}.tgz`;
    const setupRoot = path.join(runSetRoot, "setup", variant.id);
    await mkdir(path.dirname(path.join(runSetRoot, packagePath)), {
      recursive: true,
    });
    await writeFile(path.join(runSetRoot, packagePath), packageBytes);
    const setupCommands = [];
    for (const label of [
      "git-worktree-add",
      "npm-ci",
      "package-build",
      "package-pack",
    ]) {
      const stdout = Buffer.from(`${label}\n`);
      const stderr = Buffer.alloc(0);
      const command = {
        schema_version: "long-task-real-process-host-command-v1",
        label,
        argv: [label],
        cwd: runSetRoot,
        started_at: "2026-08-10T00:00:00.000Z",
        completed_at: "2026-08-10T00:00:01.000Z",
        duration_ms: 1,
        status: 0,
        signal: null,
        spawn_error: null,
        stdout_bytes: stdout.length,
        stderr_bytes: stderr.length,
        stdout_sha256: digest(stdout),
        stderr_sha256: digest(stderr),
      };
      await writeFile(path.join(setupRoot, `${label}.stdout.log`), stdout);
      await writeFile(path.join(setupRoot, `${label}.stderr.log`), stderr);
      await writeJson(path.join(setupRoot, `${label}.command.json`), command);
      setupCommands.push(command);
    }
    const record = {
      variant_id: variant.id,
      commit: variant.commit,
      tree: fakeTree,
      package_path: `pack/${variant.id}.tgz`,
      package_sha256: digest(packageBytes),
      setup_commands: setupCommands,
    };
    await writeJson(path.join(setupRoot, "setup.json"), record);
    records.push(record);
  }
  return records;
}

async function writeIdentityFixture(runSetRoot, prefix, identity, contents) {
  assert.equal(identity.entries.length, 1);
  const entry = identity.entries[0];
  assert.equal(entry.bytes, Buffer.byteLength(contents));
  assert.equal(entry.sha256, digest(contents));
  const target = path.join(
    runSetRoot,
    "inputs",
    prefix,
    ...entry.path.split("/"),
  );
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeRunRawFixture(runSetRoot, runReference, run) {
  const runRoot = path.dirname(
    path.join(runSetRoot, ...runReference.split("/")),
  );
  const commandRefs = [
    ...run.cases.flatMap((item) => item.command_record_refs),
    ...run.recoveries.flatMap((item) => item.command_record_refs),
  ];
  const commands = [];
  await mkdir(path.join(runRoot, "logs"), { recursive: true });
  for (const [index, reference] of commandRefs.entries()) {
    const stdout = Buffer.from(`stdout-${index}\n`);
    const stderr = Buffer.alloc(0);
    const stdoutPath = `logs/${String(index + 1).padStart(3, "0")}.stdout.log`;
    const stderrPath = `logs/${String(index + 1).padStart(3, "0")}.stderr.log`;
    const command = {
      schema_version: "long-task-real-process-command-v1",
      index: index + 1,
      label: "fixture",
      argv: [process.execPath, "fixture"],
      cwd: runRoot,
      started_at: "2026-08-10T00:00:00.000Z",
      completed_at: "2026-08-10T00:00:01.000Z",
      duration_ms: 1,
      status: 0,
      signal: null,
      spawn_error: null,
      peak_rss_bytes: 1024,
      stdout_bytes: stdout.length,
      stderr_bytes: stderr.length,
      stdout_sha256: digest(stdout),
      stderr_sha256: digest(stderr),
      stdout_path: stdoutPath,
      stderr_path: stderrPath,
      relative_path: reference,
    };
    await mkdir(path.dirname(path.join(runRoot, reference)), {
      recursive: true,
    });
    await writeFile(path.join(runRoot, ...stdoutPath.split("/")), stdout);
    await writeFile(path.join(runRoot, ...stderrPath.split("/")), stderr);
    await writeJson(path.join(runRoot, ...reference.split("/")), command);
    commands.push(command);
  }
  for (const item of run.cases)
    await writeJson(
      path.join(runRoot, "cases", item.case_id, "case-result.json"),
      item,
    );
  for (const item of run.recoveries)
    await writeJson(
      path.join(
        runRoot,
        "recoveries",
        `after-${item.source_attack_case_id}`,
        "recovery-result.json",
      ),
      item,
    );
  run.lifecycle_evidence.command_count = commands.length;
  run.lifecycle_evidence.raw_artifact_sha256 = sha256(
    canonical({
      command_records: commands,
      cases: run.cases,
      recoveries: run.recoveries,
    }),
  );
  await writeFile(
    path.join(runRoot, "commands.ndjson"),
    `${commands.map((command) => JSON.stringify(command)).join("\n")}\n`,
  );
  await writeJson(path.join(runSetRoot, ...runReference.split("/")), run);
}

function sourceIdentityFixture(file, contents) {
  const entries = [
    {
      path: file,
      bytes: Buffer.byteLength(contents),
      sha256: digest(contents),
    },
  ];
  return {
    entries,
    identity_sha256: sha256(canonical(entries)),
  };
}
