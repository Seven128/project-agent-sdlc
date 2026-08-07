import { DESIGN_RESOURCE_PATCH_SCHEMA } from "./design-resource-recovery-schema.js";
import type {
  DesignResourceEolPolicy,
  DesignResourceTextEncoding,
} from "./design-resource-recovery-types.js";

export interface DesignResourceTextSemanticProjection {
  semantic_path: string[];
  start_offset: number;
  end_offset: number;
}

export interface DesignResourcePatchSemanticBinding {
  delta_id: string;
  target_key: string;
  before_semantics_sha256: string;
  after_semantics_sha256: string;
  before_text_projection: DesignResourceTextSemanticProjection | null;
  after_text_projection: DesignResourceTextSemanticProjection | null;
}

export interface DesignResourceExactPatchOperation {
  operation_id: string;
  target_keys: string[];
  delta_ids: string[];
  before_text: string;
  after_text: string;
  before_text_sha256: string;
  after_text_sha256: string;
  semantic_bindings: DesignResourcePatchSemanticBinding[];
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
