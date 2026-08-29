import { compareUtf8Paths } from "../context-catalog/catalog-paths.js";
import type { ContextCatalog } from "../context-catalog/catalog-types.js";
import type { ContextRole } from "../context-catalog/catalog-portable-contract.js";
import type { ContextMarkdownCatalogAnalysis } from "../context-markdown/context-markdown-types.js";
import type {
  ContextInspectResult,
  ContextInspectRoute,
} from "./context-inspect-types.js";

const CORE_ROLES = new Map<string, ContextRole>([
  ["project_context/global.md", "global"],
  ["project_context/architecture.md", "architecture"],
]);

export function projectContextInspection(input: {
  catalog: ContextCatalog;
  markdown: ContextMarkdownCatalogAnalysis;
  context_path: string;
  route: ContextInspectRoute | null;
}): ContextInspectResult {
  const fileAnalysis = input.markdown.files.find(
    (candidate) => candidate.path === input.context_path,
  );
  if (!fileAnalysis)
    throw new Error(`Context Markdown analysis omitted ${input.context_path}`);
  const registered = input.catalog.registered_contexts.find(
    (candidate) => candidate.path === input.context_path,
  );
  const coreRole = CORE_ROLES.get(input.context_path);
  const reasons = [
    ...(input.catalog.default_footprint.get(input.context_path) ?? []),
  ].sort();
  const declarationKeys = new Set(
    fileAnalysis.declarations.map((entry) => `${entry.type}\0${entry.id}`),
  );
  return {
    schema_version: 1,
    path: input.context_path,
    registration:
      registered || coreRole !== undefined ? "registered" : "unregistered",
    source: coreRole !== undefined ? "core" : (registered?.source ?? null),
    role: coreRole ?? registered?.role ?? null,
    read_policy: registered?.read_policy ?? null,
    read_when: registered?.context?.read_when ?? null,
    triggers: [...(registered?.context?.triggers ?? [])],
    default_children: [...(registered?.context?.default_children ?? [])],
    bytes: fileAnalysis.bytes,
    default_footprint: {
      selected: reasons.length > 0,
      reasons,
    },
    referenced_by: input.markdown.references
      .filter(
        (reference) =>
          reference.status === "valid" &&
          reference.target_path === input.context_path,
      )
      .sort(referenceOrder),
    references: [...fileAnalysis.references].sort(referenceOrder),
    stable_key_declarations: fileAnalysis.declarations,
    stable_key_conflicts: input.markdown.declaration_conflicts.filter(
      (conflict) => declarationKeys.has(`${conflict.type}\0${conflict.id}`),
    ),
    route: input.route,
    diagnostics: input.catalog.diagnostics.filter(
      (diagnostic) =>
        diagnostic.severity === "error" ||
        diagnostic.path === undefined ||
        diagnostic.path === input.context_path,
    ),
  };
}

function referenceOrder(
  left: ContextInspectResult["references"][number],
  right: ContextInspectResult["references"][number],
): number {
  return (
    compareUtf8Paths(left.source_path, right.source_path) ||
    left.line - right.line ||
    left.column - right.column ||
    compareUtf8Paths(left.destination, right.destination)
  );
}
