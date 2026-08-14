import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  BASELINE_A_COMMIT,
  CASE_IDS,
  ISOLATED_ENVELOPE_B_COMMIT,
  LEGACY_REAL_PROCESS_SCHEMAS,
  REAL_PROCESS_SCHEMAS,
} from "./long_task_real_process_roi_policy.mjs";
import {
  assert,
  assertCurrentEvidenceSchema,
  canonical,
  deriveRealProcessRoiSummary,
  validateRealProcessRoiPolicy,
  validateRunRecord,
} from "./long_task_real_process_roi_scoring.mjs";
import {
  buildArtifactManifest,
  collectRealProcessRoi,
  dryRunRealProcessRoi,
  realProcessRoiPaths,
} from "./long_task_real_process_roi_runner.mjs";
import {
  evaluateFormalTotalCostEvidence,
  readFormalAccountingPolicy,
} from "./long_task_formal_total_cost_evidence.mjs";
import { validateFormalPrecollectionIdentity } from "./long_task_formal_total_cost_precollection.mjs";
import { parseJson as parseFormalJson } from "./long_task_formal_total_cost_shared.mjs";

const {
  REAL_PROCESS_ATTESTATION_SCHEMA,
  REAL_PROCESS_COLLECTION_SCHEMA,
  REAL_PROCESS_FROZEN_CONFIG_SCHEMA,
  REAL_PROCESS_MANIFEST_SCHEMA,
  REAL_PROCESS_ROI_SCHEMA,
  REAL_PROCESS_VERIFICATION_SCHEMA,
} = REAL_PROCESS_SCHEMAS;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const execFileAsync = promisify(execFile);

