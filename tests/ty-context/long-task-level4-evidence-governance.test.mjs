import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";
import { CASE_IDS } from "../../tools/long_task_real_process_roi_policy.mjs";
import {
  FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
  FORMAL_EVIDENCE_CAPACITY,
  FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH,
  LEGACY_FORMAL_EVIDENCE_SCHEMAS,
  LEGACY_REAL_PROCESS_SCHEMAS,
  REAL_PROCESS_SCHEMA_FAMILY_TABLE,
  REAL_PROCESS_SCHEMAS,
} from "../../tools/long_task_real_process_schema_policy.mjs";
import {
  canonical,
  sha256,
} from "../../tools/long_task_real_process_roi_scoring.mjs";
import {
  deriveFormalExecutionId,
  deriveFormalExecutionRecordSha256,
  deriveFormalInvocationId,
  finalizeFormalExecutionRecord,
} from "../../tools/long_task_formal_total_cost_execution.mjs";
import {
  expectedFormalEvidenceKeys,
  formalEvidenceKey,
} from "../../tools/long_task_formal_total_cost_events.mjs";
import { evaluateFormalTotalCostEvidence } from "../../tools/long_task_formal_total_cost_evidence.mjs";
import {
  buildImmutableRunArtifactIndex,
  buildRealProcessArtifactManifest,
} from "../../tools/long_task_real_process_artifacts.mjs";
import { FormalProcessSupervisor } from "../../tools/formal_process_supervisor.mjs";
import { RunnerInteractionSession } from "../../tools/long_task_formal_interaction_recorder.mjs";
import { formalCollectorEnvironment } from "../../tools/long_task_formal_collection_io.mjs";
import {
  collectFormalScenarioExecution,
  collectFormalTotalCostArtifacts,
} from "../../tools/long_task_formal_total_cost_collection.mjs";
import { deriveFormalTotalCostAccounting } from "../../tools/long_task_formal_total_cost_accounting.mjs";
import {
  LEVEL4_AUDIT_REQUIRED_INPUT_ROLES,
  validateLevel4EvidenceReference,
  validateLevel4IndependentAuditRecord,
  validateLevel4OwnerDecision,
  validateLevel4PromotionRecord,
} from "../../tools/level4_governance_protocol.mjs";
import {
  comparePackedPackages,
  verifyLevel4GovernancePromotion,
} from "../../tools/verify_level4_governance_promotion.mjs";
import { realProcessRoiBenchmarkImplementationPaths } from "../../tools/long_task_real_process_roi_runner.mjs";
import { deriveFormalRuntimeTcbIdentity } from "../../tools/long_task_formal_runtime_tcb.mjs";
import { npmCommandSpec } from "../../tools/npm_command_spec.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("../..", import.meta.url));
const accountingPolicyPath = path.join(
  root,
  ...FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH.split("/"),
);
const scenarioCatalogPath = path.join(
  root,
  ...FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH.split("/"),
);
const emptySha256 = digest(Buffer.alloc(0));

test("[critical:level4-evidence-governance-boundary] Level 4 schema families and the 11-scenario owner are explicit and closed", async () => {
  assert.deepEqual(
    formalCollectorEnvironment({
      PATH: "C:/tools",
      "npm_package_bin_ty-context": "dist/cli.js",
      "ProgramFiles(x86)": "C:/Program Files (x86)",
    }),
    {
      PATH: "C:/tools",
      "ProgramFiles(x86)": "C:/Program Files (x86)",
    },
  );
  const catalog = JSON.parse(await readFile(scenarioCatalogPath, "utf8"));
  assert.equal(catalog.scenarios.length, 11);
  assert.equal(
    new Set(catalog.scenarios.map((scenario) => scenario.scenario_id)).size,
    11,
  );
  for (const scenario of catalog.scenarios) {
    const profileValues = [
      scenario.measurement_profile.human_time,
      scenario.measurement_profile.raw_prompt,
      scenario.measurement_profile.provider_event,
      ...Object.values(scenario.measurement_profile.meters),
    ];
    assert.ok(
      profileValues.every((entry) =>
        ["required", "forbidden"].includes(entry.presence),
      ),
      scenario.scenario_id,
    );
    assert.ok(
      profileValues.every((entry) => entry.presence !== "optional"),
      scenario.scenario_id,
    );
  }
  assert.deepEqual(REAL_PROCESS_SCHEMA_FAMILY_TABLE.formal_evidence.current, {
    accounting_policy: "long-task-formal-total-cost-accounting-policy-v2",
    evidence_packet: "long-task-formal-total-cost-evidence-packet-v2",
    precollection_plan: "long-task-formal-total-cost-precollection-plan-v2",
    provider_event: "long-task-formal-total-cost-provider-event-v2",
    raw_event: "long-task-formal-total-cost-raw-event-v2",
    scenario_catalog: "long-task-formal-total-cost-scenario-catalog-v2",
    source_manifest: "long-task-formal-total-cost-source-manifest-v2",
  });
  assert.equal(REAL_PROCESS_SCHEMA_FAMILY_TABLE.formal_evidence.next, null);
  assert.equal(REAL_PROCESS_SCHEMA_FAMILY_TABLE.real_process.next, null);
  assert.deepEqual(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.formal_evidence.legacy,
    LEGACY_FORMAL_EVIDENCE_SCHEMAS,
  );
  assert.deepEqual(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.real_process.legacy,
    LEGACY_REAL_PROCESS_SCHEMAS,
  );
  assert.equal(
    REAL_PROCESS_SCHEMA_FAMILY_TABLE.real_process.current.run_set,
    "long-task-real-process-roi-run-set-v4",
  );
  assert.equal(CASE_IDS.includes("r12-argv-incident"), false);
});

test("formal invocation and execution identities are derived on opposite sides of spawn", () => {
  const projection = {
    schema_version: "formal-invocation-projection-v1",
    run_set_id: "fixture-run-set",
    run_id: "run-b-1",
    pair_id: "pair-01",
    variant_id: "b",
    scenario_id: "fixed-runtime-task",
    collector: {
      collector_id: "collector-v1",
      implementation_sha256: "1".repeat(64),
    },
    attempt: 1,
    precollection_identity_sha256: "2".repeat(64),
  };
  const invocationId = deriveFormalInvocationId(projection);
  assert.match(invocationId, /^[a-f0-9]{64}$/u);
  assert.notEqual(
    invocationId,
    deriveFormalInvocationId({
      ...projection,
      scenario_id: "fixed-test-task",
    }),
  );
  const record = finalizeFormalExecutionRecord({
    invocation_id: invocationId,
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_SCENARIO_EXECUTION_SCHEMA,
    exit: { exit_code: 0 },
  });
  assert.equal(
    record.execution_record_sha256,
    deriveFormalExecutionRecordSha256(record),
  );
  assert.equal(
    record.execution_id,
    deriveFormalExecutionId(invocationId, record.execution_record_sha256),
  );
  assert.notEqual(record.execution_id, invocationId);
});

