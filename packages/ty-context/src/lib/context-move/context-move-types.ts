import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";
import type { ContextFootprintState } from "../context-mutation/mutation-types.js";
import type { ContextMoveLiteralMatch } from "./context-move-literal-scan.js";

export interface ContextMoveInput {
  project_root: string;
  from_path: string;
  to_path: string;
  apply?: boolean;
}

export interface ContextMoveFileProjection {
  path: string;
  action: "create" | "update" | "delete";
  before_sha256: string | null;
  after_sha256: string | null;
  before_bytes: number;
  after_bytes: number;
}

export interface ContextMoveResult {
  schema_version: 1;
  operation: "move";
  applied: boolean;
  can_apply: boolean;
  from_path: string;
  to_path: string;
  owner: {
    source: "area" | "context";
    role: ContextRole;
    read_policy: string | null;
  };
  directories_created: string[];
  files: ContextMoveFileProjection[];
  manifest: {
    path: "project_context/context.toml";
    replacements: Array<{
      kind: "owner" | "default_child";
      previous_literal: string;
      next_literal: string;
    }>;
  };
  links: {
    files_changed: string[];
    references_updated: Array<{
      source_path: string;
      line: number;
      column: number;
      previous_destination: string;
      next_destination: string;
    }>;
  };
  unresolved: ContextMoveLiteralMatch[];
  scan: {
    complete: boolean;
    files_scanned: number;
    bytes_scanned: number;
    limits_exceeded: string[];
  };
  default_footprint: {
    changed: boolean;
    before: ContextFootprintState;
    after: ContextFootprintState;
    added: string[];
    removed: string[];
  };
  catalog: { before_identity: string; after_identity: string };
  diagnostics: string[];
  transaction: {
    id: string;
    state: "dry-run" | "committed";
    journal_present: false;
  };
}
