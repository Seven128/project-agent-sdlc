import type { EvidenceCapabilityV2 } from "./long-task-delivery-types.js";
import { semanticFactClosureInvalid } from "./long-task-semantic-fact-closure-primitives.js";
import {
  isCustomSemanticFactName,
  SEMANTIC_FACT_PROOF_METHODS,
  SEMANTIC_FACT_STANDARD_PROPERTIES,
} from "./semantic-fact-catalog.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

const STANDARD_PROPERTY_CATALOG_SHA256 =
  "dd71ac2bb67144bd0e9df30c69a0231cc6ba71a72cd202a7e400cd59a3ab7d02";

const METHOD_CAPABILITY_FLOORS: Readonly<
  Record<
    (typeof SEMANTIC_FACT_PROOF_METHODS)[number],
    readonly EvidenceCapabilityV2[]
  >
> = {
  exact_value: ["semantic_fact"],
  schema_contract: ["semantic_fact"],
  decision_table: ["semantic_fact"],
  formula_evaluation: ["semantic_fact"],
  invariant: ["semantic_fact"],
  transition_trace: ["semantic_fact", "interaction_trace", "state_delta"],
  sequence_trace: ["semantic_fact", "interaction_trace"],
  durable_roundtrip: ["semantic_fact", "data_state", "durable_readback"],
  boundary_invocation: [
    "semantic_fact",
    "boundary_invocation",
    "actual_provenance",
  ],
  external_side_effect: [
    "semantic_fact",
    "boundary_invocation",
    "actual_provenance",
    "external_side_effect",
    "state_delta",
  ],
  population_set_equality: ["semantic_fact", "population_coverage"],
  concurrency_schedule: ["semantic_fact", "input_variation", "state_delta"],
  idempotency_repetition: ["semantic_fact", "input_variation", "state_delta"],
  fault_injection: ["semantic_fact", "failure_injection"],
  recovery_drill: ["semantic_fact", "failure_injection", "recovery"],
  migration: ["semantic_fact", "data_state", "durable_readback"],
  compatibility: ["semantic_fact", "input_variation"],
  performance: ["semantic_fact", "target_runtime"],
  capacity: ["semantic_fact", "target_runtime"],
  security: ["semantic_fact", "target_runtime", "data_state"],
  privacy: ["semantic_fact", "data_state"],
  audit: ["semantic_fact", "data_state", "durable_readback"],
  observability: ["semantic_fact", "target_runtime"],
  deployment: ["semantic_fact", "presence", "target_runtime"],
  implementation_structure: ["semantic_fact", "presence"],
};

const PROPERTY_CLASS_CAPABILITIES = {
  durable: ["data_state", "durable_readback"],
  boundary: ["boundary_invocation", "actual_provenance"],
  identity: ["distinct_identity", "data_state", "target_runtime"],
  transition: ["interaction_trace", "state_delta"],
  recovery: ["failure_injection", "recovery"],
  population: ["population_coverage"],
  visual: ["visual_render", "design_conformance"],
} as const satisfies Readonly<Record<string, readonly EvidenceCapabilityV2[]>>;

const PROPERTY_CLASSES: Readonly<Record<string, ReadonlySet<string>>> = {
  durable: new Set([
    "persistence_cache_search.persistence",
    "persistence_cache_search.archive",
    "persistence_cache_search.retention",
    "persistence_cache_search.deletion",
    "transaction_consistency_concurrency_idempotency.durability",
    "reliability_slo.durability",
    "event_message_job.retention",
    "backup_restore_disaster_recovery.backup_scope",
    "commercial_billing.audit",
  ]),
  boundary: new Set([
    "api_protocol.operation_identity",
    "api_protocol.request_body",
    "api_protocol.callback_webhook",
    "external_integration.provider_protocol_identity",
    "external_integration.request_contract",
    "external_integration.callback_contract",
    "external_integration.side_effect_observation",
    "commercial_billing.processor_confirmation",
  ]),
  identity: new Set([
    "actor_role_tenant_entitlement.identity",
    "actor_role_tenant_entitlement.impersonation",
    "actor_role_tenant_entitlement.isolation_boundary",
    "data_model.identity",
    "security.authentication",
    "security.identity_proofing",
    "security.authorization",
    "security.tenant_isolation",
    "api_protocol.authentication",
    "api_protocol.authorization",
  ]),
  transition: new Set([
    "operation_workflow.trigger",
    "operation_workflow.ordered_step",
    "operation_workflow.state_transition",
    "operation_workflow.synchronous_effect",
    "operation_workflow.asynchronous_effect",
    "state_machine.transition",
    "state_machine.illegal_transition",
    "state_machine.reentry",
    "state_machine.interruption",
    "commercial_billing.payment_state",
  ]),
  recovery: new Set([
    "state_machine.recovery",
    "state_machine.restoration",
    "input_validation.lossless_recovery",
    "output_error.recovery",
    "fault_degradation_recovery.recovery_trigger",
    "fault_degradation_recovery.restoration_point",
    "fault_degradation_recovery.data_loss_prevention",
    "backup_restore_disaster_recovery.restore_procedure",
    "backup_restore_disaster_recovery.restore_verification",
    "backup_restore_disaster_recovery.drill_evidence",
    "compatibility_migration_rollout.failure_recovery",
    "reliability_slo.recovery_response",
    "architecture_ownership.recovery",
  ]),
  population: new Set([
    "data_model.cardinality",
    "performance_capacity_cost.dataset_cardinality",
    "reliability_slo.population",
    "ai_ml.evaluation_population",
  ]),
  visual: new Set([
    "architecture_ownership.selected_design",
    "notification_file_media.dimensions",
    "notification_file_media.accessibility_alternative",
  ]),
};

