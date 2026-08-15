import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
  FORMAL_EVIDENCE_CAPACITY,
  FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH,
  FORMAL_TOTAL_COST_CATEGORIES,
  FORMAL_TOTAL_COST_UNIT,
  LEGACY_REAL_PROCESS_SCHEMAS,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_schema_policy.mjs";
import {
  MEASUREMENT_THRESHOLDS,
  VARIANT_IDS,
  repeatOrder,
  variantDefinitions,
} from "./long_task_real_process_roi_policy.mjs";
import { readFormalAccountingPolicy } from "./long_task_formal_total_cost_evidence.mjs";
import { assessFormalCollectionReadiness } from "./long_task_formal_collection_readiness.mjs";
import {
  materializeFormalPrecollectionInputs,
  readFormalPrecollectionPlan,
} from "./long_task_formal_total_cost_precollection.mjs";
import {
  assertCurrentEvidenceSchema,
  canonical,
  deriveRealProcessRoiSummary,
  sha256,
  validateRunRecord,
} from "./long_task_real_process_roi_scoring.mjs";
import { buildRealProcessArtifactManifest } from "./long_task_real_process_artifacts.mjs";
import { materializeLongTaskPackage } from "./long_task_package_materialization.mjs";
import { deriveFormalRuntimeTcbIdentity } from "./long_task_formal_runtime_tcb.mjs";
import { collectFormalTotalCostArtifacts } from "./long_task_formal_total_cost_collection.mjs";
import { formalProviderSourceAvailability } from "./long_task_formal_provider_capture.mjs";

const {
  REAL_PROCESS_ATTESTATION_SCHEMA,
  REAL_PROCESS_DRY_RUN_SCHEMA,
  REAL_PROCESS_FROZEN_CONFIG_SCHEMA,
  REAL_PROCESS_ROI_SCHEMA,
  REAL_PROCESS_WORKLOAD_SCHEMA,
} = REAL_PROCESS_SCHEMAS;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workloadRoot = path.join(
  root,
  "examples",
  "delivery-benchmark",
  "real-process-workload",
);
const workloadPath = path.join(workloadRoot, "workload.json");
const semanticGoldPath = path.join(workloadRoot, "semantic-gold.json");
const executorPath = path.join(workloadRoot, "runner", "workload-executor.mjs");
const workloadIdentityPaths = Object.freeze([
  "examples/delivery-benchmark/real-process-workload/workload.json",
  "examples/delivery-benchmark/real-process-workload/semantic-gold.json",
  "examples/delivery-benchmark/real-process-workload/product/facts.mjs",
  "examples/delivery-benchmark/real-process-workload/product/product.mjs",
  "examples/delivery-benchmark/real-process-workload/product/config/state.json",
  FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH,
]);
export const realProcessRoiBenchmarkImplementationPaths = Object.freeze([
  "tools/level4_governance_protocol.mjs",
  "tools/level4_governance_audit.mjs",
  "tools/level4_governance_audit_findings.mjs",
  "tools/level4_governance_shared.mjs",
  "tools/level4_package_identity_comparator.mjs",
  "tools/level4_promotion_evidence_validation.mjs",
  "tools/verify_level4_governance_promotion.mjs",
  "tools/long_task_package_materialization.mjs",
  "tools/long_task_package_materialization_commands.mjs",
  "tools/long_task_real_process_roi_policy.mjs",
  "tools/long_task_real_process_schema_policy.mjs",
  "tools/long_task_formal_artifact_budget.mjs",
  "tools/long_task_formal_provider_capture.mjs",
  "tools/long_task_formal_acquisition_runtime.mjs",
  "tools/long_task_formal_state_capture.mjs",
  "tools/long_task_real_process_roi_runner.mjs",
  "tools/long_task_real_process_roi_scoring.mjs",
  "tools/long_task_real_process_artifacts.mjs",
  "tools/long_task_real_process_artifact_roles.mjs",
  "tools/long_task_packed_package_identity.mjs",
  "tools/formal_process_supervisor.mjs",
  "tools/formal_process_supervisor_protocol.mjs",
  "tools/formal_process_supervisor_native_types.cs",
  "tools/formal_process_supervisor_native_run.cs",
  "tools/formal_process_supervisor_native_helpers.cs",
  "tools/windows_job_process_supervisor.ps1",
  "tools/long_task_formal_total_cost_evidence.mjs",
  "tools/long_task_formal_total_cost_accounting.mjs",
  "tools/long_task_formal_total_cost_accounting_policy.mjs",
  "tools/long_task_formal_total_cost_collectors.mjs",
  "tools/long_task_formal_collection_readiness.mjs",
  "tools/long_task_formal_total_cost_collection.mjs",
  "tools/long_task_formal_collection_io.mjs",
  "tools/long_task_formal_scenario_collection.mjs",
  "tools/long_task_formal_scenario_records.mjs",
  "tools/long_task_formal_total_cost_events.mjs",
  "tools/long_task_formal_total_cost_execution.mjs",
  "tools/long_task_formal_execution_artifacts.mjs",
  "tools/long_task_formal_execution_identity.mjs",
  "tools/long_task_formal_execution_invocation.mjs",
  "tools/long_task_formal_execution_measurements.mjs",
  "tools/long_task_formal_total_cost_incident.mjs",
  "tools/long_task_formal_total_cost_json.mjs",
  "tools/long_task_formal_total_cost_measurements.mjs",
  "tools/long_task_formal_total_cost_precollection.mjs",
  "tools/long_task_formal_total_cost_prices.mjs",
  "tools/long_task_formal_total_cost_retention.mjs",
  "tools/long_task_formal_total_cost_scenarios.mjs",
  "tools/long_task_formal_total_cost_shared.mjs",
  "tools/long_task_formal_total_cost_source_bundle.mjs",
  "tools/long_task_formal_runtime_tcb.mjs",
  "tools/long_task_formal_interaction_recorder.mjs",
  "tools/verify_long_task_real_process_roi.mjs",
  "examples/delivery-benchmark/real-process-workload/runner/gold.mjs",
  "examples/delivery-benchmark/real-process-workload/runner/fixture-adapter.mjs",
  "examples/delivery-benchmark/real-process-workload/runner/workload-executor.mjs",
]);
const defaultArtifactRoot = path.join(
  root,
  ".artifacts",
  "long-task-real-capability",
  "real-process-workload",
);

