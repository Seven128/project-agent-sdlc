import type { CatalogDiagnostic } from "../context-catalog/catalog-types.js";
import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";
import type { DefaultContextSelectionReason } from "../context-catalog/catalog-default-footprint.js";
import type { ContextRouteBudgetName } from "./context-route-budget.js";

export type ContextRouteTermSource =
  | "explicit"
  | "quoted_phrase"
  | "code_identifier"
  | "path_fragment"
  | "manifest_trigger"
  | "stable_name";

export interface ContextRouteTerm {
  value: string;
  normalized: string;
  source: ContextRouteTermSource;
  order: number;
}

export type ContextRouteGroup =
  | "default_registered"
  | "on_demand_registered"
  | "legacy_registered"
  | "unregistered"
  | "path_candidates"
  | "trigger_candidates"
  | "literal_candidates"
  | "manual_includes";

export interface ContextRouteMatch {
  term: string;
  term_source: ContextRouteTermSource;
  line: number;
  column: number;
}

export interface ContextRouteReason {
  kind: "default" | "path" | "trigger" | "literal" | "manual_include";
  input: string;
  detail: string;
}

export interface ContextRouteCandidate {
  path: string;
  registration: "registered" | "unregistered";
  role: ContextRole | null;
  read_policy: string | null;
  groups: ContextRouteGroup[];
  reasons: ContextRouteReason[];
  matched_terms: string[];
  matched_paths: string[];
  matches: ContextRouteMatch[];
  bytes: number;
  cumulative_bytes: number;
}

export interface ContextRouteDefaultEntry {
  path: string;
  reasons: DefaultContextSelectionReason[];
  bytes: number;
  cumulative_bytes: number;
}

export interface ContextRouteAreaCandidate {
  id: string;
  root: string;
  context: string;
}

export interface ContextRouteAmbiguity {
  kind: "area_path";
  input: string;
  candidates: ContextRouteAreaCandidate[];
  reason: string;
}

export interface ContextRouteUnresolved {
  kind: "path" | "include";
  input: string;
  reason: string;
}

export interface ContextRouteBudgetExceeded {
  budget: ContextRouteBudgetName;
  limit: number;
  observed: number;
  path?: string;
}

export interface ContextRouteScanReport {
  files_considered: number;
  files_scanned: number;
  bytes_scanned: number;
  budget_exceeded: boolean;
  exceeded: ContextRouteBudgetExceeded[];
}

export interface ContextRouteResult {
  schema_version: 1;
  complete: boolean;
  catalog_valid: boolean;
  experimental: true;
  authority: false;
  workflow_search_replaced: false;
  matching: {
    literal: true;
    unicode_normalization: "NFC";
    case_sensitive: boolean;
  };
  scan: ContextRouteScanReport;
  output_truncated: boolean;
  default_context: ContextRouteDefaultEntry[];
  candidates: ContextRouteCandidate[];
  unregistered_matches: ContextRouteCandidate[];
  ambiguous: ContextRouteAmbiguity[];
  unresolved: ContextRouteUnresolved[];
  diagnostics: CatalogDiagnostic[];
}

export interface ContextRouteInput {
  project_root: string;
  task: string;
  paths?: string[];
  explicit_terms?: string[];
  includes?: string[];
  case_sensitive?: boolean;
  max_search_results?: number;
}
