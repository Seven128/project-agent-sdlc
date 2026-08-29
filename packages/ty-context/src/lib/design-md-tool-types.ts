export const DESIGN_MD_TOOL_ADAPTER_SCHEMA_VERSION = 1;

export const DESIGN_MD_EXPORT_FORMATS = [
  "json-tailwind",
  "css-tailwind",
  "tailwind",
  "dtcg",
  "css-vars",
] as const;

export type DesignMdExportFormat = (typeof DESIGN_MD_EXPORT_FORMATS)[number];
export type DesignMdValidationMode = "parse-validate" | "lint";
export type DesignMdFindingSeverity = "error" | "warning" | "info";

export interface DesignMdToolIdentity {
  package_name: "@google/design.md";
  package_version: string;
  api_surface: "@google/design.md/linter";
}

export interface DesignMdFinding {
  severity: DesignMdFindingSeverity;
  path?: string;
  message: string;
  rule?: string;
}

export interface DesignMdFindingSummary {
  errors: number;
  warnings: number;
  infos: number;
}

export interface DesignMdComponentSnapshot {
  properties: Record<string, unknown>;
  unresolved_refs: string[];
}

export interface DesignMdSystemSnapshot {
  name?: string;
  description?: string;
  colors: Record<string, unknown>;
  typography: Record<string, unknown>;
  rounded: Record<string, unknown>;
  spacing: Record<string, unknown>;
  components: Record<string, DesignMdComponentSnapshot>;
  sections: string[];
  unknown_keys: string[];
}

export interface DesignMdValidationResult {
  schema_version: typeof DESIGN_MD_TOOL_ADAPTER_SCHEMA_VERSION;
  mode: DesignMdValidationMode;
  tool: DesignMdToolIdentity;
  valid: boolean;
  findings: DesignMdFinding[];
  summary: DesignMdFindingSummary;
  design_system: DesignMdSystemSnapshot | null;
}

export interface DesignMdExportSuccess {
  success: true;
  format: DesignMdExportFormat;
  media_type: "application/json" | "text/css";
  content: string;
  options: DesignMdExportOptions;
  validation: DesignMdValidationResult;
}

export interface DesignMdExportFailure {
  success: false;
  format: DesignMdExportFormat;
  error: string;
  options: DesignMdExportOptions;
  validation: DesignMdValidationResult;
}

export interface DesignMdExportOptions {
  css_variable_prefix?: string;
}

export type DesignMdExportResult =
  DesignMdExportSuccess | DesignMdExportFailure;

export interface DesignMdTokenChangeSet {
  added: string[];
  removed: string[];
  modified: string[];
}

export interface DesignMdDiffSuccess {
  success: true;
  tool: DesignMdToolIdentity;
  tokens: {
    colors: DesignMdTokenChangeSet;
    typography: DesignMdTokenChangeSet;
    rounded: DesignMdTokenChangeSet;
    spacing: DesignMdTokenChangeSet;
    components: DesignMdTokenChangeSet;
  };
  findings: {
    before: DesignMdFindingSummary;
    after: DesignMdFindingSummary;
    delta: { errors: number; warnings: number };
  };
  regression: boolean;
  before_validation: DesignMdValidationResult;
  after_validation: DesignMdValidationResult;
}

export interface DesignMdDiffFailure {
  success: false;
  tool: DesignMdToolIdentity;
  error: string;
  before_validation: DesignMdValidationResult;
  after_validation: DesignMdValidationResult;
}

export type DesignMdDiffResult = DesignMdDiffSuccess | DesignMdDiffFailure;
