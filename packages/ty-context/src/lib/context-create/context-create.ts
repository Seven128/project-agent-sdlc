import { CLI_EXIT_CODES, CliCommandError } from "../cli-exit.js";
import { loadContextCatalog } from "../context-catalog/catalog-load.js";
import { normalizeContextPath } from "../context-catalog/catalog-paths.js";
import {
  CONTEXT_ROLES,
  normalizeContextRole,
} from "../context-catalog/catalog-portable-contract.js";
import type { ContextCatalog } from "../context-catalog/catalog-types.js";
import { normalizeContextCreatePath } from "./context-create-path.js";
import { renderContextCreateScaffold } from "./context-create-template.js";
import type {
  ContextCreateInput,
  ContextCreateResult,
  ContextFootprintSnapshot,
} from "./context-create-types.js";
import { publishContextScaffold } from "./context-create-write.js";

export async function createContextScaffold(
  input: ContextCreateInput,
): Promise<ContextCreateResult> {
  const contextPath = normalizeContextCreatePath(input.context_path);
  const role = normalizeContextRole(input.role);
  if (!role)
    throw new CliCommandError(
      CLI_EXIT_CODES.arguments,
      `context create role must be one of: ${CONTEXT_ROLES.join(", ")}`,
    );
  const catalog = await loadCatalog(input.project_root);
  assertUnregisteredTarget(catalog, contextPath);
  const blocking = catalog.diagnostics.filter(
    (diagnostic) => diagnostic.severity === "error",
  );
  if (blocking.length > 0)
    throw new CliCommandError(
      CLI_EXIT_CODES.catalog,
      `context create requires a valid Context Catalog: ${blocking
        .map((entry) => entry.message)
        .join("; ")}`,
    );
  const content = renderContextCreateScaffold(contextPath, role);
  const bytes = Buffer.from(content, "utf8");
  const footprint = contextFootprintSnapshot(catalog);
  await publishContextScaffold(input.project_root, contextPath, bytes);
  return {
    schema_version: 1,
    path: contextPath,
    role,
    created: true,
    registration: "unregistered",
    manifest_modified: false,
    bytes: bytes.length,
    default_footprint: {
      changed: false,
      before: footprint,
      after: { ...footprint },
      added: [],
      removed: [],
      reason:
        "unregistered scaffolds do not participate in the default footprint",
    },
    next_steps: [
      "Replace every TODO with durable facts owned by this Context.",
      `Inspect the unregistered scaffold with: ty-context context inspect ${contextPath}`,
      "Register only after the file satisfies its Role recovery requirements; create never edits the Manifest.",
    ],
  };
}

async function loadCatalog(projectRoot: string): Promise<ContextCatalog> {
  try {
    return await loadContextCatalog(projectRoot);
  } catch (error) {
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `unable to load Context Catalog: ${message(error)}`,
      { cause: error },
    );
  }
}

function assertUnregisteredTarget(
  catalog: ContextCatalog,
  contextPath: string,
): void {
  const folded = contextPath.toLocaleLowerCase("en-US");
  const registered = registeredPaths(catalog).find(
    (candidate) => candidate.toLocaleLowerCase("en-US") === folded,
  );
  if (registered)
    throw new CliCommandError(
      CLI_EXIT_CODES.catalog,
      `context create only creates unregistered scaffolds; Manifest already owns ${registered}`,
    );
  const existing = catalog.context_files.find(
    (candidate) => candidate.path.toLocaleLowerCase("en-US") === folded,
  );
  if (existing)
    throw new CliCommandError(
      CLI_EXIT_CODES.io,
      `context create refuses to overwrite existing target: ${existing.path}`,
    );
}

function registeredPaths(catalog: ContextCatalog): string[] {
  return [
    "project_context/global.md",
    "project_context/architecture.md",
    ...(catalog.manifest?.areas.map((entry) => entry.context) ?? []),
    ...(catalog.manifest?.contexts.map((entry) => entry.path) ?? []),
  ].map(normalizeContextPath);
}

function contextFootprintSnapshot(
  catalog: ContextCatalog,
): ContextFootprintSnapshot {
  const files = new Map(
    catalog.context_files.map((entry) => [entry.path, entry.bytes]),
  );
  let bytes = 0;
  for (const contextPath of catalog.default_footprint.keys())
    bytes +=
      contextPath === catalog.manifest_path
        ? Buffer.byteLength(catalog.manifest_content ?? "", "utf8")
        : (files.get(contextPath) ?? 0);
  return { path_count: catalog.default_footprint.size, bytes };
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
