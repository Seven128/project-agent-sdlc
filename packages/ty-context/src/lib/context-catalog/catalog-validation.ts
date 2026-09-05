import path from "node:path";
import type { ContextManifest } from "../context-manifest-schema.js";
import {
  CONTEXT_LEGACY_READ_POLICY_SET,
  isContextReadPolicy,
  normalizeContextRole,
} from "./catalog-portable-contract.js";
import { catalogDiagnostic } from "./catalog-diagnostics.js";
import {
  compareUtf8Paths,
  normalizeContextPath,
  normalizeContextPathSpelling,
  portableContextPathCaseKey,
} from "./catalog-paths.js";
import {
  looksLikeContextExportArtifact,
  type CatalogPathErrorReporter,
  validateCatalogManifestPath,
} from "./catalog-path-validation.js";
import type {
  CatalogFile,
  CatalogDiagnostic,
  CatalogRegisteredContext,
} from "./catalog-types.js";

export interface CatalogManifestValidation {
  registered_contexts: CatalogRegisteredContext[];
  roles_by_path: Map<string, CatalogRegisteredContext["role"]>;
  read_policies_by_path: Map<string, string>;
  diagnostics: CatalogDiagnostic[];
}

export async function validateCatalogManifest(
  projectRoot: string,
  manifest: ContextManifest,
  fileOverrides: ReadonlyMap<string, Uint8Array | null> = new Map(),
  directoryOverrides: ReadonlySet<string> = new Set(),
  contextFiles: readonly CatalogFile[] = [],
): Promise<CatalogManifestValidation> {
  const diagnostics: CatalogDiagnostic[] = [];
  const registeredContexts: CatalogRegisteredContext[] = [];
  const rolesByPath = new Map<string, CatalogRegisteredContext["role"]>();
  const readPoliciesByPath = new Map<string, string>();
  const addError = (
    code: string,
    message: string,
    location: { path?: string; line?: number } = {},
  ): void => {
    diagnostics.push(catalogDiagnostic(code, "error", message, location));
  };
  const addWarning = (
    code: string,
    message: string,
    location: { path?: string; line?: number } = {},
  ): void => {
    diagnostics.push(catalogDiagnostic(code, "warning", message, location));
  };

  const areaIds = new Map<string, string>();
  const registeredPaths = new Set<string>();
  const filesByPath = new Map(contextFiles.map((file) => [file.path, file]));
  const registeredPathSpellings = new Map<string, string>();
  const registeredPathCases = new Map<string, string>();
  const defaultAreas = manifest.areas.filter((area) => area.default);
  if (defaultAreas.length > 1) {
    addError(
      "manifest_default_area_count",
      `project_context/context.toml may mark at most one [[areas]] entry with default = true; found ${defaultAreas.length}`,
    );
  }

  const directDefaults = new Set<string>();
  for (const file of [
    "project_context/global.md",
    ...(manifest.default_files ?? []),
  ]) {
    const key = normalizeContextPath(file);
    if (directDefaults.has(key))
      addError(
        "manifest_default_file_duplicate",
        `Duplicate default file: ${file}`,
      );
    directDefaults.add(key);
    await validateCatalogManifestPath(
      projectRoot,
      file,
      path.join(projectRoot, "project_context"),
      "default file",
      true,
      addError,
      fileOverrides,
      directoryOverrides,
      filesByPath,
    );
  }

  for (const area of manifest.areas) {
    const canonicalAreaId = area.id.normalize("NFC");
    const previousAreaId = areaIds.get(canonicalAreaId);
    if (previousAreaId !== undefined) {
      if (previousAreaId === area.id)
        addError(
          "manifest_area_id_duplicate",
          `project_context/context.toml has duplicate area id: ${area.id}`,
          { line: area.line },
        );
      else {
        const aliases = [previousAreaId, area.id].sort(compareUtf8Paths);
        addError(
          "manifest_area_id_unicode_collision",
          `project_context/context.toml area ids ${aliases.join(", ")} normalize to the same NFC id ${canonicalAreaId}`,
          { line: area.line },
        );
      }
    } else areaIds.set(canonicalAreaId, area.id);
    await validateCatalogManifestPath(
      projectRoot,
      area.root,
      projectRoot,
      `area ${area.id} root`,
      false,
      addError,
      fileOverrides,
      directoryOverrides,
      filesByPath,
    );
    const relative = normalizeContextPath(area.context);
    reportRegisteredPathCollision(
      relative,
      area.context,
      area.line,
      registeredPathSpellings,
      registeredPathCases,
      addError,
    );
    registeredPaths.add(relative);
    await addRegisteredContext(
      projectRoot,
      registeredContexts,
      rolesByPath,
      readPoliciesByPath,
      {
        source: "area",
        rawPath: area.context,
        role: "area",
        line: area.line,
        sourceLabel: `area ${area.id}`,
        area,
      },
      addError,
      fileOverrides,
      directoryOverrides,
      filesByPath,
    );
  }

  for (const context of manifest.contexts) {
    const relative = normalizeContextPath(context.path);
    reportRegisteredPathCollision(
      relative,
      context.path,
      context.line,
      registeredPathSpellings,
      registeredPathCases,
      addError,
    );
    registeredPaths.add(relative);
    if (context.read_policy && !isContextReadPolicy(context.read_policy)) {
      addError(
        "manifest_read_policy_unsupported",
        `project_context/context.toml line ${context.line} has unsupported read_policy: ${context.read_policy}`,
        { path: relative, line: context.line },
      );
    }
    if (
      context.read_policy &&
      CONTEXT_LEGACY_READ_POLICY_SET.has(context.read_policy)
    ) {
      addWarning(
        "manifest_read_policy_legacy",
        `project_context/context.toml line ${context.line} uses legacy read_policy ${context.read_policy}; Schema v4 preserves its current selection behavior and migration must be explicit`,
        { path: relative, line: context.line },
      );
    }
    const role = normalizeContextRole(context.role);
    if (!role) {
      addError(
        "manifest_context_role_unsupported",
        `project_context/context.toml line ${context.line} has unsupported context role: ${context.role}`,
        { path: relative, line: context.line },
      );
      continue;
    }
    await addRegisteredContext(
      projectRoot,
      registeredContexts,
      rolesByPath,
      readPoliciesByPath,
      {
        source: "context",
        rawPath: context.path,
        role,
        readPolicy: context.read_policy,
        line: context.line,
        sourceLabel: `context ${context.path}`,
        context,
      },
      addError,
      fileOverrides,
      directoryOverrides,
      filesByPath,
    );
  }

  const contextsByPath = new Map(
    manifest.contexts.map((entry) => [normalizeContextPath(entry.path), entry]),
  );
  for (const context of manifest.contexts) {
    for (const child of context.default_children) {
      const normalizedChild = normalizeContextPath(child);
      if (!registeredPaths.has(normalizedChild)) {
        addError(
          "manifest_default_child_unregistered",
          `project_context/context.toml line ${context.line} default_children references unregistered Context path: ${child}`,
          { path: normalizedChild, line: context.line },
        );
        continue;
      }
      if (
        contextsByPath.get(normalizedChild)?.read_policy === "never-default"
      ) {
        addWarning(
          "manifest_never_default_child_conflict",
          `project_context/context.toml line ${context.line} default_children selects ${normalizedChild} even though its current read_policy is never-default; Schema v4 preserves this behavior and a future migration must remove the edge or change the policy explicitly`,
          { path: normalizedChild, line: context.line },
        );
      }
    }
  }

  return {
    registered_contexts: registeredContexts,
    roles_by_path: rolesByPath,
    read_policies_by_path: readPoliciesByPath,
    diagnostics,
  };
}