export async function verifyRealProcessRoiReport(runSetRoot, options = {}) {
  const resolved = path.resolve(runSetRoot);
  const [config, environment, aggregate, manifest, attestation] =
    await Promise.all([
      readJson(path.join(resolved, "frozen-config.json")),
      readJson(path.join(resolved, "environment.json")),
      readJson(path.join(resolved, "aggregate.json")),
      readJson(path.join(resolved, "manifest.json")),
      readJson(path.join(resolved, "attestation.json")),
    ]);
  assertCurrentEvidenceSchema(
    aggregate.schema_version,
    REAL_PROCESS_ROI_SCHEMA,
    LEGACY_REAL_PROCESS_SCHEMAS.run_set,
    "aggregate_schema",
  );
  assertNoFormalConclusionFields(
    aggregate,
    "aggregate_formal_conclusion_fields",
  );
  assertExactKeys(
    aggregate,
    [
      "accounting_policy_sha256",
      "artifacts_are_non_authority",
      "benchmark_implementation_sha256",
      "candidate_identity",
      "capability_level",
      "environment_identity",
      "formal_evidence_precollection_sha256",
      "governance_judgment_included",
      "level_4_claimed",
      "purpose",
      "run_refs",
      "run_set_id",
      "safety_theorem_claimed",
      "schema_version",
      "setup",
      "summary",
      "workload_sha256",
    ],
    "aggregate_field_set",
  );
  assert(
    manifest.schema_version === REAL_PROCESS_MANIFEST_SCHEMA,
    "manifest_schema",
  );
  assertCurrentEvidenceSchema(
    attestation.schema_version,
    REAL_PROCESS_ATTESTATION_SCHEMA,
    LEGACY_REAL_PROCESS_SCHEMAS.attestation,
    "attestation_schema",
  );
  assertNoFormalConclusionFields(
    attestation,
    "attestation_formal_conclusion_fields",
  );
  assertExactKeys(
    attestation,
    [
      "a_safety_eligible",
      "accounting_policy_sha256",
      "aggregate_sha256",
      "artifacts_are_non_authority",
      "benchmark_implementation_sha256",
      "candidate_commit",
      "candidate_tree",
      "capability_level",
      "environment_identity",
      "formal_status",
      "formal_evidence_precollection_sha256",
      "governance_judgment_included",
      "level_4_claimed",
      "manifest_sha256",
      "observed_lifecycle_evidence_valid",
      "observed_lifecycle_status",
      "raw_promoted_to_gate",
      "run_set_id",
      "schema_version",
      "workload_sha256",
    ],
    "attestation_field_set",
  );
  assertCurrentEvidenceSchema(
    config.schema_version,
    REAL_PROCESS_FROZEN_CONFIG_SCHEMA,
    LEGACY_REAL_PROCESS_SCHEMAS.frozen_config,
    "frozen_config_schema",
  );
  assertNoFormalConclusionFields(config, "config_formal_conclusion_fields");
  assertExactKeys(
    config,
    [
      "a_safety_eligible",
      "accounting_policy_identity",
      "artifacts_are_non_authority",
      "authoring_token_policy",
      "benchmark_implementation_identity",
      "candidate_is_head",
      "candidate_must_be_clean_commit",
      "candidate_must_equal_head",
      "candidate_tree",
      "candidate_worktree_clean",
      "capability_level",
      "environment",
      "environment_identity",
      "formal_total_cost_policy",
      "formal_evidence_precollection_identity",
      "governance_judgment_included",
      "initial_repeats",
      "level_4_claimed",
      "maximum_repeats",
      "measurement_thresholds",
      "purpose",
      "repeat_orders",
      "safety_theorem_claimed",
      "schema_version",
      "semantic_gold_sha256",
      "variants",
      "workload_identity",
      "workload_sha256",
    ],
    "frozen_config_field_set",
  );
  assert(
    config.purpose === "real-process-lifecycle-roi-only",
    "config_purpose",
  );
  assert(config.safety_theorem_claimed === false, "config_safety_boundary");
  assert(
    config.capability_level === "level_3" &&
      config.level_4_claimed === false &&
      config.governance_judgment_included === false,
    "config_level_boundary",
  );
  assert(config.artifacts_are_non_authority === true, "config_non_authority");
  assert(
    config.candidate_must_equal_head === true &&
      config.candidate_is_head === true &&
      config.candidate_worktree_clean === true,
    "config_clean_head_candidate",
  );
  assert(
    config.authoring_token_policy?.required_for_positive_roi === true &&
      config.authoring_token_policy.surrogate_tokenizer_permitted === false &&
      config.authoring_token_policy.missing_value_status ===
        "required-unverified",
    "config_authoring_token_policy",
  );
  validateRealProcessRoiPolicy(config);
  assert(
    canonical(environment) === canonical(config.environment) &&
      config.environment_identity === digest(canonical(environment)),
    "config_environment_identity",
  );
  validateSourceIdentity(config.workload_identity, "workload_identity");
  validateSourceIdentity(
    config.benchmark_implementation_identity,
    "benchmark_implementation_identity",
  );
  validateSourceIdentity(
    config.accounting_policy_identity,
    "accounting_policy_identity",
  );
  assert(
    config.accounting_policy_identity.entries.length === 1,
    "accounting_policy_identity_entry_count",
  );
  await Promise.all([
    validateMaterializedSourceIdentity(
      resolved,
      "workload",
      config.workload_identity,
    ),
    validateMaterializedSourceIdentity(
      resolved,
      "benchmark-implementation",
      config.benchmark_implementation_identity,
    ),
    validateMaterializedSourceIdentity(
      resolved,
      "accounting-policy",
      config.accounting_policy_identity,
    ),
  ]);
  const accountingPolicyEntry = config.accounting_policy_identity.entries[0];
  const { policy: accountingPolicy } = await readFormalAccountingPolicy(
    resolveContained(
      resolved,
      `inputs/accounting-policy/${accountingPolicyEntry.path}`,
    ),
  );
  if (config.formal_evidence_precollection_identity !== null) {
    validateFormalPrecollectionIdentity(
      config.formal_evidence_precollection_identity,
      accountingPolicy.source_bundle_limits,
    );
    await validateMaterializedSourceIdentity(
      resolved,
      "formal-evidence-precollection",
      config.formal_evidence_precollection_identity,
    );
  }
  assert(
    config.workload_identity.identity_sha256 === config.workload_sha256,
    "workload_source_identity",
  );
  assert(config.variants.a.commit === BASELINE_A_COMMIT, "variant_a_identity");
  assert(
    config.variants.a.safety_eligible === false &&
      config.variants.a.comparison_role === "cost-and-error-baseline-only",
    "variant_a_role",
  );
  assert(
    config.variants.b.commit === ISOLATED_ENVELOPE_B_COMMIT,
    "variant_b_identity",
  );
  assert(config.variants.b.safety_eligible === false, "variant_b_role");
  assert(config.variants.c.safety_eligible === true, "variant_c_role");
  if (options.expectedCandidate) {
    assert(
      config.variants.c.commit === options.expectedCandidate,
      "candidate_identity",
    );
    let resolvedCommit = null;
    let resolvedTree = null;
    try {
      resolvedCommit = await gitText(root, [
        "rev-parse",
        `${options.expectedCandidate}^{commit}`,
      ]);
      resolvedTree = await gitText(root, [
        "rev-parse",
        `${options.expectedCandidate}^{tree}`,
      ]);
    } catch {
      assert(false, "candidate_git_identity");
    }
    assert(
      resolvedCommit === options.expectedCandidate &&
        resolvedTree === config.candidate_tree,
      "candidate_git_identity",
    );
  }
  assert(
    aggregate.candidate_identity.commit === config.variants.c.commit &&
      aggregate.candidate_identity.tree === config.candidate_tree,
    "aggregate_candidate_identity",
  );
  assertExactKeys(
    aggregate.candidate_identity,
    ["commit", "tree"],
    "aggregate_candidate_identity_fields",
  );
  assert(
    aggregate.capability_level === "level_3" &&
      aggregate.level_4_claimed === false &&
      aggregate.governance_judgment_included === false,
    "aggregate_level_boundary",
  );
  const setupByVariant = await validateSetupRecords({
    runSetRoot: resolved,
    setup: aggregate.setup,
    config,
  });
  assert(
    aggregate.workload_sha256 === config.workload_sha256 &&
      aggregate.benchmark_implementation_sha256 ===
        config.benchmark_implementation_identity.identity_sha256 &&
      aggregate.accounting_policy_sha256 ===
        config.accounting_policy_identity.identity_sha256 &&
      aggregate.formal_evidence_precollection_sha256 ===
        (config.formal_evidence_precollection_identity?.identity_sha256 ??
          null) &&
      aggregate.environment_identity === config.environment_identity,
    "aggregate_frozen_identity",
  );
  const recomputedManifest = await buildArtifactManifest(resolved);
  assert(
    canonical(recomputedManifest) === canonical(manifest),
    "manifest_recomputation",
  );
  validateManifestPaths(resolved, manifest);
  const [manifestBytes, aggregateBytes] = await Promise.all([
    readFile(path.join(resolved, "manifest.json")),
    readFile(path.join(resolved, "aggregate.json")),
  ]);
  assert(
    attestation.manifest_sha256 === digest(manifestBytes),
    "attestation_manifest_identity",
  );
  assert(
    attestation.aggregate_sha256 === digest(aggregateBytes),
    "attestation_aggregate_identity",
  );
  assert(
    attestation.candidate_commit === config.variants.c.commit &&
      attestation.candidate_tree === config.candidate_tree,
    "attestation_candidate_identity",
  );
  assert(
    attestation.workload_sha256 === config.workload_sha256 &&
      attestation.benchmark_implementation_sha256 ===
        config.benchmark_implementation_identity.identity_sha256 &&
      attestation.accounting_policy_sha256 ===
        config.accounting_policy_identity.identity_sha256 &&
      attestation.formal_evidence_precollection_sha256 ===
        (config.formal_evidence_precollection_identity?.identity_sha256 ??
          null) &&
      attestation.environment_identity === config.environment_identity,
    "attestation_frozen_identity",
  );
  assert(
    attestation.a_safety_eligible === false &&
      attestation.artifacts_are_non_authority === true &&
      attestation.raw_promoted_to_gate === false &&
      attestation.capability_level === "level_3" &&
      attestation.level_4_claimed === false &&
      attestation.governance_judgment_included === false,
    "attestation_authority_boundary",
  );
  assert(Array.isArray(aggregate.run_refs), "aggregate_run_refs");
  assert(
    new Set(aggregate.run_refs).size === aggregate.run_refs.length,
    "aggregate_run_ref_duplicates",
  );
  const runs = [];
  for (const reference of aggregate.run_refs) {
    const target = resolveContained(resolved, reference);
    const run = await readJson(target);
    validateRunRecord(run, config);
    const setup = setupByVariant.get(run.variant_id);
    assert(
      run.candidate_identity.tree === setup.tree &&
        run.candidate_identity.package_sha256 === setup.package_sha256,
      `run_setup_identity:${run.run_id}`,
    );
    await validateRunRawClosure({
      runSetRoot: resolved,
      runRoot: path.dirname(target),
      run,
    });
    runs.push(run);
  }
  const summary = deriveRealProcessRoiSummary(runs, config);
  assert(
    canonical(summary) === canonical(aggregate.summary),
    "summary_recomputation",
  );
  assert(
    attestation.observed_lifecycle_status ===
      summary.observed_lifecycle_status &&
      attestation.observed_lifecycle_evidence_valid ===
        summary.observed_lifecycle_evidence_valid &&
      attestation.formal_status === "not_evaluated",
    "attestation_measurement_summary",
  );
  const formalEvidence = options.formalEvidence
    ? await evaluateFormalTotalCostEvidence({
        packetPath: options.formalEvidence,
        accountingPolicy,
        accountingPolicyIdentity: config.accounting_policy_identity,
        runSetId: aggregate.run_set_id,
        runs,
        setupByVariant,
        precollectionIdentity:
          config.formal_evidence_precollection_identity,
      })
    : null;
  const formalConclusion = deriveVerifierFormalRoiConclusion({
    summary,
    formalEvidence,
  });
  return {
    schema_version: REAL_PROCESS_VERIFICATION_SCHEMA,
    capability_level: "level_3",
    level_4_claimed: false,
    governance_judgment_included: false,
    run_set_root: resolved,
    candidate_commit: config.variants.c.commit,
    candidate_tree: config.candidate_tree,
    manifest_sha256: attestation.manifest_sha256,
    accounting_policy_sha256:
      config.accounting_policy_identity.identity_sha256,
    formal_evidence_precollection_sha256:
      config.formal_evidence_precollection_identity?.identity_sha256 ?? null,
    repeats: summary.repeats,
    expansion: summary.expansion,
    a_safety_eligible: false,
    b_known_r9_r11_false_acceptance_reproduced:
      summary.b_known_r9_r11_false_acceptance_reproduced,
    observed_lifecycle_evidence_valid:
      summary.observed_lifecycle_evidence_valid,
    observed_lifecycle_known_path_floor_met:
      summary.observed_lifecycle_known_path_floor_met,
    observed_lifecycle_status: summary.observed_lifecycle_status,
    metrics: Object.fromEntries(
      Object.entries(summary.per_variant).map(([variant, value]) => [
        variant,
        value,
      ]),
    ),
    report_status: formalConclusion.formal_status,
    formal_status: formalConclusion.formal_status,
    formal_blockers: formalConclusion.formal_blockers,
    independent_evidence_admitted:
      formalConclusion.independent_evidence_admitted,
    total_roi_supported: formalConclusion.total_roi_supported,
    total_roi_positive: formalConclusion.total_roi_positive,
    formal_evidence:
      formalEvidence === null
        ? null
        : {
            packet_sha256: formalEvidence.packet_sha256,
            source_bundle_identity_sha256:
              formalEvidence.source_bundle_identity_sha256,
            collector_identity_sha256:
              formalEvidence.collector_identity_sha256,
            precollection_identity_sha256:
              formalEvidence.precollection_identity_sha256,
            precollection_bound: formalEvidence.precollection_bound,
            event_count: formalEvidence.event_count,
            event_identity_set_sha256:
              formalEvidence.event_identity_set_sha256,
            missing_event_keys: formalEvidence.missing_event_keys,
            missing_price_rate_keys:
              formalEvidence.missing_price_rate_keys,
            missing_meter_keys: formalEvidence.missing_meter_keys,
            missing_authoring_usage_keys:
              formalEvidence.missing_authoring_usage_keys,
            unpriced_event_keys: formalEvidence.unpriced_event_keys,
            support_complete: formalEvidence.support_complete,
          },
    formal_accounting: formalEvidence?.accounting ?? null,
    artifacts_are_non_authority: true,
  };
}