export async function prepareRealProcessRoiPlan({
  candidate,
  repositoryRoot = root,
  formalEvidencePlan = null,
}) {
  const candidateCommit = await resolveCommit(repositoryRoot, candidate);
  const variants = variantDefinitions(candidateCommit);
  if (
    candidateCommit === variants.a.commit ||
    candidateCommit === variants.b.commit
  )
    throw new Error("real_process_roi_candidate_must_be_post_b");
  await assertHistoricalIdentities(repositoryRoot, variants);
  await assertCandidateDescendsFromB(repositoryRoot, candidateCommit);
  const candidateTree = await gitText(repositoryRoot, [
    "rev-parse",
    `${candidateCommit}^{tree}`,
  ]);
  const head = await resolveCommit(repositoryRoot, "HEAD");
  const candidateIsHead = candidateCommit === head;
  const worktreeClean =
    candidateIsHead &&
    (await gitText(repositoryRoot, ["status", "--short"])) === "";
  const workloadIdentity = await sourceIdentity(
    repositoryRoot,
    workloadIdentityPaths,
  );
  const workload = JSON.parse(await readFile(workloadPath, "utf8"));
  assertCurrentEvidenceSchema(
    workload.schema_version,
    REAL_PROCESS_WORKLOAD_SCHEMA,
    LEGACY_REAL_PROCESS_SCHEMAS.workload,
    "workload_schema",
  );
  if (
    workload.capability_level !== "level_3" ||
    workload.level_4_claimed !== false ||
    workload.governance_judgment_included !== false ||
    workload.total_cost_theorem !==
      "incremental-purpose-benefit-exceeds-sum-of-all-incremental-costs" ||
    workload.level_4_requires_independent_capability_audit !== true ||
    workload.fixture_candidate_identity?.required !== true
  )
    throw new Error("real_process_roi_workload_boundary_invalid");
  const benchmarkImplementationIdentity = await sourceIdentity(
    repositoryRoot,
    realProcessRoiBenchmarkImplementationPaths,
  );
  const accountingPolicyPath = path.resolve(
    repositoryRoot,
    ...FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH.split("/"),
  );
  const { policy: accountingPolicy } =
    await readFormalAccountingPolicy(accountingPolicyPath);
  const accountingPolicyIdentity = await sourceIdentity(repositoryRoot, [
    FORMAL_ACCOUNTING_POLICY_REPOSITORY_PATH,
  ]);
  const formalPrecollection = formalEvidencePlan
    ? await readFormalPrecollectionPlan({
        planPath: path.resolve(formalEvidencePlan),
        limits: accountingPolicy.source_bundle_limits,
      })
    : null;
  if (formalPrecollection) {
    const catalogSource = formalPrecollection.files.get(
      "scenarios/catalog.json",
    );
    const canonicalCatalog = await readFile(
      path.resolve(
        repositoryRoot,
        ...FORMAL_SCENARIO_CATALOG_REPOSITORY_PATH.split("/"),
      ),
    );
    if (!catalogSource || !catalogSource.bytes.equals(canonicalCatalog))
      throw new Error("formal_scenario_catalog_not_candidate_owned");
  }
  const workloadSha256 = workloadIdentity.identity_sha256;
  const goldBytes = await readFile(semanticGoldPath);
  const environment = await environmentRecord(repositoryRoot);
  const environmentIdentity = sha256(canonical(environment));
  const formalRuntimeTcbIdentity = await deriveFormalRuntimeTcbIdentity({
    environment,
    benchmarkImplementationIdentity,
  });
  const validationTimestamp = Date.now();
  const sourceReadiness = assessFormalCollectionReadiness({
    precollection: formalPrecollection,
    accountingPolicy,
    validationWindow: {
      started: validationTimestamp,
      completed: validationTimestamp,
    },
  });
  const providerAvailability = formalProviderSourceAvailability(
    formalRuntimeTcbIdentity.provider_adapter,
  );
  const formalCollectionReadiness = combineFormalCollectionReadiness(
    sourceReadiness,
    providerAvailability,
  );
  const frozenConfig = {
    schema_version: REAL_PROCESS_FROZEN_CONFIG_SCHEMA,
    purpose: "real-process-lifecycle-roi-only",
    safety_theorem_claimed: false,
    capability_level: "level_3",
    level_4_claimed: false,
    governance_judgment_included: false,
    candidate_must_be_clean_commit: true,
    candidate_must_equal_head: true,
    candidate_is_head: candidateIsHead,
    candidate_worktree_clean: worktreeClean,
    variants,
    candidate_tree: candidateTree,
    workload_sha256: workloadSha256,
    workload_identity: workloadIdentity,
    benchmark_implementation_identity: benchmarkImplementationIdentity,
    accounting_policy_identity: accountingPolicyIdentity,
    formal_evidence_precollection_identity:
      formalPrecollection?.identity ?? null,
    semantic_gold_sha256: digest(goldBytes),
    environment,
    environment_identity: environmentIdentity,
    formal_runtime_tcb_identity: formalRuntimeTcbIdentity,
    measurement_thresholds: MEASUREMENT_THRESHOLDS,
    formal_total_cost_policy: {
      categories: FORMAL_TOTAL_COST_CATEGORIES,
      normalized_unit: FORMAL_TOTAL_COST_UNIT,
      theorem:
        "incremental-purpose-benefit-exceeds-sum-of-all-incremental-costs",
      missing_or_unverified_consequence: "total_roi_unsupported",
      formal_conclusion_owner: "verify_long_task_real_process_roi",
      collection_formal_status: "not_evaluated",
      independent_evidence_packet: "required",
      accounting_population_status: "frozen",
      accounting_policy_schema: accountingPolicy.schema_version,
      accounting_policy_sha256: accountingPolicyIdentity.identity_sha256,
      self_attested_verified_records_admitted: false,
      governance_judgment_included: false,
      level_4_requires_independent_capability_audit: true,
    },
    authoring_token_policy: {
      required_for_positive_roi: true,
      authoritative_source:
        "host/provider usage event bound to the exact authoring invocation",
      surrogate_tokenizer_permitted: false,
      missing_value_status: "required-unverified",
      consequence: "total ROI remains unsupported",
    },
    initial_repeats: MEASUREMENT_THRESHOLDS.minimum_repeats,
    maximum_repeats: MEASUREMENT_THRESHOLDS.expanded_repeats,
    repeat_orders: Array.from(
      { length: MEASUREMENT_THRESHOLDS.expanded_repeats },
      (_, index) => repeatOrder(index + 1),
    ),
    artifacts_are_non_authority: true,
    a_safety_eligible: false,
  };
  return {
    candidateCommit,
    candidateTree,
    candidateIsHead,
    worktreeClean,
    workloadSha256,
    environmentIdentity,
    variants,
    frozenConfig,
    formalPrecollection,
    accountingPolicy,
    formalCollectionReadiness,
  };
}