function reportRegisteredPathCollision(
  relative: string,
  rawPath: string,
  line: number,
  spellings: Map<string, string>,
  cases: Map<string, string>,
  addError: CatalogPathErrorReporter,
): void {
  const rawSpelling = normalizeContextPathSpelling(rawPath);
  const previous = spellings.get(relative);
  if (previous === undefined) {
    spellings.set(relative, rawSpelling);
  } else if (previous === rawSpelling) {
    addError(
      "manifest_context_path_duplicate",
      `project_context/context.toml has duplicate Context path: ${relative}`,
      { path: relative, line },
    );
  } else {
    const aliases = [previous, rawSpelling].sort(compareUtf8Paths);
    addError(
      "manifest_context_path_unicode_collision",
      `project_context/context.toml Context paths ${aliases.join(", ")} normalize to the same NFC repository path ${relative}`,
      { path: relative, line },
    );
  }
  const caseKey = portableContextPathCaseKey(relative);
  const previousCase = cases.get(caseKey);
  if (previousCase === undefined) cases.set(caseKey, relative);
  else if (previousCase !== relative) {
    const aliases = [previousCase, relative].sort(compareUtf8Paths);
    addError(
      "manifest_context_path_case_collision",
      `project_context/context.toml Context paths ${aliases.join(", ")} collide on a case-insensitive filesystem`,
      { path: aliases[0], line },
    );
  }
}

interface AddRegisteredContextInput {
  source: "area" | "context";
  rawPath: string;
  role: CatalogRegisteredContext["role"];
  readPolicy?: string;
  line: number;
  sourceLabel: string;
  area?: CatalogRegisteredContext["area"];
  context?: CatalogRegisteredContext["context"];
}

async function addRegisteredContext(
  projectRoot: string,
  registeredContexts: CatalogRegisteredContext[],
  rolesByPath: CatalogManifestValidation["roles_by_path"],
  readPoliciesByPath: Map<string, string>,
  input: AddRegisteredContextInput,
  addError: CatalogPathErrorReporter,
  fileOverrides: ReadonlyMap<string, Uint8Array | null>,
  directoryOverrides: ReadonlySet<string>,
  filesByPath: ReadonlyMap<string, CatalogFile>,
): Promise<void> {
  const relative = normalizeContextPath(input.rawPath);
  if (looksLikeContextExportArtifact(relative)) {
    addError(
      "manifest_export_artifact_forbidden",
      `project_context/context.toml ${input.sourceLabel} must not reference temporary export artifact ${input.rawPath}; export artifacts belong in tmp/ty-context/context-exports/** and must not be registered as Context graph nodes or implementation-index`,
      { path: relative, line: input.line },
    );
    return;
  }
  if (!relative.startsWith("project_context/") || !relative.endsWith(".md")) {
    addError(
      "manifest_context_path_invalid",
      `project_context/context.toml ${input.sourceLabel} must reference a markdown file under project_context/: ${input.rawPath}`,
      { path: relative, line: input.line },
    );
    return;
  }
  if (
    !(await validateCatalogManifestPath(
      projectRoot,
      input.rawPath,
      path.join(projectRoot, "project_context"),
      input.sourceLabel,
      true,
      addError,
      fileOverrides,
      directoryOverrides,
      filesByPath,
    ))
  ) {
    return;
  }
  rolesByPath.set(relative, input.role);
  if (input.readPolicy) readPoliciesByPath.set(relative, input.readPolicy);
  registeredContexts.push({
    source: input.source,
    path: relative,
    role: input.role,
    read_policy: input.readPolicy,
    line: input.line,
    area: input.area,
    context: input.context,
  });
}
