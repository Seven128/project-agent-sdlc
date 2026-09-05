import { readFile } from "node:fs/promises";
import path from "node:path";
import { CONTEXT_MANIFEST_PATH } from "../context-manifest.js";
import { parseContextManifest } from "../context-manifest-schema.js";
import { pathExists } from "../fs.js";
import { rawSchemaVersion } from "../schema-guard.js";
import { selectDefaultContextPaths } from "./catalog-default-footprint.js";
import {
  catalogDiagnostic,
  sortCatalogDiagnostics,
} from "./catalog-diagnostics.js";
import { discoverContextMarkdownFiles } from "./catalog-discovery.js";
import {
  compareUtf8Paths,
  normalizeContextPath,
  normalizeContextPathSpelling,
  sortedContextMap,
} from "./catalog-paths.js";
import type {
  CatalogDiagnostic,
  CatalogRegisteredContext,
  ContextCatalog,
} from "./catalog-types.js";
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
  const normalizedOverrides = normalizeFileOverrides(options.file_overrides);
  const fileOverrides = normalizedOverrides.values;
  diagnostics.push(...normalizedOverrides.diagnostics);
  const directoryOverrides = normalizeDirectoryOverrides(
    options.directory_overrides,
  );
  const discovery =
    options.discover_files === false
      ? { files: [], diagnostics: [] }
      : await discoverContextMarkdownFiles(projectRoot, fileOverrides);
  const contextFiles = discovery.files;
  diagnostics.push(...discovery.diagnostics);
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
      diagnostics: sortCatalogDiagnostics(diagnostics),
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
      diagnostics: sortCatalogDiagnostics(diagnostics),
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
          contextFiles,
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

  let defaults = parsed.manifest;
  try {
    const version = await rawSchemaVersion(projectRoot);
    if (version !== undefined && Number(version) < 5)
      defaults = {
        ...defaults,
        default_files: [
          ...new Set([
            ...(defaults.default_files ?? []),
            "project_context/architecture.md",
          ]),
        ],
      };
  } catch (error) {
    diagnostics.push(
      catalogDiagnostic("config_invalid", "error", String(error)),
    );
  }

  return {
    project_root: projectRoot,
    manifest_path: manifestPath,
    manifest_content: manifestContent,
    manifest: parsed.manifest,
    areas: projectAreas(parsed.manifest.areas),
    registered_contexts: projectRegisteredContexts(
      validation.registered_contexts,
    ),
    context_files: contextFiles,
    unregistered_context_files: unregisteredContextFiles,
    default_footprint: selectDefaultContextPaths(defaults),
    roles_by_path: sortedContextMap(validation.roles_by_path),
    read_policies_by_path: sortedContextMap(validation.read_policies_by_path),
    diagnostics: sortCatalogDiagnostics(diagnostics),
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
): {
  values: ReadonlyMap<string, Uint8Array | null>;
  diagnostics: CatalogDiagnostic[];
} {
  if (!values) return { values: new Map(), diagnostics: [] };
  const normalized = new Map<string, Uint8Array | null>();
  const diagnostics: CatalogDiagnostic[] = [];
  const spellings = new Map<string, string[]>();
  const entries = [...values].sort(([left], [right]) =>
    compareUtf8Paths(
      normalizeContextPathSpelling(left),
      normalizeContextPathSpelling(right),
    ),
  );
  for (const [file, bytes] of entries) {
    const relative = normalizeContextPath(file);
    const valuesForPath = spellings.get(relative) ?? [];
    valuesForPath.push(normalizeContextPathSpelling(file));
    spellings.set(relative, valuesForPath);
    if (!normalized.has(relative))
      normalized.set(relative, bytes === null ? null : Buffer.from(bytes));
  }
  for (const [relative, rawSpellings] of spellings) {
    const unique = [...new Set(rawSpellings)].sort(compareUtf8Paths);
    if (unique.length < 2) continue;
    diagnostics.push(
      catalogDiagnostic(
        "context_override_path_unicode_collision",
        "error",
        `Context file overrides ${unique.join(", ")} normalize to the same NFC repository path ${relative}`,
        { path: relative },
      ),
    );
  }
  return { values: normalized, diagnostics };
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

function projectAreas(areas: ContextCatalog["areas"]): ContextCatalog["areas"] {
  return areas
    .map((area) => ({
      ...area,
      id: area.id.normalize("NFC"),
      root: normalizeContextPath(area.root),
      context: normalizeContextPath(area.context),
      forbidden_runtime_dependencies: [...area.forbidden_runtime_dependencies]
        .map((entry) => entry.normalize("NFC"))
        .sort(compareUtf8Paths),
    }))
    .sort(
      (left, right) =>
        compareUtf8Paths(left.root, right.root) ||
        compareUtf8Paths(left.id, right.id) ||
        compareUtf8Paths(left.context, right.context) ||
        left.line - right.line,
    );
}

function projectRegisteredContexts(
  entries: CatalogRegisteredContext[],
): CatalogRegisteredContext[] {
  return entries
    .map((entry) => ({
      ...entry,
      path: normalizeContextPath(entry.path),
      area: entry.area
        ? {
            ...entry.area,
            id: entry.area.id.normalize("NFC"),
            root: normalizeContextPath(entry.area.root),
            context: normalizeContextPath(entry.area.context),
            forbidden_runtime_dependencies: [
              ...entry.area.forbidden_runtime_dependencies,
            ]
              .map((value) => value.normalize("NFC"))
              .sort(compareUtf8Paths),
          }
        : undefined,
      context: entry.context
        ? {
            ...entry.context,
            path: normalizeContextPath(entry.context.path),
            triggers: [...entry.context.triggers]
              .map((value) => value.normalize("NFC"))
              .sort(compareUtf8Paths),
            default_children: [...entry.context.default_children]
              .map(normalizeContextPath)
              .sort(compareUtf8Paths),
          }
        : undefined,
    }))
    .sort(
      (left, right) =>
        compareUtf8Paths(left.path, right.path) ||
        compareUtf8Paths(left.source, right.source) ||
        compareUtf8Paths(left.role, right.role) ||
        left.line - right.line,
    );
}
