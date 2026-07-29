export const semanticRows = parseRows(`
result|architecture|semantic-fact-completeness-result
default_fine_grained_non_ui_authoring|authoring|default-fine-grained-non-ui-authoring
authority_provenance_and_decision_boundary|authoring|authority-provenance-and-decision-boundary
material_input_and_basis_closure|authoring|material-input-and-basis-closure
standard_and_custom_domain_family_closure|catalog|standard-and-custom-domain-family-closure
subject_census_and_stable_identity|catalog|subject-census-and-stable-identity
relation_hierarchy_and_population_closure|catalog|relation-hierarchy-and-population-closure
goal_scope_glossary_assumption_and_decision_closure|domain|goal-scope-glossary-assumption-and-decision-closure
actor_role_tenant_entitlement_and_responsibility|domain|actor-role-tenant-entitlement-and-responsibility
business_rule_decision_table_and_calculation|domain|business-rule-decision-table-and-calculation
data_model_field_and_value_semantics|domain|data-model-field-and-value-semantics
operation_workflow_and_side_effect_semantics|domain|operation-workflow-and-side-effect-semantics
state_machine_and_lifecycle_semantics|domain|state-machine-and-lifecycle-semantics
temporal_scheduling_and_clock_semantics|domain|temporal-scheduling-and-clock-semantics
input_validation_normalization_and_boundary|domain|input-validation-normalization-and-boundary
output_error_feedback_and_partial_success|domain|output-error-feedback-and-partial-success
api_protocol_and_versioning|domain|api-protocol-and-versioning
event_message_stream_and_job|domain|event-message-stream-and-job
persistence_cache_search_and_data_lifecycle|domain|persistence-cache-search-and-data-lifecycle
transaction_consistency_concurrency_idempotency|domain|transaction-consistency-concurrency-idempotency
fault_timeout_retry_degradation_recovery|domain|fault-timeout-retry-degradation-recovery
backup_restore_disaster_recovery|domain|backup-restore-disaster-recovery
configuration_feature_flag_secret_and_precedence|domain|configuration-feature-flag-secret-and-precedence
compatibility_migration_rollout_and_rollback|domain|compatibility-migration-rollout-and-rollback
performance_capacity_resource_and_cost|quality|performance-capacity-resource-and-cost
reliability_availability_freshness_and_slo|quality|reliability-availability-freshness-and-slo
security_trust_authn_authz_session_and_abuse|security|security-trust-authn-authz-session-and-abuse
privacy_data_governance_and_rights|security|privacy-data-governance-and-rights
safety_compliance_human_approval_and_irreversibility|security|safety-compliance-human-approval-and-irreversibility
observability_health_alert_and_runbook|operations|observability-health-alert-and-runbook
deployment_topology_startup_shutdown_and_maintenance|operations|deployment-topology-startup-shutdown-and-maintenance
external_integration_capability_quota_and_reconciliation|operations|external-integration-capability-quota-and-reconciliation
notification_file_media_and_delivery|domain|notification-file-media-and-delivery
localization_encoding_unit_and_formatting|domain|localization-encoding-unit-and-formatting
commercial_billing_metering_and_financial|domain|commercial-billing-metering-and-financial
hardware_device_sensor_and_physical|custom|hardware-device-sensor-and-physical
ai_ml_model_prompt_evaluation_and_human_oversight|custom|ai-ml-model-prompt-evaluation-and-human-oversight
architecture_owner_boundary_and_debt|architecture|architecture-owner-boundary-and-debt
complete_condition_axis_catalog|catalog|complete-condition-axis-catalog
atomic_applicability_combination_closure|catalog|atomic-applicability-combination-closure
typed_fact_identity_and_expected_value|catalog|typed-fact-identity-and-expected-value
quantifier_range_null_absence_and_equivalence|catalog|quantifier-range-null-absence-and-equivalence
fact_proof_obligation_method_catalog|evidence|fact-proof-obligation-method-catalog
per_fact_comparator_oracle_environment|evidence|per-fact-comparator-oracle-environment
expected_source_contract_runtime_set_equality|contract|expected-source-contract-runtime-set-equality
per_fact_current_result_and_multiple_observer|evidence|per-fact-current-result-and-multiple-observer
furthest_independent_boundary_and_counterfactual|evidence|furthest-independent-boundary-and-counterfactual
protected_evidence_redaction_and_secrets|security|protected-evidence-redaction-and-secrets
scalable_complete_generation_no_truncation|catalog|scalable-complete-generation-no-truncation
fail_closed_dispositions_conflicts_and_unreadable|authoring|fail-closed-dispositions-conflicts-and-unreadable
default_workflow_and_long_task_projection|contract|default-workflow-and-long-task-projection
source_authoring_product_and_engineering_guidance|docs|source-authoring-product-and-engineering-guidance
canonical_owner_context_projection|architecture|canonical-owner-context-projection
legacy_migration_and_schema_parser_parity|contract|legacy-migration-and-schema-parser-parity
anti_degradation_and_implementation_freedom|architecture|anti-degradation-and-implementation-freedom
honest_theorem_boundary_and_custom_extension|architecture|honest-theorem-boundary-and-custom-extension
public_distribution_and_cost_closure|docs|public-distribution-and-cost-closure
single_source_semantic_manifest|architecture|single-source-semantic-manifest
machine_enforced_semantic_universe|catalog|machine-enforced-semantic-universe
contract_semantic_fact_binding|contract|contract-semantic-fact-binding
typed_semantic_fact_runtime_evidence|evidence|typed-semantic-fact-runtime-evidence
semantic_fact_antidegradation_admission|architecture|semantic-fact-antidegradation-admission
semantic_fact_distribution_parity|docs|semantic-fact-distribution-parity
authoring_universe_mutation_ac|contract|authoring-universe-mutation-ac
atomic_axis_and_aggregate_rejection_ac|contract|atomic-axis-and-aggregate-rejection-ac
business_data_state_interface_closure_ac|contract|business-data-state-interface-closure-ac
concurrency_failure_migration_quality_ac|contract|concurrency-failure-migration-quality-ac
security_privacy_safety_operations_ac|contract|security-privacy-safety-operations-ac
custom_hardware_ai_domain_extension_ac|contract|custom-hardware-ai-domain-extension-ac
source_contract_obligation_set_equality_ac|contract|source-contract-obligation-set-equality-ac
per_fact_current_evidence_ac|contract|per-fact-current-evidence-ac
furthest_boundary_and_counterfactual_ac|contract|furthest-boundary-and-counterfactual-ac
no_truncation_disposition_bypass_ac|contract|no-truncation-disposition-bypass-ac
`);