function deriveVerifierFormalRoiConclusion({ summary, formalEvidence }) {
  const blockers = [];
  if (formalEvidence === null)
    blockers.push("independent_evidence_packet_missing");
  else blockers.push(...formalEvidence.blockers);
  if (!summary.observed_lifecycle_evidence_valid)
    blockers.push("observed_lifecycle_evidence_invalid");
  if (!summary.observed_lifecycle_known_path_floor_met)
    blockers.push("observed_lifecycle_known_path_floor_not_met");
  if (summary.observed_lifecycle_status === "requires_expanded_repeats")
    blockers.push("observed_lifecycle_repeat_set_incomplete");
  const evidenceSupported = formalEvidence?.support_complete === true;
  const observedSupported =
    summary.observed_lifecycle_evidence_valid &&
    summary.observed_lifecycle_known_path_floor_met &&
    summary.repeats >= summary.required_repeats;
  const supported = evidenceSupported && observedSupported;
  const positive =
    supported &&
    formalEvidence.accounting.significant_stable_margin_met === true;
  if (supported && !positive)
    blockers.push("significant_stable_margin_not_met");
  return {
    formal_status:
      formalEvidence === null
        ? "independent_evidence_packet_missing"
        : !supported
          ? "total_roi_unsupported"
          : positive
            ? "total_roi_positive"
            : "total_roi_not_positive",
    formal_blockers: [...new Set(blockers)],
    independent_evidence_admitted: formalEvidence?.admitted === true,
    total_roi_supported: supported,
    total_roi_positive: positive,
  };
}

