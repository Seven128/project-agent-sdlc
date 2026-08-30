import { analyzeContextMarkdownCatalog } from "../context-markdown/context-markdown-analysis.js";
import type {
  ContextMarkdownCatalogAnalysis,
  ContextMarkdownReference,
} from "../context-markdown/context-markdown-types.js";
import type { ContextCatalog } from "../context-catalog/catalog-types.js";
import { compareUtf8Paths } from "../context-catalog/catalog-paths.js";
import { mutationCatalogFailure } from "../context-mutation/mutation-command-support.js";

export async function validateStagedContextMoveReferences(input: {
  repository: string;
  before_catalog: ContextCatalog;
  after_catalog: ContextCatalog;
  file_overrides: ReadonlyMap<string, Uint8Array | null>;
  from_path: string;
  to_path: string;
}): Promise<string[]> {
  const before = await analyzeContextMarkdownCatalog({
    project_root: input.repository,
    files: input.before_catalog.context_files,
    long_line_threshold: Number.MAX_SAFE_INTEGER,
  });
  const after = await analyzeContextMarkdownCatalog({
    project_root: input.repository,
    files: input.after_catalog.context_files,
    long_line_threshold: Number.MAX_SAFE_INTEGER,
    file_overrides: input.file_overrides,
  });
  const previousIssues = issueCounts(before, input.from_path, input.to_path);
  const afterIssues = issueSignatures(after);
  const additions: string[] = [];
  for (const issue of afterIssues) {
    const remaining = previousIssues.get(issue) ?? 0;
    if (remaining === 0) additions.push(issue);
    else previousIssues.set(issue, remaining - 1);
  }
  const stale = after.references.filter(
    (reference) => reference.target_path === input.from_path,
  );
  if (stale.length)
    mutationCatalogFailure(
      `staged Context move leaves explicit links targeting ${input.from_path}: ${stale
        .map((entry) => `${entry.source_path}:${entry.line}`)
        .join(", ")}`,
    );
  if (additions.length)
    mutationCatalogFailure(
      `staged Context move introduces Markdown reference problems: ${additions.join("; ")}`,
    );
  return afterIssues;
}

export function issueSignatures(
  analysis: ContextMarkdownCatalogAnalysis,
): string[] {
  return analysis.references
    .filter((entry) => entry.status !== "valid")
    .map(referenceIssueSignature)
    .sort(compareUtf8Paths);
}

function issueCounts(
  analysis: ContextMarkdownCatalogAnalysis,
  fromPath: string,
  toPath: string,
): Map<string, number> {
  const result = new Map<string, number>();
  for (const reference of analysis.references) {
    if (reference.status === "valid") continue;
    const signature = referenceIssueSignature({
      ...reference,
      source_path:
        reference.source_path === fromPath ? toPath : reference.source_path,
      target_path:
        reference.target_path === fromPath ? toPath : reference.target_path,
    });
    result.set(signature, (result.get(signature) ?? 0) + 1);
  }
  return result;
}

function referenceIssueSignature(reference: ContextMarkdownReference): string {
  return JSON.stringify([
    reference.source_path,
    reference.kind,
    reference.status,
    reference.target_path,
    reference.fragment,
    reference.detail ?? null,
  ]);
}
