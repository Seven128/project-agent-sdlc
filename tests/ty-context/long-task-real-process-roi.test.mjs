import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  cp,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  symlink,
  truncate,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  BASELINE_A_COMMIT,
  CASE_IDS,
  FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
  FORMAL_TOTAL_COST_CATEGORIES,
  ISOLATED_ENVELOPE_B_COMMIT,
  MEASUREMENT_THRESHOLDS,
  REAL_PROCESS_SCHEMAS,
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
import { evaluateFormalTotalCostEvidence } from "../../tools/long_task_formal_total_cost_evidence.mjs";
import {
  materializeFormalPrecollectionInputs,
  readFormalPrecollectionPlan,
} from "../../tools/long_task_formal_total_cost_precollection.mjs";
import { verifyRealProcessRoiReport } from "../../tools/verify_long_task_real_process_roi.mjs";
import { evaluateProductFacts } from "../../examples/delivery-benchmark/real-process-workload/product/facts.mjs";
import {
  evaluateCounterfactualGold,
  evaluateIndependentGold,
  loadSemanticGold,
} from "../../examples/delivery-benchmark/real-process-workload/runner/gold.mjs";
import {
  enableRealProcessRoiLongTaskProfile,
  executeRealProcessRoiLifecycle,
} from "../../examples/delivery-benchmark/real-process-workload/runner/workload-executor.mjs";
import {
  createWorkloadFixture,
  removeFixture,
} from "../../examples/delivery-benchmark/real-process-workload/runner/fixture-adapter.mjs";

const {
  REAL_PROCESS_ATTESTATION_SCHEMA,
  REAL_PROCESS_FROZEN_CONFIG_SCHEMA,
  REAL_PROCESS_ROI_SCHEMA,
  REAL_PROCESS_RUN_SCHEMA,
  REAL_PROCESS_SUMMARY_SCHEMA,
} = REAL_PROCESS_SCHEMAS;

const root = fileURLToPath(new URL("../..", import.meta.url));
const workloadRoot = path.join(
  root,
  "examples",
  "delivery-benchmark",
  "real-process-workload",
);
const accountingPolicyText = readFileSync(
  path.join(root, ...FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH.split("/")),
  "utf8",
);
const fakeCandidate = "c".repeat(40);
const fakeTree = "d".repeat(40);
const digest = (value) => createHash("sha256").update(value).digest("hex");

test("real process ROI CLI fails closed when a path option has no value", async () => {
  const cli = path.join(root, "tools", "verify_long_task_real_process_roi.mjs");
  for (const option of [
    "--candidate",
    "--report",
    "--formal-evidence",
    "--formal-evidence-plan",
    "--artifact-root",
  ]) {
    const result = await execute(process.execPath, [cli, option], { cwd: root });
    assert.notEqual(result.status, 0, option);
    assert.ok(
      result.stderr.includes(
        `real_process_roi_argument_value_required:${option}`,
      ),
      result.stderr,
    );
  }
});

test("real process ROI CLI rejects conflicting modes and ignored option scopes", async () => {
  const cli = path.join(root, "tools", "verify_long_task_real_process_roi.mjs");
  for (const [args, diagnostic] of [
    [
      ["--collect", "--candidate", fakeCandidate, "--report", "run-set"],
      "real_process_roi_mode_conflict",
    ],
    [
      ["--report", "run-set", "--formal-evidence-plan", "plan.json"],
      "real_process_roi_formal_evidence_plan_requires_collection",
    ],
    [
      ["--dry-run", "--candidate", fakeCandidate, "--formal-evidence", "packet.json"],
      "real_process_roi_formal_evidence_requires_report",
    ],
    [
      ["--dry-run", "--candidate", fakeCandidate, "--artifact-root", "artifacts"],
      "real_process_roi_artifact_root_requires_collection",
    ],
    [
      ["--report", "run-set", "--keep-worktrees"],
      "real_process_roi_keep_worktrees_requires_collection",
    ],
    [
      ["--collect", "--candidate", fakeCandidate, "--allow-rejected"],
      "real_process_roi_allow_rejected_requires_report",
    ],
  ]) {
    const result = await execute(process.execPath, [cli, ...args], { cwd: root });
    assert.notEqual(result.status, 0, args.join(" "));
    assert.ok(result.stderr.includes(diagnostic), result.stderr);
  }
});

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

