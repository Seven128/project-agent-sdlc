export const SEMANTIC_FACT_STANDARD_FAMILIES = [
  "goal_scope_glossary",
  "actor_role_tenant_entitlement",
  "business_rule_calculation",
  "data_model",
  "operation_workflow",
  "state_machine",
  "temporal_scheduling",
  "input_validation",
  "output_error",
  "api_protocol",
  "event_message_job",
  "persistence_cache_search",
  "transaction_consistency_concurrency_idempotency",
  "fault_degradation_recovery",
  "backup_restore_disaster_recovery",
  "configuration_feature_flag_secret",
  "compatibility_migration_rollout",
  "performance_capacity_cost",
  "reliability_slo",
  "security",
  "privacy",
  "safety_compliance",
  "observability",
  "deployment_topology",
  "external_integration",
  "notification_file_media",
  "localization",
  "commercial_billing",
  "hardware_sensor",
  "ai_ml",
  "architecture_ownership",
] as const;

export const SEMANTIC_FACT_STANDARD_CONDITION_AXES = [
  "actor",
  "role",
  "tenant",
  "organization",
  "jurisdiction",
  "residency",
  "environment",
  "region",
  "zone",
  "platform",
  "device",
  "client_version",
  "api_version",
  "schema_version",
  "runtime_version",
  "feature",
  "cohort",
  "configuration",
  "entitlement",
  "permission",
  "consent",
  "session",
  "entity_state",
  "prior_state",
  "input_class",
  "boundary_case",
  "data_volume",
  "locale",
  "timezone",
  "clock",
  "concurrency",
  "repetition",
  "dependency_health",
  "connectivity",
  "failure_class",
  "retry_phase",
  "consistency",
  "freshness",
  "migration_phase",
  "rollout_phase",
  "topology",
  "threat",
  "operational_mode",
] as const;

export const SEMANTIC_FACT_REQUIRED_INSPECTOR_CAPABILITIES = [
  "source_inventory",
  "context_inventory",
  "input_classification",
  "standard_catalog",
  "custom_domain_discovery",
  "subject_inventory",
  "relation_inventory",
  "population_inventory",
  "condition_axis_inventory",
  "condition_combination_inventory",
  "property_inventory",
  "fact_cell_inventory",
  "proof_obligation_inventory",
] as const;

export const SEMANTIC_FACT_PROOF_METHODS = [
  "exact_value",
  "schema_contract",
  "decision_table",
  "formula_evaluation",
  "invariant",
  "transition_trace",
  "sequence_trace",
  "durable_roundtrip",
  "boundary_invocation",
  "external_side_effect",
  "population_set_equality",
  "concurrency_schedule",
  "idempotency_repetition",
  "fault_injection",
  "recovery_drill",
  "migration",
  "compatibility",
  "performance",
  "capacity",
  "security",
  "privacy",
  "audit",
  "observability",
  "deployment",
  "implementation_structure",
] as const;

export const SEMANTIC_FACT_COMPARATORS = [
  "exact_value",
  "semantic_equal",
  "set_equal",
  "ordered_equal",
  "schema_compatible",
  "decision_table_complete",
  "numeric_tolerance",
  "range_contains",
  "trace_equal",
  "invariant_holds",
  "population_set_equal",
  "latency_budget",
  "capacity_budget",
  "security_policy",
  "privacy_policy",
  "custom",
] as const;

export const SEMANTIC_FACT_STANDARD_PROPERTIES: Readonly<
  Record<(typeof SEMANTIC_FACT_STANDARD_FAMILIES)[number], readonly string[]>