async function validateSetupRecords({ runSetRoot, setup, config }) {
  assert(Array.isArray(setup), "setup_records");
  assert(
    setup.length === 3 &&
      new Set(setup.map((item) => item.variant_id)).size === 3,
    "setup_variant_set",
  );
  const byVariant = new Map();
  for (const item of setup) {
    const expected = config.variants[item.variant_id];
    assert(expected, `setup_variant:${item.variant_id}`);
    assert(
      item.commit === expected.commit &&
        /^[a-f0-9]{40}$/u.test(item.tree ?? "") &&
        /^[a-f0-9]{64}$/u.test(item.package_sha256 ?? ""),
      `setup_identity:${item.variant_id}`,
    );
    if (item.variant_id === "c")
      assert(item.tree === config.candidate_tree, "setup_candidate_tree");
    assert(
      typeof item.package_path === "string" && item.package_path.length > 0,
      `setup_package_path:${item.variant_id}`,
    );
    const packageBytes = await readFile(
      resolveContained(
        runSetRoot,
        `setup/${item.variant_id}/${item.package_path}`,
      ),
    );
    assert(
      digest(packageBytes) === item.package_sha256,
      `setup_package_sha:${item.variant_id}`,
    );
    assert(
      Array.isArray(item.setup_commands) && item.setup_commands.length >= 4,
      `setup_commands:${item.variant_id}`,
    );
    const setupRoot = resolveContained(runSetRoot, `setup/${item.variant_id}`);
    const persisted = await readJson(resolveContained(setupRoot, "setup.json"));
    assert(
      canonical(persisted) === canonical(item),
      `setup_record:${item.variant_id}`,
    );
    const labels = item.setup_commands.map((command) => command.label);
    assert(
      new Set(labels).size === labels.length,
      `setup_command_duplicates:${item.variant_id}`,
    );
    const commandByLabel = new Map();
    const stdoutByLabel = new Map();
    for (const command of item.setup_commands) {
      assert(
        command.schema_version === "long-task-real-process-host-command-v1" &&
          command.status === 0,
        `setup_command_status:${item.variant_id}:${command.label}`,
      );
      const commandRecord = await readJson(
        resolveContained(setupRoot, `${command.label}.command.json`),
      );
      assert(
        canonical(commandRecord) === canonical(command),
        `setup_command_record:${item.variant_id}:${command.label}`,
      );
      commandByLabel.set(command.label, command);
      for (const stream of ["stdout", "stderr"]) {
        const bytes = await readFile(
          resolveContained(setupRoot, `${command.label}.${stream}.log`),
        );
        assert(
          bytes.length === command[`${stream}_bytes`] &&
            digest(bytes) === command[`${stream}_sha256`],
          `setup_command_${stream}:${item.variant_id}:${command.label}`,
        );
        if (stream === "stdout")
          stdoutByLabel.set(command.label, bytes.toString("utf8"));
      }
    }
    for (const [label, args, expectedOutput] of [
      ["candidate-head", ["rev-parse", "HEAD"], item.commit],
      ["candidate-tree", ["rev-parse", "HEAD^{tree}"], item.tree],
      ["candidate-status", ["status", "--short"], ""],
    ]) {
      const command = commandByLabel.get(label);
      assert(
        command &&
          canonical(command.argv) === canonical(["git", ...args]) &&
          command.cwd === commandByLabel.get("candidate-head")?.cwd &&
          stdoutByLabel.get(label)?.trim() === expectedOutput,
        `setup_candidate_identity_command:${item.variant_id}:${label}`,
      );
    }
    byVariant.set(item.variant_id, item);
  }
  return byVariant;
}

