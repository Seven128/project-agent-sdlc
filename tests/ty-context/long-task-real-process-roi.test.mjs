import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  cp,
  lstat,
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
import { gzipSync } from "node:zlib";
import {
  BASELINE_A_COMMIT,
  CASE_IDS,
  ISOLATED_ENVELOPE_B_COMMIT,
  MEASUREMENT_THRESHOLDS,
  REQUIRED_METRICS,
  repeatOrder,
  variantDefinitions,
} from "../../tools/long_task_real_process_roi_policy.mjs";
import {
  FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
  FORMAL_TOTAL_COST_CATEGORIES,
  REAL_PROCESS_SCHEMAS,
} from "../../tools/long_task_real_process_schema_policy.mjs";
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
} from "../../tools/long_task_real_process_roi_runner.mjs";
import { npmCommandSpec } from "../../tools/npm_command_spec.mjs";
import { verifyRealProcessRoiReport } from "../../tools/verify_long_task_real_process_roi.mjs";
import {
  deriveFormalRuntimeTcbIdentity,
  formalProcessSupervisorTcbPaths,
} from "../../tools/long_task_formal_runtime_tcb.mjs";
import { FORMAL_PROVIDER_PARENT_IMPLEMENTATION_PATHS } from "../../tools/long_task_formal_provider_capture.mjs";
import {
  FORMAL_PROVIDER_PROTOCOL_PATH,
  FORMAL_PROVIDER_RESPONSE_PATH,
  FORMAL_PROVIDER_WORKER_PATH,
} from "../../tools/long_task_formal_provider_protocol.mjs";
import { readPackedPackageIdentity } from "../../tools/long_task_packed_package_identity.mjs";
import { evaluateProductFacts } from "../../examples/delivery-benchmark/real-process-workload/product/facts.mjs";
import {
  evaluateCounterfactualGold,
  evaluateIndependentGold,
  loadSemanticGold,
} from "../../examples/delivery-benchmark/real-process-workload/runner/gold.mjs";
import { runOwnedChildProcess } from "./helpers/owned-child-process.mjs";

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
const runtimeControlChild = fileURLToPath(
  new URL("./long-task-real-process-roi-runtime-child.mjs", import.meta.url),
);
const ownedTreeFixture = fileURLToPath(
  new URL("./owned-child-process-tree-fixture.mjs", import.meta.url),
);
const fixtureRuntimeEnvironments = new WeakMap();
const ROI_RUNTIME_RESPONSE_LIMIT_BYTES = 16 * 1024 * 1024;
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
    const result = await execute(process.execPath, [cli, option], {
      cwd: root,
    });
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
      [
        "--dry-run",
        "--candidate",
        fakeCandidate,
        "--formal-evidence",
        "packet.json",
      ],
      "real_process_roi_formal_evidence_requires_report",
    ],
    [
      [
        "--dry-run",
        "--candidate",
        fakeCandidate,
        "--artifact-root",
        "artifacts",
      ],
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
    const result = await execute(process.execPath, [cli, ...args], {
      cwd: root,
    });
    assert.notEqual(result.status, 0, args.join(" "));
    assert.ok(result.stderr.includes(diagnostic), result.stderr);
  }
});

test("real process ROI lifecycle enables Long-Task before Preflight", async () => {
  const success = await runRoiRuntimeControl("enable-capture", {
    cli: "C:\\fixture\\cli.js",
    status: 0,
  });
  assert.equal(success.result.status, 0);
  assert.equal(success.error, null);
  assert.deepEqual(success.calls, [
    [
      "enable-long-task",
      process.execPath,
      ["C:\\fixture\\cli.js", "enable", "long-task"],
    ],
  ]);
  const failure = await runRoiRuntimeControl("enable-capture", {
    cli: "C:\\fixture\\cli.js",
    status: 1,
  });
  assert.match(failure.error, /real_process_roi_enable_failed:1/u);
  assert.equal(failure.result, null);
});