export async function dryRunRealProcessRoi(options) {
  const plan = await prepareRealProcessRoiPlan(options);
  return {
    schema_version: REAL_PROCESS_DRY_RUN_SCHEMA,
    capability_level: "level_3",
    level_4_claimed: false,
    governance_judgment_included: false,
    observed_lifecycle_status: "not_collected",
    formal_status: "not_evaluated",
    lifecycle_collection_executable: plan.worktreeClean,
    lifecycle_collection_blocker: plan.worktreeClean
      ? null
      : plan.candidateIsHead
        ? "candidate_head_worktree_dirty"
        : "candidate_must_equal_clean_head",
    formal_collection_executable:
      plan.worktreeClean && plan.formalCollectionReadiness.executable,
    formal_collection_blockers: Object.freeze([
      ...(plan.worktreeClean
        ? []
        : [
            plan.candidateIsHead
              ? "candidate_head_worktree_dirty"
              : "candidate_must_equal_clean_head",
          ]),
      ...plan.formalCollectionReadiness.blockers,
    ]),
    external_pending: plan.formalCollectionReadiness.external_pending,
    missing_price_meters: plan.formalCollectionReadiness.missing_price_meters,
    candidate_commit: plan.candidateCommit,
    candidate_tree: plan.candidateTree,
    workload_sha256: plan.workloadSha256,
    benchmark_implementation_sha256:
      plan.frozenConfig.benchmark_implementation_identity.identity_sha256,
    accounting_policy_sha256:
      plan.frozenConfig.accounting_policy_identity.identity_sha256,
    formal_evidence_precollection_sha256:
      plan.frozenConfig.formal_evidence_precollection_identity
        ?.identity_sha256 ?? null,
    environment_identity: plan.environmentIdentity,
    formal_runtime_tcb_identity_sha256:
      plan.frozenConfig.formal_runtime_tcb_identity.identity_sha256,
    variants: plan.variants,
    initial_schedule: plan.frozenConfig.repeat_orders.slice(
      0,
      MEASUREMENT_THRESHOLDS.minimum_repeats,
    ),
    expansion_schedule: plan.frozenConfig.repeat_orders.slice(
      MEASUREMENT_THRESHOLDS.minimum_repeats,
    ),
    expansion_rule:
      "v4 always collects five repeats for formal accounting; the initial-three diagnostic records whether CV, paired direction, threshold nearness, or provenance would independently require expansion",
  };
}