async function validateRunRawClosure({ runSetRoot, runRoot, run }) {
  const commandsPath = resolveContained(runRoot, "commands.ndjson");
  const commandLines = (await readFile(commandsPath, "utf8"))
    .split(/\r?\n/u)
    .filter((line) => line.trim().length > 0);
  const commands = commandLines.map((line, index) =>
    parseFormalJson(
      Buffer.from(line),
      `run_command_json:${run.run_id}:${index + 1}`,
    ),
  );
  assert(
    commands.length === run.lifecycle_evidence.command_count,
    `run_command_count:${run.run_id}`,
  );
  const commandRefs = commands.map((command) => command.relative_path);
  assert(
    new Set(commandRefs).size === commandRefs.length,
    `run_command_duplicates:${run.run_id}`,
  );
  const commandEvidence = new Map();
  for (const command of commands) {
    assert(
      command.schema_version === "long-task-real-process-command-v1",
      `run_command_schema:${run.run_id}`,
    );
    const persisted = await readJson(
      resolveContained(runRoot, command.relative_path),
    );
    assert(
      canonical(persisted) === canonical(command),
      `run_command_record:${run.run_id}:${command.relative_path}`,
    );
    let stdoutText = null;
    for (const stream of ["stdout", "stderr"]) {
      const bytes = await readFile(
        resolveContained(runRoot, command[`${stream}_path`]),
      );
      assert(
        bytes.length === command[`${stream}_bytes`] &&
          digest(bytes) === command[`${stream}_sha256`],
        `run_command_${stream}:${run.run_id}:${command.relative_path}`,
      );
      if (stream === "stdout") stdoutText = bytes.toString("utf8");
    }
    commandEvidence.set(command.relative_path, { command, stdoutText });
  }
  const referencedCommands = [
    ...run.cases.flatMap((item) => item.command_record_refs),
    ...run.recoveries.flatMap((item) => item.command_record_refs),
  ];
  assert(
    new Set(referencedCommands).size === referencedCommands.length &&
      referencedCommands.length === commandRefs.length &&
      [...referencedCommands]
        .sort()
        .every(
          (reference, index) => reference === [...commandRefs].sort()[index],
        ),
    `run_command_reference:${run.run_id}`,
  );

  const cases = [];
  for (const caseId of CASE_IDS) {
    const persisted = await readJson(
      resolveContained(runRoot, `cases/${caseId}/case-result.json`),
    );
    const reported = run.cases.find((item) => item.case_id === caseId);
    assert(
      canonical(persisted) === canonical(reported),
      `run_case_record:${run.run_id}:${caseId}`,
    );
    validateFixtureCandidateCommandEvidence(
      persisted.committed_candidate_identity,
      commandEvidence,
      `${run.run_id}:case:${caseId}`,
    );
    cases.push(persisted);
  }
  const recoveries = [];
  for (const reported of run.recoveries) {
    const caseId = reported.source_attack_case_id;
    const persisted = await readJson(
      resolveContained(
        runRoot,
        `recoveries/after-${caseId}/recovery-result.json`,
      ),
    );
    assert(
      canonical(persisted) === canonical(reported),
      `run_recovery_record:${run.run_id}:${caseId}`,
    );
    validateFixtureCandidateCommandEvidence(
      persisted.committed_candidate_identity,
      commandEvidence,
      `${run.run_id}:recovery:${caseId}`,
    );
    recoveries.push(persisted);
  }
  assert(
    run.lifecycle_evidence.raw_artifact_sha256 ===
      digest(canonical({ command_records: commands, cases, recoveries })),
    `run_raw_artifact_identity:${run.run_id}`,
  );
  for (const file of [commandsPath]) {
    const relative = path.relative(runSetRoot, file).replaceAll("\\", "/");
    assert(
      !relative.startsWith("../") && relative !== "..",
      `run_raw_closure_escape:${run.run_id}`,
    );
  }
}