test("the frozen lifecycle population keeps reductions outside the positive-cost denominator", async () => {
  const accountingPolicy = JSON.parse(
    await readFile(accountingPolicyPath, "utf8"),
  );
  const byKey = new Map();
  for (const stratum of accountingPolicy.lifecycle_population.strata) {
    const pairs =
      stratum.pair_count === 1
        ? ["once"]
        : ["pair-01", "pair-02", "pair-03", "pair-04", "pair-05"];
    for (const category of stratum.categories)
      for (const pairId of pairs) {
        byKey.set(
          formalEvidenceKey({
            kind: "cost",
            category,
            pairId,
            variantId: "b",
          }),
          { value: category === "migration" ? 12 : 10 },
        );
        byKey.set(
          formalEvidenceKey({
            kind: "cost",
            category,
            pairId,
            variantId: "c",
          }),
          { value: category === "migration" ? 10 : 12 },
        );
      }
  }
  for (const pairId of [
    "pair-01",
    "pair-02",
    "pair-03",
    "pair-04",
    "pair-05",
  ]) {
    byKey.set(
      formalEvidenceKey({
        kind: "purpose_benefit",
        scenarioId: "fixed-controlled-incident",
        pairId,
        variantId: "b",
      }),
      { value: 250 },
    );
    byKey.set(
      formalEvidenceKey({
        kind: "purpose_benefit",
        scenarioId: "fixed-controlled-incident",
        pairId,
        variantId: "c",
      }),
      { value: 50 },
    );
  }
  const accounting = deriveFormalTotalCostAccounting(byKey, accountingPolicy);
  assert.equal(accounting.signed_incremental_cost_ncu, "106.000000");
  assert.equal(accounting.positive_incremental_cost_ncu, "108.000000");
  assert.equal(accounting.cost_reduction_ncu, "2.000000");
  assert.equal(
    accounting.purpose_benefit.cycle_purpose_benefit_ncu,
    "200.000000",
  );
  assert.equal(
    accounting.cost_reductions_offset_positive_cost_denominator,
    false,
  );
  assert.equal(accounting.significant_stable_margin_met, true);
});

test(
  "the Windows Job supervisor preserves argv, closes descendants, and fails overflow closed",
  { skip: process.platform !== "win32" },
  async () => {
    const temporary = await mkdtemp(
      path.join(os.tmpdir(), "ty-level4-supervisor-"),
    );
    const supervisor = new FormalProcessSupervisor();
    try {
      const exact = await supervisor.run({
        requestId: "exact-argv",
        executable: process.execPath,
        argv: [
          "-e",
          "process.stdout.write(JSON.stringify(process.argv.slice(1)))",
          "token with spaces",
          "literal&token",
          'quote"token',
        ],
        cwd: temporary,
        stdoutPath: path.join(temporary, "exact.stdout.log"),
        stderrPath: path.join(temporary, "exact.stderr.log"),
        timeoutMs: 10_000,
        combinedOutputLimitBytes: 64 * 1024,
        environment: childEnvironment(),
      });
      assert.equal(exact.exit_code, 0);
      assert.equal(exact.descendants_cleaned, true);
      assert.equal(exact.active_processes_at_result, 0);
      assert.deepEqual(
        JSON.parse(
          await readFile(path.join(temporary, "exact.stdout.log"), "utf8"),
        ),
        ["token with spaces", "literal&token", 'quote"token'],
      );

      const timeout = await supervisor.run({
        requestId: "descendant-timeout",
        executable: process.execPath,
        argv: [
          "-e",
          "require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)']);setInterval(()=>{},1000)",
        ],
        cwd: temporary,
        stdoutPath: path.join(temporary, "timeout.stdout.log"),
        stderrPath: path.join(temporary, "timeout.stderr.log"),
        timeoutMs: 300,
        combinedOutputLimitBytes: 64 * 1024,
        environment: childEnvironment(),
      });
      assert.equal(timeout.timed_out, true);
      assert.equal(timeout.descendants_cleaned, true);
      assert.equal(timeout.active_processes_at_result, 0);
      assert.ok(timeout.total_processes >= 2);

      const overflow = await supervisor.run({
        requestId: "stream-overflow",
        executable: process.execPath,
        argv: ["-e", "process.stdout.write(Buffer.alloc(65536, 120))"],
        cwd: temporary,
        stdoutPath: path.join(temporary, "overflow.stdout.log"),
        stderrPath: path.join(temporary, "overflow.stderr.log"),
        timeoutMs: 10_000,
        combinedOutputLimitBytes: 1024,
        environment: childEnvironment(),
      });
      assert.equal(overflow.output_overflow, true);
      assert.equal(overflow.descendants_cleaned, true);
      assert.equal(overflow.active_processes_at_result, 0);
    } finally {
      await supervisor.close();
      await rm(temporary, { recursive: true, force: true });
    }
  },
);

