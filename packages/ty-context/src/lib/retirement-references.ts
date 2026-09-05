import { readFile } from "node:fs/promises";
import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import { extractContextMarkdown } from "./context-markdown/context-markdown-extract.js";
import { resolveContextControllingSourceDeclaration } from "./context-controlling-source.js";
import type { ContextCatalog } from "./context-catalog/catalog-types.js";
import type { RetirementFile } from "./retirement-assets.js";

// A one-time, bounded migration review. This is neither a historical-resource
// compiler nor a general link validator. Only declared controlling inputs and
// executable package scripts are blocking dependencies here.
export async function inspectRetirementReferences(
  repository: string,
  catalog: ContextCatalog,
  changes: RetirementFile[],
) {
  const blockers: string[] = [],
    review: string[] = [];
  const files = new Set(catalog.context_files.map((file) => file.path));
  files.add("DESIGN.md");
  files.add("AGENTS.override.md");
  const queue = [...files].map((file) => ({
    file,
    required: false,
    via: file,
  }));
  const visited = new Set<string>();
  while (queue.length) {
    const { file, required, via } = queue.shift()!;
    const key = `${required}:${file}`;
    if (visited.has(key)) continue;
    visited.add(key);
    let state;
    try {
      state = await captureMutationFileState(repository, file);
    } catch (error) {
      (required ? blockers : review).push(
        `${via} -> ${file}: ${String(error)}`,
      );
      continue;
    }
    if (!state.exists) {
      if (required)
        blockers.push(`${via} -> ${file}: required local input missing`);
      continue;
    }
    if (Number(state.identity?.size ?? 0) > 2_000_000) {
      (required ? blockers : review).push(
        `${via} -> ${file}: exceeds the 2 MB migration inspection scope; extract necessary requirements and source locations before retiring its decoder`,
      );
      continue;
    }
    const content = Buffer.from(state.bytes_base64!, "base64").toString("utf8");
    const retiredRepresentation =
      /(?:semantic-fact-compact-carrier-v1|long-task-compact-carrier-v1|design-resource-handoff-v2|symbolic_rules_v2|symbolic-denotation-canonical-dag-v1|design-resource-symbolic-source-ir-v1)/.exec(
        content,
      );
    if (required && retiredRepresentation)
      blockers.push(
        `${via} -> ${file}: ${retiredRepresentation[0]} requires retired interpretation; extract the required values, adopted decisions and locators into a directly readable source with provenance, then update the controlling reference`,
      );
    if (!file.endsWith(".md")) continue;
    const parsed = extractContextMarkdown(content, file);
    for (const declaration of parsed.controlling_sources) {
      const resolved = await resolveContextControllingSourceDeclaration(
        repository,
        declaration,
      );
      const locator = `${file}:${declaration.line} (${declaration.declared_path})`;
      if (resolved.status !== "valid" || !resolved.target_path)
        blockers.push(`${locator}: ${resolved.detail ?? resolved.status}`);
      else
        queue.push({
          file: resolved.target_path,
          required: true,
          via: locator,
        });
    }
    for (const reference of parsed.references)
      if (!/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference.destination))
        review.push(
          `${file}:${reference.line}: follow local resource ${reference.destination} if still selected; ordinary links and historical examples are not migration blockers or compiler-resolved inputs`,
        );
    content.split(/\r?\n/).forEach((line, index) => {
      if (
        /Final Gate|\$long-task-workflow|\bty-context\s+(?:long-task|design-resource|design-authority)\b/.test(
          line,
        )
      )
        review.push(
          `${file}:${index + 1}: review old workflow wording; retain historical facts and independent user constraints, revise any still-effective requirement explicitly`,
        );
    });
  }
  const packages = new Set([
    "package.json",
    ...catalog.areas.map(
      (area) => `${area.root.replace(/\/$/, "")}/package.json`,
    ),
  ]);
  for (const file of packages) {
    try {
      const state = await captureMutationFileState(repository, file);
      if (!state.exists) continue;
      const raw = JSON.parse(
        Buffer.from(state.bytes_base64!, "base64").toString("utf8"),
      );
      for (const [name, command] of Object.entries(raw.scripts ?? {}))
        if (typeof command === "string" && retiredCommand(command))
          blockers.push(
            `${file} scripts.${name}: invokes a retired command; replace or move the build dependency and verify its derived outputs before upgrading`,
          );
    } catch (error) {
      blockers.push(
        `${file}: build configuration could not be inspected: ${String(error)}`,
      );
    }
  }
  const makeChange = changes.find((file) => file.path === "Makefile");
  const makeState = await captureMutationFileState(repository, "Makefile");
  const make = makeChange
    ? (makeChange.after ?? "")
    : makeState.exists
      ? Buffer.from(makeState.bytes_base64!, "base64").toString("utf8")
      : "";
  make.split(/\r?\n/).forEach((line, index) => {
    if (/^\t/.test(line) && retiredCommand(line))
      blockers.push(
        `Makefile:${index + 1}: retained recipe invokes a retired command; replace its build dependency before upgrade`,
      );
  });
  review.push(
    "Inspected declared controlling-source inputs, Context/DESIGN local links, root and manifest-Area package scripts, and retained Makefile recipes. Direct Markdown/JSON/YAML fields stay readable. Structured IDs, compact expansion, symbolic evaluation, arbitrary CI/shell indirection and unreferenced history are not interpreted; review current task/selected resources and other build entrypoints separately. Project-information migration is not automatically certified.",
  );
  return { blockers, review: [...new Set(review)] };
}

function retiredCommand(value: string): boolean {
  return /(?:\bty-context|(?:^|[\s"'])[^\s"']*dist[\\/]cli\.js)["']?\s+(?:long-task|design-resource|design-authority|validate-harness|validate-code-modularity|check-modularity|route|enable|disable|delivery-set|composite-long-task|composite-campaign)\b/.test(
    value,
  );
}
