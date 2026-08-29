import path from "node:path";
import type { ContextManifest } from "../context-manifest-schema.js";
import {
  CONTEXT_LEGACY_READ_POLICY_SET,
  isContextReadPolicy,
  normalizeContextRole,
} from "./catalog-portable-contract.js";
import { catalogDiagnostic } from "./catalog-diagnostics.js";
import { normalizeContextPath } from "./catalog-paths.js";
import {
  looksLikeContextExportArtifact,
  type CatalogPathErrorReporter,
  validateCatalogManifestPath,
} from "./catalog-path-validation.js";
import type {
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

  if (manifest.areas.length === 0) {
    addError(
      "manifest_area_missing",
      "project_context/context.toml must declare at least one [[areas]] entry",
    );
  }

  const areaIds = new Set<string>();
  const registeredPaths = new Set<string>();
  const defaultAreas = manifest.areas.filter((area) => area.default);
  if (manifest.areas.length > 0 && defaultAreas.length !== 1) {
    addError(
      "manifest_default_area_count",
      `project_context/context.toml must mark exactly one [[areas]] entry with default = true; found ${defaultAreas.length}`,
    );
  }

  for (const area of manifest.areas) {
    if (areaIds.has(area.id)) {
      addError(
        "manifest_area_id_duplicate",
        `project_context/context.toml has duplicate area id: ${area.id}`,
        { line: area.line },
      );
    }
    areaIds.add(area.id);
    await validateCatalogManifestPath(
      projectRoot,
      area.root,
      projectRoot,
      `area ${area.id} root`,
      false,
      addError,
      fileOverrides,
      directoryOverrides,
    );
    const relative = normalizeContextPath(area.context);
    if (registeredPaths.has(relative)) {
      addError(
        "manifest_context_path_duplicate",
        `project_context/context.toml has duplicate Context path: ${relative}`,
        { path: relative, line: area.line },
      );
    }
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
    );
  }

  for (const context of manifest.contexts) {
    const relative = normalizeContextPath(context.path);
    if (registeredPaths.has(relative)) {
      addError(
        "manifest_context_path_duplicate",
        `project_context/context.toml has duplicate Context path: ${relative}`,
        { path: relative, line: context.line },
      );
    }
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
