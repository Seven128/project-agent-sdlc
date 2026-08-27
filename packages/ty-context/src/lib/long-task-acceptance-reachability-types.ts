import type { CompiledClaimsV2 } from "./long-task-claims.js";
import type {
  CompiledCheckV2,
  DeliveryContractV2,
  EvidenceCapabilityV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export type AcceptanceReachabilityStatusV1 =
  "machine_admitted" | "external_fulfillable" | "unreachable";

export interface AcceptanceObligationReachabilityV1 {
  obligation_ref: string;
  source_obligation_ref: string;
  outcome_key: string | null;
  claim_ref: string;
  applicability_ref: string;
  fact_ref: string | null;
  proof_ref: string | null;
  method: string;
  proof_surface: ProofSurface;
  required_evidence_capabilities: EvidenceCapabilityV2[];
  authority: "machine" | "external_confirmation" | "none";
  confirmation_ref: string | null;
  status: AcceptanceReachabilityStatusV1;
  reason: string | null;
  session_group: string | null;
}

export interface AcceptanceReachabilityV1 {
  completion_authority: DeliveryContractV2["task"]["target_profile"]["completion_authority"];
  total: number;
  machine_admitted: number;
  external_fulfillable: number;
  unreachable: number;
  obligations: AcceptanceObligationReachabilityV1[];
  effective_external_routes: EffectiveExternalObligationV1[];
}

export interface MachineAuthorityRouteV1 {
  check_key: string;
  assertion_key: string;
  proof_surface: ProofSurface;
  method?: string;
  required_evidence_capabilities: EvidenceCapabilityV2[];
  semantic_identity?: string | null;
}

export interface ExternalAuthorityRouteV1 {
  confirmation_ref: string;
  obligation_key?: string;
  proof_surface: ProofSurface;
  method?: string;
  required_evidence_capabilities?: EvidenceCapabilityV2[];
  advisory_to_machine?: boolean;
  authority_ambiguous?: boolean;
  authority_unresolved?: boolean;
  expected_authority_ref?: string;
  semantic_identity?: string | null;
}

export interface ObligationAuthorityCandidatesV1 {
  source_obligation_ref: string;
  proof_surface_selection?: "required" | "optional";
  machine_candidates: MachineAuthorityRouteV1[];
  external_candidates: ExternalAuthorityRouteV1[];
}

export interface ExpectedExternalObligation {
  source_obligation_ref: string;
  outcome_key: string | null;
  claim_ref: string;
  local_claim_ref: string;
  applicability_ref: string;
  fact_ref: string | null;
  proof_ref: string | null;
  method: string;
  proof_surface: ProofSurface;
  evidence_capabilities: EvidenceCapabilityV2[];
  expected_authority_ref: string;
  confirmation_ref: string;
  required_polarity: "positive" | "negative";
  completion_role: "blocking" | "advisory";
  acceptance_effect: "required" | "none";
  semantic_identity: string | null;
  machine_obligation_ref: string | null;
}

export interface EffectiveExternalObligationV1 extends AcceptanceObligationReachabilityV1 {
  local_claim_ref: string;
  target_ref: string;
  expected_authority_ref: string;
  required_polarity: "positive" | "negative";
  completion_role: "blocking" | "advisory";
  acceptance_effect: "required" | "none";
  semantic_identity: string;
  machine_obligation_ref: string | null;
}

export interface AcceptanceReachabilityInputV1 {
  contract: DeliveryContractV2;
  claims: CompiledClaimsV2;
  manifest: SemanticFactManifestV1;
  compiled_checks: CompiledCheckV2[];
}