test(
  "one real formal collection uses a clean candidate, fresh output root, and process-tree accounting",
  { skip: process.platform !== "win32" },
  async () => {
    const temporary = await mkdtemp(
      path.join(os.tmpdir(), "ty level4 real collector "),
    );
    const runSetRoot = path.join(temporary, "run set with spaces");
    const checkout = path.join(temporary, "candidate checkout");
    const supervisor = new FormalProcessSupervisor();
    try {
      await mkdir(runSetRoot, { recursive: true });
      await mkdir(checkout, { recursive: true });
      await git(checkout, ["init"]);
      await git(checkout, ["config", "user.email", "fixture@example.invalid"]);
      await git(checkout, ["config", "user.name", "Fixture"]);
      await writeFile(path.join(checkout, "candidate.txt"), "candidate\n");
      await git(checkout, ["add", "candidate.txt"]);
      await git(checkout, ["commit", "-m", "candidate"]);
      const commit = await git(checkout, ["rev-parse", "HEAD"]);
      const tree = await git(checkout, ["rev-parse", "HEAD^{tree}"]);
      const implementationRef = "collectors/runtime collector.mjs";
      const taskRef = "scenarios/runtime task/task.txt";
      const implementation = Buffer.from(
        [
          "import { copyFileSync } from 'node:fs';",
          "const argv=process.argv.slice(2);",
          "const value=(flag)=>argv[argv.indexOf(flag)+1];",
          "if(value('--scenario-id')!=='fixed-runtime-task'||value('--variant-id')!=='b') process.exit(21);",
          "copyFileSync(value('--task'),value('--output'));",
          "process.stdout.write(JSON.stringify(argv));",
        ].join("\n"),
      );
      await writeArtifact(
        runSetRoot,
        `inputs/formal-evidence-precollection/${implementationRef}`,
        implementation,
      );
      await writeArtifact(
        runSetRoot,
        `inputs/formal-evidence-precollection/${taskRef}`,
        Buffer.from("gold-output\n"),
      );
      const packagePath = "candidate package.tgz";
      const packageBytes = Buffer.from("candidate-package");
      await writeArtifact(runSetRoot, `setup/b/${packagePath}`, packageBytes);
      const formalRoot = path.join(runSetRoot, "formal-evidence");
      await mkdir(formalRoot);
      const setup = {
        checkout,
        record: {
          commit,
          tree,
          package_path: packagePath,
          package_version: "0.8.14",
          package_sha256: digest(packageBytes),
        },
      };
      const run = {
        run_id: "run-b-1",
        variant_id: "b",
        repeat: 1,
        candidate_identity: { commit, tree },
      };
      const scenario = {
        scenario_id: "fixed-runtime-task",
        kind: "cost",
        category: "runtime",
        stratum: "repeatable_delivery",
        task_source_ref: taskRef,
        execution_timeout_ms: 10_000,
        measurement_profile: {
          raw_prompt: { presence: "forbidden" },
          provider_event: { presence: "forbidden" },
          meters: {
            compute_ms: { presence: "required" },
            storage_byte_hour: { presence: "forbidden" },
          },
        },
      };
      const collector = {
        collector_id: "runtime-collector-v1",
        implementation_ref: implementationRef,
        implementation_sha256: digest(implementation),
      };
      const precollection = {
        identity: { identity_sha256: "9".repeat(64) },
      };
      const interactionRecorder = {
        async begin({ invocationId }) {
          return new RunnerInteractionSession({
            invocationId,
            initialState: "active",
          });
        },
        finish() {},
      };
      const result = await collectFormalScenarioExecution({
        resolvedRoot: runSetRoot,
        formalRoot,
        runSetId: "real-collector-run-set",
        run,
        setup,
        scenario,
        collector,
        pairId: "pair-01",
        variantId: "b",
        precollection,
        interactionRecorder,
        supervisor,
      });
      const event = JSON.parse(
        await readFile(
          path.join(runSetRoot, ...result.event_path.split("/")),
          "utf8",
        ),
      );
      assert.equal(event.execution_record.exit.descendants_cleaned, true);
      assert.equal(event.execution_record.exit.active_processes_at_result, 0);
      assert.equal(
        event.execution_record.measurement_refs.process_accounting.endsWith(
          "/process-accounting.json",
        ),
        true,
      );
      assert.ok(
        event.execution_record.exact_invocation.argv.includes(
          `setup/b/${packagePath}`,
        ),
      );
      assert.equal(
        await readFile(
          path.join(runSetRoot, ...event.scenario_output_ref.split("/")),
          "utf8",
        ),
        "gold-output\n",
      );
    } finally {
      await supervisor.close();
      await rm(temporary, { recursive: true, force: true });
    }
  },
);

test("a complete 576-file synthetic control is admitted only as external_pending", async () => {
  const fixture = await createFormalEvidenceFixture();
  try {
    const result = await fixture.evaluate(fixture.index);
    assert.equal(result.admitted, true);
    assert.equal(result.event_count, 86);
    assert.equal(result.incident_evidence_class, "synthetic_test_only");
    assert.equal(result.support_complete, false);
    assert.deepEqual(result.blockers, ["controlled_incident_external_pending"]);
    assert.equal(result.accounting, null);
    assert.deepEqual(result.missing_event_keys, []);
    assert.deepEqual(result.missing_price_rate_keys, []);
    assert.deepEqual(result.missing_meter_keys, []);
    assert.equal(
      fixture.manifest.entries.filter((entry) =>
        entry.path.startsWith("formal-evidence/"),
      ).length,
      FORMAL_EVIDENCE_CAPACITY.expected_runner_artifact_count,
    );
    assert.equal(
      fixture.packet.artifact_bindings.length,
      FORMAL_EVIDENCE_CAPACITY.expected_execution_count,
    );
    assert.deepEqual(Object.keys(fixture.packet).sort(), [
      "accounting_policy_identity",
      "artifact_bindings",
      "candidate_identities",
      "collection_window",
      "created_at",
      "precollection_identity_sha256",
      "retention_policy",
      "run_bindings",
      "run_set_id",
      "schema_version",
    ]);
    await assert.rejects(
      () =>
        collectFormalTotalCostArtifacts({
          runSetRoot: fixture.root,
          runSetId: "fixture-run-set-v4",
          runs: fixture.runs,
          preparedByVariant: fixture.preparedByVariant,
          precollection: fixture.precollection,
          accountingPolicy: fixture.accountingPolicy,
          accountingPolicyIdentity: fixture.accountingPolicyIdentity,
          interactionRecorder: { async begin() {} },
        }),
      /formal_collection_controlled_incident_external_pending/u,
    );
  } finally {
    await fixture.remove();
  }
});

test("formal evidence swaps, gaps, forged clocks, and post-index mutation fail closed", async () => {
  const fixture = await createFormalEvidenceFixture();
  try {
    await assertJsonMutationRejected(
      fixture,
      fixture.attackPaths.runtimeEvent,
      (event) => {
        const record = withoutDerivedExecutionFields(event.execution_record);
        record.measurement_refs.process_accounting = null;
        event.execution_record = finalizeFormalExecutionRecord(record);
      },
      /formal_process_accounting_ref/u,
    );
    await assertJsonMutationRejected(
      fixture,
      fixture.attackPaths.human,
      (trace) => {
        trace.records[0].started_ns = (
          BigInt(trace.records[0].started_ns) + 1n
        ).toString();
      },
      /formal_human_interval/u,
    );
    await assertJsonMutationRejected(
      fixture,
      fixture.attackPaths.provider,
      (record) => {
        record.invocation_id = "f".repeat(64);
      },
      /provider_event_identity/u,
    );
    await assertJsonMutationRejected(
      fixture,
      fixture.attackPaths.candidateObservation,
      (record) => {
        record.before.commit = "c".repeat(40);
        record.after.commit = "c".repeat(40);
      },
      /formal_candidate_observation_before/u,
    );
    await assertByteMutationRejected(
      fixture,
      fixture.attackPaths.costOutput,
      Buffer.from("not-the-gold\n"),
      /formal_scenario_cost_gold/u,
    );
    await assertJsonMutationRejected(
      fixture,
      "formal-evidence-index.json",
      (packet) => {
        packet.verified = true;
      },
      /formal_evidence_packet_prohibited_field/u,
    );

    const tamperedPath = path.join(
      fixture.root,
      ...fixture.attackPaths.stdout.split("/"),
    );
    const original = await readFile(tamperedPath);
    await writeFile(
      tamperedPath,
      Buffer.concat([original, Buffer.from("tamper")]),
    );
    try {
      await assert.rejects(
        () => fixture.evaluate(fixture.index),
        /run_artifact_identity_changed/u,
      );
    } finally {
      await writeFile(tamperedPath, original);
    }
  } finally {
    await fixture.remove();
  }
});