export async function collectRealProcessRoi(options) {
  assertAllowedCollectionOptions(options);
  const {
    candidate,
    repositoryRoot = root,
    artifactRoot = defaultArtifactRoot,
    keepWorktrees = false,
    formalEvidencePlan = null,
    formalInteractionStdin = false,
  } = options;
  const plan = await prepareRealProcessRoiPlan({
    candidate,
    repositoryRoot,
    formalEvidencePlan,
  });
  if (!plan.worktreeClean)
    throw new Error("real_process_roi_candidate_worktree_dirty");
  if (plan.formalPrecollection && !plan.formalCollectionReadiness.executable)
    throw new Error(plan.formalCollectionReadiness.blockers[0]);
  if (plan.formalPrecollection && formalInteractionStdin !== true)
    throw new Error("formal_interaction_recorder_unavailable");
  const runSetId = `${compactTimestamp()}-${plan.candidateCommit.slice(0, 12)}-${plan.workloadSha256.slice(0, 12)}`;
  const runSetRoot = path.resolve(artifactRoot, runSetId);
  await mkdir(path.resolve(artifactRoot), { recursive: true });
  await mkdir(runSetRoot, { recursive: false });
  await Promise.all([
    writeJson(path.join(runSetRoot, "frozen-config.json"), plan.frozenConfig),
    writeJson(
      path.join(runSetRoot, "environment.json"),
      plan.frozenConfig.environment,
    ),
    materializeSourceIdentity({
      repositoryRoot,
      runSetRoot,
      prefix: "workload",
      identity: plan.frozenConfig.workload_identity,
    }),
    materializeSourceIdentity({
      repositoryRoot,
      runSetRoot,
      prefix: "benchmark-implementation",
      identity: plan.frozenConfig.benchmark_implementation_identity,
    }),
    materializeSourceIdentity({
      repositoryRoot,
      runSetRoot,
      prefix: "accounting-policy",
      identity: plan.frozenConfig.accounting_policy_identity,
    }),
    materializeFormalPrecollectionInputs({
      runSetRoot,
      precollection: plan.formalPrecollection,
    }),
  ]);
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "ty-real-process-roi-"),
  );
  const prepared = {};
  const registeredCheckouts = new Set();
  const runs = [];
  const setupRecords = [];
  let collectionError = null;
  try {
    for (const variantId of VARIANT_IDS) {
      const variant = plan.variants[variantId];
      const checkout = path.join(temporaryRoot, `variant-${variantId}`);
      const setup = await prepareVariant({
        repositoryRoot,
        checkout,
        variant,
        outputDir: path.join(runSetRoot, "setup", variantId),
        registeredCheckouts,
      });
      prepared[variantId] = setup;
      setupRecords.push(setup.record);
    }
    for (
      let repeat = 1;
      repeat <= MEASUREMENT_THRESHOLDS.expanded_repeats;
      repeat += 1
    )
      await executeRepeat({ repeat, plan, prepared, runSetRoot, runs });

    const formalCollection = plan.formalPrecollection
      ? await collectFormalTotalCostArtifacts({
          runSetRoot,
          runSetId,
          runs,
          preparedByVariant: prepared,
          precollection: plan.formalPrecollection,
          accountingPolicy: plan.accountingPolicy,
          accountingPolicyIdentity:
            plan.frozenConfig.accounting_policy_identity,
          formalInteractionStdin,
          runtimeTcbIdentity: plan.frozenConfig.formal_runtime_tcb_identity,
        })
      : null;
    const summary = deriveRealProcessRoiSummary(runs, plan.frozenConfig);
    const aggregate = {
      schema_version: REAL_PROCESS_ROI_SCHEMA,
      run_set_id: runSetId,
      purpose: plan.frozenConfig.purpose,
      safety_theorem_claimed: false,
      capability_level: "level_3",
      level_4_claimed: false,
      governance_judgment_included: false,
      artifacts_are_non_authority: true,
      candidate_identity: {
        commit: plan.candidateCommit,
        tree: plan.candidateTree,
      },
      workload_sha256: plan.workloadSha256,
      benchmark_implementation_sha256:
        plan.frozenConfig.benchmark_implementation_identity.identity_sha256,
      accounting_policy_sha256:
        plan.frozenConfig.accounting_policy_identity.identity_sha256,
      formal_evidence_precollection_sha256:
        plan.frozenConfig.formal_evidence_precollection_identity
          ?.identity_sha256 ?? null,
      formal_evidence_index_ref: formalCollection
        ? "formal-evidence-index.json"
        : null,
      environment_identity: plan.environmentIdentity,
      formal_runtime_tcb_identity_sha256:
        plan.frozenConfig.formal_runtime_tcb_identity.identity_sha256,
      setup: setupRecords,
      summary,
      run_refs: runs.map((run) =>
        relative(
          runSetRoot,
          path.join(
            runSetRoot,
            "raw",
            run.variant_id,
            `repeat-${String(run.repeat).padStart(2, "0")}`,
            "run.json",
          ),
        ),
      ),
    };
    await writeJson(path.join(runSetRoot, "aggregate.json"), aggregate);
    const manifest = await buildArtifactManifest(runSetRoot);
    await writeJson(path.join(runSetRoot, "manifest.json"), manifest);
    const manifestBytes = await readFile(
      path.join(runSetRoot, "manifest.json"),
    );
    const aggregateBytes = await readFile(
      path.join(runSetRoot, "aggregate.json"),
    );
    const attestation = {
      schema_version: REAL_PROCESS_ATTESTATION_SCHEMA,
      run_set_id: runSetId,
      candidate_commit: plan.candidateCommit,
      candidate_tree: plan.candidateTree,
      workload_sha256: plan.workloadSha256,
      benchmark_implementation_sha256:
        plan.frozenConfig.benchmark_implementation_identity.identity_sha256,
      accounting_policy_sha256:
        plan.frozenConfig.accounting_policy_identity.identity_sha256,
      formal_evidence_precollection_sha256:
        plan.frozenConfig.formal_evidence_precollection_identity
          ?.identity_sha256 ?? null,
      formal_evidence_index_ref: formalCollection
        ? "formal-evidence-index.json"
        : null,
      environment_identity: plan.environmentIdentity,
      formal_runtime_tcb_identity_sha256:
        plan.frozenConfig.formal_runtime_tcb_identity.identity_sha256,
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
    };
    await writeJson(path.join(runSetRoot, "attestation.json"), attestation);
    const attestationBytes = await readFile(
      path.join(runSetRoot, "attestation.json"),
    );
    assertRunSetControlBudget(manifestBytes, attestationBytes);
    return {
      runSetRoot,
      aggregate,
      manifest,
      attestation,
      formalCollection,
    };
  } catch (error) {
    collectionError = error;
  } finally {
    if (!keepWorktrees)
      await finalizeRealProcessRoiResources({
        repositoryRoot,
        checkouts: registeredCheckouts,
        temporaryRoot,
        primaryError: collectionError,
      });
  }
  throw collectionError;
}

