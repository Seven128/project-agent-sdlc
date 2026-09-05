import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes, Root } from "mdast";
import {
  DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH,
  DESIGN_AUTHORITY_SHOWCASE_MARKER,
} from "./design-authority-showcase-types.js";

const MARKER_NAMESPACE = "ty-context-design-showcase";
const EXACT_MARKER =
  /^<!-- ty-context-design-showcase path="docs\/design-system-showcase\/showcase\.manifest\.json" -->$/u;

export function declaredDesignAuthorityShowcase(
  content: string,
): typeof DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH | null {
  const candidates: string[] = [];
  walk(fromMarkdown(content), (node) => {
    if (node.type !== "html") return;
    const raw = node.value.trim();
    if (raw.includes(MARKER_NAMESPACE)) candidates.push(raw);
  });
  if (!candidates.length) return null;
  if (candidates.length > 1)
    invalid(`declaration_duplicate:${candidates.length}`);
  if (!EXACT_MARKER.test(candidates[0]))
    invalid(
      `declaration_noncanonical:expected=${JSON.stringify(DESIGN_AUTHORITY_SHOWCASE_MARKER)}:actual=${diagnostic(candidates[0])}`,
    );
  return DESIGN_AUTHORITY_SHOWCASE_MANIFEST_PATH;
}

function walk(node: Root | Nodes, visit: (node: Nodes) => void): void {
  if (node.type !== "root") visit(node);
  if (!("children" in node)) return;
  for (const child of node.children) walk(child, visit);
}

function diagnostic(value: string): string {
  return JSON.stringify(
    value.length <= 256 ? value : `${value.slice(0, 256)}…(${value.length})`,
  );
}

function invalid(reason: string): never {
  throw new Error(`design_authority_showcase_invalid:${reason}`);
}
