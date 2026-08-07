import {
  DESIGN_RESOURCE_AUTHORITY_PROJECTION_SCHEMA,
  DESIGN_RESOURCE_RECOVERY_INPUT_SCHEMA,
  DESIGN_RESOURCE_RECOVERY_SCHEMA,
} from "./design-resource-recovery-schema.js";
import type {
  DesignResourceRecoveryWriteback,
  DesignResourceWritebackInput,
} from "./design-resource-recovery-patch-types.js";
import type { SourceItemKind } from "./long-task-source-authority-types.js";

export type DesignResourceDecisionOrigin =
  | "user-direct"
  | "necessary-derived"
  | "repository-evidence-backed"
  | "provider-suggested";

export type DesignResourceDecisionStatus =
  "accepted" | "rejected" | "unresolved";

export type DesignResourceDecisionAuthority =
  "explicit-user" | "none" | `delegated:${string}`;

export type DesignResourceSemanticKind =
  | "exact-visual"
  | "product"
  | "business"
  | "permission"
  | "data"
  | "algorithm"
  | "commercial"
  | "safety-security"
  | "technical";

export type DesignResourceTextEncoding =
  "utf8" | "utf8-bom" | "utf16le" | "utf16be";

export type DesignResourceEolPolicy = "none" | "lf" | "crlf" | "cr" | "mixed";

export interface DesignResourceRecoveryBaseInput {
  locator: string;
  raw_byte_digest: string;
  materialization:
    | { kind: "repository-source" }
    | { kind: "authorized-recovery-snapshot"; authorization_ref: string };
  scope_ceiling: string;
  in_scope_keys: string[];
  explicitly_excluded_keys: string[];
}

export interface DesignResourceRecoveryBase extends DesignResourceRecoveryBaseInput {
  encoding: DesignResourceTextEncoding;
  eol_policy: DesignResourceEolPolicy;
}

export interface DesignResourceDelegation {
  key: string;
  source_ref: string;
  allowed_origins: DesignResourceDecisionOrigin[];
  allowed_target_keys: string[];
  allowed_semantic_kinds: DesignResourceSemanticKind[];
}

export type DesignResourceAuthorityProjection =
  | {
      schema_version: typeof DESIGN_RESOURCE_AUTHORITY_PROJECTION_SCHEMA;
      mode: "explicit-user";
      target_keys: string[];
      semantic_kinds: DesignResourceSemanticKind[];
      allowed_origins: DesignResourceDecisionOrigin[];
      meaning_sha256: string;
    }
  | {
      schema_version: typeof DESIGN_RESOURCE_AUTHORITY_PROJECTION_SCHEMA;
      mode: "delegation";
      delegation_key: string;
      allowed_target_keys: string[];
      allowed_semantic_kinds: DesignResourceSemanticKind[];
      allowed_origins: DesignResourceDecisionOrigin[];
    };

export interface DesignResourceAuthoritySourceItem {
  source_ref: string;
  locator: string;
  raw_byte_digest: string;
  source_item_key: string;
  source_item_kind: SourceItemKind;
  source_item_text_sha256: string;
}

export interface DesignResourceDelta {
  delta_id: string;
  sequence: number;
  supersedes: string[];
  proposes_replacement_of: string[];
  operation: "add" | "replace" | "remove" | "preserve";
  semantic_kind: DesignResourceSemanticKind;
  target_keys: string[];
  before_semantics: unknown;
  after_semantics: unknown;
  origin: DesignResourceDecisionOrigin;
  decision_authority: DesignResourceDecisionAuthority;
  evidence_refs: string[];
  source_refs: string[];
  explicitly_unchanged_keys: string[];
  status: DesignResourceDecisionStatus;
}

export type DesignResourceAuthorityIdentity =
  | {
      kind: "repository-file" | "external-immutable";
      locator: string;
      raw_byte_digest: string;
    }
  | { kind: "not-applicable"; rationale: string };

export interface DesignResourceProviderIdentity {
  key: string;
  locator: string;
  immutable_identity: string;
}

export interface DesignResourceProviderResourceIdentity extends DesignResourceProviderIdentity {
  raw_byte_digest: string;
}

export interface DesignResourceProviderReferences {
  project: DesignResourceProviderIdentity;
  run: DesignResourceProviderIdentity;
  resources: DesignResourceProviderResourceIdentity[];
}

export interface DesignResourceSelectedResourceBinding {
  key: string;
  identity_kind:
    "repository-snapshot" | "formal-handoff-target" | "external-immutable";
  locator: string;
  raw_byte_digest: string;
  condition_refs: string[];
}

export interface DesignResourceAuditExpectations {
  changed: Array<{
    key: string;
    delta_ids: string[];
    resource_refs: string[];
    condition_refs: string[];
  }>;
  unchanged: Array<{
    key: string;
    resource_refs: string[];
    condition_refs: string[];
    basis_source_refs: string[];
  }>;
  resource_decisions: Array<{
    key: string;
    resource_ref: string;
    semantic_kind: DesignResourceSemanticKind;
    bindings: Array<{
      binding_id: string;
      delta_id: string;
      target_key: string;
    }>;
    condition_refs: string[];
    allowed_final_dispositions: Array<
      | "proposal-written"
      | "resource-owned-exact-visual"
      | "not-adopted"
      | "unresolved"
    >;
  }>;
  blast_radius: Array<{ key: string }>;
  inactive_delta_leakage: Array<{
    delta_id: string;
    reason: "rejected" | "unresolved" | "superseded";
  }>;
}

export interface DesignResourceRecoveryCreateInput {
  schema_version: typeof DESIGN_RESOURCE_RECOVERY_INPUT_SCHEMA;
  session_id: string;
  disclosure_review: {
    reviewed: true;
    contains_sensitive_raw_values: false;
  };
  base: DesignResourceRecoveryBaseInput;
  authority_sources: DesignResourceAuthoritySourceItem[];
  delegations: DesignResourceDelegation[];
  deltas: DesignResourceDelta[];
  decision_sets: {
    accepted_delta_ids: string[];
    rejected_delta_ids: string[];
    unresolved_delta_ids: string[];
  };
  audit_expectations: DesignResourceAuditExpectations;
  design_authority: DesignResourceAuthorityIdentity;
  provider: DesignResourceProviderReferences;
  selected_resource_bindings: DesignResourceSelectedResourceBinding[];
  writeback?: DesignResourceWritebackInput;
}

export interface DesignResourceRecoveryCheckpoint extends Omit<
  DesignResourceRecoveryCreateInput,
  "schema_version" | "base" | "writeback"
> {
  schema_version: typeof DESIGN_RESOURCE_RECOVERY_SCHEMA;
  owner: "ty-context-design-resource-recovery";
  base: DesignResourceRecoveryBase;
  writeback?: DesignResourceRecoveryWriteback;
}

export interface DesignResourceReplayProjection {
  status: "replayable";
  base: DesignResourceRecoveryBase;
  ordered_active_accepted_deltas: DesignResourceDelta[];
  rejected_deltas: DesignResourceDelta[];
  unresolved_deltas: DesignResourceDelta[];
  superseded_delta_ids: string[];
  explicitly_unchanged_keys: string[];
  design_authority: DesignResourceAuthorityIdentity;
  external_revalidation_required: string[];
}
