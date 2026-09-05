import type {
  CompiledObservationAuthorityV2,
  EvidenceCapabilityV2,
  ProofSurface,
} from "./long-task-delivery-types.js";
import type { DesignFactObligationDescriptorV1 } from "./long-task-design-obligation.js";

export interface CompiledDesignFactObligationDescriptorV1 extends DesignFactObligationDescriptorV1 {
  observation_authority: CompiledObservationAuthorityV2;
}

export type CompiledDesignFactObligationResolutionV1 =
  | {
      status: "resolved";
      descriptor: CompiledDesignFactObligationDescriptorV1;
    }
  | { status: "missing" }
  | { status: "ambiguous" };

export interface CompiledDesignObligationIdentity {
  obligation_ref?: string;
  source_obligation_ref?: string;
  outcome_key: string | null;
  claim_ref: string;
  applicability_ref: string;
  fact_ref: string | null;
  proof_ref: string | null;
  method: string;
  proof_surface: ProofSurface;
  confirmation_ref?: string | null;
  expected_authority_ref?: string;
  required_evidence_capabilities?: readonly EvidenceCapabilityV2[];
  evidence_capabilities?: readonly EvidenceCapabilityV2[];
}