test("real process ROI adapters preserve each historical runtime authority boundary", async () => {
  const fixtures = [];
  try {
    const legacy = await createWorkloadFixture({
      harnessRoot: root,
      variantId: "a",
      caseId: "r10-verification-role-runtime-input",
      repeat: 1,
    });
    fixtures.push(legacy);
    assert.equal(Object.hasOwn(legacy.target, "root_argv"), false);
    const legacyOracle = await readFile(
      path.join(legacy.root, "tests", "oracle.mjs"),
      "utf8",
    );
    assert.match(legacyOracle, /--facts=src\/facts\.mjs/u);
    assert.match(legacyOracle, /--external-input=" \+ extra/u);
    assert.deepEqual(
      legacy.contract.outcomes.map(
        (outcome) => outcome.acceptance.checks[0].runner.argv,
      ),
      [["first"], ["second"]],
    );
    assert.ok(
      legacy.contract.outcomes.every((outcome) => {
        const check = outcome.acceptance.checks[0];
        return (
          check.input_paths.includes(legacy.product.productPath) &&
          check.input_paths.includes(legacy.product.factsPath) &&
          check.verification_inputs.includes(
            "tests/legacy-generated-oracle.mjs",
          )
        );
      }),
    );
    assert.ok(
      legacy.contract.outcomes.every(
        (outcome) =>
          !outcome.technical.allowed_support_paths.includes(
            "tests/r10-runtime-input.json",
          ),
      ),
    );
    assert.ok(
      legacy.contract.outcomes.every((outcome) =>
        outcome.acceptance.checks[0].verification_inputs.includes(
          "tests/r10-runtime-input.json",
        ),
      ),
    );

    const legacyWrongProduct = await createWorkloadFixture({
      harnessRoot: root,
      variantId: "a",
      caseId: "wrong-product-value",
      repeat: 1,
    });
    fixtures.push(legacyWrongProduct);
    const wrongProductOracle = await readFile(
      path.join(legacyWrongProduct.root, "tests", "oracle.mjs"),
      "utf8",
    );
    assert.match(
      wrongProductOracle,
      /checkout-enabled[^\n]+\? true : envelope\.observations/u,
    );

    const legacyWrongRoot = await createWorkloadFixture({
      harnessRoot: root,
      variantId: "a",
      caseId: "r11-source-wrong-execution-root",
      repeat: 1,
    });
    fixtures.push(legacyWrongRoot);
    assert.equal(Object.hasOwn(legacyWrongRoot.target, "root_argv"), false);
    assert.ok(
      legacyWrongRoot.contract.outcomes.every(
        (outcome) =>
          outcome.acceptance.checks[0].runner.target === "tests/oracle.mjs",
      ),
    );

    const isolated = await createWorkloadFixture({
      harnessRoot: root,
      variantId: "b",
      caseId: "r9-evidence-role-runtime-input",
      repeat: 1,
    });
    fixtures.push(isolated);
    const isolatedOutcome = isolated.contract.outcomes[0];
    const isolatedCheck = isolatedOutcome.acceptance.checks[0];
    assert.deepEqual(
      isolatedOutcome.technical.bindings.map((item) => item.key),
      ["roi-product-state"],
    );
    assert.ok(isolatedOutcome.product.owner.path_globs.includes("bin/**"));
    assert.equal(
      isolatedOutcome.technical.allowed_support_paths.includes(
        isolated.product.rootPath,
      ),
      false,
    );
    assert.ok(isolatedCheck.input_paths.includes(isolated.product.productPath));
    assert.ok(isolatedCheck.input_paths.includes(isolated.product.factsPath));
    assert.ok(
      isolatedCheck.input_paths.includes("artifacts/r9-runtime-input.json"),
    );

    const current = await createWorkloadFixture({
      harnessRoot: root,
      variantId: "c",
      caseId: "r10-verification-role-runtime-input",
      repeat: 1,
    });
    fixtures.push(current);
    const currentOutcome = current.contract.outcomes[0];
    const currentCheck = currentOutcome.acceptance.checks[0];
    assert.deepEqual(
      currentOutcome.technical.bindings.map((item) => item.key),
      [
        "roi-product-root",
        "roi-product-module",
        "roi-product-facts",
        "roi-product-state",
      ],
    );
    assert.equal(currentCheck.runner.retry_policy, "transient_once");
    assert.equal(
      current.target.root_argv.some((item) =>
        item.includes("tests/r10-runtime-input.json"),
      ),
      false,
    );
    const currentState = JSON.parse(
      await readFile(path.join(current.root, "config", "state.json"), "utf8"),
    );
    assert.equal(
      currentState.runtime.external_input_path,
      "tests/r10-runtime-input.json",
    );
    assert.equal(
      currentOutcome.product.owner.path_globs.includes(
        "tests/r10-runtime-input.json",
      ),
      false,
    );
    assert.equal(
      currentOutcome.technical.allowed_support_paths.includes(
        "tests/r10-runtime-input.json",
      ),
      false,
    );
    assert.ok(
      currentCheck.input_paths.includes("tests/r10-runtime-input.json"),
    );
    assert.ok(
      currentCheck.verification_inputs.includes("tests/r10-runtime-input.json"),
    );
    assert.equal(
      currentOutcome.technical.bindings.some((item) =>
        item.carrier_paths.includes("tests/r10-runtime-input.json"),
      ),
      false,
    );
  } finally {
    await Promise.all(fixtures.map((fixture) => removeFixture(fixture)));
  }
});

test("R9/R10 workload cases reach the real Final Gate through non-closure input isolation", async () => {
  for (const caseId of [
    "r9-evidence-role-runtime-input",
    "r10-verification-role-runtime-input",
  ]) {
    const fixture = await createWorkloadFixture({
      harnessRoot: root,
      variantId: "c",
      caseId,
      repeat: 1,
    });
    const outputDir = await mkdtemp(
      path.join(os.tmpdir(), `ty-roi-${caseId.slice(0, 3)}-`),
    );
    const commandRecords = [];
    try {
      const productEnv = { ...process.env };
      delete productEnv.TY_CONTEXT_FIXTURE_FIRST_SCOPE;
      delete productEnv.TY_CONTEXT_FIXTURE_SECOND_SCOPE;
      const directProduct = await execute(
        process.execPath,
        [
          fixture.product.productPath,
          "first",
          `--facts=${fixture.product.factsPath}`,
        ],
        { cwd: fixture.root, env: productEnv },
      );
      assert.equal(directProduct.status, 0, directProduct.stderr);
      const directEnvelope = JSON.parse(directProduct.stdout);
      assert.equal(
        directEnvelope.observations[
          "assertion.first.first-check.pricing-currency-cny"
        ],
        true,
      );
      const lifecycle = await executeRealProcessRoiLifecycle({
        harnessRoot: root,
        fixture,
        outputDir,
        commandRecords,
        relativeRoot: outputDir,
        timeoutMs: 120000,
        commitMessage: `roi-final-gate-${caseId}`,
        snapshotLabel: `roi-final-gate-${caseId}`,
      });
      assert.equal(lifecycle.preflight.status, 0);
      assert.equal(lifecycle.compile.status, 0);
      assert.ok(lifecycle.final);
      assert.notEqual(lifecycle.terminal, "machine_accepted");
      assert.doesNotMatch(
        lifecycle.owner_diagnostic ?? "",
        /active_task_missing/u,
      );
      const checkResults = new Map(
        lifecycle.parsed_final.check_results.map((result) => [
          result.check_key,
          result,
        ]),
      );
      assert.equal(checkResults.get("first-check")?.status, "assertion_failed");
      assert.ok(
        checkResults
          .get("first-check")
          ?.findings.some(
            (finding) => finding.assertion_key === "pricing-currency-cny",
          ),
      );
      assert.equal(checkResults.get("second-check")?.status, "passed");
      assert.doesNotMatch(
        JSON.stringify(lifecycle.parsed_final),
        /invalid_evidence|process_observation_identity_set_mismatch/u,
      );
      assert.match(
        lifecycle.committed_candidate_identity.commit,
        /^[a-f0-9]{40}$/u,
      );
      assert.match(
        lifecycle.committed_candidate_identity.tree,
        /^[a-f0-9]{40}$/u,
      );
      assert.equal(lifecycle.committed_candidate_identity.clean, true);
      assert.equal(
        lifecycle.committed_candidate_identity.command_record_refs.length,
        6,
      );
      assert.ok(lifecycle.closure_copy_bytes > 0);
      assert.ok(
        lifecycle.closure_copy_measurement_overhead_ms >=
          lifecycle.closure_copy_ms,
      );
      await assert.rejects(stat(path.join(outputDir, "closure-copy-probe")), {
        code: "ENOENT",
      });
    } finally {
      await removeFixture(fixture);
      await rm(outputDir, { recursive: true, force: true });
    }
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

test("real process ROI artifact manifest keeps its retained-file budget fail closed", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-budget-"));
  const oversized = path.join(temporary, "oversized.bin");
  try {
    await writeFile(oversized, "");
    await truncate(oversized, 64 * 1024 * 1024 + 1);
    await assert.rejects(
      buildArtifactManifest(temporary),
      /real_process_roi_artifact_file_budget:oversized\.bin/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
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
  assert.deepEqual(REAL_PROCESS_SCHEMAS, {
    FORMAL_TOTAL_COST_ACCOUNTING_POLICY_SCHEMA:
      "long-task-formal-total-cost-accounting-policy-v1",
    FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA:
      "long-task-formal-total-cost-evidence-packet-v1",
    FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA:
      "long-task-formal-total-cost-precollection-plan-v1",
    FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA:
      "long-task-formal-total-cost-price-document-v1",
    FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA:
      "long-task-formal-total-cost-price-source-v1",
    FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA:
      "long-task-formal-total-cost-provider-event-v1",
    FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA:
      "long-task-formal-total-cost-raw-event-v1",
    FORMAL_TOTAL_COST_REDACTION_RULE_SCHEMA:
      "long-task-formal-total-cost-redaction-rule-v1",
    FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA:
      "long-task-formal-total-cost-scenario-catalog-v1",
    FORMAL_TOTAL_COST_SOURCE_MANIFEST_SCHEMA:
      "long-task-formal-total-cost-source-manifest-v1",
    REAL_PROCESS_ROI_SCHEMA: "long-task-real-process-roi-run-set-v3",
    REAL_PROCESS_RUN_SCHEMA: "long-task-real-process-roi-run-v3",
    REAL_PROCESS_MANIFEST_SCHEMA: "long-task-real-process-roi-manifest-v1",
    REAL_PROCESS_ATTESTATION_SCHEMA:
      "long-task-real-process-roi-attestation-v3",
    REAL_PROCESS_FROZEN_CONFIG_SCHEMA:
      "long-task-real-process-roi-frozen-config-v3",
    REAL_PROCESS_SUMMARY_SCHEMA: "long-task-real-process-roi-summary-v3",
    REAL_PROCESS_DRY_RUN_SCHEMA: "long-task-real-process-roi-dry-run-v3",
    REAL_PROCESS_COLLECTION_SCHEMA: "long-task-real-process-roi-collection-v3",
    REAL_PROCESS_VERIFICATION_SCHEMA:
      "long-task-real-process-roi-verification-v3",
    REAL_PROCESS_WORKLOAD_SCHEMA: "long-task-real-process-workload-v3",
  });
  const variants = variantDefinitions(fakeCandidate);
  assert.equal(variants.a.commit, BASELINE_A_COMMIT);
  assert.equal(variants.a.safety_eligible, false);
  assert.equal(variants.a.comparison_role, "cost-and-error-baseline-only");
  assert.equal(variants.b.commit, ISOLATED_ENVELOPE_B_COMMIT);
  assert.equal(variants.b.safety_eligible, false);
  assert.equal(variants.c.safety_eligible, true);
  assert.equal(variants.c.comparison_role, "measurement-candidate");
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

test("collection summary owns observed lifecycle facts and never a formal ROI conclusion", () => {
  const fixture = scoringFixture();
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.schema_version, REAL_PROCESS_SUMMARY_SCHEMA);
  assert.equal(summary.a_safety_eligible, false);
  assert.equal(summary.b_known_r9_r11_false_acceptance_reproduced, true);
  assert.equal(summary.observed_lifecycle_known_path_floor_met, true);
  assert.equal(summary.expansion.required_repeats, 3);
  assert.equal(summary.observed_lifecycle_paired_wins, 3);
  assert.equal(summary.observed_lifecycle_thresholds_met, true);
  assert.equal(summary.observed_lifecycle_evidence_valid, true);
  assert.equal(
    summary.observed_lifecycle_status,
    "observed_lifecycle_thresholds_met",
  );
  assert.equal(summary.formal_status, "not_evaluated");
  for (const prohibited of [
    "report_status",
    "total_roi_supported",
    "total_roi_positive",
    "independent_evidence_admitted",
    "formal_total_cost_pairs",
    "required_unverified_total_cost_evidence",
  ])
    assert.equal(Object.hasOwn(summary, prohibited), false, prohibited);
  assert.equal(summary.capability_level, "level_3");
  assert.equal(summary.level_4_claimed, false);
  assert.equal(summary.governance_judgment_included, false);
});

test("the five-repeat formal population remains complete when three repeats satisfy diagnostics", () => {
  const fixture = formalScoringFixture();
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.repeats, 5);
  assert.equal(summary.expansion.required_repeats, 3);
  assert.equal(summary.observed_lifecycle_paired_wins, 5);
  assert.equal(summary.observed_lifecycle_thresholds_met, true);
  assert.equal(
    summary.observed_lifecycle_status,
    "observed_lifecycle_thresholds_met",
  );
});

test("run records and frozen config cannot self-attest formal ROI evidence", () => {
  const runFixture = scoringFixture();
  runFixture.runs[0].formal_total_cost_evidence = {
    verified: true,
  };
  assert.throws(
    () => validateRunRecord(runFixture.runs[0], runFixture.config),
    /real_process_roi_invalid:run_formal_conclusion_fields_prohibited/u,
  );
  const renamedConclusion = scoringFixture();
  renamedConclusion.runs[0].formal_status = "verified";
  assert.throws(
    () =>
      validateRunRecord(renamedConclusion.runs[0], renamedConclusion.config),
    /real_process_roi_invalid:run_formal_conclusion_fields_prohibited/u,
  );
  const configFixture = scoringFixture();
  configFixture.config.formal_total_cost_policy.independent_evidence_admitted = true;
  assert.throws(
    () => deriveRealProcessRoiSummary(configFixture.runs, configFixture.config),
    /real_process_roi_invalid:frozen_config_formal_total_cost_policy/u,
  );
});

test("formal evidence accounting applies the frozen ten-delivery and once-only strata", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({
    fixture,
    setupByVariant,
  });
  try {
    const result = await evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
      precollectionIdentity: formal.precollectionIdentity,
    });
    assert.equal(result.admitted, true);
    assert.equal(result.support_complete, true);
    assert.deepEqual(result.blockers, []);
    assert.equal(result.event_count, 86);
    assert.equal(result.accounting.deliveries_per_cycle, 10);
    assert.equal(
      result.accounting.category_results.authoring.cycle_incremental_cost_ncu,
      "1.000000",
    );
    assert.equal(
      result.accounting.category_results.maintenance.cycle_incremental_cost_ncu,
      "0.100000",
    );
    assert.equal(
      result.accounting.category_results.migration.cycle_incremental_cost_ncu,
      "0.100000",
    );
    assert.equal(result.accounting.positive_incremental_cost_ncu, "5.500000");
    assert.equal(result.accounting.cost_reduction_ncu, "0.000000");
    assert.equal(
      result.accounting.purpose_benefit.cycle_purpose_benefit_ncu,
      "10.000000",
    );
    assert.equal(
      result.accounting.benefit_to_positive_incremental_cost_ratio,
      "1.818182",
    );
    assert.equal(result.accounting.positive_pair_count, 5);
    assert.equal(result.accounting.paired_net_benefit_sample_cv, "0.000000");
    assert.equal(result.accounting.significant_stable_margin_met, true);

    const unlocked = await evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
    });
    assert.equal(unlocked.precollection_bound, false);
    assert.equal(unlocked.support_complete, false);
    assert.deepEqual(unlocked.blockers, [
      "formal_evidence_precollection_lock_missing",
    ]);
    assert.equal(unlocked.accounting, null);
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("the runner precollection plan freezes and materializes every fixed external input", async () => {
  const fixture = formalScoringFixture();
  const formal = await writeFormalEvidenceFixture({
    fixture,
    setupByVariant: setupMapFixture(fixture.config),
  });
  const planRoot = await mkdtemp(path.join(os.tmpdir(), "ty-formal-plan-"));
  const runSetRoot = await mkdtemp(path.join(os.tmpdir(), "ty-formal-run-"));
  try {
    for (const entry of formal.precollectionIdentity.entries) {
      const source = path.join(
        formal.root,
        "sources",
        ...entry.path.split("/"),
      );
      const target = path.join(planRoot, "sources", ...entry.path.split("/"));
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, await readFile(source));
    }
    const planPath = path.join(planRoot, "precollection-plan.json");
    await writeJson(planPath, formal.precollectionIdentity);
    const precollection = await readFormalPrecollectionPlan({
      planPath,
      limits: JSON.parse(accountingPolicyText).source_bundle_limits,
    });
    assert.deepEqual(precollection.identity, formal.precollectionIdentity);
    await materializeFormalPrecollectionInputs({
      runSetRoot,
      precollection,
    });
    for (const entry of formal.precollectionIdentity.entries) {
      const materialized = await readFile(
        path.join(
          runSetRoot,
          "inputs",
          "formal-evidence-precollection",
          ...entry.path.split("/"),
        ),
      );
      assert.equal(materialized.length, entry.bytes);
      assert.equal(digest(materialized), entry.sha256);
    }
  } finally {
    await Promise.all(
      [formal.root, planRoot, runSetRoot].map((target) =>
        rm(target, { recursive: true, force: true }),
      ),
    );
  }
});

test("formal evidence accepts a pre-collection actual-invoice price source", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({
    fixture,
    setupByVariant,
    options: { priceSourceKind: "actual_invoice" },
  });
  try {
    const result = await evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
      precollectionIdentity: formal.precollectionIdentity,
    });
    assert.equal(result.support_complete, true);
    assert.equal(result.accounting.significant_stable_margin_met, true);
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("formal positivity does not use cost reductions to satisfy the 1.25 positive-cost margin", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({
    fixture,
    setupByVariant,
    options: {
      benefitDeltas: [5, 5, 5, 5, 5],
      costActiveMs: {
        process: { b: 360_000, c: 0 },
      },
    },
  });
  try {
    const result = await evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
      precollectionIdentity: formal.precollectionIdentity,
    });
    assert.equal(result.support_complete, true);
    assert.equal(result.accounting.positive_incremental_cost_ncu, "4.500000");
    assert.equal(result.accounting.cost_reduction_ncu, "200.000000");
    assert.equal(
      result.accounting.benefit_to_positive_incremental_cost_ratio,
      "1.111111",
    );
    assert.equal(
      result.accounting.cost_reductions_offset_positive_cost_denominator,
      false,
    );
    assert.equal(result.accounting.significant_stable_margin_met, false);
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("formal positivity requires four positive pairs and sample CV at most twenty percent", async () => {
  for (const benefitDeltas of [
    [10, 10, 10, -1, -1],
    [8, 9, 10, 11, 30],
  ]) {
    const fixture = formalScoringFixture();
    const setupByVariant = setupMapFixture(fixture.config);
    const formal = await writeFormalEvidenceFixture({
      fixture,
      setupByVariant,
      options: { benefitDeltas },
    });
    try {
      const result = await evaluateFormalTotalCostEvidence({
        packetPath: formal.packetPath,
        accountingPolicy: JSON.parse(accountingPolicyText),
        accountingPolicyIdentity: fixture.config.accounting_policy_identity,
        runSetId: formal.runSetId,
        runs: fixture.runs,
        setupByVariant,
        precollectionIdentity: formal.precollectionIdentity,
      });
      assert.equal(result.support_complete, true);
      assert.equal(result.accounting.significant_stable_margin_met, false);
      if (benefitDeltas[3] < 0)
        assert.equal(result.accounting.positive_pair_count, 3);
      else
        assert.ok(
          Number(result.accounting.paired_net_benefit_sample_cv) > 0.2,
        );
    } finally {
      await rm(formal.root, { recursive: true, force: true });
    }
  }
});

test("formal evidence admission is verifier-derived and incomplete raw packets remain unsupported", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({
    fixture,
    setupByVariant,
    options: { omitEvidenceKey: "cost:migration:once:c" },
  });
  try {
    const result = await evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
      precollectionIdentity: formal.precollectionIdentity,
    });
    assert.equal(result.admitted, true);
    assert.equal(result.support_complete, false);
    assert.deepEqual(result.missing_event_keys, ["cost:migration:once:c"]);
    assert.ok(result.blockers.includes("formal_evidence_event_set_incomplete"));
    assert.equal(result.accounting, null);

    const packet = JSON.parse(await readFile(formal.packetPath, "utf8"));
    packet.verified = true;
    await writeJson(formal.packetPath, packet);
    await assert.rejects(
      evaluateFormalTotalCostEvidence({
        packetPath: formal.packetPath,
        accountingPolicy: JSON.parse(accountingPolicyText),
        accountingPolicyIdentity: fixture.config.accounting_policy_identity,
        runSetId: formal.runSetId,
        runs: fixture.runs,
        setupByVariant,
        precollectionIdentity: formal.precollectionIdentity,
      }),
      /formal_evidence_packet_prohibited_field/u,
    );

    delete packet.verified;
    await writeJson(formal.packetPath, packet);
    const eventRelative = "events/cost-authoring-pair-01-b.json";
    const eventPath = path.join(
      formal.root,
      "sources",
      ...eventRelative.split("/"),
    );
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    event.event_id = "packet-authored-event-id";
    await writeJson(eventPath, event);
    await resignFormalEvidenceSource(formal.packetPath, eventRelative);
    await assert.rejects(
      evaluateFormalTotalCostEvidence({
        packetPath: formal.packetPath,
        accountingPolicy: JSON.parse(accountingPolicyText),
        accountingPolicyIdentity: fixture.config.accounting_policy_identity,
        runSetId: formal.runSetId,
        runs: fixture.runs,
        setupByVariant,
        precollectionIdentity: formal.precollectionIdentity,
      }),
      /raw_event_prohibited_field/u,
    );
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("formal event identity prevents one invocation from owning two cost categories", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({ fixture, setupByVariant });
  try {
    const runtimeRelative = "events/cost-runtime-pair-01-b.json";
    const stateRelative = "events/cost-state-pair-01-b.json";
    const runtime = JSON.parse(
      await readFile(
        path.join(formal.root, "sources", ...runtimeRelative.split("/")),
        "utf8",
      ),
    );
    const statePath = path.join(
      formal.root,
      "sources",
      ...stateRelative.split("/"),
    );
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.invocation_id = runtime.invocation_id;
    await writeJson(statePath, state);
    await resignFormalEvidenceSource(formal.packetPath, stateRelative);
    await assert.rejects(
      evaluateFormalTotalCostEvidence({
        packetPath: formal.packetPath,
        accountingPolicy: JSON.parse(accountingPolicyText),
        accountingPolicyIdentity: fixture.config.accounting_policy_identity,
        runSetId: formal.runSetId,
        runs: fixture.runs,
        setupByVariant,
        precollectionIdentity: formal.precollectionIdentity,
      }),
      /raw_event_identity/u,
    );
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("formal scenarios derive same-quality cost and incident outcomes from raw outputs", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({ fixture, setupByVariant });
  const evaluate = () =>
    evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
      precollectionIdentity: formal.precollectionIdentity,
    });
  const mutateOutput = async (relative, contents) => {
    await writeFile(
      path.join(formal.root, "sources", ...relative.split("/")),
      contents,
    );
    await resignFormalEvidenceSource(formal.packetPath, relative);
  };
  try {
    await mutateOutput("outputs/runtime-pair01-b.bin", "wrong-runtime\n");
    await assert.rejects(evaluate(), /formal_scenario_cost_gold/u);
    await mutateOutput(
      "outputs/runtime-pair01-b.bin",
      "gold:fixed-runtime-task\n",
    );

    await mutateOutput(
      "outputs/incident-pair-01-b.bin",
      "gold:fixed-controlled-incident\n",
    );
    await assert.rejects(evaluate(), /formal_scenario_incident_b_wrong/u);
    await mutateOutput(
      "outputs/incident-pair-01-b.bin",
      "wrong:fixed-controlled-incident:pair-01\n",
    );

    await mutateOutput(
      "outputs/incident-pair-01-c.bin",
      "wrong:fixed-controlled-incident:pair-01\n",
    );
    await assert.rejects(evaluate(), /formal_scenario_incident_c_correct/u);
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("formal source bundles fail closed at file-count, per-file, and total-byte limits", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({ fixture, setupByVariant });
  const original = await readFile(formal.packetPath);
  const evaluate = () =>
    evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
      precollectionIdentity: formal.precollectionIdentity,
    });
  const writeMutatedPacket = async (mutate) => {
    const packet = JSON.parse(original.toString("utf8"));
    mutate(packet.source_bundle);
    packet.source_bundle.entry_count = packet.source_bundle.entries.length;
    packet.source_bundle.total_bytes = packet.source_bundle.entries.reduce(
      (sum, entry) => sum + entry.bytes,
      0,
    );
    packet.source_bundle.materialized_set_sha256 = sha256(
      canonical(packet.source_bundle.entries),
    );
    await writeJson(formal.packetPath, packet);
  };
  try {
    await writeMutatedPacket((manifest) => {
      const template = manifest.entries[0];
      manifest.entries = Array.from({ length: 257 }, (_, index) => ({
        ...template,
        path: `overflow/${String(index).padStart(3, "0")}.json`,
      }));
    });
    await assert.rejects(evaluate(), /formal_evidence_source_file_count/u);

    await writeMutatedPacket((manifest) => {
      const event = manifest.entries.find((entry) => entry.role === "raw_event");
      event.bytes = 8 * 1024 * 1024 + 1;
    });
    await assert.rejects(evaluate(), /formal_evidence_source_file_budget/u);

    await writeMutatedPacket((manifest) => {
      for (const event of manifest.entries
        .filter((entry) => entry.role === "raw_event")
        .slice(0, 9))
        event.bytes = 8 * 1024 * 1024;
    });
    await assert.rejects(evaluate(), /formal_evidence_source_total_budget/u);
  } finally {
    await writeFile(formal.packetPath, original);
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("formal JSON sources reject duplicate keys and invalid UTF-8 bytes", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({ fixture, setupByVariant });
  const eventRelative = "events/cost-runtime-pair-01-b.json";
  const eventPath = path.join(
    formal.root,
    "sources",
    ...eventRelative.split("/"),
  );
  const original = await readFile(eventPath);
  const evaluate = () =>
    evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
      precollectionIdentity: formal.precollectionIdentity,
    });
  try {
    const duplicate = original
      .toString("utf8")
      .replace(
        '  "run_set_id": "fixture-run-set",',
        '  "run_set_id": "fixture-run-set",\n  "run_set_id": "fixture-run-set",',
      );
    assert.notEqual(duplicate, original.toString("utf8"));
    await writeFile(eventPath, duplicate);
    await resignFormalEvidenceSource(formal.packetPath, eventRelative);
    await assert.rejects(evaluate(), /raw_event_json:.*:duplicate_key/u);

    await writeFile(eventPath, Buffer.from([0xff]));
    await resignFormalEvidenceSource(formal.packetPath, eventRelative);
    await assert.rejects(evaluate(), /raw_event_json:.*:utf8/u);
  } finally {
    await writeFile(eventPath, original);
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("formal evidence rejects post-collection price freezing and no-follow source links", async (t) => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const latePrice = await writeFormalEvidenceFixture({
    fixture,
    setupByVariant,
  });
  try {
    const priceRelative = "prices/official-price.json";
    const pricePath = path.join(
      latePrice.root,
      "sources",
      ...priceRelative.split("/"),
    );
    const price = JSON.parse(await readFile(pricePath, "utf8"));
    price.frozen_at = "2026-08-11T00:30:00.000Z";
    await writeJson(pricePath, price);
    await resignFormalEvidenceSource(latePrice.packetPath, priceRelative);
    await assert.rejects(
      evaluateFormalTotalCostEvidence({
        packetPath: latePrice.packetPath,
        accountingPolicy: JSON.parse(accountingPolicyText),
        accountingPolicyIdentity: fixture.config.accounting_policy_identity,
        runSetId: latePrice.runSetId,
        runs: fixture.runs,
        setupByVariant,
        precollectionIdentity: latePrice.precollectionIdentity,
      }),
      /formal_precollection_packet_binding/u,
    );
  } finally {
    await rm(latePrice.root, { recursive: true, force: true });
  }

  const linked = await writeFormalEvidenceFixture({ fixture, setupByVariant });
  try {
    const eventRelative = "events/cost-authoring-pair-01-b.json";
    const eventPath = path.join(
      linked.root,
      "sources",
      ...eventRelative.split("/"),
    );
    const externalPath = path.join(linked.root, "outside-event.json");
    await writeFile(externalPath, await readFile(eventPath));
    await rm(eventPath, { force: true });
    try {
      await symlink(externalPath, eventPath, "file");
    } catch (error) {
      if (["EPERM", "EACCES"].includes(error?.code)) {
        t.diagnostic("file symlink creation unavailable on this host");
        return;
      }
      throw error;
    }
    await assert.rejects(
      evaluateFormalTotalCostEvidence({
        packetPath: linked.packetPath,
        accountingPolicy: JSON.parse(accountingPolicyText),
        accountingPolicyIdentity: fixture.config.accounting_policy_identity,
        runSetId: linked.runSetId,
        runs: fixture.runs,
        setupByVariant,
        precollectionIdentity: linked.precollectionIdentity,
      }),
      /formal_evidence_source_link/u,
    );
  } finally {
    await rm(linked.root, { recursive: true, force: true });
  }
});

test("formal authoring usage is recomputed from the invocation-bound provider event", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({ fixture, setupByVariant });
  try {
    const eventRelative = "events/cost-authoring-pair-01-b.json";
    const eventPath = path.join(
      formal.root,
      "sources",
      ...eventRelative.split("/"),
    );
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    event.measurements.find(
      (measurement) => measurement.meter === "provider_input_token",
    ).quantity += 1;
    await writeJson(eventPath, event);
    await resignFormalEvidenceSource(formal.packetPath, eventRelative);
    await assert.rejects(
      evaluateFormalTotalCostEvidence({
        packetPath: formal.packetPath,
        accountingPolicy: JSON.parse(accountingPolicyText),
        accountingPolicyIdentity: fixture.config.accounting_policy_identity,
        runSetId: formal.runSetId,
        runs: fixture.runs,
        setupByVariant,
        precollectionIdentity: formal.precollectionIdentity,
      }),
      /raw_event_provider_usage/u,
    );
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("missing authoritative authoring usage produces an unsupported reportable result", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({ fixture, setupByVariant });
  try {
    const eventRelative = "events/cost-authoring-pair-01-b.json";
    const eventPath = path.join(
      formal.root,
      "sources",
      ...eventRelative.split("/"),
    );
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    event.measurements = event.measurements.filter(
      (measurement) => measurement.kind === "human_time",
    );
    await writeJson(eventPath, event);
    await resignFormalEvidenceSource(formal.packetPath, eventRelative);
    const result = await evaluateFormalTotalCostEvidence({
      packetPath: formal.packetPath,
      accountingPolicy: JSON.parse(accountingPolicyText),
      accountingPolicyIdentity: fixture.config.accounting_policy_identity,
      runSetId: formal.runSetId,
      runs: fixture.runs,
      setupByVariant,
      precollectionIdentity: formal.precollectionIdentity,
    });
    assert.equal(result.admitted, true);
    assert.equal(result.support_complete, false);
    assert.deepEqual(result.missing_authoring_usage_keys, [
      "cost:authoring:pair-01:b",
    ]);
    assert.ok(result.blockers.includes("formal_authoring_usage_incomplete"));
    assert.equal(result.accounting, null);
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("formal purpose benefit rejects packet-authored normalized loss values", async () => {
  const fixture = formalScoringFixture();
  const setupByVariant = setupMapFixture(fixture.config);
  const formal = await writeFormalEvidenceFixture({ fixture, setupByVariant });
  try {
    const eventRelative =
      "events/benefit-fixed-controlled-incident-pair-01-b.json";
    const eventPath = path.join(
      formal.root,
      "sources",
      ...eventRelative.split("/"),
    );
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    event.measurements = [{ kind: "incident_loss_cny", amount_cny: 100 }];
    await writeJson(eventPath, event);
    await resignFormalEvidenceSource(formal.packetPath, eventRelative);
    await assert.rejects(
      evaluateFormalTotalCostEvidence({
        packetPath: formal.packetPath,
        accountingPolicy: JSON.parse(accountingPolicyText),
        accountingPolicyIdentity: fixture.config.accounting_policy_identity,
        runSetId: formal.runSetId,
        runs: fixture.runs,
        setupByVariant,
        precollectionIdentity: formal.precollectionIdentity,
      }),
      /raw_event_meter_fields/u,
    );
  } finally {
    await rm(formal.root, { recursive: true, force: true });
  }
});

test("a missing authoritative authoring-token event remains diagnostic and cannot manufacture total ROI", () => {
  const fixture = scoringFixture();
  fixture.runs[0].metrics.authoring_token_count = unverifiedMetric(
    "tokens",
    "no provider usage event",
  );
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.observed_lifecycle_known_path_floor_met, true);
  assert.ok(
    summary.observed_lifecycle_unverified_metrics.includes(
      `${fixture.runs[0].variant_id}:${fixture.runs[0].repeat}:authoring_token_count`,
    ),
  );
  assert.equal(summary.formal_status, "not_evaluated");
  assert.equal(Object.hasOwn(summary, "total_roi_supported"), false);
  assert.equal(Object.hasOwn(summary, "total_roi_positive"), false);
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
  assert.equal(summary.observed_lifecycle_evidence_valid, false);
  assert.equal(
    summary.observed_lifecycle_status,
    "invalid_measurement_evidence",
  );
  assert.equal(summary.formal_status, "not_evaluated");
});

test("high variance or inconsistent direction expands three repeats to five", () => {
  const fixture = scoringFixture();
  const cRuns = fixture.runs.filter((run) => run.variant_id === "c");
  cRuns[1].metrics.total_elapsed_ms.value = 3000;
  const expansion = expansionDecision(fixture.runs, fixture.config);
  assert.equal(expansion.required_repeats, 5);
  assert.ok(expansion.reasons.length > 0);
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.formal_status, "not_evaluated");
  assert.equal(summary.observed_lifecycle_status, "requires_expanded_repeats");
});

test("run validation rejects metric tampering, duplicate cases and promoted A authority", () => {
  const fixture = scoringFixture();
  const legacy = structuredClone(fixture.runs[0]);
  legacy.schema_version = "long-task-real-process-roi-run-v1";
  assert.throws(
    () => validateRunRecord(legacy, fixture.config),
    /real_process_roi_invalid:run_schema_v1_recollection_required/u,
  );
  const legacyV2 = structuredClone(fixture.runs[0]);
  legacyV2.schema_version = "long-task-real-process-roi-run-v2";
  assert.throws(
    () => validateRunRecord(legacyV2, fixture.config),
    /real_process_roi_invalid:run_schema_v2_recollection_required/u,
  );
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
  const duplicateRunIds = scoringFixture();
  duplicateRunIds.runs[1].run_id = duplicateRunIds.runs[0].run_id;
  assert.throws(
    () =>
      deriveRealProcessRoiSummary(
        duplicateRunIds.runs,
        duplicateRunIds.config,
      ),
    /real_process_roi_invalid:summary_run_id_duplicates/u,
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
  const missingCommittedIdentity = structuredClone(fixture.runs[0]);
  delete missingCommittedIdentity.cases[0].committed_candidate_identity;
  assert.throws(
    () => validateRunRecord(missingCommittedIdentity, fixture.config),
    /real_process_roi_invalid:case_committed_candidate_identity/u,
  );
});

test("report verifier recomputes raw SHA closure, summary and verdict", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-report-"));
  const auxiliaryRoots = [];
  try {
    const state = await materializeVerifierReportFixture(temporary);
    auxiliaryRoots.push(state.formal.root);
    await assertVerifierFormalConclusions(temporary, state);
    await assertNonOwnerFormalFieldsRejected(temporary);
    await assertVerifierRawTamperingRejected(temporary, state);
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await Promise.all(
      auxiliaryRoots.map((target) =>
        rm(target, { recursive: true, force: true }),
      ),
    );
  }
});

async function materializeVerifierReportFixture(temporary) {
  const fixture = formalScoringFixture();
  for (const run of fixture.runs.filter((item) => item.variant_id === "c"))
    run.metrics.total_elapsed_ms.value += 1_000;
  const formal = await writeFormalEvidenceFixture({
    fixture,
    setupByVariant: setupMapFixture(fixture.config),
  });
  fixture.config.formal_evidence_precollection_identity =
    formal.precollectionIdentity;
  await writeJson(path.join(temporary, "frozen-config.json"), fixture.config);
  await writeJson(
    path.join(temporary, "environment.json"),
    fixture.config.environment,
  );
  for (const [prefix, identity, contents] of [
    ["workload", fixture.config.workload_identity, "workload"],
    [
      "benchmark-implementation",
      fixture.config.benchmark_implementation_identity,
      "implementation",
    ],
    [
      "accounting-policy",
      fixture.config.accounting_policy_identity,
      accountingPolicyText,
    ],
  ])
    await writeIdentityFixture(temporary, prefix, identity, contents);
  await writePrecollectionIdentityFixture(temporary, formal);
  const runRefs = [];
  for (const run of fixture.runs) {
    const relative = `raw/${run.variant_id}/repeat-${String(run.repeat).padStart(2, "0")}/run.json`;
    await writeRunRawFixture(temporary, relative, run);
    runRefs.push(relative);
  }
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  const setup = await writeSetupFixture(temporary, fixture.config);
  await writeJson(path.join(temporary, "aggregate.json"), {
    schema_version: REAL_PROCESS_ROI_SCHEMA,
    run_set_id: "fixture-run-set",
    purpose: fixture.config.purpose,
    safety_theorem_claimed: false,
    capability_level: "level_3",
    level_4_claimed: false,
    governance_judgment_included: false,
    artifacts_are_non_authority: true,
    candidate_identity: { commit: fakeCandidate, tree: fakeTree },
    workload_sha256: fixture.config.workload_sha256,
    benchmark_implementation_sha256:
      fixture.config.benchmark_implementation_identity.identity_sha256,
    accounting_policy_sha256:
      fixture.config.accounting_policy_identity.identity_sha256,
    formal_evidence_precollection_sha256:
      formal.precollectionIdentity.identity_sha256,
    environment_identity: fixture.config.environment_identity,
    setup,
    summary,
    run_refs: runRefs,
  });
  const manifest = await buildArtifactManifest(temporary);
  await writeJson(path.join(temporary, "manifest.json"), manifest);
  await writeVerifierAttestation(temporary, fixture, summary);
  return { fixture, formal, runRefs, setup };
}

async function writeVerifierAttestation(temporary, fixture, summary) {
  const manifestBytes = await readFile(path.join(temporary, "manifest.json"));
  const aggregateBytes = await readFile(path.join(temporary, "aggregate.json"));
  await writeJson(path.join(temporary, "attestation.json"), {
    schema_version: REAL_PROCESS_ATTESTATION_SCHEMA,
    run_set_id: "fixture-run-set",
    candidate_commit: fakeCandidate,
    candidate_tree: fakeTree,
    workload_sha256: fixture.config.workload_sha256,
    benchmark_implementation_sha256:
      fixture.config.benchmark_implementation_identity.identity_sha256,
    accounting_policy_sha256:
      fixture.config.accounting_policy_identity.identity_sha256,
    formal_evidence_precollection_sha256:
      fixture.config.formal_evidence_precollection_identity.identity_sha256,
    environment_identity: fixture.config.environment_identity,
    manifest_sha256: digest(manifestBytes),
    aggregate_sha256: digest(aggregateBytes),
    observed_lifecycle_status: summary.observed_lifecycle_status,
    observed_lifecycle_evidence_valid:
      summary.observed_lifecycle_evidence_valid,
    formal_status: "not_evaluated",
    capability_level: "level_3",
    level_4_claimed: false,
    governance_judgment_included: false,
    a_safety_eligible: false,
    artifacts_are_non_authority: true,
    raw_promoted_to_gate: false,
  });
}

async function assertVerifierFormalConclusions(temporary, state) {
  await assert.rejects(
    verifyRealProcessRoiReport(temporary, { expectedCandidate: fakeCandidate }),
    /real_process_roi_invalid:candidate_git_identity/u,
  );
  const verified = await verifyRealProcessRoiReport(temporary);
  assert.equal(verified.formal_status, "independent_evidence_packet_missing");
  assert.equal(verified.report_status, "independent_evidence_packet_missing");
  assert.equal(verified.independent_evidence_admitted, false);
  assert.equal(verified.total_roi_supported, false);
  assert.equal(verified.total_roi_positive, false);
  assert.equal(verified.observed_lifecycle_evidence_valid, true);
  assert.equal(
    verified.observed_lifecycle_status,
    "observed_lifecycle_thresholds_not_met",
  );
  assert.equal(verified.a_safety_eligible, false);
  const result = await verifyRealProcessRoiReport(temporary, {
    formalEvidence: state.formal.packetPath,
  });
  assert.equal(result.formal_status, "total_roi_positive");
  assert.equal(result.report_status, "total_roi_positive");
  assert.equal(result.independent_evidence_admitted, true);
  assert.equal(result.total_roi_supported, true);
  assert.equal(result.total_roi_positive, true);
  assert.deepEqual(result.formal_blockers, []);
  assert.equal(
    result.observed_lifecycle_status,
    "observed_lifecycle_thresholds_not_met",
  );
  assert.equal(result.formal_accounting.positive_incremental_cost_ncu, "5.500000");
  assert.equal(result.formal_accounting.significant_stable_margin_met, true);
}

async function assertNonOwnerFormalFieldsRejected(temporary) {
  const attestationPath = path.join(temporary, "attestation.json");
  const originalAttestation = await readFile(attestationPath);
  await assertMutatedReportRejected({
    temporary,
    target: attestationPath,
    original: originalAttestation,
    mutate: (value) => (value.total_roi_positive = true),
    diagnostic: /attestation_formal_conclusion_fields/u,
  });
  await assertMutatedReportRejected({
    temporary,
    target: attestationPath,
    original: originalAttestation,
    mutate: (value) => (value.normalized_total_cost = 0),
    diagnostic: /attestation_field_set/u,
  });
  const configPath = path.join(temporary, "frozen-config.json");
  await assertMutatedReportRejected({
    temporary,
    target: configPath,
    original: await readFile(configPath),
    mutate: (value) => (value.total_roi_supported = true),
    diagnostic: /config_formal_conclusion_fields/u,
  });
  const aggregatePath = path.join(temporary, "aggregate.json");
  const originalAggregate = await readFile(aggregatePath);
  const duplicateAggregate = originalAggregate
    .toString("utf8")
    .replace(
      '  "run_set_id": "fixture-run-set",',
      '  "run_set_id": "fixture-run-set",\n  "run_set_id": "fixture-run-set",',
    );
  assert.notEqual(duplicateAggregate, originalAggregate.toString("utf8"));
  await writeFile(aggregatePath, duplicateAggregate);
  await assert.rejects(
    verifyRealProcessRoiReport(temporary),
    /run_set_json:aggregate\.json:duplicate_key/u,
  );
  await writeFile(aggregatePath, originalAggregate);
  await assertMutatedReportRejected({
    temporary,
    target: aggregatePath,
    original: originalAggregate,
    mutate: (value) => (value.total_roi_positive = true),
    diagnostic: /aggregate_formal_conclusion_fields/u,
  });
  await assertMutatedReportRejected({
    temporary,
    target: aggregatePath,
    original: originalAggregate,
    mutate: (value) => (value.unreviewed_projection = true),
    diagnostic: /aggregate_field_set/u,
  });
}

async function assertMutatedReportRejected(options) {
  const { temporary, target, original, mutate, diagnostic } = options;
  const changed = JSON.parse(original);
  mutate(changed);
  await writeJson(target, changed);
  await assert.rejects(verifyRealProcessRoiReport(temporary), diagnostic);
  await writeFile(target, original);
}

async function assertVerifierRawTamperingRejected(temporary, state) {
  const aggregatePath = path.join(temporary, "aggregate.json");
  const currentAggregate = await readFile(aggregatePath);
  const legacyAggregate = JSON.parse(currentAggregate);
  for (const [version, diagnostic] of [
    ["v1", /aggregate_schema_v1_recollection_required/u],
    ["v2", /aggregate_schema_v2_recollection_required/u],
  ]) {
    legacyAggregate.schema_version = `long-task-real-process-roi-run-set-${version}`;
    await writeJson(aggregatePath, legacyAggregate);
    await assert.rejects(verifyRealProcessRoiReport(temporary), diagnostic);
  }
  await writeFile(aggregatePath, currentAggregate);
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
  state.fixture.runs[0].metrics.total_elapsed_ms.value += 1;
  await writeJson(
    path.join(temporary, ...state.runRefs[0].split("/")),
    state.fixture.runs[0],
  );
  await assert.rejects(
    verifyRealProcessRoiReport(temporary),
    /real_process_roi_invalid:manifest_recomputation/u,
  );
}

function scoringFixture({ repeats = 3 } = {}) {
  const variants = variantDefinitions(fakeCandidate);
  const workloadIdentity = sourceIdentityFixture("workload.json", "workload");
  const implementationIdentity = sourceIdentityFixture(
    "runner.mjs",
    "implementation",
  );
  const accountingPolicyIdentity = sourceIdentityFixture(
    FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
    accountingPolicyText,
  );
  const environment = { platform: process.platform };
  const environmentIdentity = sha256(canonical(environment));
  const config = {
    schema_version: REAL_PROCESS_FROZEN_CONFIG_SCHEMA,
    purpose: "real-process-lifecycle-roi-only",
    safety_theorem_claimed: false,
    capability_level: "level_3",
    level_4_claimed: false,
    governance_judgment_included: false,
    artifacts_are_non_authority: true,
    a_safety_eligible: false,
    candidate_must_be_clean_commit: true,
    candidate_must_equal_head: true,
    candidate_is_head: true,
    candidate_worktree_clean: true,
    authoring_token_policy: {
      required_for_positive_roi: true,
      authoritative_source: "fixture provider usage event",
      surrogate_tokenizer_permitted: false,
      missing_value_status: "required-unverified",
      consequence: "total ROI remains unsupported",
    },
    variants,
    candidate_tree: fakeTree,
    workload_sha256: workloadIdentity.identity_sha256,
    workload_identity: workloadIdentity,
    benchmark_implementation_identity: implementationIdentity,
    accounting_policy_identity: accountingPolicyIdentity,
    formal_evidence_precollection_identity: null,
    semantic_gold_sha256: digest("semantic-gold"),
    environment,
    environment_identity: environmentIdentity,
    measurement_thresholds: MEASUREMENT_THRESHOLDS,
    formal_total_cost_policy: {
      categories: FORMAL_TOTAL_COST_CATEGORIES,
      normalized_unit: "normalized-cost-units",
      theorem:
        "incremental-purpose-benefit-exceeds-sum-of-all-incremental-costs",
      missing_or_unverified_consequence: "total_roi_unsupported",
      formal_conclusion_owner: "verify_long_task_real_process_roi",
      collection_formal_status: "not_evaluated",
      independent_evidence_packet: "required",
      accounting_population_status: "frozen",
      accounting_policy_schema:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_ACCOUNTING_POLICY_SCHEMA,
      accounting_policy_sha256: accountingPolicyIdentity.identity_sha256,
      self_attested_verified_records_admitted: false,
      governance_judgment_included: false,
      level_4_requires_independent_capability_audit: true,
    },
    initial_repeats: MEASUREMENT_THRESHOLDS.minimum_repeats,
    maximum_repeats: MEASUREMENT_THRESHOLDS.expanded_repeats,
    repeat_orders: Array.from(
      { length: MEASUREMENT_THRESHOLDS.expanded_repeats },
      (_, index) => repeatOrder(index + 1),
    ),
  };
  const runs = [];
  for (let repeat = 1; repeat <= repeats; repeat += 1) {
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

function formalScoringFixture() {
  return scoringFixture({ repeats: 5 });
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
  const committedCandidateIdentity = committedCandidateIdentityFixture(
    `recovery-${sourceAttackCaseId}`,
  );
  return {
    source_attack_case_id: sourceAttackCaseId,
    committed_candidate_identity: committedCandidateIdentity,
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
      ...committedCandidateIdentity.command_record_refs,
      `recoveries/after-${sourceAttackCaseId}/command.json`,
    ],
  };
}

function caseFixture(variantId, caseId) {
  const committedCandidateIdentity = committedCandidateIdentityFixture(
    `${variantId}-${caseId}`,
  );
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
    committed_candidate_identity: committedCandidateIdentity,
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
    command_record_refs: [
      ...committedCandidateIdentity.command_record_refs,
      `cases/${caseId}/command.json`,
    ],
    final_result_sha256: "c".repeat(64),
  };
}

function committedCandidateIdentityFixture(label) {
  return {
    commit: digest(`commit:${label}`).slice(0, 40),
    tree: digest(`tree:${label}`).slice(0, 40),
    clean: true,
    command_record_refs: [
      `identity/${label}/candidate-before-head.command.json`,
      `identity/${label}/candidate-before-tree.command.json`,
      `identity/${label}/candidate-before-status.command.json`,
      `identity/${label}/candidate-after-head.command.json`,
      `identity/${label}/candidate-after-tree.command.json`,
      `identity/${label}/candidate-after-status.command.json`,
    ],
  };
}

function setupMapFixture(config) {
  return new Map(
    Object.values(config.variants).map((variant) => [
      variant.id,
      {
        variant_id: variant.id,
        commit: variant.commit,
        tree: fakeTree,
        package_sha256: digest(`package-${variant.id}`),
      },
    ]),
  );
}

async function writeFormalEvidenceFixture({
  fixture,
  setupByVariant,
  options = {},
}) {
  const formalRoot = await mkdtemp(path.join(os.tmpdir(), "ty-formal-roi-"));
  const sourcesRoot = path.join(formalRoot, "sources");
  await mkdir(sourcesRoot, { recursive: true });
  const sourceRecords = [];
  const addSource = async (relativePath, role, contents) => {
    const bytes = Buffer.isBuffer(contents)
      ? contents
      : Buffer.from(
          typeof contents === "string"
            ? contents
            : `${JSON.stringify(contents, null, 2)}\n`,
        );
    const target = path.join(sourcesRoot, ...relativePath.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    sourceRecords.push({
      path: relativePath,
      role,
      bytes: bytes.length,
      sha256: digest(bytes),
    });
  };

  await addSource(
    "collector/collector.mjs",
    "collector",
    "export const collector = 'fixed-formal-roi-fixture';\n",
  );
  const priceSourcePath = "prices/official-price.json";
  const priceDocumentPath = "prices/official-price-source.json";
  const officialRates = [
    ["provider_input_token", "token", 0.000001],
    ["provider_output_token", "token", 0.000002],
    ["provider_cached_input_token", "token", 0.0000005],
    ["compute_ms", "millisecond", 0.000001],
    ["storage_byte_hour", "byte-hour", 0.000001],
  ];
  const priceSourceKind = options.priceSourceKind ?? "official_price";
  await addSource(priceDocumentPath, "price_document", {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA,
    source_kind: priceSourceKind,
    publisher: "fixture-official-provider",
    source_locator: "fixture://official-provider/pricing/2026-08-10",
    published_at: "2026-08-10T00:00:00.000Z",
    currency: "CNY",
    rates: officialRates.map(([key, unit, ncuPerUnit]) =>
      priceSourceKind === "official_price"
        ? {
            key,
            unit,
            basis: "official_rate",
            cny_per_unit: ncuPerUnit,
          }
        : {
            key,
            unit,
            basis: "invoice_line",
            invoice_quantity: 1_000_000,
            invoice_amount_cny: ncuPerUnit * 1_000_000,
        },
    ),
  });
  await addSource(priceSourcePath, "price_source", {
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA,
    source_document_ref: priceDocumentPath,
    frozen_at: "2026-08-10T01:00:00.000Z",
    currency: "CNY",
  });

  const policy = JSON.parse(accountingPolicyText);
  const scenarioDefinitions = [];
  const addScenario = async ({
    scenarioId,
    kind,
    category,
    stratum,
    scenarioKind,
    pairCount,
    aggregation,
    cycleMultiplier,
  }) => {
    const taskSourceRef = `scenarios/${scenarioId}/task.txt`;
    const goldSourceRef = `scenarios/${scenarioId}/gold.bin`;
    await addSource(taskSourceRef, "scenario_source", `task:${scenarioId}\n`);
    await addSource(goldSourceRef, "scenario_gold", `gold:${scenarioId}\n`);
    scenarioDefinitions.push({
      scenario_id: scenarioId,
      kind,
      category,
      stratum,
      scenario_kind: scenarioKind,
      comparison_variants: ["b", "c"],
      pair_count: pairCount,
      aggregation,
      cycle_multiplier: cycleMultiplier,
      task_source_ref: taskSourceRef,
      gold_source_ref: goldSourceRef,
    });
  };
  for (const stratum of policy.lifecycle_population.strata)
    for (const category of stratum.categories)
      await addScenario({
        scenarioId: policy.lifecycle_population.scenario_ids[category],
        kind: "cost",
        category,
        stratum: stratum.key,
        scenarioKind: "fixed-b-c-same-quality-task",
        pairCount: stratum.pair_count,
        aggregation: stratum.aggregation,
        cycleMultiplier: stratum.cycle_multiplier,
      });
  const purposeScenario = policy.lifecycle_population.purpose_benefit;
  await addScenario({
    scenarioId: purposeScenario.scenario_id,
    kind: "purpose_benefit",
    category: null,
    stratum: "incident_once",
    scenarioKind: purposeScenario.scenario_kind,
    pairCount: purposeScenario.pair_count,
    aggregation: purposeScenario.aggregation,
    cycleMultiplier: purposeScenario.cycle_multiplier,
  });
  await addSource("scenarios/catalog.json", "scenario_catalog", {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA,
    frozen_at: "2026-08-10T02:00:00.000Z",
    scenarios: scenarioDefinitions,
  });
  const runByVariantAndRepeat = new Map(
    fixture.runs
      .filter((run) => ["b", "c"].includes(run.variant_id))
      .map((run) => [`${run.variant_id}:${run.repeat}`, run]),
  );
  const runForPair = (variantId, pairId) => {
    const repeat = pairId === "once" ? 1 : Number(pairId.slice(-2));
    const run = runByVariantAndRepeat.get(`${variantId}:${repeat}`);
    assert.ok(run, `fixture run missing for ${variantId} ${pairId}`);
    return run;
  };
  const notApplicable = () => ({
    disposition: "not_applicable",
    source_ref: null,
    redaction_rule_ref: null,
  });
  const retained = (sourceRef) => ({
    disposition: "retained",
    source_ref: sourceRef,
    redaction_rule_ref: null,
  });
  const defaultCostTime = (category, variantId) =>
    options.costActiveMs?.[category]?.[variantId] ??
    (variantId === "b" ? 3_600 : 5_400);
  const writeCostEvent = async ({ category, stratum, pairId, variantId }) => {
    const eventKey = `cost:${category}:${pairId}:${variantId}`;
    if (options.omitEvidenceKey === eventKey) return;
    const safePair = pairId.replaceAll("-", "");
    const prefix = `${category}-${safePair}-${variantId}`;
    const scenarioId = policy.lifecycle_population.scenario_ids[category];
    const scenarioOutputRef = `outputs/${prefix}.bin`;
    await addSource(
      scenarioOutputRef,
      "scenario_output",
      `gold:${scenarioId}\n`,
    );
    let rawPrompt = notApplicable();
    let providerEvent = notApplicable();
    const measurements = [
      {
        kind: "human_time",
        active_ms: defaultCostTime(category, variantId),
        wait_ms: 0,
      },
    ];
    if (category === "authoring") {
      const promptPath = `prompts/${prefix}.txt`;
      const providerPath = `provider-events/${prefix}.json`;
      await addSource(promptPath, "raw_prompt", `prompt:${prefix}\n`);
      await addSource(
        providerPath,
        "provider_event",
        {
          schema_version:
            REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA,
          invocation_id: `invocation:${eventKey}`,
          provider: "fixture-provider",
          model: "fixture-model",
          recorded_at: "2026-08-11T00:30:00.000Z",
          usage: {
            input_tokens: 1000,
            output_tokens: 100,
            cached_input_tokens: 50,
          },
        },
      );
      rawPrompt = retained(promptPath);
      providerEvent = retained(providerPath);
      measurements.push(
        {
          kind: "metered_usage",
          meter: "provider_input_token",
          quantity: 1000,
          unit: "token",
          price_source_ref: priceSourcePath,
        },
        {
          kind: "metered_usage",
          meter: "provider_output_token",
          quantity: 100,
          unit: "token",
          price_source_ref: priceSourcePath,
        },
        {
          kind: "metered_usage",
          meter: "provider_cached_input_token",
          quantity: 50,
          unit: "token",
          price_source_ref: priceSourcePath,
        },
      );
    }
    if (category === "runtime")
      measurements.push({
        kind: "metered_usage",
        meter: "compute_ms",
        quantity: 1000,
        unit: "millisecond",
        price_source_ref: priceSourcePath,
      });
    if (category === "state")
      measurements.push({
        kind: "metered_usage",
        meter: "storage_byte_hour",
        quantity: 1000,
        unit: "byte-hour",
        price_source_ref: priceSourcePath,
      });
    await addSource(`events/${eventKey.replaceAll(":", "-")}.json`, "raw_event", {
      schema_version: REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA,
      run_set_id: "fixture-run-set",
      run_id: runForPair(variantId, pairId).run_id,
      variant_id: variantId,
      pair_id: pairId,
      invocation_id: `invocation:${eventKey}`,
      observed_at: "2026-08-11T00:30:00.000Z",
      scenario_output_ref: scenarioOutputRef,
      subject: {
        kind: "cost",
        category,
        scenario_id: scenarioId,
        stratum,
      },
      measurements,
      provenance: {
        raw_prompt: rawPrompt,
        provider_event: providerEvent,
      },
    });
  };
  for (const stratum of policy.lifecycle_population.strata) {
    const pairs =
      stratum.pair_count === 1
        ? ["once"]
        : ["pair-01", "pair-02", "pair-03", "pair-04", "pair-05"];
    for (const category of stratum.categories)
      for (const pairId of pairs)
        for (const variantId of ["b", "c"])
          await writeCostEvent({
            category,
            stratum: stratum.key,
            pairId,
            variantId,
          });
  }

  const benefitDeltas = options.benefitDeltas ?? [10, 10, 10, 10, 10];
  for (const [index, pairId] of [
    "pair-01",
    "pair-02",
    "pair-03",
    "pair-04",
    "pair-05",
  ].entries()) {
    for (const variantId of ["b", "c"]) {
      const eventKey = `benefit:fixed-controlled-incident:${pairId}:${variantId}`;
      if (options.omitEvidenceKey === eventKey) continue;
      const scenarioOutputRef = `outputs/incident-${pairId}-${variantId}.bin`;
      await addSource(
        scenarioOutputRef,
        "scenario_output",
        variantId === "c"
          ? `gold:${purposeScenario.scenario_id}\n`
          : `wrong:${purposeScenario.scenario_id}:${pairId}\n`,
      );
      await addSource(
        `events/${eventKey.replaceAll(":", "-")}.json`,
        "raw_event",
        {
          schema_version:
            REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA,
          run_set_id: "fixture-run-set",
          run_id: runForPair(variantId, pairId).run_id,
          variant_id: variantId,
          pair_id: pairId,
          invocation_id: `invocation:${eventKey}`,
          observed_at: "2026-08-11T00:30:00.000Z",
          scenario_output_ref: scenarioOutputRef,
          subject: {
            kind: "purpose_benefit",
            scenario_id: "fixed-controlled-incident",
            stratum: "incident_once",
          },
          measurements: [
            {
              kind: "human_time",
              active_ms:
                (variantId === "b" ? 100 : 100 - benefitDeltas[index]) *
                18_000,
              wait_ms: 0,
            },
          ],
          provenance: {
            raw_prompt: notApplicable(),
            provider_event: notApplicable(),
          },
        },
      );
    }
  }

  const entries = sourceRecords.sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  const precollectionEntries = entries
    .filter((entry) =>
      [
        "collector",
        "price_document",
        "price_source",
        "redaction_rule",
        "scenario_catalog",
        "scenario_gold",
        "scenario_source",
      ].includes(entry.role),
    )
    .map((entry) => ({ ...entry }));
  const precollectionFrozenAt = "2026-08-10T03:00:00.000Z";
  const precollectionIdentity = {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA,
    frozen_at: precollectionFrozenAt,
    entries: precollectionEntries,
    identity_sha256: sha256(
      canonical({
        frozen_at: precollectionFrozenAt,
        entries: precollectionEntries,
      }),
    ),
  };
  const collectorEntries = entries
    .filter((entry) => entry.role === "collector")
    .map(({ path: sourcePath, bytes, sha256: sourceSha }) => ({
      path: sourcePath,
      bytes,
      sha256: sourceSha,
    }));
  const runBindings = fixture.runs.map((run) => ({
    run_id: run.run_id,
    variant_id: run.variant_id,
    repeat: run.repeat,
    candidate_commit: run.candidate_identity.commit,
    candidate_tree: run.candidate_identity.tree,
    package_sha256: setupByVariant.get(run.variant_id).package_sha256,
  }));
  const packet = {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA,
    run_set_id: "fixture-run-set",
    created_at: "2026-08-11T02:00:00.000Z",
    collection_window: {
      started_at: "2026-08-11T00:00:00.000Z",
      completed_at: "2026-08-11T01:00:00.000Z",
    },
    accounting_policy_identity: fixture.config.accounting_policy_identity,
    candidate_identities: ["a", "b", "c"].map((variantId) => {
      const setup = setupByVariant.get(variantId);
      return {
        variant_id: variantId,
        commit: setup.commit,
        tree: setup.tree,
        package_sha256: setup.package_sha256,
      };
    }),
    run_bindings: runBindings,
    collector_identity: {
      frozen_at: "2026-08-10T02:00:00.000Z",
      entries: collectorEntries,
      identity_sha256: sha256(canonical(collectorEntries)),
    },
    retention_policy: policy.retention,
    source_bundle: {
      schema_version:
        REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_SOURCE_MANIFEST_SCHEMA,
      root: "sources",
      entries,
      entry_count: entries.length,
      total_bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
      materialized_set_sha256: sha256(canonical(entries)),
    },
  };
  const packetPath = path.join(formalRoot, "packet.json");
  await writeJson(packetPath, packet);
  return {
    root: formalRoot,
    packetPath,
    runSetId: packet.run_set_id,
    precollectionIdentity,
  };
}

async function resignFormalEvidenceSource(packetPath, relativePath) {
  const packet = JSON.parse(await readFile(packetPath, "utf8"));
  const target = path.join(
    path.dirname(packetPath),
    packet.source_bundle.root,
    ...relativePath.split("/"),
  );
  const bytes = await readFile(target);
  const entry = packet.source_bundle.entries.find(
    (candidate) => candidate.path === relativePath,
  );
  assert.ok(entry, relativePath);
  entry.bytes = bytes.length;
  entry.sha256 = digest(bytes);
  packet.source_bundle.total_bytes = packet.source_bundle.entries.reduce(
    (sum, candidate) => sum + candidate.bytes,
    0,
  );
  packet.source_bundle.materialized_set_sha256 = sha256(
    canonical(packet.source_bundle.entries),
  );
  await writeJson(packetPath, packet);
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
    for (const { label, argv, output } of [
      {
        label: "git-worktree-add",
        argv: ["git-worktree-add"],
        output: "git-worktree-add",
      },
      { label: "npm-ci", argv: ["npm-ci"], output: "npm-ci" },
      {
        label: "package-build",
        argv: ["package-build"],
        output: "package-build",
      },
      { label: "package-pack", argv: ["package-pack"], output: "package-pack" },
      {
        label: "candidate-head",
        argv: ["git", "rev-parse", "HEAD"],
        output: variant.commit,
      },
      {
        label: "candidate-tree",
        argv: ["git", "rev-parse", "HEAD^{tree}"],
        output: fakeTree,
      },
      {
        label: "candidate-status",
        argv: ["git", "status", "--short"],
        output: "",
      },
    ]) {
      const stdout = Buffer.from(output ? `${output}\n` : "");
      const stderr = Buffer.alloc(0);
      const command = {
        schema_version: "long-task-real-process-host-command-v1",
        label,
        argv,
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

async function writePrecollectionIdentityFixture(runSetRoot, formal) {
  for (const entry of formal.precollectionIdentity.entries) {
    const source = path.join(
      formal.root,
      "sources",
      ...entry.path.split("/"),
    );
    const target = path.join(
      runSetRoot,
      "inputs",
      "formal-evidence-precollection",
      ...entry.path.split("/"),
    );
    const bytes = await readFile(source);
    assert.equal(bytes.length, entry.bytes);
    assert.equal(digest(bytes), entry.sha256);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
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
  const candidateIdentityByRef = new Map();
  for (const item of [...run.cases, ...run.recoveries])
    for (const reference of item.committed_candidate_identity
      .command_record_refs)
      candidateIdentityByRef.set(reference, item.committed_candidate_identity);
  const commands = [];
  await mkdir(path.join(runRoot, "logs"), { recursive: true });
  for (const [index, reference] of commandRefs.entries()) {
    const candidateIdentity = candidateIdentityByRef.get(reference);
    const label = path.basename(reference, ".command.json");
    const identityCommand = candidateIdentity
      ? fixtureIdentityCommand(label, candidateIdentity)
      : null;
    const stdout = Buffer.from(
      identityCommand
        ? identityCommand.stdout
          ? `${identityCommand.stdout}\n`
          : ""
        : `stdout-${index}\n`,
    );
    const stderr = Buffer.alloc(0);
    const stdoutPath = `logs/${String(index + 1).padStart(3, "0")}.stdout.log`;
    const stderrPath = `logs/${String(index + 1).padStart(3, "0")}.stderr.log`;
    const command = {
      schema_version: "long-task-real-process-command-v1",
      index: index + 1,
      label: identityCommand ? label : "fixture",
      argv: identityCommand?.argv ?? [process.execPath, "fixture"],
      cwd: candidateIdentity
        ? path.join(runRoot, path.dirname(reference))
        : runRoot,
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

function fixtureIdentityCommand(label, identity) {
  if (label.endsWith("-head"))
    return { argv: ["git", "rev-parse", "HEAD"], stdout: identity.commit };
  if (label.endsWith("-tree"))
    return {
      argv: ["git", "rev-parse", "HEAD^{tree}"],
      stdout: identity.tree,
    };
  if (label.endsWith("-status"))
    return { argv: ["git", "status", "--short"], stdout: "" };
  throw new Error(`fixture_identity_command_unknown:${label}`);
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
