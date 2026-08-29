import type { CatalogDiagnostic } from "../context-catalog/catalog-types.js";
import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";
import type { DefaultContextSelectionReason } from "../context-catalog/catalog-default-footprint.js";
import type {
  ContextMarkdownReference,
  ContextStableKeyConflict,
  ContextStableKeyDeclaration,
} from "../context-markdown/context-markdown-types.js";
import type {
  ContextRouteAmbiguity,
  ContextRouteCandidate,
  ContextRouteUnresolved,
} from "../context-router/context-route-types.js";

export interface ContextInspectRoute {
  complete: boolean;
  catalog_valid: boolean;
  selected: boolean;
  candidate: ContextRouteCandidate | null;
  ambiguous: ContextRouteAmbiguity[];
  unresolved: ContextRouteUnresolved[];
}

export interface ContextInspectResult {
  schema_version: 1;
  path: string;
  registration: "registered" | "unregistered";
  source: "core" | "area" | "context" | null;
  role: ContextRole | null;
  read_policy: string | null;
  read_when: string | null;
  triggers: string[];
  default_children: string[];
  bytes: number;
  default_footprint: {
    selected: boolean;
    reasons: DefaultContextSelectionReason[];
  };
  referenced_by: ContextMarkdownReference[];
  references: ContextMarkdownReference[];
  stable_key_declarations: ContextStableKeyDeclaration[];
  stable_key_conflicts: ContextStableKeyConflict[];
  route: ContextInspectRoute | null;
  diagnostics: CatalogDiagnostic[];
}

export interface ContextInspectInput {
  project_root: string;
  context_path: string;
  route_task?: string;
  route_paths?: string[];
  route_terms?: string[];
  route_case_sensitive?: boolean;
}
