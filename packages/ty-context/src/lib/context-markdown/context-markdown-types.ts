export type ContextMarkdownReferenceKind = "inline" | "definition" | "angle";
export type ContextMarkdownReferenceStatus =
  "valid" | "missing" | "outside_repository" | "invalid";

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
  declarations: ContextStableKeyDeclaration[];
  invalid_declarations: ContextInvalidDeclaration[];
  declaration_conflicts: ContextStableKeyConflict[];
}
