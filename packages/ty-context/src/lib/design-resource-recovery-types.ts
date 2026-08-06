import {
  DESIGN_RESOURCE_PATCH_SCHEMA,
  DESIGN_RESOURCE_RECOVERY_AUDIT_SCHEMA,
  DESIGN_RESOURCE_RECOVERY_INPUT_SCHEMA,
  DESIGN_RESOURCE_RECOVERY_SCHEMA,
} from "./design-resource-recovery-schema.js";

export type DesignResourceDecisionOrigin =
  | "user-direct"
  | "necessary-derived"
  | "repository-evidence-backed"
  | "provider-suggested";

export type DesignResourceDecisionStatus =
  "accepted" | "rejected" | "unresolved";

export type DesignResourceDecisionAuthority =
  "explicit-user" | "none" | `delegated:${string}`;

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
}

export interface DesignResourceDelta {
  delta_id: string;
  sequence: number;
  supersedes: string[];
  operation: "add" | "replace" | "remove" | "preserve";
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

export interface DesignResourceExactPatchOperation {
  operation_id: string;
  target_keys: string[];
  before_text: string;
  after_text: string;
  expected_occurrences: 1;
}

export interface DesignResourceExactPatch {
  schema_version: typeof DESIGN_RESOURCE_PATCH_SCHEMA;
  operations: DesignResourceExactPatchOperation[];
}

export interface DesignResourceWritebackInput {
  target_locator: string;
  pre_write_raw_byte_digest: string;
  patch: DesignResourceExactPatch;
  patch_identity: string;
  expected_post_write_raw_byte_digest: string;
  resource_identities: Array<{ key: string; raw_byte_digest: string }>;
  accepted_delta_ids: string[];
}

export interface DesignResourceRecoveryWriteback extends DesignResourceWritebackInput {
  target_encoding: DesignResourceTextEncoding;
  target_eol_policy: Exclude<DesignResourceEolPolicy, "mixed">;
}

export interface DesignResourceRecoveryCreateInput {
  schema_version: typeof DESIGN_RESOURCE_RECOVERY_INPUT_SCHEMA;
  session_id: string;
  disclosure_review: {
    reviewed: true;
    contains_sensitive_raw_values: false;
  };
  base: DesignResourceRecoveryBaseInput;
  delegations: DesignResourceDelegation[];
  deltas: DesignResourceDelta[];
  decision_sets: {
    accepted_delta_ids: string[];
    rejected_delta_ids: string[];
    unresolved_delta_ids: string[];
  };
  explicitly_unchanged_keys: string[];
  design_authority: DesignResourceAuthorityIdentity;
  provider: DesignResourceProviderReferences;
  selected_resource_keys: string[];
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

export interface DesignResourceReconciliationAudit {
  schema_version: typeof DESIGN_RESOURCE_RECOVERY_AUDIT_SCHEMA;
  session_id: string;
  base_raw_byte_digest: string;
  design_authority: DesignResourceAuthorityIdentity;
  provider_run: DesignResourceProviderIdentity;
  resource_identities: Array<{ key: string; raw_byte_digest: string }>;
  writeback_target_raw_byte_digest: string;
  accepted_delta_ids: string[];
  rejected_delta_ids: string[];
  unresolved_delta_ids: string[];
  changed_keys: string[];
  explicitly_unchanged: Array<{ key: string; preserved: boolean }>;
  requirements_to_resource: Array<{
    key: string;
    verdict: "covered" | "missing" | "distorted" | "unsupported";
    delta_ids: string[];
    resource_refs: string[];
  }>;
  resource_to_requirements: Array<{
    key: string;
    resource_ref: string;
    origin: DesignResourceDecisionOrigin;
    decision_authority: DesignResourceDecisionAuthority;
    status: DesignResourceDecisionStatus;
    written: boolean;
    requirement_keys: string[];
  }>;
  unexpected_blast_radius: Array<{
    key: string;
    verdict: "expected" | "unexpected";
  }>;
  rejected_or_unresolved_leakage: Array<{
    delta_id: string;
    leaked: boolean;
  }>;
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

export interface DesignResourceReconciliationResult {
  status: "balanced" | "blocked";
  findings: string[];
}
