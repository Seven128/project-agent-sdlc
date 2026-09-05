import type {
  DesignAuthorityDiagnostic,
  DesignAuthorityIdentityV1,
} from "./design-authority-types.js";

export const DESIGN_AUTHORITY_SHOWCASE_SCHEMA =
  "design-authority-showcase-v1" as const;
export const DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH =
  "docs/design-system-showcase/showcase.manifest.json" as const;
export const DESIGN_AUTHORITY_SHOWCASE_HTML_PATH =
  "docs/design-system-showcase/index.html" as const;
export const DESIGN_AUTHORITY_SHOWCASE_ASSET_ROOT =
  "docs/design-system-showcase/assets/" as const;
export const DESIGN_AUTHORITY_SHOWCASE_ARTIFACT_CATEGORY =
  "design_system_handbook" as const;
export const DESIGN_AUTHORITY_SHOWCASE_STATUS = "adopted" as const;
export const DESIGN_AUTHORITY_SHOWCASE_MARKER =
  '<!-- ty-context-design-showcase path="docs/design-system-showcase/showcase.manifest.json" -->' as const;

export const DESIGN_AUTHORITY_SHOWCASE_COVERAGE_KEYS = [
  "identity",
  "color",
  "typography",
  "layout-spacing-density",
  "container-grammar",
  "icons-assets",
  "component-catalog",
  "component-contracts",
  "relationship-contracts",
  "interaction-accessibility",
  "motion",
  "adaptation",
  "implementation-provenance",
  "supplemental-validation",
] as const;

export type DesignAuthorityShowcaseCoverageKey =
  (typeof DESIGN_AUTHORITY_SHOWCASE_COVERAGE_KEYS)[number];

export interface DesignAuthorityShowcaseAuthorityBinding {
  entry_path: "DESIGN.md";
  closure_digest: string;
  revision: string;
}

export interface DesignAuthorityShowcaseFile {
  path: string;
  sha256: string;
}

export type DesignAuthorityShowcaseCoverage =
  | {
      key: DesignAuthorityShowcaseCoverageKey;
      disposition: "rendered";
      anchor: string;
    }
  | {
      key: DesignAuthorityShowcaseCoverageKey;
      disposition: "not_applicable";
      rationale: string;
    };

export interface DesignAuthorityShowcaseIndexEntry {
  key: string;
  anchor: string;
}

export interface DesignAuthorityShowcaseTargetCondition {
  target_key: string;
  condition_key: string;
  anchor: string;
}

export interface DesignAuthorityShowcaseManifestV1 {
  schema_version: typeof DESIGN_AUTHORITY_SHOWCASE_SCHEMA;
  artifact_category: typeof DESIGN_AUTHORITY_SHOWCASE_ARTIFACT_CATEGORY;
  authority: DesignAuthorityShowcaseAuthorityBinding;
  status: typeof DESIGN_AUTHORITY_SHOWCASE_STATUS;
  html: DesignAuthorityShowcaseFile & {
    path: typeof DESIGN_AUTHORITY_SHOWCASE_HTML_PATH;
  };
  assets: DesignAuthorityShowcaseFile[];
  coverage: DesignAuthorityShowcaseCoverage[];
  token_families: DesignAuthorityShowcaseIndexEntry[];
  components: DesignAuthorityShowcaseIndexEntry[];
  target_conditions: DesignAuthorityShowcaseTargetCondition[];
  external_network_dependencies: [];
}

export interface DesignAuthorityShowcaseInspectionV1 {
  schema_version: 1;
  status: "not_evaluated" | "not_declared" | "valid" | "invalid";
  manifest_path: typeof DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH | null;
  artifact_category: typeof DESIGN_AUTHORITY_SHOWCASE_ARTIFACT_CATEGORY | null;
  authority: DesignAuthorityShowcaseAuthorityBinding | null;
  html: DesignAuthorityShowcaseFile | null;
  assets: DesignAuthorityShowcaseFile[];
  coverage: {
    rendered: DesignAuthorityShowcaseCoverageKey[];
    not_applicable: DesignAuthorityShowcaseCoverageKey[];
  } | null;
  indexes: {
    token_families: number;
    components: number;
    target_conditions: number;
  } | null;
  external_network_dependencies: [] | null;
  diagnostics: DesignAuthorityDiagnostic[];
}

export interface DesignAuthorityShowcaseContext {
  repository: string;
  authority: DesignAuthorityIdentityV1;
}