function combineFormalCollectionReadiness(
  sourceReadiness,
  providerAvailability,
) {
  const blockers = [...sourceReadiness.blockers];
  const externalPending = [...sourceReadiness.external_pending];
  if (!providerAvailability.available) {
    blockers.push("formal_provider_source_unavailable");
    externalPending.push("provider_invocation_source");
  }
  return Object.freeze({
    executable: blockers.length === 0,
    blockers: Object.freeze(blockers),
    external_pending: Object.freeze([...new Set(externalPending)]),
    missing_price_meters: sourceReadiness.missing_price_meters,
  });
}

function assertAllowedCollectionOptions(value) {
  const allowed = new Set([
    "artifactRoot",
    "candidate",
    "formalEvidencePlan",
    "formalInteractionStdin",
    "keepWorktrees",
    "repositoryRoot",
  ]);
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    typeof value.candidate !== "string" ||
    Object.keys(value).some((key) => !allowed.has(key))
  )
    throw new Error("real_process_roi_collection_options");
}

async function materializeSourceIdentity({
  repositoryRoot,
  runSetRoot,
  prefix,
  identity,
}) {
  for (const entry of identity.entries) {
    const source = path.resolve(repositoryRoot, ...entry.path.split("/"));
    const target = path.resolve(
      runSetRoot,
      "inputs",
      prefix,
      ...entry.path.split("/"),
    );
    const relativeTarget = path.relative(runSetRoot, target);
    if (
      path.isAbsolute(relativeTarget) ||
      relativeTarget.split(path.sep).includes("..")
    )
      throw new Error(`real_process_roi_input_escape:${entry.path}`);
    const bytes = await readFile(source);
    if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256)
      throw new Error(`real_process_roi_input_identity_changed:${entry.path}`);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
}

