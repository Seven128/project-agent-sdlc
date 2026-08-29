import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";
import type { ContextFootprintState } from "../context-mutation/mutation-types.js";

export interface ContextRegisterInput {
  project_root: string;
  context_path: string;
  role: string;
  read_policy?: string;
  read_when?: string;
  triggers?: string[];
  default_children?: string[];
  apply?: boolean;
}

export interface ContextRegisterResult {
  schema_version: 1;
  operation: "register";
  applied: boolean;
  path: string;
  role: ContextRole;
  read_policy: "default" | "on-demand";
  manifest: {
    path: "project_context/context.toml";
    before_sha256: string;
    after_sha256: string;
    before_bytes: number;
    after_bytes: number;
    bytes_delta: number;
    diff: string;
  };
  default_footprint: {
    changed: boolean;
    before: ContextFootprintState;
    after: ContextFootprintState;
    added: string[];
    removed: string[];
  };
  catalog: {
    before_identity: string;
    after_identity: string;
  };
  diagnostics: string[];
  transaction: {
    id: string;
    state: "dry-run" | "committed";
    journal_present: false;
  };
}
