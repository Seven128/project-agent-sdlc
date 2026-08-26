import type {
  EvidenceCapabilityV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import type { SemanticFactLocatedValueV1 } from "./semantic-fact-base-types.js";
import type {
  SemanticFactEnvironmentV1,
  SemanticFactOracleV1,
  SemanticFactProofObligationV1,
} from "./semantic-fact-proof-types.js";

export interface SemanticFactManifestRefV2 {
  key: string;
  source_path: string;
  sha256: string;
}

export interface SemanticFactBindingV2 {
  fact_ref: string;
  fact_revision_digest?: string;
  claim_ref: string;
  applicability_ref: string;
  required_polarity?: "positive" | "negative";
}

export type SemanticFactProofBindingV2 =
  | {
      proof_ref: string;
      obligation_revision_digest?: string;
      fact_ref: string;
      method: string;
      proof_surface: ProofSurface;
      evidence_capabilities: EvidenceCapabilityV2[];
      authority: "machine";
      check_ref: string;
      assertion_ref: string;
    }
  | {
      proof_ref: string;
      obligation_revision_digest?: string;
      fact_ref: string;
      method: string;
      proof_surface: ProofSurface;
      evidence_capabilities: EvidenceCapabilityV2[];
      authority: "external_confirmation";
      confirmation_ref: string;
    };

export interface SemanticFactOutcomeBindingsV2 {
  manifest_ref: string;
  facts: SemanticFactBindingV2[];
  proofs: SemanticFactProofBindingV2[];
}

export interface SemanticFactGlobalObligationBindingV2 {
  claim_ref: string;
  applicability_ref: string;
  target_ref: string;
  outcome_ref: string;
  fact_ref: string;
  proof_ref: string;
  method: string;
  required_polarity: "positive" | "negative";
}

/**
 * Links Global Claims to exact obligations that remain owned by the existing
 * Outcome-scoped Semantic Fact/proof bindings. This is a conservation
 * projection, not a second Fact inventory or completion authority.
 */
export interface SemanticFactGlobalBindingsV2 {
  manifest_ref: string;
  obligations: SemanticFactGlobalObligationBindingV2[];
}

export interface SemanticFactExpectationV2 {
  manifest_ref: string;
  manifest_sha256: string;
  fact_key: string;
  fact_revision_digest: string;
  obligation_key: string;
  obligation_revision_digest: string;
  revision_identity_required: boolean;
  fact_ref: string;
  proof_ref: string;
  method: string;
  check_ref: string;
  assertion_ref: string;
  outcome_ref: string;
  claim_ref: string;
  applicability_ref: string;
  subject_ref: string;
  condition_ref: string;
  property_ref: string;
  observation_sensitivity: "plain" | "protected";
  expected: SemanticFactLocatedValueV1;
  comparison: SemanticFactProofObligationV1["comparison"];
  oracle: SemanticFactOracleV1;
  environment: SemanticFactEnvironmentV1;
  observer_refs: string[];
}