export async function buildArtifactManifest(runSetRoot) {
  return buildRealProcessArtifactManifest(runSetRoot);
}

async function executeRepeat({ repeat, plan, prepared, runSetRoot, runs }) {
  const order = repeatOrder(repeat);
  for (const [position, variantId] of order.entries()) {
    const setup = prepared[variantId];
    const outputDir = path.join(
      runSetRoot,
      "raw",
      variantId,
      `repeat-${String(repeat).padStart(2, "0")}`,
    );
    await mkdir(outputDir, { recursive: true });
    const options = {
      harnessRoot: setup.checkout,
      outputDir,
      repeat,
      invocationPosition: position + 1,
      variant: plan.variants[variantId],
      environmentIdentity: plan.environmentIdentity,
      workloadSha256: plan.workloadSha256,
      packageSha256: setup.package_sha256,
      candidateTree: setup.tree,
    };
    const optionsPath = path.join(outputDir, "executor-options.json");
    await writeJson(optionsPath, options);
    const execution = await spawnCaptured(
      process.execPath,
      [executorPath, optionsPath],
      {
        cwd: root,
        timeoutMs: 60 * 60 * 1000,
        outputDir,
        label: "executor",
      },
    );
    if (execution.status !== 0)
      throw new Error(
        `real_process_roi_executor_failed:${variantId}:${repeat}:${execution.status}:${execution.stderr_sha256}`,
      );
    const run = JSON.parse(
      await readFile(path.join(outputDir, "run.json"), "utf8"),
    );
    validateRunRecord(run, plan.frozenConfig);
    runs.push(run);
  }
}

