import { lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import { loadContextCatalog } from "../context-catalog/catalog-load.js";
import {
  isPathWithin,
  normalizeContextPath,
} from "../context-catalog/catalog-paths.js";
import { analyzeContextMarkdownCatalog } from "../context-markdown/context-markdown-analysis.js";
import { routeContext } from "../context-router/context-route.js";
import { projectContextInspection } from "./context-inspect-projection.js";
import type {
  ContextInspectInput,
  ContextInspectResult,
} from "./context-inspect-types.js";

export async function inspectContext(
  input: ContextInspectInput,
): Promise<ContextInspectResult> {
  const projectRoot = path.resolve(input.project_root);
  const contextPath = normalizeInspectedPath(input.context_path);
  let catalog;
  try {
    catalog = await loadContextCatalog(projectRoot);
  } catch (error) {
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `unable to load Context Catalog: ${message(error)}`,
      { cause: error },
    );
  }
  const file = catalog.context_files.find(
    (candidate) => candidate.path === contextPath,
  );
  if (!file)
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `Context inspect target is not an eligible Markdown file: ${contextPath}`,
    );
  try {
    await verifyOrdinaryInRepositoryFile(projectRoot, file.absolute_path);
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `unable to inspect Context file identity: ${message(error)}`,
      { cause: error },
    );
  }

  let markdown;
  try {
    markdown = await analyzeContextMarkdownCatalog({
      project_root: projectRoot,
      files: catalog.context_files,
      long_line_threshold: Number.MAX_SAFE_INTEGER,
    });
  } catch (error) {
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `unable to analyze Context Markdown: ${message(error)}`,
      { cause: error },
    );
  }
  const routeRequested =
    input.route_task !== undefined ||
    (input.route_paths?.length ?? 0) > 0 ||
    (input.route_terms?.length ?? 0) > 0;
  let route: ContextInspectResult["route"] = null;
  if (routeRequested) {
    const routed = await routeContext({
      project_root: projectRoot,
      task: input.route_task ?? "",
      paths: input.route_paths ?? [],
      explicit_terms: input.route_terms ?? [],
      case_sensitive: input.route_case_sensitive,
    });
    const candidate = [
      ...routed.candidates,
      ...routed.unregistered_matches,
    ].find((entry) => entry.path === contextPath);
    route = {
      complete: routed.complete,
      catalog_valid: routed.catalog_valid,
      selected: Boolean(candidate),
      candidate: candidate ?? null,
      ambiguous: routed.ambiguous,
      unresolved: routed.unresolved,
    };
  }

  try {
    return projectContextInspection({
      catalog,
      markdown,
      context_path: contextPath,
      route,
    });
  } catch (error) {
    throw new CliCommandError(CLI_EXIT_CODES.internal, message(error), {
      cause: error,
    });
  }
}

function normalizeInspectedPath(value: string): string {
  if (path.isAbsolute(value))
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      "Context inspect requires a repository-relative path",
    );
  const normalized = normalizeContextPath(value);
  if (
    !normalized.startsWith("project_context/") ||
    !normalized.toLowerCase().endsWith(".md") ||
    normalized.split("/").includes("..")
  )
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `Context inspect target must be a Markdown file under project_context/: ${value}`,
    );
  return normalized;
}

async function verifyOrdinaryInRepositoryFile(
  projectRoot: string,
  absolutePath: string,
): Promise<void> {
  const metadata = await lstat(absolutePath);
  if (!metadata.isFile() || metadata.isSymbolicLink())
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      "Context inspect target must be an ordinary file",
    );
  const repositoryIdentity = await realpath(projectRoot);
  // Catalog discovery owns the canonical NFC key -> physical file mapping.
  // Re-resolving the key would lose an NFD spelling on filesystems that keep
  // canonical-equivalent names distinct.
  const targetIdentity = await realpath(absolutePath);
  if (!isPathWithin(repositoryIdentity, targetIdentity))
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      "Context inspect target resolves outside the repository",
    );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