test("real process ROI child response stays regular and within its private file bound", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-response-"));
  try {
    const responsePath = path.join(temporary, "response.json");
    await writeFile(responsePath, JSON.stringify({ ok: true, value: 1 }));
    assert.deepEqual(await readBoundedRuntimeResponse(responsePath), {
      ok: true,
      value: 1,
    });

    await writeFile(
      responsePath,
      Buffer.alloc(ROI_RUNTIME_RESPONSE_LIMIT_BYTES + 1),
    );
    await assert.rejects(
      () => readBoundedRuntimeResponse(responsePath),
      /real_process_roi_runtime_control_response_invalid/u,
    );

    const targetPath = path.join(temporary, "target.json");
    const linkedPath = path.join(temporary, "linked.json");
    await writeFile(targetPath, JSON.stringify({ ok: true, value: 2 }));
    try {
      await symlink(targetPath, linkedPath, "file");
    } catch (error) {
      if (!["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) throw error;
      return;
    }
    await assert.rejects(
      () => readBoundedRuntimeResponse(linkedPath),
      /real_process_roi_runtime_control_response_invalid/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("test-owned child boundaries settle their process tree on success and bounded failure", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-owned-tree-"));
  try {
    for (const control of [
      {
        mode: "timeout",
        diagnostic: /owned_child_process_timeout/u,
        timeoutMs: 2_000,
      },
      {
        mode: "output-limit",
        diagnostic: /owned_child_process_output_limit/u,
        timeoutMs: 10_000,
      },
      {
        mode: "success-leak",
        diagnostic: /owned_child_process_(?:timeout|tree_unsettled)/u,
        cleanSuccessAllowed: true,
        timeoutMs: 2_000,
      },
    ]) {
      const pidPath = path.join(temporary, `${control.mode}.json`);
      const execution = runOwnedChildProcess(
        process.execPath,
        [ownedTreeFixture, pidPath, control.mode],
        {
          timeoutMs: control.timeoutMs,
        },
      );
      if (control.cleanSuccessAllowed) {
        try {
          assert.equal((await execution).status, 0);
        } catch (error) {
          assert.match(String(error), control.diagnostic);
        }
      } else {
        await assert.rejects(execution, control.diagnostic);
      }
      const pids = JSON.parse(await readFile(pidPath, "utf8"));
      await waitForProcessesGone([pids.parent, pids.descendant]);
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
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
    await runRoiRuntimeControl("enable-fixture", {
      cli,
      environment: fixtureRuntimeEnvironments.get(fixture),
      root: fixture.root,
    });
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
      assert.equal(
        checkResults.get("first-check")?.status,
        "assertion_failed",
        JSON.stringify(checkResults.get("first-check")?.findings ?? []),
      );
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
    assert.deepEqual(npmCommandSpec(args, options), {
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "call", "npm", ...args],
    });
});

test("real process ROI artifact manifest keeps its retained-file budget fail closed", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-budget-"));
  const oversized = path.join(temporary, "oversized.stdout.log");
  try {
    await writeFile(oversized, "");
    await truncate(oversized, 64 * 1024 * 1024 + 1);
    await assert.rejects(
      buildArtifactManifest(temporary),
      /real_process_roi_artifact_capacity/u,
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
      "long-task-formal-total-cost-accounting-policy-v2",
    FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA:
      "long-task-formal-total-cost-evidence-packet-v2",
    FORMAL_TOTAL_COST_PRECOLLECTION_PLAN_SCHEMA:
      "long-task-formal-total-cost-precollection-plan-v2",
    FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA:
      "long-task-formal-total-cost-price-document-v1",
    FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA:
      "long-task-formal-total-cost-price-source-v1",
    FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA:
      "long-task-formal-total-cost-provider-event-v3",
    FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA:
      "long-task-formal-total-cost-raw-event-v2",
    FORMAL_TOTAL_COST_REDACTION_RULE_SCHEMA:
      "long-task-formal-total-cost-redaction-rule-v1",
    FORMAL_TOTAL_COST_SCENARIO_CATALOG_SCHEMA:
      "long-task-formal-total-cost-scenario-catalog-v2",
    FORMAL_TOTAL_COST_SOURCE_MANIFEST_SCHEMA:
      "long-task-formal-total-cost-source-manifest-v2",
    FORMAL_TOTAL_COST_COLLECTOR_CATALOG_SCHEMA:
      "long-task-formal-total-cost-collector-catalog-v1",
    FORMAL_SCENARIO_EXECUTION_SCHEMA: "formal-scenario-execution-v1",
    FORMAL_HUMAN_INTERACTION_TRACE_SCHEMA: "formal-runner-interaction-trace-v1",
    FORMAL_PROCESS_ACCOUNTING_SCHEMA: "formal-process-tree-accounting-v1",
    FORMAL_STORAGE_LEDGER_SCHEMA: "formal-runner-storage-ledger-v1",
    LEVEL4_INDEPENDENT_AUDIT_SCHEMA: "level4-independent-capability-audit-v1",
    LEVEL4_PROMOTION_RECORD_SCHEMA: "level4-governance-promotion-v1",
    REAL_PROCESS_ROI_SCHEMA: "long-task-real-process-roi-run-set-v5",
    REAL_PROCESS_RUN_SCHEMA: "long-task-real-process-roi-run-v5",
    REAL_PROCESS_MANIFEST_SCHEMA: "long-task-real-process-roi-manifest-v2",
    REAL_PROCESS_ATTESTATION_SCHEMA:
      "long-task-real-process-roi-attestation-v5",
    REAL_PROCESS_FROZEN_CONFIG_SCHEMA:
      "long-task-real-process-roi-frozen-config-v5",
    REAL_PROCESS_SUMMARY_SCHEMA: "long-task-real-process-roi-summary-v5",
    REAL_PROCESS_DRY_RUN_SCHEMA: "long-task-real-process-roi-dry-run-v5",
    REAL_PROCESS_COLLECTION_SCHEMA: "long-task-real-process-roi-collection-v5",
    REAL_PROCESS_VERIFICATION_SCHEMA:
      "long-task-real-process-roi-verification-v5",
    REAL_PROCESS_WORKLOAD_SCHEMA: "long-task-real-process-workload-v5",
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
    assert.equal(Object.keys(envelope.observations).length, 16);
    assert.equal(
      envelope.observations["fact.first.architecture-boundary"],
      true,
    );
    assert.equal(
      envelope.observations["fact.second.architecture-boundary"],
      true,
    );
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
    assert.equal(Object.keys(firstEnvelope.observations).length, 8);
    assert.equal(Object.keys(secondEnvelope.observations).length, 8);
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

test("collection summary owns observed lifecycle facts and never a formal ROI conclusion", async () => {
  const fixture = await scoringFixture();
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

test("the five-repeat formal population remains complete when three repeats satisfy diagnostics", async () => {
  const fixture = await formalScoringFixture();
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

test("run records and frozen config cannot self-attest formal ROI evidence", async () => {
  const runFixture = await scoringFixture();
  runFixture.runs[0].formal_total_cost_evidence = {
    verified: true,
  };
  assert.throws(
    () => validateRunRecord(runFixture.runs[0], runFixture.config),
    /real_process_roi_invalid:run_formal_conclusion_fields_prohibited/u,
  );
  const renamedConclusion = await scoringFixture();
  renamedConclusion.runs[0].formal_status = "verified";
  assert.throws(
    () =>
      validateRunRecord(renamedConclusion.runs[0], renamedConclusion.config),
    /real_process_roi_invalid:run_formal_conclusion_fields_prohibited/u,
  );
  const configFixture = await scoringFixture();
  configFixture.config.formal_total_cost_policy.independent_evidence_admitted = true;
  assert.throws(
    () => deriveRealProcessRoiSummary(configFixture.runs, configFixture.config),
    /real_process_roi_invalid:frozen_config_formal_total_cost_policy/u,
  );
});

test("a missing authoritative authoring-token event remains diagnostic and cannot manufacture total ROI", async () => {
  const fixture = await scoringFixture();
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

test("missing B false acceptance invalidates the evidence instead of making B look safer", async () => {
  const fixture = await scoringFixture();
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

test("high variance or inconsistent direction expands three repeats to five", async () => {
  const fixture = await scoringFixture();
  const cRuns = fixture.runs.filter((run) => run.variant_id === "c");
  cRuns[1].metrics.total_elapsed_ms.value = 3000;
  const expansion = expansionDecision(fixture.runs, fixture.config);
  assert.equal(expansion.required_repeats, 5);
  assert.ok(expansion.reasons.length > 0);
  const summary = deriveRealProcessRoiSummary(fixture.runs, fixture.config);
  assert.equal(summary.formal_status, "not_evaluated");
  assert.equal(summary.observed_lifecycle_status, "requires_expanded_repeats");
});

test("run validation rejects metric tampering, duplicate cases and promoted A authority", async () => {
  const fixture = await scoringFixture();
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
  const legacyV3 = structuredClone(fixture.runs[0]);
  legacyV3.schema_version = "long-task-real-process-roi-run-v3";
  assert.throws(
    () => validateRunRecord(legacyV3, fixture.config),
    /real_process_roi_invalid:run_schema_v3_recollection_required/u,
  );
  const unknownNewer = structuredClone(fixture.runs[0]);
  unknownNewer.schema_version = "long-task-real-process-roi-run-v999";
  assert.throws(
    () => validateRunRecord(unknownNewer, fixture.config),
    /real_process_roi_invalid:run_schema/u,
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
  const duplicateRunIds = await scoringFixture();
  duplicateRunIds.runs[1].run_id = duplicateRunIds.runs[0].run_id;
  assert.throws(
    () =>
      deriveRealProcessRoiSummary(duplicateRunIds.runs, duplicateRunIds.config),
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

test("report verifier is Windows-TCB-bound and recomputes raw SHA closure, summary and verdict", async () => {
  if (process.platform !== "win32") {
    await assert.rejects(
      () => formalScoringFixture({ includeRuntimeTcb: true }),
      /formal_process_supervisor_platform_unsupported/u,
    );
    return;
  }
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-report-"));
  try {
    const state = await materializeVerifierReportFixture(temporary);
    await assertVerifierFormalConclusions(temporary, state);
    await assertNonOwnerFormalFieldsRejected(temporary);
    await assertVerifierRawTamperingRejected(temporary, state);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

async function materializeVerifierReportFixture(temporary) {
  const fixture = await formalScoringFixture({ includeRuntimeTcb: true });
  for (const run of fixture.runs.filter((item) => item.variant_id === "c"))
    run.metrics.total_elapsed_ms.value += 1_000;
  fixture.config.formal_evidence_precollection_identity = null;
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
    formal_evidence_precollection_sha256: null,
    formal_evidence_index_ref: null,
    environment_identity: fixture.config.environment_identity,
    formal_runtime_tcb_identity_sha256:
      fixture.config.formal_runtime_tcb_identity.identity_sha256,
    setup,
    summary,
    run_refs: runRefs,
  });
  const manifest = await buildArtifactManifest(temporary);
  await writeJson(path.join(temporary, "manifest.json"), manifest);
  await writeVerifierAttestation(temporary, fixture, summary);
  return { fixture, runRefs, setup };
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
    formal_evidence_precollection_sha256: null,
    formal_evidence_index_ref: null,
    environment_identity: fixture.config.environment_identity,
    formal_runtime_tcb_identity_sha256:
      fixture.config.formal_runtime_tcb_identity.identity_sha256,
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
  assert.equal(
    verified.formal_conclusion_owner,
    "verify_long_task_real_process_roi",
  );
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
  await resignManifest(temporary);
  await assert.rejects(
    verifyRealProcessRoiReport(temporary),
    /run_set_json:aggregate\.json:duplicate_key/u,
  );
  await writeFile(aggregatePath, originalAggregate);
  await resignManifest(temporary);
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
  if (path.basename(target) !== "attestation.json")
    await resignManifest(temporary);
  await assert.rejects(verifyRealProcessRoiReport(temporary), diagnostic);
  await writeFile(target, original);
  if (path.basename(target) !== "attestation.json")
    await resignManifest(temporary);
}

async function assertVerifierRawTamperingRejected(temporary, state) {
  const aggregatePath = path.join(temporary, "aggregate.json");
  const currentAggregate = await readFile(aggregatePath);
  const legacyAggregate = JSON.parse(currentAggregate);
  for (const [version, diagnostic] of [
    ["v1", /aggregate_schema_v1_recollection_required/u],
    ["v2", /aggregate_schema_v2_recollection_required/u],
    ["v3", /aggregate_schema_v3_recollection_required/u],
  ]) {
    legacyAggregate.schema_version = `long-task-real-process-roi-run-set-${version}`;
    await writeJson(aggregatePath, legacyAggregate);
    await resignManifest(temporary);
    await assert.rejects(verifyRealProcessRoiReport(temporary), diagnostic);
  }
  await writeFile(aggregatePath, currentAggregate);
  await resignManifest(temporary);
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
    /real_process_roi_manifest_recomputation/u,
  );
}

async function scoringFixture({ repeats = 3, includeRuntimeTcb = false } = {}) {
  const variants = variantDefinitions(fakeCandidate);
  const workloadIdentity = sourceIdentityFixture("workload.json", "workload");
  const implementationIdentity = sourceIdentityMultiFixture(
    [
      ...formalProcessSupervisorTcbPaths,
      ...FORMAL_PROVIDER_PARENT_IMPLEMENTATION_PATHS,
      FORMAL_PROVIDER_WORKER_PATH,
      FORMAL_PROVIDER_RESPONSE_PATH,
      FORMAL_PROVIDER_PROTOCOL_PATH,
    ],
    "implementation",
  );
  const accountingPolicyIdentity = sourceIdentityFixture(
    FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
    accountingPolicyText,
  );
  const environment = {
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    node_exec_path: process.execPath,
  };
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
    formal_runtime_tcb_identity: includeRuntimeTcb
      ? await deriveFormalRuntimeTcbIdentity({
          environment,
          benchmarkImplementationIdentity: implementationIdentity,
        })
      : null,
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

async function formalScoringFixture({ includeRuntimeTcb = false } = {}) {
  return scoringFixture({ repeats: 5, includeRuntimeTcb });
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
      package_sha256: digest(packageTarballFixture("0.8.15")),
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

async function createWorkloadFixture(options) {
  const result = await runRoiRuntimeControl("create-fixture", { options });
  fixtureRuntimeEnvironments.set(result.fixture, result.environment);
  return result.fixture;
}

async function removeFixture(fixture) {
  try {
    await runRoiRuntimeControl("remove-fixture", { fixture });
  } catch (error) {
    await rm(fixture.root, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

async function executeRealProcessRoiLifecycle(options) {
  const { commandRecords, ...serializable } = options;
  const result = await runRoiRuntimeControl("execute-lifecycle", {
    environment: fixtureRuntimeEnvironments.get(options.fixture),
    options: serializable,
  });
  commandRecords.push(...result.commandRecords);
  return result.lifecycle;
}

async function runRoiRuntimeControl(operation, payload) {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-roi-runtime-control-"),
  );
  const requestPath = path.join(temporary, "request.json");
  const responsePath = path.join(temporary, "response.json");
  try {
    await writeFile(
      requestPath,
      JSON.stringify({ operation, ...payload }),
      "utf8",
    );
    const execution = await runOwnedChildProcess(
      process.execPath,
      [runtimeControlChild, requestPath, responsePath],
      {
        cwd: root,
        timeoutMs: 300_000,
      },
    );
    if (execution.status !== 0)
      throw new Error(
        `real_process_roi_runtime_control_child:${operation}:${execution.status}:${execution.stderr}`,
      );
    const response = await readBoundedRuntimeResponse(responsePath);
    if (response.ok !== true)
      throw new Error(
        `real_process_roi_runtime_control:${operation}:${response.error ?? "missing_error"}`,
      );
    return response.value;
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function readBoundedRuntimeResponse(responsePath) {
  const metadata = await lstat(responsePath);
  if (
    !metadata.isFile() ||
    metadata.isSymbolicLink() ||
    metadata.size > ROI_RUNTIME_RESPONSE_LIMIT_BYTES
  )
    throw new Error("real_process_roi_runtime_control_response_invalid");
  const bytes = await readFile(responsePath);
  if (bytes.length > ROI_RUNTIME_RESPONSE_LIMIT_BYTES)
    throw new Error("real_process_roi_runtime_control_response_limit");
  return JSON.parse(bytes.toString("utf8"));
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

async function waitForProcessesGone(pids) {
  const deadline = Date.now() + 10_000;
  while (pids.some(isProcessAlive)) {
    if (Date.now() >= deadline)
      assert.fail(`owned child process tree remained alive: ${pids.join(",")}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
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
    const packageBytes = packageTarballFixture("0.8.15");
    const packed = readPackedPackageIdentity(packageBytes);
    const packagePath = `setup/${variant.id}/pack/${variant.id}.tgz`;
    const setupRoot = path.join(runSetRoot, "setup", variant.id);
    await mkdir(path.dirname(path.join(runSetRoot, packagePath)), {
      recursive: true,
    });
    await writeFile(path.join(runSetRoot, packagePath), packageBytes);
    const commandRecords = [];
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
      {
        label: "package-check-source",
        argv: ["package-check-source"],
        output: "package-check-source",
      },
      { label: "package-pack", argv: ["package-pack"], output: "package-pack" },
      { label: "npm-version", argv: ["npm", "--version"], output: "10.0.0" },
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
        argv: ["git", "status", "--porcelain=v1", "--untracked-files=no"],
        output: "",
      },
    ]) {
      const stdout = Buffer.from(output ? `${output}\n` : "");
      const stderr = Buffer.alloc(0);
      const command = {
        schema_version: "long-task-package-materialization-command-v1",
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
      commandRecords.push(command);
    }
    const record = {
      variant_id: variant.id,
      schema_version: "long-task-package-materialization-v1",
      commit: variant.commit,
      tree: fakeTree,
      package_name: packed.package_name,
      package_path: `pack/${variant.id}.tgz`,
      package_version: "0.8.15",
      package_sha256: digest(packageBytes),
      package_file_set_sha256: packed.package_file_set_sha256,
      lockfile_sha256: digest("fixture-lockfile"),
      node_version: process.version,
      node_executable_sha256: digest("fixture-node"),
      npm_version: "10.0.0",
      protocol: "npm-ci-build-check-source-pack-v1",
      command_records: commandRecords,
    };
    await writeJson(path.join(setupRoot, "setup.json"), record);
    records.push(record);
  }
  return records;
}

async function writeIdentityFixture(runSetRoot, prefix, identity, contents) {
  for (const entry of identity.entries) {
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

function sourceIdentityMultiFixture(files, contents) {
  const entries = files.map((file) => ({
    path: file,
    bytes: Buffer.byteLength(contents),
    sha256: digest(contents),
  }));
  return {
    entries,
    identity_sha256: sha256(canonical(entries)),
  };
}

function packageTarballFixture(version) {
  const body = Buffer.from(
    `${JSON.stringify({
      name: "project-tiny-context-harness",
      version,
    })}\n`,
  );
  const header = Buffer.alloc(512);
  header.write("package/package.json", 0, "utf8");
  header.write("0000644\0", 100, "ascii");
  header.write("0000000\0", 108, "ascii");
  header.write("0000000\0", 116, "ascii");
  header.write(`${body.length.toString(8).padStart(11, "0")}\0`, 124, "ascii");
  header.write("00000000000\0", 136, "ascii");
  header.fill(0x20, 148, 156);
  header.write("0", 156, "ascii");
  header.write("ustar\0", 257, "ascii");
  header.write("00", 263, "ascii");
  const checksum = header.reduce((total, byte) => total + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
  const padding = Buffer.alloc(
    Math.ceil(body.length / 512) * 512 - body.length,
  );
  return gzipSync(Buffer.concat([header, body, padding, Buffer.alloc(1024)]), {
    mtime: 0,
  });
}
