import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import type {
  CatalogFile,
  ContextCatalog,
} from "../context-catalog/catalog-types.js";
import { compareUtf8Paths } from "../context-catalog/catalog-paths.js";
import { loadContextCatalog } from "../context-catalog/catalog-load.js";
import {
  CONTEXT_ROUTE_BUDGETS,
  CONTEXT_ROUTE_SCHEMA_VERSION,
} from "./context-route-budget.js";
import { defaultEntries, emptyResult } from "./context-route-candidates.js";
import { stableRouteBudgetExceeded } from "./context-route-order.js";
import {
  matchContextAreas,
  normalizeRepositoryInputs,
  resolveManualIncludes,
} from "./context-route-paths.js";
import { scanContextCatalogFiles } from "./context-route-scan.js";
import { selectContextRouteCandidates } from "./context-route-selection.js";
import { buildContextRouteTerms } from "./context-route-terms.js";
import type {
  ContextRouteBudgetExceeded,
  ContextRouteInput,
  ContextRouteResult,
} from "./context-route-types.js";

export async function routeContext(
  input: ContextRouteInput,
): Promise<ContextRouteResult> {
  const caseSensitive = input.case_sensitive ?? false;
  const maxSearchResults =
    input.max_search_results ?? CONTEXT_ROUTE_BUDGETS.output_matches;
  const inputExceeded: ContextRouteBudgetExceeded[] = [];
  const taskBytes = Buffer.byteLength(input.task, "utf8");
  let task = input.task;
  if (taskBytes > CONTEXT_ROUTE_BUDGETS.task_utf8_bytes) {
    inputExceeded.push({
      budget: "task_utf8_bytes",
      limit: CONTEXT_ROUTE_BUDGETS.task_utf8_bytes,
      observed: taskBytes,
    });
    task = utf8Prefix(input.task, CONTEXT_ROUTE_BUDGETS.task_utf8_bytes);
  }

  let catalog: ContextCatalog;
  try {
    catalog = await loadContextCatalog(input.project_root);
  } catch (error) {
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `unable to load Context Catalog: ${message(error)}`,
      { cause: error },
    );
  }
  const catalogValid = !catalog.diagnostics.some(
    (entry) => entry.severity === "error",
  );
  const defaultContext = defaultEntries(catalog);
  if (!catalogValid) {
    return emptyResult({
      catalog,
      caseSensitive,
      defaultContext,
      exceeded: inputExceeded,
    });
  }

  const paths = normalizeRepositoryInputs(input.paths ?? [], "--path");
  const triggers = [
    ...new Set(
      catalog.registered_contexts.flatMap((entry) =>
        (entry.context?.triggers ?? []).map((trigger) =>
          trigger.normalize("NFC"),
        ),
      ),
    ),
  ].sort(compareUtf8Paths);
  const termBuild = buildContextRouteTerms({
    task,
    explicit_terms: input.explicit_terms ?? [],
    paths,
    manifest_triggers: triggers,
    case_sensitive: caseSensitive,
  });
  inputExceeded.push(...termBuild.exceeded);

  const pathResult = matchContextAreas(catalog, paths);
  let includes: CatalogFile[];
  try {
    includes = await resolveManualIncludes(catalog, input.includes ?? []);
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `unable to resolve route includes: ${message(error)}`,
      { cause: error },
    );
  }

  let scanned;
  try {
    scanned = await scanContextCatalogFiles({
      files: catalog.context_files,
      terms: termBuild.terms,
      case_sensitive: caseSensitive,
      max_search_results: maxSearchResults,
    });
  } catch (error) {
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `unable to scan Context files: ${message(error)}`,
      { cause: error },
    );
  }

  const selected = selectContextRouteCandidates({
    catalog,
    default_context: defaultContext,
    path_matches: pathResult.matches,
    literal_matches: scanned.matches_by_path,
    includes,
    task,
    case_sensitive: caseSensitive,
  });
  const scanExceeded = [...inputExceeded, ...scanned.scan.exceeded];
  const scan = {
    ...scanned.scan,
    budget_exceeded: scanExceeded.length > 0,
    exceeded: stableRouteBudgetExceeded(scanExceeded),
  };
  return {
    schema_version: CONTEXT_ROUTE_SCHEMA_VERSION,
    complete: !scan.budget_exceeded,
    catalog_valid: true,
    experimental: true,
    authority: false,
    workflow_search_replaced: false,
    matching: {
      literal: true,
      unicode_normalization: "NFC",
      case_sensitive: caseSensitive,
    },
    scan,
    output_truncated: scanned.output_truncated,
    default_context: defaultContext,
    candidates: selected.registered,
    unregistered_matches: selected.unregistered,
    ambiguous: pathResult.ambiguous,
    unresolved: pathResult.unresolved,
    diagnostics: catalog.diagnostics,
  };
}

function utf8Prefix(value: string, maximumBytes: number): string {
  let bytes = 0;
  let result = "";
  for (const point of Array.from(value)) {
    const size = Buffer.byteLength(point, "utf8");
    if (bytes + size > maximumBytes) break;
    result += point;
    bytes += size;
  }
  return result;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