async function prepareVariant({
  repositoryRoot,
  checkout,
  variant,
  outputDir,
  registeredCheckouts,
}) {
  const materialized = await materializeLongTaskPackage({
    repositoryRoot,
    commit: variant.commit,
    checkout,
    outputDir,
  });
  registeredCheckouts.add(checkout);
  const packagePath = relative(outputDir, materialized.tarball_path);
  const record = {
    ...materialized.record,
    variant_id: variant.id,
    package_path: packagePath,
  };
  await writeJson(path.join(outputDir, "setup.json"), record);
  return {
    checkout,
    tree: record.tree,
    package_sha256: record.package_sha256,
    package_version: record.package_version,
    record,
  };
}

async function spawnCaptured(executable, args, options) {
  const { cwd, timeoutMs, outputDir, label } = options;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const child = spawn(executable, args, {
    cwd,
    env: process.env,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  const stdout = [];
  const stderr = [];
  let spawnError = null;
  child.once("error", (error) => {
    spawnError = error;
    stderr.push(Buffer.from(String(error.stack ?? error)));
  });
  child.stdout.on("data", (chunk) => stdout.push(chunk));
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  const closed = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolve({ status: null, signal: "timeout" });
    }, timeoutMs);
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      resolve({ status, signal });
    });
  });
  const stdoutBytes = Buffer.concat(stdout);
  const stderrBytes = Buffer.concat(stderr);
  const record = {
    schema_version: "long-task-real-process-host-command-v1",
    label,
    argv: [executable, ...args],
    cwd,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: round(performance.now() - started),
    status: closed.status,
    signal: closed.signal,
    spawn_error: spawnError ? String(spawnError.message ?? spawnError) : null,
    stdout_bytes: stdoutBytes.length,
    stderr_bytes: stderrBytes.length,
    stdout_sha256: digest(stdoutBytes),
    stderr_sha256: digest(stderrBytes),
  };
  await Promise.all([
    writeFile(path.join(outputDir, `${label}.stdout.log`), stdoutBytes),
    writeFile(path.join(outputDir, `${label}.stderr.log`), stderrBytes),
    writeJson(path.join(outputDir, `${label}.command.json`), record),
  ]);
  return record;
}

async function assertHistoricalIdentities(repositoryRoot, variants) {
  for (const variant of Object.values(variants)) {
    const actual = await resolveCommit(repositoryRoot, variant.commit);
    if (actual !== variant.commit)
      throw new Error(`real_process_roi_variant_identity:${variant.id}`);
  }
  if (variants.a.safety_eligible !== false)
    throw new Error("real_process_roi_a_safety_role");
}

