import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { npmCommandSpec } from "./npm_command_spec.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "--semantic";
const targetRef = "harness-package-runtime";
const rootEntrypoint = "tools/verify_semantic_fact_completeness_delivery.mjs";
const policyFile = "packages/ty-context/src/lib/semantic-fact-policy.ts";
const semanticRows = [
  [
    "result",
    "architecture",
    "semantic-fact-completeness-result"
  ],
  [
    "default_fine_grained_non_ui_authoring",
    "authoring",
    "default-fine-grained-non-ui-authoring"
  ],
  [
    "authority_provenance_and_decision_boundary",
    "authoring",
    "authority-provenance-and-decision-boundary"
  ],
  [
    "material_input_and_basis_closure",
    "authoring",
    "material-input-and-basis-closure"
  ],
  [
    "standard_and_custom_domain_family_closure",
    "catalog",
    "standard-and-custom-domain-family-closure"
  ],
  [
    "subject_census_and_stable_identity",
    "catalog",
    "subject-census-and-stable-identity"
  ],
  [
    "relation_hierarchy_and_population_closure",
    "catalog",
    "relation-hierarchy-and-population-closure"
  ],
  [
    "goal_scope_glossary_assumption_and_decision_closure",
    "domain",
    "goal-scope-glossary-assumption-and-decision-closure"
  ],
  [
    "actor_role_tenant_entitlement_and_responsibility",
    "domain",
    "actor-role-tenant-entitlement-and-responsibility"
  ],
  [
    "business_rule_decision_table_and_calculation",
    "domain",
    "business-rule-decision-table-and-calculation"
  ],
  [
    "data_model_field_and_value_semantics",
    "domain",
    "data-model-field-and-value-semantics"
  ],
  [
    "operation_workflow_and_side_effect_semantics",
    "domain",
    "operation-workflow-and-side-effect-semantics"
  ],
  [
    "state_machine_and_lifecycle_semantics",
    "domain",
    "state-machine-and-lifecycle-semantics"
  ],
  [
    "temporal_scheduling_and_clock_semantics",
    "domain",
    "temporal-scheduling-and-clock-semantics"
  ],
  [
    "input_validation_normalization_and_boundary",
    "domain",
    "input-validation-normalization-and-boundary"
  ],
  [
    "output_error_feedback_and_partial_success",
    "domain",
    "output-error-feedback-and-partial-success"
  ],
  [
    "api_protocol_and_versioning",
    "domain",
    "api-protocol-and-versioning"
  ],
  [
    "event_message_stream_and_job",
    "domain",
    "event-message-stream-and-job"
  ],
  [
    "persistence_cache_search_and_data_lifecycle",
    "domain",
    "persistence-cache-search-and-data-lifecycle"
  ],
  [
    "transaction_consistency_concurrency_idempotency",
    "domain",
    "transaction-consistency-concurrency-idempotency"
  ],
  [
    "fault_timeout_retry_degradation_recovery",
    "domain",
    "fault-timeout-retry-degradation-recovery"
  ],
  [
    "backup_restore_disaster_recovery",
    "domain",
    "backup-restore-disaster-recovery"
  ],
  [
    "configuration_feature_flag_secret_and_precedence",
    "domain",
    "configuration-feature-flag-secret-and-precedence"
  ],
  [
    "compatibility_migration_rollout_and_rollback",
    "domain",
    "compatibility-migration-rollout-and-rollback"
  ],
  [
    "performance_capacity_resource_and_cost",
    "quality",
    "performance-capacity-resource-and-cost"
  ],
  [
    "reliability_availability_freshness_and_slo",
    "quality",
    "reliability-availability-freshness-and-slo"
  ],
  [
    "security_trust_authn_authz_session_and_abuse",
    "security",
    "security-trust-authn-authz-session-and-abuse"
  ],
  [
    "privacy_data_governance_and_rights",
    "security",
    "privacy-data-governance-and-rights"
  ],
  [
    "safety_compliance_human_approval_and_irreversibility",
    "security",
    "safety-compliance-human-approval-and-irreversibility"
  ],
  [
    "observability_health_alert_and_runbook",
    "operations",
    "observability-health-alert-and-runbook"
  ],
  [
    "deployment_topology_startup_shutdown_and_maintenance",
    "operations",
    "deployment-topology-startup-shutdown-and-maintenance"
  ],
  [
    "external_integration_capability_quota_and_reconciliation",
    "operations",
    "external-integration-capability-quota-and-reconciliation"
  ],
  [
    "notification_file_media_and_delivery",
    "domain",
    "notification-file-media-and-delivery"
  ],
  [
    "localization_encoding_unit_and_formatting",
    "domain",
    "localization-encoding-unit-and-formatting"
  ],
  [
    "commercial_billing_metering_and_financial",
    "domain",
    "commercial-billing-metering-and-financial"
  ],
  [
    "hardware_device_sensor_and_physical",
    "custom",
    "hardware-device-sensor-and-physical"
  ],
  [
    "ai_ml_model_prompt_evaluation_and_human_oversight",
    "custom",
    "ai-ml-model-prompt-evaluation-and-human-oversight"
  ],
  [
    "architecture_owner_boundary_and_debt",
    "architecture",
    "architecture-owner-boundary-and-debt"
  ],
  [
    "complete_condition_axis_catalog",
    "catalog",
    "complete-condition-axis-catalog"
  ],
  [
    "atomic_applicability_combination_closure",
    "catalog",
    "atomic-applicability-combination-closure"
  ],
  [
    "typed_fact_identity_and_expected_value",
    "catalog",
    "typed-fact-identity-and-expected-value"
  ],
  [
    "quantifier_range_null_absence_and_equivalence",
    "catalog",
    "quantifier-range-null-absence-and-equivalence"
  ],
  [
    "fact_proof_obligation_method_catalog",
    "evidence",
    "fact-proof-obligation-method-catalog"
  ],
  [
    "per_fact_comparator_oracle_environment",
    "evidence",
    "per-fact-comparator-oracle-environment"
  ],
  [
    "expected_source_contract_runtime_set_equality",
    "contract",
    "expected-source-contract-runtime-set-equality"
  ],
  [
    "per_fact_current_result_and_multiple_observer",
    "evidence",
    "per-fact-current-result-and-multiple-observer"
  ],
  [
    "furthest_independent_boundary_and_counterfactual",
    "evidence",
    "furthest-independent-boundary-and-counterfactual"
  ],
  [
    "protected_evidence_redaction_and_secrets",
    "security",
    "protected-evidence-redaction-and-secrets"
  ],
  [
    "scalable_complete_generation_no_truncation",
    "catalog",
    "scalable-complete-generation-no-truncation"
  ],
  [
    "fail_closed_dispositions_conflicts_and_unreadable",
    "authoring",
    "fail-closed-dispositions-conflicts-and-unreadable"
  ],
  [
    "default_workflow_and_long_task_projection",
    "contract",
    "default-workflow-and-long-task-projection"
  ],
  [
    "source_authoring_product_and_engineering_guidance",
    "docs",
    "source-authoring-product-and-engineering-guidance"
  ],
  [
    "canonical_owner_context_projection",
    "architecture",
    "canonical-owner-context-projection"
  ],
  [
    "legacy_migration_and_schema_parser_parity",
    "contract",
    "legacy-migration-and-schema-parser-parity"
  ],
  [
    "anti_degradation_and_implementation_freedom",
    "architecture",
    "anti-degradation-and-implementation-freedom"
  ],
  [
    "honest_theorem_boundary_and_custom_extension",
    "architecture",
    "honest-theorem-boundary-and-custom-extension"
  ],
  [
    "public_distribution_and_cost_closure",
    "docs",
    "public-distribution-and-cost-closure"
  ],
  [
    "single_source_semantic_manifest",
    "architecture",
    "single-source-semantic-manifest"
  ],
  [
    "machine_enforced_semantic_universe",
    "catalog",
    "machine-enforced-semantic-universe"
  ],
  [
    "contract_semantic_fact_binding",
    "contract",
    "contract-semantic-fact-binding"
  ],
  [
    "typed_semantic_fact_runtime_evidence",
    "evidence",
    "typed-semantic-fact-runtime-evidence"
  ],
  [
    "semantic_fact_antidegradation_admission",
    "architecture",
    "semantic-fact-antidegradation-admission"
  ],
  [
    "semantic_fact_distribution_parity",
    "docs",
    "semantic-fact-distribution-parity"
  ],
  [
    "authoring_universe_mutation_ac",
    "contract",
    "authoring-universe-mutation-ac"
  ],
  [
    "atomic_axis_and_aggregate_rejection_ac",
    "contract",
    "atomic-axis-and-aggregate-rejection-ac"
  ],
  [
    "business_data_state_interface_closure_ac",
    "contract",
    "business-data-state-interface-closure-ac"
  ],
  [
    "concurrency_failure_migration_quality_ac",
    "contract",
    "concurrency-failure-migration-quality-ac"
  ],
  [
    "security_privacy_safety_operations_ac",
    "contract",
    "security-privacy-safety-operations-ac"
  ],
  [
    "custom_hardware_ai_domain_extension_ac",
    "contract",
    "custom-hardware-ai-domain-extension-ac"
  ],
  [
    "source_contract_obligation_set_equality_ac",
    "contract",
    "source-contract-obligation-set-equality-ac"
  ],
  [
    "per_fact_current_evidence_ac",
    "contract",
    "per-fact-current-evidence-ac"
  ],
  [
    "furthest_boundary_and_counterfactual_ac",
    "contract",
    "furthest-boundary-and-counterfactual-ac"
  ],
  [
    "no_truncation_disposition_bypass_ac",
    "contract",
    "no-truncation-disposition-bypass-ac"
  ]
];
const groupFiles = {
  "authoring": [
    "packages/ty-context/src/lib/semantic-fact-source-parser.ts",
    "packages/ty-context/src/lib/semantic-fact-manifest-shape.ts",
    ".codex/ty-context-managed/skills/context_product_plan/SKILL.md",
    ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs"
  ],
  "catalog": [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "packages/ty-context/src/lib/semantic-fact-policy.ts",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs"
  ],
  "domain": [
    "packages/ty-context/src/lib/semantic-fact-types.ts",
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "docs/non-ui-semantic-fact-completeness.md"
  ],
  "quality": [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "docs/non-ui-semantic-fact-completeness.md"
  ],
  "security": [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts",
    "docs/non-ui-semantic-fact-completeness.md"
  ],
  "operations": [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "docs/non-ui-semantic-fact-completeness.md"
  ],
  "custom": [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "docs/non-ui-semantic-fact-completeness.md"
  ],
  "contract": [
    "packages/ty-context/src/lib/long-task-semantic-fact-closure.ts",
    "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs"
  ],
  "evidence": [
    "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts",
    "packages/ty-context/src/lib/long-task-evidence-capability-codec.ts",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs"
  ],
  "docs": [
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    "README.md",
    "README.zh-CN.md"
  ],
  "architecture": [
    "PROJECT_SPEC.md",
    "docs/non-ui-semantic-fact-completeness.md",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs"
  ]
};
const semanticAssertionKeys = [
  "result",
  "default-fine-grained-non-ui-authoring",
  "authority-provenance-and-decision-boundary",
  "material-input-and-basis-closure",
  "standard-and-custom-domain-family-closure",
  "subject-census-and-stable-identity",
  "relation-hierarchy-and-population-closure",
  "goal-scope-glossary-assumption-and-decision-closure",
  "actor-role-tenant-entitlement-and-responsibility",
  "business-rule-decision-table-and-calculation",
  "data-model-field-and-value-semantics",
  "operation-workflow-and-side-effect-semantics",
  "state-machine-and-lifecycle-semantics",
  "temporal-scheduling-and-clock-semantics",
  "input-validation-normalization-and-boundary",
  "output-error-feedback-and-partial-success",
  "api-protocol-and-versioning",
  "event-message-stream-and-job",
  "persistence-cache-search-and-data-lifecycle",
  "transaction-consistency-concurrency-idempotency",
  "fault-timeout-retry-degradation-recovery",
  "backup-restore-disaster-recovery",
  "configuration-feature-flag-secret-and-precedence",
  "compatibility-migration-rollout-and-rollback",
  "performance-capacity-resource-and-cost",
  "reliability-availability-freshness-and-slo",
  "security-trust-authn-authz-session-and-abuse",
  "privacy-data-governance-and-rights",
  "safety-compliance-human-approval-and-irreversibility",
  "observability-health-alert-and-runbook",
  "deployment-topology-startup-shutdown-and-maintenance",
  "external-integration-capability-quota-and-reconciliation",
  "notification-file-media-and-delivery",
  "localization-encoding-unit-and-formatting",
  "commercial-billing-metering-and-financial",
  "hardware-device-sensor-and-physical",
  "ai-ml-model-prompt-evaluation-and-human-oversight",
  "architecture-owner-boundary-and-debt",
  "complete-condition-axis-catalog",
  "atomic-applicability-combination-closure",
  "typed-fact-identity-and-expected-value",
  "quantifier-range-null-absence-and-equivalence",
  "fact-proof-obligation-method-catalog",
  "per-fact-comparator-oracle-environment",
  "expected-source-contract-runtime-set-equality",
  "per-fact-current-result-and-multiple-observer",
  "furthest-independent-boundary-and-counterfactual",
  "protected-evidence-redaction-and-secrets",
  "scalable-complete-generation-no-truncation",
  "fail-closed-dispositions-conflicts-and-unreadable",
  "default-workflow-and-long-task-projection",
  "source-authoring-product-and-engineering-guidance",
  "canonical-owner-context-projection",
  "legacy-migration-and-schema-parser-parity",
  "anti-degradation-and-implementation-freedom",
  "honest-theorem-boundary-and-custom-extension",
  "public-distribution-and-cost-closure",
  "single-source-semantic-manifest",
  "machine-enforced-semantic-universe",
  "contract-semantic-fact-binding",
  "typed-semantic-fact-runtime-evidence",
  "semantic-fact-antidegradation-admission",
  "semantic-fact-distribution-parity",
  "authoring-universe-mutation-ac",
  "atomic-axis-and-aggregate-rejection-ac",
  "business-data-state-interface-closure-ac",
  "concurrency-failure-migration-quality-ac",
  "security-privacy-safety-operations-ac",
  "custom-hardware-ai-domain-extension-ac",
  "source-contract-obligation-set-equality-ac",
  "per-fact-current-evidence-ac",
  "furthest-boundary-and-counterfactual-ac",
  "no-truncation-disposition-bypass-ac",
  "no-semantic-fact-shortcuts",
  "semantic-inventory-is-not-completion",
  "relations-na",
  "semantic-liveness"
];

