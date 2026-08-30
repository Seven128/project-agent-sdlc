import type {
  ContextAreaEntry,
  ContextManifest,
  ContextNodeEntry,
} from "../context-manifest-schema.js";
import type { ContextRole } from "./catalog-portable-contract.js";
import type { DefaultContextSelectionReason } from "./catalog-default-footprint.js";

export type CatalogDiagnosticSeverity = "error" | "warning";

export interface CatalogDiagnostic {
  code: string;
  severity: CatalogDiagnosticSeverity;
  message: string;
  path?: string;
  line?: number;
}

export interface CatalogFile {
  path: string;
  physical_path: string;
  absolute_path: string;
  bytes: number;
}

export interface CatalogRegisteredContext {
  source: "area" | "context";
  path: string;
  role: ContextRole;
  read_policy?: string;
  line: number;
  area?: ContextAreaEntry;
  context?: ContextNodeEntry;
}

export interface ContextCatalog {
  project_root: string;
  manifest_path: string;
  manifest_content?: string;
  manifest?: ContextManifest;
  areas: ContextAreaEntry[];
  registered_contexts: CatalogRegisteredContext[];
  context_files: CatalogFile[];
  unregistered_context_files: CatalogFile[];
  default_footprint: Map<string, Set<DefaultContextSelectionReason>>;
  roles_by_path: Map<string, ContextRole>;
  read_policies_by_path: Map<string, string>;
  diagnostics: CatalogDiagnostic[];
}