> = {
  goal_scope_glossary:
    "goal observable_outcome scope non_goal term_definition unit_definition invariant assumption priority acceptance_meaning normative_status decision_owner conflict_resolution".split(
      " ",
    ),
  actor_role_tenant_entitlement:
    "identity eligibility visibility allowed_operation forbidden_operation delegation impersonation isolation_boundary ownership approval_owner escalation lifecycle".split(
      " ",
    ),
  business_rule_calculation:
    "predicate input precedence decision_branch overlap_handling gap_handling output formula formula_version unit precision rounding threshold boundary_inclusivity cap floor exception effective_period audit_rationale".split(
      " ",
    ),
  data_model:
    "identity type schema nullability requiredness default absence_semantics enum_domain uniqueness cardinality ownership provenance lineage mutability lifecycle unit precision scale rounding format encoding normalization ordering comparison invariant validation_boundary sensitivity retention serialization".split(
      " ",
    ),
  operation_workflow:
    "trigger initiator target precondition input guard ordered_step state_transition synchronous_effect asynchronous_effect output postcondition partial_success cancellation replacement compensation feedback audit_event forbidden_effect".split(
      " ",
    ),
  state_machine:
    "state initial_state terminal_state transition trigger guard action emitted_effect illegal_transition compound_state concurrent_state precedence reentry interruption cancellation timeout stale_handling conflict_handling recovery restoration archive_delete".split(
      " ",
    ),
  temporal_scheduling:
    "clock_source monotonicity timezone calendar dst_gap dst_fold clock_skew timestamp effective_boundary expiry_boundary interval_inclusivity schedule recurrence grace_period debounce throttle ordering lateness timeout lease retry_timing test_clock".split(
      " ",
    ),
  input_validation:
    "source type requiredness default absence_semantics accepted_range grammar unit encoding normalization canonicalization cross_field_rule validation_order validation_location duplicate_handling replay_handling size_limit rate_limit malformed_case adversarial_case error_identity feedback lossless_recovery".split(
      " ",
    ),
  output_error:
    "schema ordering format provenance freshness pagination streaming success_variant empty_variant partial_variant stale_variant degraded_variant error_variant error_code retryability feedback correlation_identity redaction reconciliation recovery".split(
      " ",
    ),
  api_protocol:
    "operation_identity transport authentication authorization parameter header request_body serialization content_negotiation response_variant error_variant status_code pagination filtering sorting idempotency rate_limit quota timeout retry callback_webhook version_negotiation deprecation compatibility".split(
      " ",
    ),
  event_message_job:
    "producer consumer schema version partition_routing_key correlation causation ordering delivery_guarantee acknowledgement deduplication idempotency retry_backoff timeout dead_letter replay retention backpressure poison_message cancellation schedule observable_completion".split(
      " ",
    ),
  persistence_cache_search:
    "canonical_owner schema key index query ordering transaction_boundary persistence eviction freshness invalidation replication archive retention deletion tombstone import_export backup_participation tokenization ranking filter pagination rebuild reconciliation".split(
      " ",
    ),
  transaction_consistency_concurrency_idempotency:
    "atomicity isolation consistency_model durability read_visibility write_visibility lock_lease optimistic_conflict pessimistic_conflict race_interleaving ordering causality duplicate_handling replay_handling idempotency_scope idempotency_key_lifetime retry_safety lost_update_prevention partial_commit compensation convergence".split(
      " ",
    ),
  fault_degradation_recovery:
    "fault_class detection timeout_budget retry_eligibility retry_schedule jitter retry_exhaustion circuit_breaker bulkhead fallback degraded_result cancellation cleanup compensation feedback recovery_trigger restoration_point reconciliation data_loss_prevention duplicate_effect_prevention".split(
      " ",
    ),
  backup_restore_disaster_recovery:
    "backup_scope frequency consistency_point encryption retention restore_procedure restore_verification rpo rto regional_disaster dependency_disaster failover failback replay reconciliation ownership drill_evidence".split(
      " ",
    ),
  configuration_feature_flag_secret:
    "schema type requiredness safe_default scope environment_precedence tenant_precedence override_rule conflict_rule validation reload_restart rollout cohort_assignment kill_switch expiry cleanup audit protected_representation rotation failure_behavior".split(
      " ",
    ),
  compatibility_migration_rollout:
    "supported_version backward_compatibility forward_compatibility mixed_version migration backfill validation dual_read dual_write cutover canary phased_rollout downgrade rollback irreversible_boundary cleanup deprecation data_reconciliation failure_recovery".split(
      " ",
    ),
  performance_capacity_cost:
    "journey workload_model dataset_cardinality payload concurrency warm_cold_state latency_percentile deadline throughput queue_limit backpressure_limit resource_budget saturation scaling cost_boundary quota_boundary benchmark_environment measurement_window statistical_method tolerance".split(
      " ",
    ),
  reliability_slo:
    "service_indicator measurement_point population exclusion target window availability correctness durability freshness continuity error_budget dependency_assumption degraded_expectation alert_relationship recovery_response".split(
      " ",
    ),
  security:
    "asset threat trust_boundary authentication identity_proofing authorization least_privilege tenant_isolation session_lifecycle token_lifecycle mfa account_recovery secret_rotation key_rotation transport_encryption at_rest_encryption integrity input_defense output_defense audit rate_limit abuse_case supply_chain_integrity vulnerability_handling incident_response".split(
      " ",
    ),
  privacy:
    "classification purpose lawful_authority consent preference minimization collection sharing lineage processor residency retention access_right correction_right portability_right deletion_right derived_data_effect redaction pseudonymization logging_restriction incident_handling policy_version".split(
      " ",
    ),
  safety_compliance:
    "hazard prohibited_outcome jurisdiction policy_version risk_control safe_state human_approval four_eyes irreversibility confirmation cancellation emergency_stop audit accountability expert_authority incident_escalation residual_risk".split(
      " ",
    ),
  observability:
    "log metric trace audit_event dimension unit correlation causation sampling aggregation redaction retention ownership health readiness liveness alert_condition alert_threshold alert_window alert_deduplication alert_routing alert_escalation dashboard runbook_diagnosis runbook_mitigation runbook_recovery".split(
      " ",
    ),
  deployment_topology:
    "environment region zone topology replica dependency_direction configuration_injection secret_injection artifact_identity artifact_provenance startup readiness liveness shutdown migration_order rollout rollback drain maintenance autoscaling health_probe operational_owner post_deploy_verification".split(
      " ",
    ),
  external_integration:
    "provider_protocol_identity capability version authentication region data_boundary quota rate_limit license commercial_constraint request_contract callback_contract timeout retry idempotency outage degradation side_effect_observation reconciliation sandbox_production_difference external_confirmation".split(
      " ",
    ),
  notification_file_media:
    "audience channel template localization trigger priority quiet_hours cadence deduplication delivery_receipt retry unsubscribe file_type mime size dimensions duration codec metadata scan_quarantine upload_resume transformation storage signed_access fallback deletion accessibility_alternative".split(
      " ",
    ),
  localization:
    "locale fallback language script unicode_normalization encoding collation case_sensitivity accent_sensitivity segmentation plural_rule grammar_rule timezone calendar date_format number_format currency exchange_rate_source measurement_unit conversion decimal_precision rounding locale_invariant_identifier".split(
      " ",
    ),
  commercial_billing:
    "product_plan entitlement price effective_version meter_source aggregation currency tax jurisdiction precision rounding proration discount quota invoice payment_state retry refund dispute idempotency reconciliation audit processor_confirmation".split(
      " ",
    ),
  hardware_sensor:
    "model firmware capability_discovery permission unit range resolution calibration sampling orientation coordinate_frame latency buffering connectivity power thermal storage_limit disconnect degradation actuator_safety simulation_limit physical_confirmation".split(
      " ",
    ),
  ai_ml:
    "model version prompt_contract tool_contract input_schema output_schema context_source grounding_source stochastic_control confidence abstention safety_boundary policy_boundary bias_criterion quality_criterion explainability human_review intervention evaluation_population tolerance reproducibility drift_monitoring fallback privacy latency quota cost".split(
      " ",
    ),
  architecture_ownership:
    "owner source_of_truth extension_point dependency_direction interface input_boundary output_boundary state_boundary persistence_boundary lifecycle_boundary failure_boundary recovery compatibility migration selected_design rejected_alternative future_change_challenge technical_debt forbidden_bypass conformance_check".split(
      " ",
    ),
};

export function isCustomSemanticFactName(value: string): boolean {
  return /^custom\.[a-z0-9][a-z0-9._-]*$/u.test(value);
}

export function isAtomicSemanticFactAtom(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  const aggregateLabel =
    /^(?:all|any|every|multiple|various)[._:-].*(?:catalog|states?|modes?|variants?|cases?|values?|conditions?)$/u.test(
      normalized,
    ) || /^(?:all|any|every|multiple|various)[._:-]\d+[._:-]/u.test(normalized);
  return (
    /^[a-z0-9][a-z0-9._:-]*$/u.test(value) &&
    !aggregateLabel &&
    ![
      "all",
      "any",
      "every",
      "default",
      "various",
      "multiple",
      "all-states",
      "all_states",
      "*",
    ].includes(normalized)
  );
}
