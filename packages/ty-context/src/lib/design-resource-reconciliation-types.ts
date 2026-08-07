import { DESIGN_RESOURCE_RECOVERY_AUDIT_SCHEMA } from "./design-resource-recovery-schema.js";
import type {
  DesignResourceAuthorityIdentity,
  DesignResourceDecisionAuthority,
  DesignResourceDecisionOrigin,
  DesignResourceDecisionStatus,
  DesignResourceFinalDisposition,
  DesignResourceProviderIdentity,
  DesignResourceSemanticKind,
} from "./design-resource-recovery-types.js";

export interface DesignResourceReconciliationAudit {
  schema_version: typeof DESIGN_RESOURCE_RECOVERY_AUDIT_SCHEMA;
  session_id: string;
  base_raw_byte_digest: string;
  design_authority: DesignResourceAuthorityIdentity;
  provider_run: DesignResourceProviderIdentity;
  resource_identities: Array<{ key: string; raw_byte_digest: string }>;
  writeback_target_raw_byte_digest?: string;
  accepted_delta_ids: string[];
  rejected_delta_ids: string[];
  unresolved_delta_ids: string[];
  changed_keys: string[];
  explicitly_unchanged: Array<{
    key: string;
    verdict: "preserved" | "changed" | "unresolved";
    resource_refs: string[];
    condition_refs: string[];
    basis_source_refs: string[];
  }>;
  requirements_to_resource: Array<{
    key: string;
    verdict: "covered" | "missing" | "distorted" | "unsupported" | "unresolved";
    delta_ids: string[];
    resource_refs: string[];
    condition_refs: string[];
  }>;
  resource_to_requirements: Array<{
    key: string;
    resource_ref: string;
    status: DesignResourceDecisionStatus;
    semantic_kind: DesignResourceSemanticKind;
    delta_ids: string[];
    condition_refs: string[];
    requirement_bindings: Array<{
      binding_id: string;
      requirement_key: string;
      delta_id: string;
      origin: DesignResourceDecisionOrigin;
      decision_authority: DesignResourceDecisionAuthority;
      source_refs: string[];
      final_disposition: DesignResourceFinalDisposition;
    }>;
  }>;
  unexpected_blast_radius: Array<{
    key: string;
    verdict: "expected" | "unexpected" | "unresolved";
  }>;
  inactive_delta_leakage: Array<{
    delta_id: string;
    inactive_reason: "rejected" | "unresolved" | "superseded";
    leaked: boolean;
  }>;
}

export interface DesignResourceReconciliationResult {
  status: "reconciliation-balanced" | "blocked";
  findings: string[];
}
