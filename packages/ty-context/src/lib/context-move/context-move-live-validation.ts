import { readFile } from "node:fs/promises";
import { analyzeContextMarkdownCatalog } from "../context-markdown/context-markdown-analysis.js";
import { resolveCatalogFile } from "../context-catalog/catalog-paths.js";
import type { ContextCatalog } from "../context-catalog/catalog-types.js";
import type { ContextMutationJournal } from "../context-mutation/mutation-types.js";
import { assertProtectedRepositoryFile } from "../repository-path-safety.js";
import { validateContextContentForRole } from "../validators.js";
import { scanStagedRepositoryForContextPath } from "./context-move-literal-scan.js";
import { issueSignatures } from "./context-move-reference-validation.js";

export async function validateLiveContextMove(
  repository: string,
  catalog: ContextCatalog,
  journal: ContextMutationJournal,
): Promise<void> {
  if (journal.operation_data.kind !== "move") invalid("move_data_required");
  const data = journal.operation_data;
  const owners = catalog.registered_contexts.filter(
    (entry) => entry.path === data.to_path,
  );
  if (
    owners.length !== 1 ||
    owners[0].source !== data.owner_source ||
    owners[0].role !== data.role ||
    (owners[0].read_policy ?? null) !== data.read_policy ||
    catalog.registered_contexts.some((entry) => entry.path === data.from_path)
  )
    invalid("live_move_owner_mismatch");
  const targetFile = resolveCatalogFile(catalog, data.to_path);
  if (!targetFile) invalid("live_move_target_missing");
  const target = await assertProtectedRepositoryFile(
    repository,
    targetFile.absolute_path,
    "context_mutation_moved_context",
  );
  const content = await readFile(target, "utf8");
  const recoveryErrors = validateContextContentForRole(
    repository,
    data.to_path,
    content,
    data.role,
  );
  if (recoveryErrors.length)
    invalid(`live_move_recovery:${recoveryErrors.join("|")}`);
  const analysis = await analyzeContextMarkdownCatalog({
    project_root: repository,
    files: catalog.context_files,
    long_line_threshold: Number.MAX_SAFE_INTEGER,
  });
  if (analysis.references.some((entry) => entry.target_path === data.from_path))
    invalid("live_move_stale_markdown_reference");
  if (!sameArray(issueSignatures(analysis), data.expected_reference_issues))
    invalid("live_move_reference_issues_mismatch");
  const scan = await scanStagedRepositoryForContextPath({
    repository,
    logical_context_path: data.from_path,
    physical_context_path:
      journal.files.find((entry) => entry.path === data.from_path)
        ?.physical_path ?? data.from_path,
    file_overrides: new Map(),
  });
  if (!scan.complete)
    invalid(`live_move_scan_incomplete:${scan.limits_exceeded.join("|")}`);
  if (scan.matches.length)
    invalid(
      `live_move_unresolved_literals:${scan.matches
        .map((entry) => `${entry.path}:${entry.line}`)
        .join(",")}`,
    );
}

function sameArray(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

function invalid(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}
