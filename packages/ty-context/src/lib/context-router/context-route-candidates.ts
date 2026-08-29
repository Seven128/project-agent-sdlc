import { compareUtf8Paths } from "../context-catalog/catalog-paths.js";
import type {
  CatalogFile,
  CatalogRegisteredContext,
  ContextCatalog,
} from "../context-catalog/catalog-types.js";
import { CONTEXT_LEGACY_READ_POLICY_SET } from "../context-catalog/catalog-portable-contract.js";
import { CONTEXT_ROUTE_SCHEMA_VERSION } from "./context-route-budget.js";
import type {
  ContextRouteBudgetExceeded,
  ContextRouteCandidate,
  ContextRouteDefaultEntry,
  ContextRouteGroup,
  ContextRouteReason,
  ContextRouteResult,
} from "./context-route-types.js";

export interface MutableCandidate extends Omit<
  ContextRouteCandidate,
  "cumulative_bytes"
> {
  group_set: Set<ContextRouteGroup>;
  reason_keys: Set<string>;
}

export function addReason(
  candidates: Map<string, MutableCandidate>,
  catalog: ContextCatalog,
  filesByPath: Map<string, CatalogFile>,
  registeredByPath: Map<string, CatalogRegisteredContext>,
  contextPath: string,
  reason: ContextRouteReason,
  group?: ContextRouteGroup,
  matchedPath?: string,
): MutableCandidate {
  const registered = registeredByPath.get(contextPath);
  const file = filesByPath.get(contextPath);
  const current =
    candidates.get(contextPath) ??
    createCandidate(catalog, registered, file, contextPath);
  if (group) current.group_set.add(group);
  if (matchedPath && !current.matched_paths.includes(matchedPath))
    current.matched_paths.push(matchedPath);
  const reasonKey = `${reason.kind}\0${reason.input}\0${reason.detail}`;
  if (!current.reason_keys.has(reasonKey)) {
    current.reason_keys.add(reasonKey);
    current.reasons.push(reason);
  }
  candidates.set(contextPath, current);
  return current;
}

export function projectCandidates(
  values: MutableCandidate[],
): ContextRouteCandidate[] {
  const result = [...values].sort((left, right) =>
    compareUtf8Paths(left.path, right.path),
  );
  let cumulative = 0;
  return result.map(({ group_set, reason_keys: _reasonKeys, ...entry }) => {
    cumulative += entry.bytes;
    return {
      ...entry,
      groups: [...group_set],
      matched_paths: [...entry.matched_paths].sort(compareUtf8Paths),
      cumulative_bytes: cumulative,
    };
  });
}

export function defaultEntries(
  catalog: ContextCatalog,
): ContextRouteDefaultEntry[] {
  const files = new Map(
    catalog.context_files.map((entry) => [entry.path, entry]),
  );
  const values = [...catalog.default_footprint.entries()].sort(
    ([left], [right]) => compareUtf8Paths(left, right),
  );
  let cumulative = 0;
  return values.map(([contextPath, reasons]) => {
    const bytes =
      contextPath === catalog.manifest_path
        ? Buffer.byteLength(catalog.manifest_content ?? "", "utf8")
        : (files.get(contextPath)?.bytes ?? 0);
    cumulative += bytes;
    return {
      path: contextPath,
      reasons: [...reasons].sort(),
      bytes,
      cumulative_bytes: cumulative,
    };
  });
}

export function emptyResult(input: {
  catalog: ContextCatalog;
  caseSensitive: boolean;
  defaultContext: ContextRouteDefaultEntry[];
  exceeded: ContextRouteBudgetExceeded[];
}): ContextRouteResult {
  return {
    schema_version: CONTEXT_ROUTE_SCHEMA_VERSION,
    complete: false,
    catalog_valid: false,
    experimental: true,
    authority: false,
    workflow_search_replaced: false,
    matching: {
      literal: true,
      unicode_normalization: "NFC",
      case_sensitive: input.caseSensitive,
    },
    scan: {
      files_considered: input.catalog.context_files.length,
      files_scanned: 0,
      bytes_scanned: 0,
      budget_exceeded: input.exceeded.length > 0,
      exceeded: stableExceeded(input.exceeded),
    },
    output_truncated: false,
    default_context: input.defaultContext,
    candidates: [],
    unregistered_matches: [],
    ambiguous: [],
    unresolved: [],
    diagnostics: input.catalog.diagnostics,
  };
}

export function stableExceeded(
  values: ContextRouteBudgetExceeded[],
): ContextRouteBudgetExceeded[] {
  const seen = new Set<string>();
  return values.filter((entry) => {
    const key = `${entry.budget}:${entry.path ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function createCandidate(
  catalog: ContextCatalog,
  registered: CatalogRegisteredContext | undefined,
  file: CatalogFile | undefined,
  contextPath: string,
): MutableCandidate {
  const groups = classificationGroups(catalog, registered, contextPath);
  const unregistered = catalog.unregistered_context_files.some(
    (entry) => entry.path === contextPath,
  );
  return {
    path: contextPath,
    registration: unregistered ? "unregistered" : "registered",
    role: registered?.role ?? null,
    read_policy: registered?.read_policy ?? null,
    groups,
    group_set: new Set(groups),
    reasons: [],
    reason_keys: new Set(),
    matched_terms: [],
    matched_paths: [],
    matches: [],
    bytes: file?.bytes ?? 0,
  };
}

function classificationGroups(
  catalog: ContextCatalog,
  registered: CatalogRegisteredContext | undefined,
  contextPath: string,
): ContextRouteGroup[] {
  if (
    catalog.unregistered_context_files.some(
      (entry) => entry.path === contextPath,
    )
  )
    return ["unregistered"];
  const groups: ContextRouteGroup[] = [];
  if (catalog.default_footprint.has(contextPath))
    groups.push("default_registered");
  if (
    registered?.read_policy &&
    CONTEXT_LEGACY_READ_POLICY_SET.has(registered.read_policy)
  )
    groups.push("legacy_registered");
  else if (!catalog.default_footprint.has(contextPath))
    groups.push("on_demand_registered");
  return groups;
}
