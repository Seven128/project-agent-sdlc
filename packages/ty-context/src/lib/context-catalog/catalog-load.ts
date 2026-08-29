import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONTEXT_MANIFEST_PATH } from "../context-manifest.js";
import { parseContextManifest } from "../context-manifest-schema.js";
import { pathExists } from "../fs.js";
import { selectDefaultContextPaths } from "./catalog-default-footprint.js";
import { catalogDiagnostic } from "./catalog-diagnostics.js";
import { discoverContextMarkdownFiles } from "./catalog-discovery.js";
import { normalizeContextPath } from "./catalog-paths.js";
import type { ContextCatalog } from "./catalog-types.js";
import { validateCatalogManifest } from "./catalog-validation.js";

export interface LoadContextCatalogOptions {
  discover_files?: boolean;
  validate_manifest?: boolean;
  file_overrides?: ReadonlyMap<string, Uint8Array | null>;
  directory_overrides?: ReadonlySet<string>;
}

export async function loadContextCatalog(
  projectRootInput: string,
  options: LoadContextCatalogOptions = {},
): Promise<ContextCatalog> {
  const projectRoot = path.resolve(projectRootInput);
  const manifestPath = CONTEXT_MANIFEST_PATH;
  const absoluteManifestPath = path.join(
    projectRoot,
    ...manifestPath.split("/"),
  );
  const diagnostics = [];
  const fileOverrides = normalizeFileOverrides(options.file_overrides);
  const directoryOverrides = normalizeDirectoryOverrides(
    options.directory_overrides,
  );
  const contextFiles =
    options.discover_files === false
      ? []
      : await discoverContextMarkdownFiles(projectRoot, fileOverrides);
  const withoutCoreFiles = contextFiles.filter(
    (entry) =>
      entry.path !== "project_context/global.md" &&
      entry.path !== "project_context/architecture.md",
  );
  const manifestOverride = fileOverrides.has(manifestPath)
    ? fileOverrides.get(manifestPath)
    : undefined;
  if (
    manifestOverride === null ||
    (manifestOverride === undefined &&
      !(await pathExists(absoluteManifestPath)))
  ) {
    diagnostics.push(
      catalogDiagnostic(
        "context_manifest_missing",
        "error",
        "project_context/context.toml is missing",
        { path: manifestPath },
      ),
    );
    addUnregisteredDiagnostics(diagnostics, withoutCoreFiles);
    return {
      project_root: projectRoot,
      manifest_path: manifestPath,
      areas: [],
      registered_contexts: [],
      context_files: contextFiles,
      unregistered_context_files: withoutCoreFiles,
      default_footprint: new Map(),
      roles_by_path: new Map(),
      read_policies_by_path: new Map(),
      diagnostics,
    };
  }

  const manifestContent =
    manifestOverride === undefined
      ? await readFile(absoluteManifestPath, "utf8")
      : Buffer.from(manifestOverride).toString("utf8");
  const parsed = parseContextManifest(manifestContent, manifestPath);
  diagnostics.push(
    ...parsed.errors.map((message) =>
      catalogDiagnostic("context_manifest_parse", "error", message, {
        path: manifestPath,
      }),
    ),
  );
  if (!parsed.manifest) {
    addUnregisteredDiagnostics(diagnostics, withoutCoreFiles);
    return {
      project_root: projectRoot,
      manifest_path: manifestPath,
      manifest_content: manifestContent,
      areas: [],
      registered_contexts: [],
      context_files: contextFiles,
      unregistered_context_files: withoutCoreFiles,
      default_footprint: new Map(),
      roles_by_path: new Map(),
      read_policies_by_path: new Map(),
      diagnostics,
    };
  }

  const validation =
    options.validate_manifest === false
      ? {
          registered_contexts: [],
          roles_by_path: new Map(),
          read_policies_by_path: new Map(),
          diagnostics: [],
        }
      : await validateCatalogManifest(
          projectRoot,
          parsed.manifest,
          fileOverrides,
          directoryOverrides,
        );
  diagnostics.push(...validation.diagnostics);
  const registeredPaths = new Set([
    "project_context/global.md",
    "project_context/architecture.md",
    ...parsed.manifest.areas.map((area) => normalizeContextPath(area.context)),
    ...parsed.manifest.contexts.map((context) =>
      normalizeContextPath(context.path),
    ),
  ]);
  const unregisteredContextFiles = contextFiles.filter(
    (entry) => !registeredPaths.has(entry.path),
  );
  addUnregisteredDiagnostics(diagnostics, unregisteredContextFiles);

  return {
    project_root: projectRoot,
    manifest_path: manifestPath,
    manifest_content: manifestContent,
    manifest: parsed.manifest,
    areas: parsed.manifest.areas,
    registered_contexts: validation.registered_contexts,
    context_files: contextFiles,
    unregistered_context_files: unregisteredContextFiles,
    default_footprint: selectDefaultContextPaths(parsed.manifest),
    roles_by_path: validation.roles_by_path,
    read_policies_by_path: validation.read_policies_by_path,
    diagnostics,
  };
}

function normalizeDirectoryOverrides(
  values: ReadonlySet<string> | undefined,
): ReadonlySet<string> {
  if (!values) return new Set();
  return new Set([...values].map(normalizeContextPath));
}

function normalizeFileOverrides(
  values: ReadonlyMap<string, Uint8Array | null> | undefined,
): ReadonlyMap<string, Uint8Array | null> {
  if (!values) return new Map();
  const normalized = new Map<string, Uint8Array | null>();
  for (const [file, bytes] of values) {
    const relative = normalizeContextPath(file);
    if (normalized.has(relative))
      throw new Error(`context_catalog_override_duplicate:${relative}`);
    normalized.set(relative, bytes === null ? null : Buffer.from(bytes));
  }
  return normalized;
}

function addUnregisteredDiagnostics(
  diagnostics: ContextCatalog["diagnostics"],
  files: ContextCatalog["unregistered_context_files"],
): void {
  for (const file of files) {
    diagnostics.push(
      catalogDiagnostic(
        "context_file_unregistered",
        "warning",
        `${file.path} is an unregistered Context Markdown file; add it to project_context/context.toml or move it out of project_context/**`,
        { path: file.path },
      ),
    );
  }
}