export const semanticFactObservationRefs = Object.fromEntries([
  ...semanticRows.map(([observation, , authorityRef]) => [
    authorityRef,
    observation,
  ]),
  ["no-semantic-fact-shortcuts", "no_semantic_fact_shortcuts"],
  [
    "semantic-inventory-is-not-completion",
    "semantic_inventory_is_not_completion",
  ],
  ["antidegradation-and-parity-ac", "antidegradation_and_parity_ac"],
  ["semantic-public-schema-risk", "semantic_public_schema_risk"],
  ["semantic-false-completion-risk", "semantic_false_completion_risk"],
  ["semantic-oracle-observability-risk", "semantic_oracle_observability_risk"],
]);

export const semanticRiskFiles = [
  "packages/ty-context/src/lib/semantic-fact-policy-units.ts",
  "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts",
  "packages/ty-context/src/lib/long-task-semantic-drift-migration.ts",
];

export const groupFiles = {
  authoring: [
    "packages/ty-context/src/lib/semantic-fact-source-parser.ts",
    "packages/ty-context/src/lib/semantic-fact-manifest-shape.ts",
    ".codex/ty-context-managed/skills/context_product_plan/SKILL.md",
    ".codex/ty-context-managed/skills/context_development_engineer/SKILL.md",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ],
  catalog: [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "packages/ty-context/src/lib/semantic-fact-policy.ts",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ],
  domain: [
    "packages/ty-context/src/lib/semantic-fact-types.ts",
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "docs/non-ui-semantic-fact-completeness.md",
  ],
  quality: [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "docs/non-ui-semantic-fact-completeness.md",
  ],
  security: [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts",
    "docs/non-ui-semantic-fact-completeness.md",
  ],
  operations: [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "docs/non-ui-semantic-fact-completeness.md",
  ],
  custom: [
    "packages/ty-context/src/lib/semantic-fact-catalog.ts",
    "docs/non-ui-semantic-fact-completeness.md",
  ],
  contract: [
    "packages/ty-context/src/lib/long-task-semantic-fact-closure.ts",
    "packages/ty-context/src/schemas/long-task-delivery-v2/long-task-delivery-v2.schema.json",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ],
  evidence: [
    "packages/ty-context/src/lib/long-task-semantic-fact-evidence.ts",
    "packages/ty-context/src/lib/long-task-evidence-capability-codec.ts",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ],
  docs: [
    ".codex/ty-context-managed/agents/AGENTS_CORE.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/source-authoring.md",
    ".codex/ty-context-managed/skills/long-task-workflow/references/contract-authoring.md",
    "README.md",
    "README.zh-CN.md",
  ],
  architecture: [
    "PROJECT_SPEC.md",
    "docs/non-ui-semantic-fact-completeness.md",
    "tests/ty-context/long-task-semantic-fact-closure.test.mjs",
  ],
};

export const semanticAssertionKeys = [
  ...semanticRows.map(([observation, , authorityRef]) =>
    observation === "result" ? observation : authorityRef,
  ),
  "no-semantic-fact-shortcuts",
  "semantic-inventory-is-not-completion",
  "relations-na",
  "semantic-liveness",
];

export async function loadSemanticManifest(repositoryRoot) {
  const source = await readFile(
    path.join(repositoryRoot, "docs/non-ui-semantic-fact-completeness.md"),
    "utf8",
  ).catch(() => "");
  const match = source.match(
    /```yaml semantic-fact-manifest-v1\r?\n([\s\S]*?)\r?\n```/u,
  );
  return match ? JSON.parse(match[1]) : null;
}

function parseRows(value) {
  const rows = value
    .trim()
    .split("\n")
    .map((row) => row.split("|"));
  if (rows.some((row) => row.length !== 3 || row.some((cell) => !cell)))
    throw new Error("semantic_delivery_catalog_row_invalid");
  if (new Set(rows.map((row) => row[0])).size !== rows.length)
    throw new Error("semantic_delivery_catalog_observation_duplicate");
  if (new Set(rows.map((row) => row[2])).size !== rows.length)
    throw new Error("semantic_delivery_catalog_authority_duplicate");
  return rows;
}
import { readFile } from "node:fs/promises";
import path from "node:path";
