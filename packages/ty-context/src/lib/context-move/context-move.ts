import { captureMutationFileState } from "../context-mutation/mutation-cas.js";
import { resolveCatalogFile } from "../context-catalog/catalog-paths.js";
import {
  assertMutationCatalogValid,
  assertNoUnfinishedContextMutation,
  decodeMutationUtf8,
  loadMutationCatalog,
  mutationCatalogFailure,
  mutationIoFailure,
  mutationMessage,
  mutationStateBytes,
} from "../context-mutation/mutation-command-support.js";
import { executeContextMutationPlan } from "../context-mutation/mutation-commit.js";
import {
  assertContextMutationOutsideActiveLongTask,
  contextMutationAffectedPaths,
} from "../context-mutation/mutation-long-task-guard.js";
import {
  replaceContextManifestPath,
  type ManifestPathReplacementResult,
} from "../context-mutation/manifest-lossless-patch.js";
import {
  contextFootprintState,
  stagedFileOverrides,
} from "../context-mutation/mutation-staged-fs.js";
import type { ContextMutationPlan } from "../context-mutation/mutation-types.js";
import { validateContextContentForRole } from "../validators.js";
import { normalizeContextMoveInput } from "./context-move-input.js";
import { scanStagedRepositoryForContextPath } from "./context-move-literal-scan.js";
import { planContextMoveMarkdown } from "./context-move-markdown-plan.js";
import { contextMoveFootprintDiff } from "./context-move-projection.js";
import { validateStagedContextMoveReferences } from "./context-move-reference-validation.js";
import {
  assertContextMoveEndpoints,
  assertStagedContextMoveOwner,
  missingContextMoveDirectories,
  readContextMoveMarkdown,
} from "./context-move-support.js";
import { buildContextMoveTransactionPlan } from "./context-move-transaction-plan.js";
import type {
  ContextMoveInput,
  ContextMoveResult,
} from "./context-move-types.js";
import { CliCommandError } from "../cli-exit.js";

const MANIFEST_PATH = "project_context/context.toml";

export interface PlannedContextMove {
  plan: ContextMutationPlan;
  result: ContextMoveResult;
}

export async function moveContext(
  input: ContextMoveInput,
): Promise<ContextMoveResult> {
  const planned = await planContextMove(input);
  if (!input.apply) return planned.result;
  // Preserve the established fail-fast diagnostic before evaluating a
  // potentially inapplicable move. executeContextMutationPlan repeats this
  // guard while holding the shared Authority interlock to close the race.
  await assertContextMutationOutsideActiveLongTask(
    input.project_root,
    contextMutationAffectedPaths(planned.plan),
  );
  if (!planned.result.can_apply)
    mutationCatalogFailure(
      "context move cannot apply until every reported unresolved reference and scan limit is cleared",
    );
  try {
    await executeContextMutationPlan(input.project_root, planned.plan);
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    mutationIoFailure(
      `context move transaction stopped: ${mutationMessage(error)}; inspect recovery with ty-context context transaction status`,
      error,
    );
  }
  return {
    ...planned.result,
    applied: true,
    transaction: { ...planned.result.transaction, state: "committed" },
  };
}