test("independent audit and direct-child promotion records cannot mutate the candidate", async () => {
  const temporary = await mkdtemp(
    path.join(os.tmpdir(), "ty-level4-promotion-"),
  );
  const repository = path.join(temporary, "repository");
  const evidenceRoot = path.join(temporary, "evidence");
  try {
    await mkdir(repository, { recursive: true });
    await mkdir(evidenceRoot, { recursive: true });
    await git(repository, ["init"]);
    await git(repository, ["config", "user.email", "fixture@example.invalid"]);
    await git(repository, ["config", "user.name", "Fixture"]);
    const benchmarkEntries = [];
    for (const relative of realProcessRoiBenchmarkImplementationPaths) {
      const bytes = Buffer.from(`candidate-source:${relative}\n`);
      await writeArtifact(repository, relative, bytes);
      benchmarkEntries.push({
        path: relative,
        bytes: bytes.length,
        sha256: digest(bytes),
      });
    }
    await writeArtifact(repository, "package.json", {
      name: "level4-promotion-fixture-root",
      private: true,
      workspaces: ["packages/*"],
    });
    await writeArtifact(repository, "packages/ty-context/package.json", {
      name: "project-tiny-context-harness",
      version: "0.8.14",
      type: "module",
      files: ["index.mjs"],
    });
    await writeArtifact(
      repository,
      "packages/ty-context/index.mjs",
      "export const fixture = true;\n",
    );
    const benchmarkIdentity = {
      entries: benchmarkEntries,
      identity_sha256: sha256(canonical(benchmarkEntries)),
    };
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "evidence candidate"]);
    const candidateCommit = await git(repository, ["rev-parse", "HEAD"]);
    const candidateTree = await git(repository, ["rev-parse", "HEAD^{tree}"]);
    const packageCheckout = path.join(temporary, "evidence-package-checkout");
    await git(repository, [
      "worktree",
      "add",
      "--detach",
      packageCheckout,
      candidateCommit,
    ]);
    const packCommand = npmCommandSpec([
      "pack",
      "--workspace",
      "project-tiny-context-harness",
      "--pack-destination",
      evidenceRoot,
      "--ignore-scripts",
    ]);
    await execFileAsync(packCommand.command, packCommand.args, {
      cwd: packageCheckout,
      windowsHide: true,
    });
    await git(repository, ["worktree", "remove", "--force", packageCheckout]);
    const packageLocator = "project-tiny-context-harness-0.8.14.tgz";
    const packageBytes = await readFile(
      path.join(evidenceRoot, packageLocator),
    );
    const frozenEnvironment = {
      platform: "win32",
      arch: "x64",
      node: process.version,
      node_exec_path: process.execPath,
    };
    const runtimeTcbIdentity = deriveFormalRuntimeTcbIdentity({
      environment: frozenEnvironment,
      benchmarkImplementationIdentity: benchmarkIdentity,
    });
    const runtimeTcbIdentitySha256 = runtimeTcbIdentity.identity_sha256;
    const candidate = {
      commit: candidateCommit,
      tree: candidateTree,
      package_version: "0.8.14",
      package_sha256: digest(packageBytes),
    };
    const formalReport = {
      schema_version: REAL_PROCESS_SCHEMAS.REAL_PROCESS_VERIFICATION_SCHEMA,
      formal_conclusion_owner: "verify_long_task_real_process_roi",
      candidate_commit: candidateCommit,
      candidate_tree: candidateTree,
      capability_level: "level_3",
      level_4_claimed: false,
      governance_judgment_included: false,
      formal_status: "total_roi_positive",
      total_roi_supported: true,
      total_roi_positive: true,
      formal_runtime_tcb_identity_sha256: runtimeTcbIdentitySha256,
      formal_blockers: [],
      formal_accounting: { significant_stable_margin_met: true },
      formal_evidence: {
        incident_evidence_class: "authorized_sanitized_real",
      },
    };
    const frozenConfig = {
      schema_version: REAL_PROCESS_SCHEMAS.REAL_PROCESS_FROZEN_CONFIG_SCHEMA,
      variants: { c: { commit: candidateCommit } },
      candidate_tree: candidateTree,
      capability_level: "level_3",
      level_4_claimed: false,
      governance_judgment_included: false,
      environment: frozenEnvironment,
      benchmark_implementation_identity: benchmarkIdentity,
      formal_runtime_tcb_identity: runtimeTcbIdentity,
    };
    const evidenceFiles = new Map([
      [packageLocator, packageBytes],
      ["formal-evidence-index.json", Buffer.from("{}\n")],
      ["formal-report.json", toBytes(formalReport)],
      ["frozen-config.json", toBytes(frozenConfig)],
      ["manifest.json", Buffer.from("{}\n")],
    ]);
    for (const [relative, bytes] of evidenceFiles)
      await writeArtifact(evidenceRoot, relative, bytes);
    const evidenceArtifacts = [
      ["candidate-package", "candidate-package-tarball", packageLocator],
      ["formal-packet", "formal-evidence-packet", "formal-evidence-index.json"],
      ["formal-report", "formal-verifier-report", "formal-report.json"],
      ["frozen-config", "run-set-frozen-config", "frozen-config.json"],
      ["manifest", "run-set-manifest", "manifest.json"],
    ]
      .map(([id, role, locator]) =>
        digestEntry(id, role, locator, evidenceFiles.get(locator)),
      )
      .sort((left, right) => left.id.localeCompare(right.id));
    const evidenceReferenceBase = {
      schema_version: "level4-evidence-reference-v1",
      candidate,
      benchmark_implementation_identity_sha256:
        benchmarkIdentity.identity_sha256,
      runtime_tcb_identity_sha256: runtimeTcbIdentitySha256,
      formal_conclusion_owner: "verify_long_task_real_process_roi",
      artifacts: evidenceArtifacts,
    };
    const evidenceReference = {
      ...evidenceReferenceBase,
      identity_sha256: sha256(canonical(evidenceReferenceBase)),
    };
    validateLevel4EvidenceReference(evidenceReference);

    const auditInputs = [];
    for (const role of LEVEL4_AUDIT_REQUIRED_INPUT_ROLES) {
      const locator =
        role === "formal-verifier-report"
          ? "formal-report.json"
          : `audit-inputs/${role}.bin`;
      let bytes = evidenceFiles.get(locator);
      if (!bytes) {
        bytes = Buffer.from(`audit-input:${role}\n`);
        await writeArtifact(evidenceRoot, locator, bytes);
      }
      auditInputs.push(digestEntry(role, role, locator, bytes));
    }
    auditInputs.sort((left, right) => left.id.localeCompare(right.id));
    const commands = [
      auditCommand("formal-verifier", ["node", "verify-formal.mjs"]),
      auditCommand("validation", ["make", "validate-harness"]),
    ];
    const auditRecord = {
      schema_version: REAL_PROCESS_SCHEMAS.LEVEL4_INDEPENDENT_AUDIT_SCHEMA,
      audit_id: "independent-audit-fixture",
      audited_at: "2026-08-14T04:00:00.000Z",
      auditor: {
        auditor_id: "auditor-external",
        implementation_owner_id: "implementation-owner",
        organization: "independent-fixture-org",
        implementation_participation: false,
        collection_participation: false,
        independence_statement:
          "No implementation or evidence collection participation.",
      },
      candidate,
      formal_conclusion_owner: "verify_long_task_real_process_roi",
      formal_roi_conclusion_owned: false,
      inputs: auditInputs,
      input_census_identity_sha256: sha256(canonical(auditInputs)),
      commands,
      current_candidate_results: {
        candidate_commit: candidateCommit,
        candidate_tree: candidateTree,
        package_sha256: candidate.package_sha256,
        benchmark_implementation_identity_sha256:
          benchmarkIdentity.identity_sha256,
        runtime_tcb_identity_sha256: runtimeTcbIdentitySha256,
        formal_report_input_id: "formal-verifier-report",
        formal_verifier_command_id: "formal-verifier",
        validation_command_ids: ["validation"],
      },
      findings: [
        {
          finding_id: "closed-control",
          severity: "note",
          status: "closed",
          summary: "Candidate identities and current verifier result agree.",
          input_refs: ["formal-verifier-report"],
          command_refs: ["formal-verifier"],
        },
      ],
      audit_conclusion: {
        governance_audit_passed: true,
        open_blocker_count: 0,
        open_p1_count: 0,
        open_critical_counterexample_count: 0,
      },
    };
    validateLevel4IndependentAuditRecord(auditRecord, evidenceReference);
    const dependentAuditor = structuredClone(auditRecord);
    dependentAuditor.auditor.auditor_id = "implementation-owner";
    assert.throws(
      () =>
        validateLevel4IndependentAuditRecord(
          dependentAuditor,
          evidenceReference,
        ),
      /level4_auditor_independence/u,
    );
    const failedCurrentCommand = structuredClone(auditRecord);
    failedCurrentCommand.commands[0].exit_code = 1;
    assert.throws(
      () =>
        validateLevel4IndependentAuditRecord(
          failedCurrentCommand,
          evidenceReference,
        ),
      /level4_audit_current_results/u,
    );
    const hiddenCriticalCounterexample = structuredClone(auditRecord);
    hiddenCriticalCounterexample.findings.push({
      finding_id: "open-critical-counterexample",
      severity: "critical-counterexample",
      status: "open",
      summary: "A critical false-acceptance path remains open.",
      input_refs: ["benchmark-implementation"],
      command_refs: ["validation"],
    });
    assert.throws(
      () =>
        validateLevel4IndependentAuditRecord(
          hiddenCriticalCounterexample,
          evidenceReference,
        ),
      /level4_audit_conclusion/u,
    );
    const ownerDecision = {
      schema_version: "level4-project-owner-decision-v1",
      candidate,
      decided_at: "2026-08-14T05:00:00.000Z",
      owner: "project-owner",
      scope: "project-tiny-context-harness-level4-capability",
      decision: "promote-level-4",
      approved: true,
      evidence_reference_sha256: sha256(canonical(evidenceReference)),
      audit_record_sha256: sha256(canonical(auditRecord)),
    };
    validateLevel4OwnerDecision(ownerDecision, evidenceReference, auditRecord);
    const promotionRecord = {
      schema_version: REAL_PROCESS_SCHEMAS.LEVEL4_PROMOTION_RECORD_SCHEMA,
      promotion_kind: "direct-child-governance-records-only",
      candidate,
      capability_level: "level_4",
      level_4_claimed: true,
      formal_conclusion_owner: "verify_long_task_real_process_roi",
      package_sha256: candidate.package_sha256,
      benchmark_implementation_identity_sha256:
        benchmarkIdentity.identity_sha256,
      runtime_tcb_identity_sha256: runtimeTcbIdentitySha256,
      evidence_reference_sha256: sha256(canonical(evidenceReference)),
      audit_record_sha256: sha256(canonical(auditRecord)),
      owner_decision_sha256: sha256(canonical(ownerDecision)),
    };
    validateLevel4PromotionRecord(
      promotionRecord,
      evidenceReference,
      auditRecord,
      ownerDecision,
    );

    const governanceRoot = `governance/level4-promotion/${candidateCommit}`;
    for (const [name, record] of [
      ["evidence-reference.json", evidenceReference],
      ["independent-audit.json", auditRecord],
      ["owner-decision.json", ownerDecision],
      ["promotion-record.json", promotionRecord],
    ])
      await writeArtifact(repository, `${governanceRoot}/${name}`, record);
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "governance promotion"]);
    const promotionCommit = await git(repository, ["rev-parse", "HEAD"]);
    const packedComparison = await comparePackedPackages({
      repositoryRoot: repository,
      candidateCommit,
      promotionCommit,
    });
    assert.deepEqual(packedComparison.candidate, packedComparison.promotion);
    assert.equal(
      packedComparison.candidate.package_sha256,
      candidate.package_sha256,
    );
    const verified = await verifyLevel4GovernancePromotion({
      repositoryRoot: repository,
      promotionCommit,
      evidenceRoot,
    });
    assert.equal(verified.governance_promotion_verified, true);
    assert.equal(verified.candidate_commit, candidateCommit);
    assert.equal(
      verified.formal_conclusion_owner,
      "verify_long_task_real_process_roi",
    );

    await git(repository, ["switch", "--detach", candidateCommit]);
    for (const [name, record] of [
      ["evidence-reference.json", evidenceReference],
      ["independent-audit.json", auditRecord],
      ["owner-decision.json", ownerDecision],
      ["promotion-record.json", promotionRecord],
    ])
      await writeArtifact(repository, `${governanceRoot}/${name}`, record);
    await writeArtifact(
      repository,
      "PROJECT_SPEC.md",
      "forbidden promotion mutation\n",
    );
    await git(repository, ["add", "."]);
    await git(repository, ["commit", "-m", "invalid promotion"]);
    const invalidPromotion = await git(repository, ["rev-parse", "HEAD"]);
    await assert.rejects(
      () =>
        verifyLevel4GovernancePromotion({
          repositoryRoot: repository,
          promotionCommit: invalidPromotion,
          evidenceRoot,
          packageIdentityComparator: async () => {
            throw new Error("must-not-reach-package-comparison");
          },
        }),
      /level4_promotion_diff_allowlist/u,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

async function createFormalEvidenceFixture() {
  const runSetRoot = await mkdtemp(path.join(os.tmpdir(), "ty-level4-formal-"));
  const accountingPolicyBytes = await readFile(accountingPolicyPath);
  const accountingPolicy = JSON.parse(accountingPolicyBytes.toString("utf8"));
  const policyEntry = {
    path: FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
    bytes: accountingPolicyBytes.length,
    sha256: digest(accountingPolicyBytes),
  };
  const accountingPolicyIdentity = {
    entries: [policyEntry],
    identity_sha256: sha256(canonical([policyEntry])),
  };
  const catalogBytes = await readFile(scenarioCatalogPath);
  const catalog = JSON.parse(catalogBytes.toString("utf8"));
  const sources = new Map();
  const addSource = (relative, role, value) => {
    const bytes = toBytes(value);
    sources.set(relative, {
      entry: {
        path: relative,
        role,
        bytes: bytes.length,
        sha256: digest(bytes),
      },
      bytes,
    });
  };
  addSource("scenarios/catalog.json", "scenario_catalog", catalogBytes);
  for (const scenario of catalog.scenarios) {
    addSource(
      scenario.task_source_ref,
      "scenario_source",
      `task:${scenario.scenario_id}\n`,
    );
    addSource(
      scenario.gold_source_ref,
      "scenario_gold",
      `gold:${scenario.scenario_id}\n`,
    );
  }
  const collectorImplementationRef = "collectors/external-real-collector.mjs";
  addSource(
    collectorImplementationRef,
    "collector",
    "export const collector = 'frozen-level4-fixture';\n",
  );
  addSource("collectors/catalog.json", "collector", {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_COLLECTOR_CATALOG_SCHEMA,
    frozen_at: "2026-08-14T00:15:00.000Z",
    collectors: [
      {
        collector_id: "external-real-scenario-collector-v1",
        implementation_ref: collectorImplementationRef,
        runtime_kind: "node-direct",
        output_protocol: "runner-fresh-child-only-file-v1",
        supported_source_kinds: [
          "invocation-correlated-provider-event-v1",
          "runner-captured-raw-prompt-v1",
          "runner-exact-byte-duration-v1",
          "runner-interaction-recorder-v1",
          "windows-job-object-accounting-v1",
        ],
      },
    ],
  });
  const priceDocumentRef = "prices/official-price-document.json";
  const priceSourceRef = "prices/official-price-source.json";
  addSource(priceDocumentRef, "price_document", {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRICE_DOCUMENT_SCHEMA,
    source_kind: "official_price",
    publisher: "fixture-provider",
    source_locator: "fixture://provider/prices/2026-08-13",
    published_at: "2026-08-13T00:00:00.000Z",
    currency: "CNY",
    rates: [
      ["provider_input_token", "token", 0.000001],
      ["provider_output_token", "token", 0.000002],
      ["provider_cached_input_token", "token", 0.0000005],
      ["compute_ms", "millisecond", 0.000001],
      ["storage_byte_hour", "byte-hour", 0.000001],
    ].map(([key, unit, cnyPerUnit]) => ({
      key,
      unit,
      basis: "official_rate",
      cny_per_unit: cnyPerUnit,
    })),
  });
  addSource(priceSourceRef, "price_source", {
    schema_version: REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PRICE_SOURCE_SCHEMA,
    source_document_ref: priceDocumentRef,
    frozen_at: "2026-08-14T00:20:00.000Z",
    currency: "CNY",
  });
  addIncidentSources({ addSource, sources, catalog });

  const precollectionEntries = [...sources.values()]
    .map(({ entry }) => entry)
    .sort((left, right) => left.path.localeCompare(right.path));
  const precollectionFrozenAt = "2026-08-14T00:30:00.000Z";
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
  for (const [relative, source] of sources)
    await writeArtifact(
      runSetRoot,
      `inputs/formal-evidence-precollection/${relative}`,
      source.bytes,
    );

  const setupByVariant = new Map();
  for (const [index, variantId] of ["a", "b", "c"].entries()) {
    const packageBytes = Buffer.from(`package:${variantId}:0.8.14\n`);
    const setup = {
      variant_id: variantId,
      commit: variantId.repeat(40),
      tree: String(index + 1).repeat(40),
      package_path: "candidate.tgz",
      package_version: "0.8.14",
      package_sha256: digest(packageBytes),
    };
    setupByVariant.set(variantId, setup);
    await writeArtifact(
      runSetRoot,
      `setup/${variantId}/${setup.package_path}`,
      packageBytes,
    );
  }
  const runs = [];
  for (const variantId of ["a", "b", "c"])
    for (let repeat = 1; repeat <= 5; repeat += 1) {
      const setup = setupByVariant.get(variantId);
      runs.push({
        run_id: `run-${variantId}-${repeat}`,
        variant_id: variantId,
        repeat,
        candidate_identity: { commit: setup.commit, tree: setup.tree },
      });
    }

  const collectorSha256 = sources.get(collectorImplementationRef).entry.sha256;
  const artifactBindings = [];
  const attackPaths = {};
  let executionIndex = 0;
  for (const scenario of catalog.scenarios) {
    const pairs =
      scenario.pair_count === 1
        ? ["once"]
        : ["pair-01", "pair-02", "pair-03", "pair-04", "pair-05"];
    for (const pairId of pairs)
      for (const variantId of scenario.comparison_variants) {
        const repeat = pairId === "once" ? 1 : Number(pairId.slice(-2));
        const run = runs.find(
          (item) => item.variant_id === variantId && item.repeat === repeat,
        );
        const setup = setupByVariant.get(variantId);
        const projection = {
          schema_version: "formal-invocation-projection-v1",
          run_set_id: "fixture-run-set-v4",
          run_id: run.run_id,
          pair_id: pairId,
          variant_id: variantId,
          scenario_id: scenario.scenario_id,
          collector: {
            collector_id: scenario.collector_id,
            implementation_sha256: collectorSha256,
          },
          attempt: 1,
          precollection_identity_sha256: precollectionIdentity.identity_sha256,
        };
        const invocationId = deriveFormalInvocationId(projection);
        const prefix = `formal-evidence/${invocationId}`;
        const refs = formalRefs(prefix);
        const startedAt = "2026-08-14T01:00:00.000Z";
        const completedAt = "2026-08-14T01:00:01.000Z";
        const startedNs = "1000000000";
        const completedNs = "2000000000";
        const gold = sources.get(scenario.gold_source_ref).bytes;
        const output =
          scenario.kind === "purpose_benefit" && variantId === "b"
            ? Buffer.from(`wrong:${pairId}\n`)
            : gold;
        await Promise.all([
          writeArtifact(runSetRoot, refs.output, output),
          writeArtifact(runSetRoot, refs.stdout, Buffer.alloc(0)),
          writeArtifact(runSetRoot, refs.stderr, Buffer.alloc(0)),
          writeArtifact(runSetRoot, refs.human, {
            schema_version:
              REAL_PROCESS_SCHEMAS.FORMAL_HUMAN_INTERACTION_TRACE_SCHEMA,
            invocation_id: invocationId,
            source_kind: "runner-interaction-recorder-v1",
            clock_id: "runner-monotonic-hrtime-v1",
            records: [
              {
                state: "active",
                started_ns: startedNs,
                completed_ns: completedNs,
              },
            ],
          }),
          writeArtifact(runSetRoot, refs.candidateObservation, {
            schema_version: "formal-candidate-observation-v1",
            invocation_id: invocationId,
            before: cleanCandidateObservation(
              invocationId,
              setup.commit,
              setup.tree,
            ),
            after: cleanCandidateObservation(
              invocationId,
              setup.commit,
              setup.tree,
            ),
          }),
        ]);
        const processRequired =
          scenario.measurement_profile.meters.compute_ms.presence ===
          "required";
        const storageRequired =
          scenario.measurement_profile.meters.storage_byte_hour.presence ===
          "required";
        const rawPromptRequired =
          scenario.measurement_profile.raw_prompt.presence === "required";
        const providerRequired =
          scenario.measurement_profile.provider_event.presence === "required";
        if (processRequired)
          await writeArtifact(runSetRoot, refs.processAccounting, {
            schema_version:
              REAL_PROCESS_SCHEMAS.FORMAL_PROCESS_ACCOUNTING_SCHEMA,
            invocation_id: invocationId,
            source_kind: "windows-job-object-accounting-v1",
            clock_id: "runner-monotonic-hrtime-v1",
            started_ns: startedNs,
            completed_ns: completedNs,
            user_cpu_100ns: variantId === "b" ? 100_000 : 150_000,
            kernel_cpu_100ns: 50_000,
            total_cpu_100ns: variantId === "b" ? 150_000 : 200_000,
            total_processes: 2,
            active_processes_at_result: 0,
          });
        if (storageRequired)
          await writeArtifact(runSetRoot, refs.storageLedger, {
            schema_version: REAL_PROCESS_SCHEMAS.FORMAL_STORAGE_LEDGER_SCHEMA,
            invocation_id: invocationId,
            source_kind: "runner-exact-byte-duration-v1",
            clock_id: "runner-monotonic-hrtime-v1",
            started_ns: startedNs,
            completed_ns: completedNs,
            scope_ref: `setup/${variantId}/${setup.package_path}`,
            events: [
              {
                at_ns: startedNs,
                bytes: (
                  await readFile(
                    path.join(
                      runSetRoot,
                      "setup",
                      variantId,
                      setup.package_path,
                    ),
                  )
                ).length,
              },
            ],
          });
        if (rawPromptRequired)
          await writeArtifact(
            runSetRoot,
            refs.rawPrompt,
            Buffer.from(`prompt:${invocationId}\n`),
          );
        if (providerRequired)
          await writeArtifact(runSetRoot, refs.providerEvent, {
            schema_version:
              REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_PROVIDER_EVENT_SCHEMA,
            invocation_id: invocationId,
            provider: "fixture-provider",
            model: "fixture-model",
            provider_request_id: `request-${invocationId}`,
            provider_response_id: `response-${invocationId}`,
            clock_id: "provider-recorded-at-v1:fixture-provider",
            recorded_at: completedAt,
            usage: {
              input_tokens: 1000,
              output_tokens: 100,
              cached_input_tokens: 50,
            },
          });
        const argv = [
          `inputs/formal-evidence-precollection/${collectorImplementationRef}`,
          "--candidate-package",
          `setup/${variantId}/${setup.package_path}`,
          "--task",
          `inputs/formal-evidence-precollection/${scenario.task_source_ref}`,
          "--output",
          refs.output,
          "--invocation-id",
          invocationId,
          "--scenario-id",
          scenario.scenario_id,
          "--variant-id",
          variantId,
        ];
        if (rawPromptRequired) argv.push("--raw-prompt", refs.rawPrompt);
        if (providerRequired) argv.push("--provider-event", refs.providerEvent);
        const execution = finalizeFormalExecutionRecord({
          schema_version: REAL_PROCESS_SCHEMAS.FORMAL_SCENARIO_EXECUTION_SCHEMA,
          invocation_id: invocationId,
          attempt: 1,
          exact_invocation: {
            executable: process.execPath,
            argv,
            cwd: runSetRoot,
            shell: false,
          },
          clocks: {
            monotonic_clock_id: "runner-monotonic-hrtime-v1",
            monotonic_started_ns: startedNs,
            monotonic_completed_ns: completedNs,
            wall_clock_id: "runner-wall-utc-v1",
            started_at: startedAt,
            completed_at: completedAt,
          },
          exit: {
            exit_code: 0,
            timed_out: false,
            output_overflow: false,
            descendants_cleaned: true,
            total_processes: processRequired ? 2 : 1,
            active_processes_at_result: 0,
          },
          streams: {
            stdout_ref: refs.stdout,
            stderr_ref: refs.stderr,
          },
          scenario_output_ref: refs.output,
          candidate_observation_ref: refs.candidateObservation,
          measurement_refs: {
            human_time: refs.human,
            process_accounting: processRequired ? refs.processAccounting : null,
            storage_ledger: storageRequired ? refs.storageLedger : null,
            raw_prompt: rawPromptRequired ? sensitiveRef(refs.rawPrompt) : null,
            provider_event: providerRequired
              ? sensitiveRef(refs.providerEvent)
              : null,
          },
        });
        const subject =
          scenario.kind === "cost"
            ? {
                kind: "cost",
                category: scenario.category,
                scenario_id: scenario.scenario_id,
                stratum: scenario.stratum,
              }
            : {
                kind: "purpose_benefit",
                scenario_id: scenario.scenario_id,
                stratum: scenario.stratum,
              };
        await writeArtifact(runSetRoot, refs.event, {
          schema_version:
            REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_RAW_EVENT_SCHEMA,
          run_set_id: "fixture-run-set-v4",
          run_id: run.run_id,
          pair_id: pairId,
          variant_id: variantId,
          invocation_id: invocationId,
          observed_at: completedAt,
          subject,
          scenario_output_ref: refs.output,
          execution_record: execution,
        });
        artifactBindings.push({
          evidence_key: formalEvidenceKey({
            kind: scenario.kind,
            category: scenario.category,
            scenarioId: scenario.scenario_id,
            pairId,
            variantId,
          }),
          event_path: refs.event,
        });
        if (!attackPaths.runtimeEvent && scenario.category === "runtime") {
          attackPaths.runtimeEvent = refs.event;
          attackPaths.human = refs.human;
          attackPaths.candidateObservation = refs.candidateObservation;
          attackPaths.stdout = refs.stdout;
        }
        if (!attackPaths.provider && scenario.category === "authoring")
          attackPaths.provider = refs.providerEvent;
        if (!attackPaths.costOutput && scenario.category === "process")
          attackPaths.costOutput = refs.output;
        executionIndex += 1;
      }
  }
  assert.equal(
    executionIndex,
    FORMAL_EVIDENCE_CAPACITY.expected_execution_count,
  );
  assert.deepEqual(
    new Set(artifactBindings.map((item) => item.evidence_key)),
    expectedFormalEvidenceKeys(accountingPolicy),
  );
  artifactBindings.sort((left, right) =>
    left.evidence_key.localeCompare(right.evidence_key),
  );
  const packet = {
    schema_version:
      REAL_PROCESS_SCHEMAS.FORMAL_TOTAL_COST_EVIDENCE_PACKET_SCHEMA,
    run_set_id: "fixture-run-set-v4",
    created_at: "2026-08-14T03:00:00.000Z",
    collection_window: {
      started_at: "2026-08-14T01:00:00.000Z",
      completed_at: "2026-08-14T02:00:00.000Z",
    },
    accounting_policy_identity: accountingPolicyIdentity,
    precollection_identity_sha256: precollectionIdentity.identity_sha256,
    candidate_identities: ["a", "b", "c"].map((variantId) => {
      const setup = setupByVariant.get(variantId);
      return {
        variant_id: variantId,
        commit: setup.commit,
        tree: setup.tree,
        package_version: setup.package_version,
        package_sha256: setup.package_sha256,
      };
    }),
    run_bindings: runs.map((run) => {
      const setup = setupByVariant.get(run.variant_id);
      return {
        run_id: run.run_id,
        variant_id: run.variant_id,
        repeat: run.repeat,
        candidate_commit: run.candidate_identity.commit,
        candidate_tree: run.candidate_identity.tree,
        package_version: setup.package_version,
        package_sha256: setup.package_sha256,
      };
    }),
    artifact_bindings: artifactBindings,
    retention_policy: accountingPolicy.retention,
  };
  await writeArtifact(runSetRoot, "formal-evidence-index.json", packet);
  const manifest = await buildRealProcessArtifactManifest(runSetRoot);
  const index = await buildImmutableRunArtifactIndex({
    runSetRoot,
    manifest,
  });
  const runtimeTcbIdentity = {
    runtime: { node_exec_path: process.execPath },
  };
  const evaluate = (runArtifactIndex) =>
    evaluateFormalTotalCostEvidence({
      packetPath: path.join(runSetRoot, "formal-evidence-index.json"),
      accountingPolicy,
      accountingPolicyIdentity,
      runSetId: "fixture-run-set-v4",
      runs,
      setupByVariant,
      precollectionIdentity,
      runArtifactIndex,
      runtimeTcbIdentity,
    });
  return {
    root: runSetRoot,
    packet,
    manifest,
    index,
    attackPaths,
    accountingPolicy,
    accountingPolicyIdentity,
    precollection: { identity: precollectionIdentity, files: sources },
    preparedByVariant: Object.fromEntries(
      [...setupByVariant].map(([variantId, record]) => [variantId, { record }]),
    ),
    runs,
    evaluate,
    remove: () => rm(runSetRoot, { recursive: true, force: true }),
  };
}

function addIncidentSources({ addSource, sources, catalog }) {
  const roles = ["incident_design", "incident_provenance", "incident_runtime"];
  const manifests = {};
  for (const kind of ["original", "sanitized"]) {
    const entries = [];
    for (const role of roles) {
      const relative = `incident/${kind}/${role}.txt`;
      const bytes = Buffer.from(`${role}\n`);
      addSource(relative, "incident_source", bytes);
      entries.push({
        path: relative,
        role,
        bytes: bytes.length,
        sha256: digest(bytes),
      });
    }
    manifests[kind] = {
      kind,
      entries,
      identity_sha256: sha256(canonical({ kind, entries })),
    };
  }
  const incidentScenario = catalog.scenarios.find(
    (scenario) => scenario.scenario_id === "fixed-controlled-incident",
  );
  addSource("incident/bundle.json", "incident_source", {
    schema_version: "level4-controlled-incident-source-bundle-v1",
    incident_id: "synthetic-structure-test-only",
    evidence_class: "synthetic_test_only",
    original: manifests.original,
    sanitized: manifests.sanitized,
    mapping: manifests.original.entries.map((entry, index) => ({
      original_path: entry.path,
      sanitized_path: manifests.sanitized.entries[index].path,
      disposition: "exact",
      reason: "structural test fixture",
    })),
    authorization: {
      authorization_id: "synthetic-fixture-authorization",
      granted_at: "2026-08-13T00:00:00.000Z",
      owner: "fixture-owner",
      scope: "synthetic-structure-only",
      permitted_uses: [
        "formal-evidence-collection",
        "independent-capability-audit",
      ],
      retention_terms: "ephemeral test fixture",
      publication_terms: "not for publication or promotion",
    },
    task_gold_derivation: {
      method: "authorized-incident-source-derivation-v1",
      task_source_ref: incidentScenario.task_source_ref,
      task_sha256: sources.get(incidentScenario.task_source_ref).entry.sha256,
      gold_source_ref: incidentScenario.gold_source_ref,
      gold_sha256: sources.get(incidentScenario.gold_source_ref).entry.sha256,
    },
  });
}

async function assertJsonMutationRejected(fixture, relative, mutate, pattern) {
  const target = path.join(fixture.root, ...relative.split("/"));
  const original = await readFile(target);
  const value = JSON.parse(original.toString("utf8"));
  mutate(value);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
  try {
    const manifest = await buildRealProcessArtifactManifest(fixture.root);
    const index = await buildImmutableRunArtifactIndex({
      runSetRoot: fixture.root,
      manifest,
    });
    await assert.rejects(() => fixture.evaluate(index), pattern);
  } finally {
    await writeFile(target, original);
  }
}

async function assertByteMutationRejected(fixture, relative, bytes, pattern) {
  const target = path.join(fixture.root, ...relative.split("/"));
  const original = await readFile(target);
  await writeFile(target, bytes);
  try {
    const manifest = await buildRealProcessArtifactManifest(fixture.root);
    const index = await buildImmutableRunArtifactIndex({
      runSetRoot: fixture.root,
      manifest,
    });
    await assert.rejects(() => fixture.evaluate(index), pattern);
  } finally {
    await writeFile(target, original);
  }
}

function formalRefs(prefix) {
  return {
    event: `${prefix}/event.json`,
    output: `${prefix}/output.bin`,
    stdout: `${prefix}/stdout.log`,
    stderr: `${prefix}/stderr.log`,
    human: `${prefix}/human.json`,
    candidateObservation: `${prefix}/candidate-observation.json`,
    processAccounting: `${prefix}/process-accounting.json`,
    storageLedger: `${prefix}/storage-ledger.json`,
    rawPrompt: `${prefix}/raw-prompt.bin`,
    providerEvent: `${prefix}/provider-event.json`,
  };
}

function cleanCandidateObservation(invocationId, commit, tree) {
  return {
    invocation_id: invocationId,
    commit,
    tree,
    status_bytes: 0,
    status_sha256: emptySha256,
  };
}

function sensitiveRef(artifactRef) {
  return {
    artifact_ref: artifactRef,
    disposition: "retained",
    redaction_rule_ref: null,
  };
}

function withoutDerivedExecutionFields(record) {
  const projected = structuredClone(record);
  delete projected.execution_record_sha256;
  delete projected.execution_id;
  return projected;
}

async function writeArtifact(rootPath, relative, value) {
  const target = path.join(rootPath, ...relative.split("/"));
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, toBytes(value));
}

function toBytes(value) {
  if (Buffer.isBuffer(value)) return value;
  if (typeof value === "string") return Buffer.from(value);
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function childEnvironment() {
  return Object.fromEntries(
    ["PATH", "SystemRoot", "TEMP", "TMP"]
      .filter((key) => typeof process.env[key] === "string")
      .map((key) => [key, process.env[key]]),
  );
}

function digestEntry(id, role, locator, bytes) {
  return {
    id,
    role,
    locator,
    bytes: bytes.length,
    sha256: digest(bytes),
  };
}

function auditCommand(commandId, argv) {
  return {
    command_id: commandId,
    argv,
    cwd: "C:/independent-audit-workspace",
    started_at: "2026-08-14T03:00:00.000Z",
    completed_at: "2026-08-14T03:00:01.000Z",
    exit_code: 0,
    stdout_sha256: digest(`${commandId}:stdout`),
    stderr_sha256: digest(Buffer.alloc(0)),
  };
}

async function git(cwd, args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
  });
  return stdout.trim();
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}
