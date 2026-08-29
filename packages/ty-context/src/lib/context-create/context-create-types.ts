import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";

export interface ContextCreateInput {
  project_root: string;
  context_path: string;
  role: string;
}

export interface ContextFootprintSnapshot {
  path_count: number;
  bytes: number;
}

export interface ContextCreateResult {
  schema_version: 1;
  path: string;
  role: ContextRole;
  created: true;
  registration: "unregistered";
  manifest_modified: false;
  bytes: number;
  default_footprint: {
    changed: false;
    before: ContextFootprintSnapshot;
    after: ContextFootprintSnapshot;
    added: [];
    removed: [];
    reason: string;
  };
  next_steps: string[];
}