export function semanticFactCustomPropertyHasClosedStandardProfile(
  property: SemanticFactManifestV1["property_dispositions"][number],
): boolean {
  return (
    !property.standard &&
    isCustomSemanticFactName(property.property) &&
    property.required_methods.length > 0 &&
    property.required_methods.every((method) =>
      Object.hasOwn(METHOD_CAPABILITY_FLOORS, method),
    )
  );
}

export function validateSemanticFactProofProfileClosure(
  manifest: SemanticFactManifestV1,
): void {
  const digest = sha256Hex(
    canonicalValueJson(SEMANTIC_FACT_STANDARD_PROPERTIES),
  );
  if (digest !== STANDARD_PROPERTY_CATALOG_SHA256)
    semanticFactClosureInvalid(
      "standard_property_profile_catalog_changed",
      `${digest}:${STANDARD_PROPERTY_CATALOG_SHA256}`,
    );
  if (
    Object.keys(METHOD_CAPABILITY_FLOORS).length !==
      SEMANTIC_FACT_PROOF_METHODS.length ||
    SEMANTIC_FACT_PROOF_METHODS.some(
      (method) => !Object.hasOwn(METHOD_CAPABILITY_FLOORS, method),
    )
  )
    semanticFactClosureInvalid(
      "standard_proof_method_profile_incomplete",
      SEMANTIC_FACT_PROOF_METHODS.join(","),
    );
  const families = new Map(
    manifest.family_dispositions.map((family) => [family.key, family.family]),
  );
  for (const property of manifest.property_dispositions) {
    const family = families.get(property.family_ref);
    if (!family)
      semanticFactClosureInvalid(
        "proof_profile_property_family_unknown",
        property.key,
      );
    const catalog =
      SEMANTIC_FACT_STANDARD_PROPERTIES[
        family as keyof typeof SEMANTIC_FACT_STANDARD_PROPERTIES
      ];
    const catalogStandard = Boolean(catalog?.includes(property.property));
    if (property.standard !== catalogStandard)
      semanticFactClosureInvalid(
        "proof_profile_property_standard_mismatch",
        `${property.key}:${family}.${property.property}`,
      );
  }
  const known = new Set(
    Object.entries(SEMANTIC_FACT_STANDARD_PROPERTIES).flatMap(
      ([family, properties]) =>
        properties.map((property) => `${family}.${property}`),
    ),
  );
  for (const [className, members] of Object.entries(PROPERTY_CLASSES))
    for (const member of members)
      if (!known.has(member))
        semanticFactClosureInvalid(
          "proof_profile_property_member_unknown",
          `${className}:${member}`,
        );
}

export function semanticFactProofCapabilityFloor(
  manifest: SemanticFactManifestV1,
  fact: SemanticFactManifestV1["facts"][number],
  proof: SemanticFactManifestV1["proof_obligations"][number],
): Set<EvidenceCapabilityV2> {
  const property = manifest.property_dispositions.find(
    (row) => row.key === fact.property_ref,
  );
  if (!property)
    semanticFactClosureInvalid(
      "proof_profile_fact_property_unknown",
      `${fact.key}:${fact.property_ref}`,
    );
  const standardMethod = Object.hasOwn(METHOD_CAPABILITY_FLOORS, proof.method);
  if (
    proof.authority === "machine" &&
    (!standardMethod ||
      (!property.standard &&
        !semanticFactCustomPropertyHasClosedStandardProfile(property)))
  )
    semanticFactClosureInvalid(
      "semantic_fact_custom_machine_authority_forbidden",
      `${proof.key}:${property.property}:${proof.method}`,
    );
  const result = new Set<EvidenceCapabilityV2>(["semantic_fact"]);
  if (standardMethod)
    for (const capability of METHOD_CAPABILITY_FLOORS[
      proof.method as keyof typeof METHOD_CAPABILITY_FLOORS
    ])
      result.add(capability);
  for (const capability of property.required_evidence_capabilities)
    result.add(capability);
  const family = manifest.family_dispositions.find(
    (row) => row.key === fact.family_ref,
  )?.family;
  const propertyIdentity = `${family}.${property.property}`;
  for (const [className, members] of Object.entries(PROPERTY_CLASSES))
    if (members.has(propertyIdentity))
      for (const capability of PROPERTY_CLASS_CAPABILITIES[
        className as keyof typeof PROPERTY_CLASS_CAPABILITIES
      ])
        result.add(capability);
  if (fact.observation_scope === "implementation_structure")
    result.add("presence");
  if (fact.observation_scope === "data_boundary") result.add("data_state");
  if (fact.observation_scope === "external_boundary") {
    result.add("boundary_invocation");
    result.add("actual_provenance");
  }
  if (fact.quantifier.kind !== "one") result.add("population_coverage");
  return result;
}
