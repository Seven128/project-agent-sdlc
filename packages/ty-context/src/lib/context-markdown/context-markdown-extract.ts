import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes, Root } from "mdast";
import type {
  ContextInvalidDeclaration,
  ContextMarkdownRawReference,
  ContextStableKeyDeclaration,
} from "./context-markdown-types.js";

const DECLARATION =
  /^<!--\s*ty-context-declare\s+([A-Z][A-Za-z0-9]*-ID):\s*([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\s*-->$/u;

export interface ContextMarkdownExtraction {
  references: ContextMarkdownRawReference[];
  declarations: ContextStableKeyDeclaration[];
  invalid_declarations: ContextInvalidDeclaration[];
}

export function extractContextMarkdown(
  content: string,
  sourcePath: string,
): ContextMarkdownExtraction {
  const tree = fromMarkdown(content);
  const references: ContextMarkdownRawReference[] = [];
  const declarations: ContextStableKeyDeclaration[] = [];
  const invalidDeclarations: ContextInvalidDeclaration[] = [];
  walk(tree, (node) => {
    const line = node.position?.start.line ?? 1;
    const column = node.position?.start.column ?? 1;
    if (node.type === "link")
      references.push({
        destination: node.url,
        kind: "inline",
        line,
        column,
      });
    else if (node.type === "definition")
      references.push({
        destination: node.url,
        kind: "definition",
        line,
        column,
      });
    else if (node.type === "text") {
      for (const angle of angleDestinations(node.value))
        references.push({
          destination: angle.value,
          kind: "angle",
          line,
          column: column + angle.code_point_offset,
        });
    } else if (node.type === "html") {
      const raw = node.value.trim();
      const declaration = DECLARATION.exec(raw);
      if (declaration)
        declarations.push({
          type: declaration[1],
          id: declaration[2],
          path: sourcePath,
          line,
          column,
        });
      else if (raw.includes("ty-context-declare"))
        invalidDeclarations.push({
          path: sourcePath,
          raw,
          line,
          column,
          reason:
            "declaration must be an exact HTML comment with <Type-ID>: <UPPERCASE-ID-PARTS>",
        });
      else if (raw.startsWith("<") && raw.endsWith(">")) {
        const destination = raw.slice(1, -1).trim();
        if (looksLikeLocalAngle(destination))
          references.push({
            destination,
            kind: "angle",
            line,
            column,
          });
      }
    }
  });
  return {
    references,
    declarations,
    invalid_declarations: invalidDeclarations,
  };
}

function walk(node: Root | Nodes, visit: (node: Nodes) => void): void {
  if (node.type !== "root") visit(node);
  if (!("children" in node)) return;
  for (const child of node.children) walk(child, visit);
}

function angleDestinations(
  value: string,
): Array<{ value: string; code_point_offset: number }> {
  const result: Array<{ value: string; code_point_offset: number }> = [];
  const points = Array.from(value);
  for (let index = 0; index < points.length; index += 1) {
    if (points[index] !== "<") continue;
    const end = points.indexOf(">", index + 1);
    if (end < 0) break;
    const candidate = points
      .slice(index + 1, end)
      .join("")
      .trim();
    if (looksLikeLocalAngle(candidate))
      result.push({ value: candidate, code_point_offset: index });
    index = end;
  }
  return result;
}

function looksLikeLocalAngle(value: string): boolean {
  if (!value || Array.from(value).some((point) => /\s/u.test(point)))
    return false;
  return (
    value.startsWith(".") ||
    value.startsWith("/") ||
    value.startsWith("project_context") ||
    value.includes("/") ||
    value.includes("\\") ||
    value.toLowerCase().endsWith(".md")
  );
}