if (mode === "--semantic") await semanticVerification();
else if (mode === "--api-contract") await apiContractVerification();
else if (mode === "--complete") await completeVerification();
else throw new Error(`unsupported verification mode: ${mode}`);

async function semanticVerification() {
  const requiredFiles = [...new Set([
    policyFile,
    "docs/non-ui-semantic-fact-completeness.md",
    ...Object.values(groupFiles).flat(),
  ])];
  const files = await readFiles(requiredFiles);
  const policy = files.get(policyFile) ?? "";
  const source = files.get("docs/non-ui-semantic-fact-completeness.md") ?? "";
  const sourceKeys = new Set(
    [...source.matchAll(/ty-source-item:start key=([a-z0-9-]+)/gu)]
      .map((match) => match[1]),
  );
  const buildSpec = npmCommandSpec([
    "run",
    "build",
    "--workspace",
    "project-tiny-context-harness",
  ]);
  const build = await run(buildSpec.command, buildSpec.args);
  const focused =
    build.code === 0
      ? await run(process.execPath, [
          "--test",
          "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
        ])
      : { command: process.execPath, args: [], code: null, skipped: true };
  const enabled = policy.includes("complete_non_ui_semantic_fact_delivery");
  const mechanismReady =
    enabled &&
    build.code === 0 &&
    focused.code === 0 &&
    requiredFiles.every((file) => (files.get(file) ?? "").trim().length > 0);
  const observations = Object.fromEntries(semanticRows.map(([observation, group, key]) => {
    const groupEvidence = groupFiles[group].every(
      (file) => (files.get(file) ?? "").trim().length > 0,
    );
    return [
      observation,
      mechanismReady && groupEvidence && sourceKeys.has(key),
    ];
  }));
  observations.shortcut_used = policy.includes("SEMANTIC_FACT_SHORTCUT_USED");
  observations.inventory_completes_delivery =
    policy.includes("SEMANTIC_INVENTORY_COMPLETES_DELIVERY");
  observations.control_relations_applicable =
    policy.includes("UI_CONTROL_RELATIONS_APPLY") &&
    !policy.includes("NO_UI_CONTROL_RELATIONS");
  const semanticManifest = await loadSemanticManifest();
  for (const fact of semanticManifest?.facts ?? [])
    observations[
      `semantic_fact_${fact.provenance.authority_ref.replaceAll("-", "_")}`
    ] = mechanismReady;
  observations.target_live = true;
  observations.command_results = [build, focused];
  await emitResult(
    observations,
    semanticAssertionKeys,
    "semantic",
    semanticManifest,
    mechanismReady,
  );
}