function validateFixtureCandidateCommandEvidence(
  identity,
  commandEvidence,
  label,
) {
  const specs = [
    ["candidate-before-head", ["rev-parse", "HEAD"], identity.commit],
    ["candidate-before-tree", ["rev-parse", "HEAD^{tree}"], identity.tree],
    ["candidate-before-status", ["status", "--short"], ""],
    ["candidate-after-head", ["rev-parse", "HEAD"], identity.commit],
    ["candidate-after-tree", ["rev-parse", "HEAD^{tree}"], identity.tree],
    ["candidate-after-status", ["status", "--short"], ""],
  ];
  const records = identity.command_record_refs.map((reference) => {
    const evidence = commandEvidence.get(reference);
    assert(evidence, `fixture_candidate_command_ref:${label}:${reference}`);
    return evidence;
  });
  const byLabel = new Map(
    records.map((evidence) => [evidence.command.label, evidence]),
  );
  assert(
    byLabel.size === specs.length,
    `fixture_candidate_command_set:${label}`,
  );
  const cwd = byLabel.get("candidate-before-head")?.command.cwd;
  for (const [commandLabel, args, expectedOutput] of specs) {
    const evidence = byLabel.get(commandLabel);
    assert(
      evidence &&
        canonical(evidence.command.argv) === canonical(["git", ...args]) &&
        evidence.command.cwd === cwd &&
        evidence.command.status === 0 &&
        evidence.command.signal === null &&
        evidence.command.spawn_error === null &&
        evidence.command.stderr_bytes === 0 &&
        evidence.stdoutText.trim() === expectedOutput,
      `fixture_candidate_command:${label}:${commandLabel}`,
    );
  }
  const beforeIndices = specs
    .slice(0, 3)
    .map(([commandLabel]) => byLabel.get(commandLabel).command.index);
  const afterIndices = specs
    .slice(3)
    .map(([commandLabel]) => byLabel.get(commandLabel).command.index);
  assert(
    Math.max(...beforeIndices) < Math.min(...afterIndices),
    `fixture_candidate_command_order:${label}`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.dryRun) {
    const result = await dryRunRealProcessRoi({
      candidate: args.candidate,
      repositoryRoot: root,
      formalEvidencePlan: args.formalEvidencePlan,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (args.collect) {
    const result = await collectRealProcessRoi({
      candidate: args.candidate,
      repositoryRoot: root,
      artifactRoot:
        args.artifactRoot ?? realProcessRoiPaths.default_artifact_root,
      keepWorktrees: args.keepWorktrees,
      formalEvidencePlan: args.formalEvidencePlan,
    });
    process.stdout.write(
      `${JSON.stringify(
        {
          schema_version: REAL_PROCESS_COLLECTION_SCHEMA,
          capability_level: "level_3",
          level_4_claimed: false,
          governance_judgment_included: false,
          run_set_root: result.runSetRoot,
          manifest_sha256: result.attestation.manifest_sha256,
          accounting_policy_sha256:
            result.attestation.accounting_policy_sha256,
          formal_evidence_precollection_sha256:
            result.attestation.formal_evidence_precollection_sha256,
          observed_lifecycle_status:
            result.aggregate.summary.observed_lifecycle_status,
          formal_status: "not_evaluated",
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  if (!args.report)
    throw new Error(
      "real_process_roi_usage:--dry-run --candidate <commit> [--formal-evidence-plan <plan>] | --collect --candidate <commit> [--formal-evidence-plan <plan>] | --report <run-set> [--formal-evidence <packet>]",
    );
  const result = await verifyRealProcessRoiReport(args.report, {
    expectedCandidate: args.candidate,
    formalEvidence: args.formalEvidence,
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.observed_lifecycle_evidence_valid && !args.allowRejected)
    process.exitCode = 1;
}

async function gitText(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    windowsHide: true,
    encoding: "utf8",
  });
  return result.stdout.trim();
}

function assertNoFormalConclusionFields(value, code) {
  const prohibited = new Set([
    "formal_total_cost_evidence",
    "formal_total_cost_pairs",
    "independent_evidence_admitted",
    "report_status",
    "required_unverified_total_cost_evidence",
    "total_roi_positive",
    "total_roi_supported",
  ]);
  const visit = (candidate) => {
    if (Array.isArray(candidate)) {
      for (const item of candidate) visit(item);
      return;
    }
    if (!candidate || typeof candidate !== "object") return;
    for (const [field, item] of Object.entries(candidate)) {
      assert(!prohibited.has(field), code);
      visit(item);
    }
  };
  visit(value);
}

function assertExactKeys(value, expected, code) {
  assert(
    canonical(Object.keys(value).sort()) === canonical([...expected].sort()),
    code,
  );
}

function parseArgs(argv) {
  const result = {
    dryRun: false,
    collect: false,
    candidate: null,
    report: null,
    formalEvidence: null,
    formalEvidencePlan: null,
    artifactRoot: null,
    keepWorktrees: false,
    allowRejected: false,
  };
  const booleanOptions = new Map([
    ["--dry-run", "dryRun"],
    ["--collect", "collect"],
    ["--keep-worktrees", "keepWorktrees"],
    ["--allow-rejected", "allowRejected"],
  ]);
  const valueOptions = new Map([
    ["--candidate", "candidate"],
    ["--report", "report"],
    ["--formal-evidence", "formalEvidence"],
    ["--formal-evidence-plan", "formalEvidencePlan"],
    ["--artifact-root", "artifactRoot"],
  ]);
  const readValue = (option, index) => {
    const next = argv[index + 1];
    if (!next || next.startsWith("--"))
      throw new Error(`real_process_roi_argument_value_required:${option}`);
    return next;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const booleanField = booleanOptions.get(value);
    if (booleanField) {
      result[booleanField] = true;
      continue;
    }
    const valueField = valueOptions.get(value);
    if (!valueField)
      throw new Error(`real_process_roi_argument_unknown:${value}`);
    result[valueField] = readValue(value, index++);
  }
  return validateParsedArgs(result);
}

function validateParsedArgs(result) {
  const modeCount =
    Number(result.dryRun) + Number(result.collect) + Number(Boolean(result.report));
  if (modeCount > 1)
    throw new Error("real_process_roi_mode_conflict");
  if ((result.dryRun || result.collect) && !result.candidate)
    throw new Error("real_process_roi_candidate_required");
  if (result.formalEvidence && !result.report)
    throw new Error("real_process_roi_formal_evidence_requires_report");
  if (result.formalEvidencePlan && !(result.dryRun || result.collect))
    throw new Error("real_process_roi_formal_evidence_plan_requires_collection");
  if (result.artifactRoot && !result.collect)
    throw new Error("real_process_roi_artifact_root_requires_collection");
  if (result.keepWorktrees && !result.collect)
    throw new Error("real_process_roi_keep_worktrees_requires_collection");
  if (result.allowRejected && !result.report)
    throw new Error("real_process_roi_allow_rejected_requires_report");
  return result;
}

function validateManifestPaths(runSetRoot, manifest) {
  const seen = new Set();
  for (const entry of manifest.entries) {
    assert(typeof entry.path === "string" && entry.path, "manifest_path");
    assert(!seen.has(entry.path), `manifest_duplicate:${entry.path}`);
    seen.add(entry.path);
    const target = resolveContained(runSetRoot, entry.path);
    assert(
      entry.bytes <= 64 * 1024 * 1024,
      `manifest_file_budget:${entry.path}`,
    );
    assert(/^[a-f0-9]{64}$/u.test(entry.sha256), `manifest_sha:${entry.path}`);
    void target;
  }
}

function validateSourceIdentity(identity, label) {
  assert(
    Array.isArray(identity?.entries) && identity.entries.length > 0,
    label,
  );
  const paths = identity.entries.map((entry) => entry.path);
  assert(new Set(paths).size === paths.length, `${label}:duplicates`);
  for (const entry of identity.entries) {
    assert(
      typeof entry.path === "string" &&
        entry.path.length > 0 &&
        !path.isAbsolute(entry.path) &&
        !entry.path.split("/").includes(".."),
      `${label}:path`,
    );
    assert(Number.isInteger(entry.bytes) && entry.bytes >= 0, `${label}:bytes`);
    assert(/^[a-f0-9]{64}$/u.test(entry.sha256), `${label}:sha`);
  }
  assert(
    identity.identity_sha256 === shaCanonical(identity.entries),
    `${label}:identity`,
  );
}

async function validateMaterializedSourceIdentity(
  runSetRoot,
  prefix,
  identity,
) {
  for (const entry of identity.entries) {
    const bytes = await readFile(
      resolveContained(runSetRoot, `inputs/${prefix}/${entry.path}`),
    );
    assert(
      bytes.length === entry.bytes && digest(bytes) === entry.sha256,
      `materialized_source_identity:${prefix}:${entry.path}`,
    );
  }
}

function resolveContained(rootPath, relative) {
  if (
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/u).some((segment) => segment === "..")
  )
    throw new Error(`real_process_roi_invalid:artifact_path:${relative}`);
  const resolved = path.resolve(rootPath, ...relative.split("/"));
  const prefix = `${path.resolve(rootPath)}${path.sep}`.toLowerCase();
  if (!resolved.toLowerCase().startsWith(prefix))
    throw new Error(`real_process_roi_invalid:artifact_escape:${relative}`);
  return resolved;
}

async function readJson(file) {
  return parseFormalJson(
    await readFile(file),
    `run_set_json:${path.basename(file)}`,
  );
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function shaCanonical(value) {
  return digest(canonical(value));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