export async function planContextMove(
  input: ContextMoveInput,
): Promise<PlannedContextMove> {
  const normalized = normalizeContextMoveInput(input);
  await assertNoUnfinishedContextMutation(input.project_root);
  const beforeCatalog = await loadMutationCatalog(input.project_root);
  assertMutationCatalogValid(
    beforeCatalog,
    "context move requires a valid Catalog",
  );
  const owner = assertContextMoveEndpoints(
    beforeCatalog,
    normalized.from_path,
    normalized.to_path,
  );
  const sourceFile = resolveCatalogFile(beforeCatalog, normalized.from_path);
  if (!sourceFile)
    mutationIoFailure(
      `context move source is missing: ${normalized.from_path}`,
    );
  const directories = await missingContextMoveDirectories(
    input.project_root,
    normalized.to_path,
  );
  const markdown = await readContextMoveMarkdown(
    input.project_root,
    beforeCatalog,
  );
  const markdownPlan = planContextMoveMarkdown({
    files: markdown,
    ...normalized,
    from_physical_path: sourceFile.physical_path,
    to_physical_path: normalized.to_path,
  });
  const sourceBefore = await captureMutationFileState(
    input.project_root,
    sourceFile.physical_path,
  );
  if (!sourceBefore.exists || sourceBefore.mode === null)
    mutationIoFailure(
      `context move source is missing: ${normalized.from_path}`,
    );
  const sourceText = decodeMutationUtf8(
    mutationStateBytes(sourceBefore),
    normalized.from_path,
  );
  if (sourceText !== markdown.get(normalized.from_path)?.content)
    mutationIoFailure("Context source changed while planning move");
  const manifestBefore = await captureMutationFileState(
    input.project_root,
    MANIFEST_PATH,
  );
  if (!manifestBefore.exists || manifestBefore.mode === null)
    mutationCatalogFailure("project_context/context.toml is missing");
  const manifestText = decodeMutationUtf8(
    mutationStateBytes(manifestBefore),
    MANIFEST_PATH,
  );
  if (manifestText !== beforeCatalog.manifest_content)
    mutationIoFailure("Context Catalog changed while planning move");
  const manifestPatch = patchManifest(
    manifestText,
    normalized.from_path,
    normalized.to_path,
  );
  const targetBytes = Buffer.from(markdownPlan.target_content, "utf8");
  const manifestBytes = Buffer.from(manifestPatch.content, "utf8");
  const overrides = stagedFileOverrides([
    [normalized.from_path, null],
    [normalized.to_path, targetBytes],
    [MANIFEST_PATH, manifestBytes],
    ...[...markdownPlan.updated_context_files].map(
      ([file, content]) => [file, Buffer.from(content, "utf8")] as const,
    ),
  ]);
  const directorySet = new Set(directories);
  const afterCatalog = await loadMutationCatalog(
    input.project_root,
    overrides,
    directorySet,
  );
  assertMutationCatalogValid(afterCatalog, "staged Context move is invalid");
  assertStagedContextMoveOwner(
    afterCatalog,
    owner,
    normalized.from_path,
    normalized.to_path,
  );
  const recoveryErrors = validateContextContentForRole(
    input.project_root,
    normalized.to_path,
    markdownPlan.target_content,
    owner.role,
  );
  if (recoveryErrors.length)
    mutationCatalogFailure(
      `moved Context is not recoverable: ${recoveryErrors.join("; ")}`,
    );
  const referenceIssues = await validateStagedContextMoveReferences({
    repository: input.project_root,
    before_catalog: beforeCatalog,
    after_catalog: afterCatalog,
    file_overrides: overrides,
    ...normalized,
  });
  const scan = await scanStagedRepositoryForContextPath({
    repository: input.project_root,
    logical_context_path: normalized.from_path,
    physical_context_path: sourceFile.physical_path,
    file_overrides: overrides,
  });
  const built = await buildContextMoveTransactionPlan({
    repository: input.project_root,
    owner,
    normalized,
    directories,
    source_before: sourceBefore,
    source_physical_path: sourceFile.physical_path,
    manifest_before: manifestBefore,
    manifest_bytes: manifestBytes,
    target_bytes: targetBytes,
    updated_files: markdownPlan.updated_context_files,
    before_catalog: beforeCatalog,
    after_catalog: afterCatalog,
    reference_issues: referenceIssues,
  });
  const beforeFootprint = contextFootprintState(beforeCatalog);
  const afterFootprint = contextFootprintState(afterCatalog);
  const canApply = scan.complete && scan.matches.length === 0;
  return {
    plan: built.plan,
    result: {
      schema_version: 1,
      operation: "move",
      applied: false,
      can_apply: canApply,
      ...normalized,
      owner: {
        source: owner.source,
        role: owner.role,
        read_policy: owner.read_policy ?? null,
      },
      directories_created: directories,
      files: built.projections,
      manifest: {
        path: MANIFEST_PATH,
        replacements: manifestPatch.replacements.map((entry) => ({
          kind: entry.kind,
          previous_literal: entry.previous_literal,
          next_literal: entry.next_literal,
        })),
      },
      links: {
        files_changed: [
          ...new Set(
            markdownPlan.references_updated.map((entry) => entry.source_path),
          ),
        ],
        references_updated: markdownPlan.references_updated,
      },
      unresolved: scan.matches,
      scan: {
        complete: scan.complete,
        files_scanned: scan.files_scanned,
        bytes_scanned: scan.bytes_scanned,
        limits_exceeded: scan.limits_exceeded,
      },
      default_footprint: contextMoveFootprintDiff(
        beforeFootprint,
        afterFootprint,
      ),
      catalog: {
        before_identity: built.plan.catalog_before_identity,
        after_identity: built.plan.catalog_after_identity,
      },
      diagnostics: [
        ...afterCatalog.diagnostics
          .filter((entry) => entry.severity === "warning")
          .map((entry) => entry.message),
        ...scan.limits_exceeded.map(
          (entry) => `move scan incomplete: ${entry}`,
        ),
      ],
      transaction: {
        id: built.plan.transaction_id,
        state: "dry-run",
        journal_present: false,
      },
    },
  };
}

function patchManifest(
  content: string,
  from: string,
  to: string,
): ManifestPathReplacementResult {
  try {
    return replaceContextManifestPath(content, from, to);
  } catch (error) {
    mutationCatalogFailure(
      `Manifest cannot be patched losslessly: ${mutationMessage(error)}`,
      error,
    );
  }
}