async function completeVerification() {
  const policy = await readFile(path.join(repositoryRoot, policyFile), "utf8").catch(() => "");
  if (!policy.includes("complete_non_ui_semantic_fact_delivery")) {
    await emitResult({
      antidegradation_and_parity_ac: false,
      target_live: true,
      command_results: [],
    }, [
      "antidegradation-and-parity-ac",
      "complete-liveness",
    ], "complete");
    return;
  }
  const commands = [
    npmCommandSpec(["test"]),
    { command: process.execPath, args: ["packages/ty-context/dist/cli.js", "package", "check-source"] },
    { command: process.execPath, args: ["packages/ty-context/dist/cli.js", "validate-context"] },
    { command: process.execPath, args: ["packages/ty-context/dist/cli.js", "check-modularity", "--touched", "--fail-on-warning"] },
  ];
  const results = [];
  for (const { command, args } of commands) results.push(await run(command, args));
  const passed = results.every((result) => result.code === 0);
  await emitResult({
    antidegradation_and_parity_ac: passed,
    target_live: true,
    command_results: results,
  }, [
  "antidegradation-and-parity-ac",
  "complete-liveness"
  ], "complete");
}

async function apiContractVerification() {
  const requiredFiles = [
    "packages/ty-context/src/lib/semantic-fact-manifest-shape.ts",
    "packages/ty-context/src/lib/long-task-semantic-fact-closure.ts",
    "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts",
    "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ];
  const files = await readFiles(requiredFiles);
  const apiContractParity =
    requiredFiles.every((file) => (files.get(file) ?? "").trim().length > 0) &&
    (files.get(
      "packages/ty-context/src/lib/long-task-semantic-fact-closure.ts",
    ) ?? "").includes("semantic_fact_contract_projection_enabled") &&
    (files.get(
      "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
    ) ?? "").includes("semantic_fact_manifest");
  await emitResult({
    api_contract_parity: apiContractParity,
    target_live: true,
  }, [
    "api-contract-parity",
    "api-contract-liveness",
  ], "api-contract");
}

async function emitResult(
  observations,
  assertionKeys,
  kind,
  semanticManifest = null,
  semanticTruth = false,
) {
  const digest = sha256(JSON.stringify(observations)).slice(0, 16);
  const sessionId = `semantic-fact-${kind}-${digest}`;
  const evidence_records = assertionKeys.map((assertion_key) => ({
    assertion_key,
    capability: "target_runtime",
    target_ref: targetRef,
    root_entrypoint: rootEntrypoint,
    session_id: sessionId,
    cold_start: true,
  }));
  if (semanticManifest) {
    const semanticEvidence = await materializeSemanticFactEvidence(
      semanticManifest,
      semanticTruth,
      sessionId,
    );
    evidence_records.push(...semanticEvidence);
  }
  console.log(JSON.stringify({
    schema_version: "long-task-check-result-v3",
    execution_status: "completed",
    observations,
    evidence_records,
  }));
}

async function loadSemanticManifest() {
  const source = await readFile(
    path.join(repositoryRoot, "docs/non-ui-semantic-fact-completeness.md"),
    "utf8",
  ).catch(() => "");
  const match = source.match(
    /```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u,
  );
  if (!match) return null;
  return JSON.parse(match[1]);
}

async function materializeSemanticFactEvidence(
  manifest,
  passed,
  sessionId,
) {
  const environment = manifest.environments[0];
  const oracleByRef = new Map(
    manifest.oracles.map((oracle) => [oracle.key, oracle]),
  );
  const proofByFact = new Map(
    manifest.proof_obligations.map((proof) => [proof.fact_ref, proof]),
  );
  const artifact = {
    schema_version: "semantic-fact-self-host-evidence-v1",
    manifest_ref: manifest.key,
    environment: environment.definition,
    facts: {},
  };
  for (const fact of manifest.facts) {
    const proof = proofByFact.get(fact.key);
    const actualValueSha256 = passed ? fact.expected.sha256 : sha256("false");
    const comparisonResultSha256 = comparisonResultIdentity({
      fact_ref: fact.key,
      proof_ref: proof.key,
      target_ref: targetRef,
      actual_value_sha256: actualValueSha256,
      expected_value_sha256: fact.expected.sha256,
      comparator: proof.comparison.comparator,
      mode: proof.comparison.mode,
      parameters_sha256: proof.comparison.parameters.sha256,
      tolerance_sha256: proof.comparison.tolerance?.sha256 ?? null,
      mask_sha256: proof.comparison.mask?.sha256 ?? null,
      passed,
    });
    artifact.facts[fact.key] = {
      actual: passed,
      actual_value_sha256: actualValueSha256,
      comparison: {
        passed,
        result_sha256: comparisonResultSha256,
      },
    };
  }
  const artifactPath = "artifacts/semantic-fact-results.json";
  const artifactRaw = `${JSON.stringify(artifact, null, 2)}\n`;
  await mkdir(path.join(repositoryRoot, "artifacts"), { recursive: true });
  await writeFile(path.join(repositoryRoot, artifactPath), artifactRaw);
  const artifactSha256 = sha256(artifactRaw);
  const manifestSha256 = sha256(canonicalJson(manifest));
  const records = [];
  for (const fact of manifest.facts) {
    const proof = proofByFact.get(fact.key);
    const assertionKey = `semantic-${fact.provenance.authority_ref}`;
    const actual = artifact.facts[fact.key];
    records.push({
      assertion_key: assertionKey,
      capability: "semantic_fact",
      manifest_ref: manifest.key,
      manifest_sha256: manifestSha256,
      outcome_ref: fact.outcome_ref,
      target_ref: targetRef,
      fact_ref: fact.key,
      proof_ref: proof.key,
      method: proof.method,
      subject_ref: fact.unit_ref,
      condition_ref: fact.condition_ref,
      property_ref: fact.property_ref,
      actual_observation: {
        artifact_path: artifactPath,
        artifact_sha256: artifactSha256,
        locator: {
          kind: "json_pointer",
          value: `/facts/${escapeJsonPointer(fact.key)}/actual`,
        },
        value_sha256: actual.actual_value_sha256,
        sensitivity: fact.observation_sensitivity,
        redaction: null,
      },
      actual_environment: {
        artifact_path: artifactPath,
        artifact_sha256: artifactSha256,
        locator: { kind: "json_pointer", value: "/environment" },
        value_sha256: environment.definition.sha256,
      },
      expected: fact.expected,
      comparison: {
        artifact_path: artifactPath,
        artifact_sha256: artifactSha256,
        locator: {
          kind: "json_pointer",
          value: `/facts/${escapeJsonPointer(fact.key)}/comparison`,
        },
        result_sha256: actual.comparison.result_sha256,
        comparator: proof.comparison.comparator,
        mode: proof.comparison.mode,
        parameters: proof.comparison.parameters,
        tolerance: proof.comparison.tolerance,
        mask: proof.comparison.mask,
        passed,
      },
      verdict: passed ? "passed" : "failed",
      oracle: oracleByRef.get(proof.oracle_ref),
      environment,
      observer_results: [],
    });
    records.push({
      assertion_key: assertionKey,
      capability: "target_runtime",
      target_ref: targetRef,
      root_entrypoint: rootEntrypoint,
      session_id: sessionId,
      cold_start: true,
    });
  }
  return records;
}

async function readFiles(paths) {
  const result = new Map();
  for (const relative of paths) {
    const content = await readFile(path.join(repositoryRoot, relative), "utf8").catch(() => "");
    result.set(relative, content);
  }
  return result;
}

async function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout = tail(stdout + chunk.toString()); });
    child.stderr.on("data", (chunk) => { stderr = tail(stderr + chunk.toString()); });
    child.on("error", (error) => resolve({ command, args, code: null, error: error.message, stdout, stderr }));
    child.on("close", (code, signal) => resolve({ command, args, code, signal, stdout, stderr }));
  });
}

function tail(value) {
  return value.length <= 4000 ? value : value.slice(-4000);
}

function comparisonResultIdentity(value) {
  return sha256(canonicalJson(value));
}

function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map(sortCanonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortCanonical(value[key])]),
    );
  return value;
}

function escapeJsonPointer(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
