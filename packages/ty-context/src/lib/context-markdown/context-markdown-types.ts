export type ContextMarkdownReferenceKind =
  "inline" | "image" | "definition" | "angle";
export type ContextMarkdownReferenceStatus =
  "valid" | "missing" | "outside_repository" | "invalid";

export type ContextControllingSourceDomain =
  "product" | "technical" | "design" | "acceptance" | "external";

export interface ContextMarkdownRawReference {
  destination: string;
  kind: ContextMarkdownReferenceKind;
  line: number;
  column: number;
}

export interface ContextMarkdownReference extends ContextMarkdownRawReference {
  source_path: string;
  target_path: string | null;
  fragment: string | null;
  status: ContextMarkdownReferenceStatus;
  detail?: string;
}

export interface ContextControllingSourceRawDeclaration {
  domain: ContextControllingSourceDomain;
  declared_path: string;
  source_path: string;
  line: number;
  column: number;
}

export interface ContextControllingSourceDeclaration extends ContextControllingSourceRawDeclaration {
  target_path: string | null;
  status: ContextMarkdownReferenceStatus;
  detail?: string;
}

export interface ContextControllingSourceConflict {
  kind: "duplicate" | "domain_conflict";
  target_path: string;
  domains: ContextControllingSourceDomain[];
  owners: Array<{
    source_path: string;
    line: number;
    domain: ContextControllingSourceDomain;
  }>;
}

export interface ContextStableKeyDeclaration {
  type: string;
  id: string;
  path: string;
  line: number;
  column: number;
}

export interface ContextInvalidDeclaration {
  path: string;
  raw: string;
  line: number;
  column: number;
  reason: string;
}

export interface ContextLongLine {
  line: number;
  code_points: number;
}

export interface ContextMarkdownFileAnalysis {
  path: string;
  bytes: number;
  max_line_code_points: number;
  long_lines: ContextLongLine[];
  references: ContextMarkdownReference[];
  controlling_sources: ContextControllingSourceDeclaration[];
  declarations: ContextStableKeyDeclaration[];
  invalid_declarations: ContextInvalidDeclaration[];
}

export interface ContextStableKeyConflict {
  type: string;
  id: string;
  owners: Array<{ path: string; line: number }>;
}

export interface ContextMarkdownCatalogAnalysis {
  files: ContextMarkdownFileAnalysis[];
  references: ContextMarkdownReference[];
  controlling_sources: ContextControllingSourceDeclaration[];
  controlling_source_conflicts: ContextControllingSourceConflict[];
  declarations: ContextStableKeyDeclaration[];
  invalid_declarations: ContextInvalidDeclaration[];
  declaration_conflicts: ContextStableKeyConflict[];
}
