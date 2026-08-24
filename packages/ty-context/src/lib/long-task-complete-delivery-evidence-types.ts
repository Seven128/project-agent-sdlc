import type { EvidenceCapabilityV2 } from "./long-task-semantic-contract-types.js";

interface CompleteDeliveryEvidenceBaseV2 {
  assertion_key: string;
  capability: EvidenceCapabilityV2;
}

export interface ActualProvenanceEvidenceV2 extends CompleteDeliveryEvidenceBaseV2 {
  capability: "actual_provenance";
  source_kind: "product_runtime" | "observer_runtime" | "durable_store";
  source_ref: string;
  actual_sha256: string;
}

export interface DistinctIdentityEvidenceV2 extends CompleteDeliveryEvidenceBaseV2 {
  capability: "distinct_identity";
  identities: Array<{ identity_ref: string; data_state_sha256: string }>;
}

export interface DataStateEvidenceV2 extends CompleteDeliveryEvidenceBaseV2 {
  capability: "data_state";
  state_ref: string;
  state_sha256: string;
  read_session_id: string;
}

export interface PopulationCoverageEvidenceV2 extends CompleteDeliveryEvidenceBaseV2 {
  capability: "population_coverage";
  universe_sha256: string;
  observed_sha256: string;
  excluded_sha256: string;
  set_equality: true;
}

export interface RecoveryEvidenceV2 extends CompleteDeliveryEvidenceBaseV2 {
  capability: "recovery";
  failure_session_id: string;
  recovery_session_id: string;
  recovered_state_sha256: string;
}
