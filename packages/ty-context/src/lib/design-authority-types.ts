export const DESIGN_AUTHORITY_MANIFEST_PATH =
  "design_system/authority.manifest.json";
export const DESIGN_AUTHORITY_ENTRY_PATH = "DESIGN.md";
export const DESIGN_AUTHORITY_MANIFEST_SCHEMA_VERSION = 1;
export const DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION = 1;

export const DESIGN_AUTHORITY_KINDS = [
  "foundation",
  "typography",
  "iconography",
  "motion",
  "component",
  "pattern",
  "platform",
  "migration",
] as const;

export type DesignAuthorityKind = (typeof DESIGN_AUTHORITY_KINDS)[number];

export interface DesignAuthorityManifestFile {
  path: string;
  kind: DesignAuthorityKind;
}

export interface DesignAuthorityGeneratedFile {
  path: string;
  source: "DESIGN.md#frontmatter.tokens";
}

export interface DesignAuthorityManifestV1 {
  schema_version: typeof DESIGN_AUTHORITY_MANIFEST_SCHEMA_VERSION;
  entry: typeof DESIGN_AUTHORITY_ENTRY_PATH;
  authority_files: DesignAuthorityManifestFile[];
  generated_files: DesignAuthorityGeneratedFile[];
  closure_digest: string;
}

export interface DesignAuthorityIdentityV1 {
  format_version: typeof DESIGN_AUTHORITY_IDENTITY_FORMAT_VERSION;
  entry_path: typeof DESIGN_AUTHORITY_ENTRY_PATH;
  manifest_path: typeof DESIGN_AUTHORITY_MANIFEST_PATH | null;
  closure_digest: string;
  revision: string | null;
}

export type DesignAuthorityHandoffBinding =
  | ({ kind: "repository-closure" } & DesignAuthorityIdentityV1)
  | { kind: "not-applicable"; rationale: string };

export interface DesignAuthorityHandoffResolution {
  identity: DesignAuthorityIdentityV1 | null;
  member_paths: string[];
  compatibility_derived: boolean;
}

export interface DesignAuthorityClosureMember {
  path: string;
  kind: "entry" | "manifest" | "authority" | "generated";
  content_sha256: string;
  normalized_bytes: number;
}

export interface DesignAuthorityDiagnostic {
  severity: "error" | "warning";
  code: string;
  path?: string;
  detail: string;
}

export interface DesignAuthorityClosureSnapshot {
  mode: "legacy" | "bundle";
  identity: DesignAuthorityIdentityV1;
  manifest: DesignAuthorityManifestV1 | null;
  claimed_closure_digest: string | null;
  members: DesignAuthorityClosureMember[];
  member_paths: string[];
  generated_tokens: string | null;
  diagnostics: DesignAuthorityDiagnostic[];
}

export interface DesignAuthorityInspection {
  schema_version: 1;
  status: "missing" | "valid" | "invalid";
  mode: "missing" | "legacy" | "bundle";
  identity: DesignAuthorityIdentityV1 | null;
  manifest: DesignAuthorityManifestV1 | null;
  claimed_closure_digest: string | null;
  members: DesignAuthorityClosureMember[];
  member_paths: string[];
  generated_tokens: string | null;
  diagnostics: DesignAuthorityDiagnostic[];
}

export const DESIGN_AUTHORITY_LIMITS = {
  max_members: 4096,
  max_file_bytes: 8 * 1024 * 1024,
  max_total_bytes: 64 * 1024 * 1024,
} as const;

export function isDesignAuthorityDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}
