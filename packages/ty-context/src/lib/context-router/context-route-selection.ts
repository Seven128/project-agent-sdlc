import type {
  CatalogFile,
  ContextCatalog,
} from "../context-catalog/catalog-types.js";
import {
  addReason,
  projectCandidates,
  type MutableCandidate,
} from "./context-route-candidates.js";
import type { ContextRouteFileMatches } from "./context-route-scan.js";
import { normalizeRouteText } from "./context-route-terms.js";
import type {
  ContextRouteCandidate,
  ContextRouteDefaultEntry,
} from "./context-route-types.js";
import type { ContextRoutePathMatch } from "./context-route-paths.js";

export function selectContextRouteCandidates(input: {
  catalog: ContextCatalog;
  default_context: ContextRouteDefaultEntry[];
  path_matches: ContextRoutePathMatch[];
  literal_matches: Map<string, ContextRouteFileMatches>;
  includes: CatalogFile[];
  task: string;
  case_sensitive: boolean;
}): {
  registered: ContextRouteCandidate[];
  unregistered: ContextRouteCandidate[];
} {
  const registeredByPath = new Map(
    input.catalog.registered_contexts.map((entry) => [entry.path, entry]),
  );
  const filesByPath = new Map(
    input.catalog.context_files.map((entry) => [entry.path, entry]),
  );
  const candidates = new Map<string, MutableCandidate>();
  addDefaultCandidates(
    candidates,
    input.catalog,
    filesByPath,
    registeredByPath,
    input.default_context,
  );
  addPathCandidates(
    candidates,
    input.catalog,
    filesByPath,
    registeredByPath,
    input.path_matches,
  );
  addTriggerCandidates(
    candidates,
    input.catalog,
    filesByPath,
    registeredByPath,
    input.task,
    input.case_sensitive,
  );
  addLiteralCandidates(
    candidates,
    input.catalog,
    filesByPath,
    registeredByPath,
    input.literal_matches,
  );
  addManualCandidates(
    candidates,
    input.catalog,
    filesByPath,
    registeredByPath,
    input.includes,
  );
  const registered: MutableCandidate[] = [];
  const unregistered: MutableCandidate[] = [];
  for (const candidate of candidates.values())
    (candidate.registration === "registered" ? registered : unregistered).push(
      candidate,
    );
  return {
    registered: projectCandidates(registered),
    unregistered: projectCandidates(unregistered),
  };
}

type CandidateMap = Map<string, MutableCandidate>;
type RegisteredMap = Map<string, ContextCatalog["registered_contexts"][number]>;
type FileMap = Map<string, CatalogFile>;

function addDefaultCandidates(
  candidates: CandidateMap,
  catalog: ContextCatalog,
  files: FileMap,
  registered: RegisteredMap,
  defaults: ContextRouteDefaultEntry[],
): void {
  for (const entry of defaults) {
    if (!registered.has(entry.path)) continue;
    addReason(candidates, catalog, files, registered, entry.path, {
      kind: "default",
      input: entry.reasons.join(","),
      detail: "registered Context belongs to the unchanged default footprint",
    });
  }
}

function addPathCandidates(
  candidates: CandidateMap,
  catalog: ContextCatalog,
  files: FileMap,
  registered: RegisteredMap,
  matches: ContextRoutePathMatch[],
): void {
  for (const match of matches)
    addReason(
      candidates,
      catalog,
      files,
      registered,
      match.area.context,
      {
        kind: "path",
        input: match.input,
        detail: `deepest Area ${match.area.id} at ${match.area.root}`,
      },
      "path_candidates",
      match.normalized_path,
    );
}

function addTriggerCandidates(
  candidates: CandidateMap,
  catalog: ContextCatalog,
  files: FileMap,
  registered: RegisteredMap,
  task: string,
  caseSensitive: boolean,
): void {
  const normalizedTask = normalizeRouteText(task, caseSensitive);
  for (const entry of catalog.registered_contexts)
    for (const trigger of entry.context?.triggers ?? []) {
      if (!normalizedTask.includes(normalizeRouteText(trigger, caseSensitive)))
        continue;
      addReason(
        candidates,
        catalog,
        files,
        registered,
        entry.path,
        {
          kind: "trigger",
          input: trigger,
          detail: "Manifest trigger occurs literally in task text",
        },
        "trigger_candidates",
      );
    }
}

function addLiteralCandidates(
  candidates: CandidateMap,
  catalog: ContextCatalog,
  files: FileMap,
  registered: RegisteredMap,
  matchesByPath: Map<string, ContextRouteFileMatches>,
): void {
  for (const [contextPath, matches] of matchesByPath) {
    const candidate = addReason(
      candidates,
      catalog,
      files,
      registered,
      contextPath,
      {
        kind: "literal",
        input: matches.matched_terms.join(", "),
        detail: "bounded literal search matched Context text",
      },
      "literal_candidates",
    );
    candidate.matches = matches.matches;
    candidate.matched_terms = matches.matched_terms;
  }
}

function addManualCandidates(
  candidates: CandidateMap,
  catalog: ContextCatalog,
  files: FileMap,
  registered: RegisteredMap,
  includes: CatalogFile[],
): void {
  for (const file of includes)
    addReason(
      candidates,
      catalog,
      files,
      registered,
      file.path,
      {
        kind: "manual_include",
        input: file.path,
        detail: "caller explicitly included this eligible Context file",
      },
      "manual_includes",
    );
}