async function assertCandidateDescendsFromB(repositoryRoot, candidate) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-ancestry-"));
  try {
    const result = await spawnCaptured(
      "git",
      [
        "merge-base",
        "--is-ancestor",
        variantDefinitions(candidate).b.commit,
        candidate,
      ],
      {
        cwd: repositoryRoot,
        timeoutMs: 10000,
        outputDir: temporary,
        label: "candidate-ancestry",
      },
    );
    if (result.status !== 0)
      throw new Error("real_process_roi_candidate_not_descendant_of_b");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function environmentRecord(repositoryRoot) {
  return {
    schema_version: "long-task-real-process-environment-v1",
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    node_exec_path: process.execPath,
    cpu_model: os.cpus()[0]?.model ?? "unknown",
    cpu_count: os.cpus().length,
    total_memory_bytes: os.totalmem(),
    git_version: await gitText(repositoryRoot, ["--version"]),
    runner_class:
      process.env.GITHUB_ACTIONS === "true"
        ? "github-hosted-or-self-hosted"
        : "local",
    timing_clock: "performance.now monotonic",
    order_policy:
      "balanced Latin-square first three; frozen near-balanced fourth/fifth",
  };
}

async function sourceIdentity(repositoryRoot, paths) {
  const entries = [];
  for (const relativePath of paths) {
    const bytes = await readFile(
      path.join(repositoryRoot, ...relativePath.split("/")),
    );
    entries.push({
      path: relativePath,
      bytes: bytes.length,
      sha256: digest(bytes),
    });
  }
  return {
    entries,
    identity_sha256: sha256(canonical(entries)),
  };
}

async function resolveCommit(repositoryRoot, revision) {
  if (typeof revision !== "string" || !revision)
    throw new Error("real_process_roi_candidate_required");
  return gitText(repositoryRoot, ["rev-parse", `${revision}^{commit}`]);
}

async function gitText(cwd, args) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-git-"));
  try {
    const result = await spawnCaptured("git", args, {
      cwd,
      timeoutMs: 30000,
      outputDir: temporary,
      label: "git",
    });
    if (result.status !== 0)
      throw new Error(`real_process_roi_git_failed:${args.join(":")}`);
    return (
      await readFile(path.join(temporary, "git.stdout.log"), "utf8")
    ).trim();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function removeWorktree(repositoryRoot, checkout) {
  const resolved = path.resolve(checkout);
  const temporaryRoot = path.resolve(os.tmpdir());
  if (
    resolved === temporaryRoot ||
    !resolved
      .toLowerCase()
      .startsWith(`${temporaryRoot.toLowerCase()}${path.sep}`)
  )
    throw new Error("real_process_roi_worktree_cleanup_scope");
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ty-roi-cleanup-"));
  try {
    const result = await spawnCaptured(
      "git",
      ["worktree", "remove", "--force", resolved],
      {
        cwd: repositoryRoot,
        timeoutMs: 120000,
        outputDir: temporary,
        label: "git-worktree-remove",
      },
    );
    if (result.status !== 0)
      throw new Error("real_process_roi_worktree_remove_failed");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function cleanupRealProcessRoiWorktrees(
  repositoryRoot,
  checkouts,
) {
  const failures = [];
  for (const checkout of new Set(checkouts))
    try {
      await removeWorktree(repositoryRoot, checkout);
    } catch (error) {
      failures.push(error);
    }
  if (failures.length)
    throw new AggregateError(
      failures,
      "real_process_roi_worktree_cleanup_failed",
    );
}

export async function finalizeRealProcessRoiResources({
  repositoryRoot,
  checkouts,
  temporaryRoot,
  primaryError = null,
  cleanupWorktrees = cleanupRealProcessRoiWorktrees,
  removeTemporaryRoot = (target) =>
    rm(target, { recursive: true, force: true }),
}) {
  const failures = primaryError ? [primaryError] : [];
  try {
    await cleanupWorktrees(repositoryRoot, checkouts);
  } catch (error) {
    failures.push(error);
  }
  try {
    await removeTemporaryRoot(temporaryRoot);
  } catch (error) {
    failures.push(error);
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1)
    throw new AggregateError(
      failures,
      "real_process_roi_collection_resource_cleanup_failed",
      { cause: primaryError ?? failures[0] },
    );
}

async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function assertRunSetControlBudget(manifestBytes, attestationBytes) {
  const controls = [manifestBytes, attestationBytes];
  if (
    controls.length !==
      FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_files ||
    controls.some(
      (bytes) =>
        bytes.length >
        FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_bytes_per_file,
    ) ||
    controls.reduce((total, bytes) => total + bytes.length, 0) >
      FORMAL_EVIDENCE_CAPACITY.maximum_run_set_control_total_bytes
  )
    throw new Error("real_process_roi_control_artifact_capacity");
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function relative(rootPath, target) {
  return path.relative(rootPath, target).replaceAll("\\", "/");
}

function compactTimestamp() {
  return new Date()
    .toISOString()
    .replaceAll(/[-:.TZ]/gu, "")
    .slice(0, 14);
}

function round(value) {
  return Math.round(value * 10_000) / 10_000;
}

export const realProcessRoiPaths = Object.freeze({
  repository_root: root,
  workload_root: workloadRoot,
  workload_path: workloadPath,
  semantic_gold_path: semanticGoldPath,
  executor_path: executorPath,
  default_artifact_root: defaultArtifactRoot,
});
