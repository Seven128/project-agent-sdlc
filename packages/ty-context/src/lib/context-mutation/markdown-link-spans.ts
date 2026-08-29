import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes, Root } from "mdast";

export type MarkdownDestinationKind =
  "inline" | "image" | "definition" | "angle";

export interface MarkdownDestinationSpan {
  kind: MarkdownDestinationKind;
  destination: string;
  start: number;
  end: number;
  line: number;
  column: number;
}

export function markdownDestinationSpans(
  content: string,
): MarkdownDestinationSpan[] {
  const tree = fromMarkdown(content);
  const spans: MarkdownDestinationSpan[] = [];
  walk(tree, content, spans);
  return spans.sort((left, right) => left.start - right.start);
}

function walk(
  node: Root | Nodes,
  content: string,
  spans: MarkdownDestinationSpan[],
): void {
  if (node.type === "link" || node.type === "image") {
    const located = locateInlineDestination(content, node);
    if (located)
      spans.push({
        ...located,
        kind: node.type === "link" ? "inline" : "image",
        ...lineColumn(content, located.start),
      });
    if (node.type === "link") return;
  } else if (node.type === "definition") {
    const located = locateDefinitionDestination(content, node);
    if (located)
      spans.push({
        ...located,
        kind: "definition",
        ...lineColumn(content, located.start),
      });
  } else if (node.type === "text" || node.type === "html") {
    const start = node.position?.start.offset;
    const end = node.position?.end.offset;
    if (start !== undefined && end !== undefined)
      for (const located of locateLocalAngles(content, start, end))
        spans.push({
          ...located,
          kind: "angle",
          ...lineColumn(content, located.start),
        });
  }
  if (!("children" in node)) return;
  for (const child of node.children) walk(child, content, spans);
}

function locateInlineDestination(
  content: string,
  node: Extract<Nodes, { type: "link" | "image" }>,
): LocatedDestination | null {
  const bounds = nodeBounds(node);
  if (!bounds) return null;
  const raw = content.slice(bounds.start, bounds.end);
  const labelStart = raw.indexOf("[");
  if (labelStart < 0) return null;
  const labelEnd = closingBracket(raw, labelStart);
  if (labelEnd < 0) return null;
  let cursor = skipWhitespace(raw, labelEnd + 1);
  if (raw[cursor] !== "(") return null;
  cursor = skipWhitespace(raw, cursor + 1);
  return destinationAt(content, raw, bounds.start, cursor, ")");
}

function locateDefinitionDestination(
  content: string,
  node: Extract<Nodes, { type: "definition" }>,
): LocatedDestination | null {
  const bounds = nodeBounds(node);
  if (!bounds) return null;
  const raw = content.slice(bounds.start, bounds.end);
  const labelStart = raw.indexOf("[");
  if (labelStart < 0) return null;
  const labelEnd = closingBracket(raw, labelStart);
  if (labelEnd < 0) return null;
  let cursor = skipWhitespace(raw, labelEnd + 1);
  if (raw[cursor] !== ":") return null;
  cursor = skipWhitespace(raw, cursor + 1);
  return destinationAt(content, raw, bounds.start, cursor, "line");
}

interface LocatedDestination {
  destination: string;
  start: number;
  end: number;
}

function destinationAt(
  content: string,
  raw: string,
  absoluteStart: number,
  cursor: number,
  terminator: ")" | "line",
): LocatedDestination | null {
  if (raw[cursor] === "<") {
    const end = unescapedIndex(raw, ">", cursor + 1);
    return end < 0
      ? null
      : located(content, absoluteStart + cursor + 1, absoluteStart + end);
  }
  const start = cursor;
  let depth = 0;
  while (cursor < raw.length) {
    const character = raw[cursor];
    if (character === "\\") {
      cursor += 2;
      continue;
    }
    if (character === "(" && terminator === ")") depth += 1;
    else if (character === ")" && terminator === ")") {
      if (depth === 0) break;
      depth -= 1;
    } else if (/\s/u.test(character) && depth === 0) break;
    cursor += 1;
  }
  return located(content, absoluteStart + start, absoluteStart + cursor);
}

function locateLocalAngles(
  content: string,
  start: number,
  end: number,
): LocatedDestination[] {
  const result: LocatedDestination[] = [];
  for (let cursor = start; cursor < end; cursor += 1) {
    if (content[cursor] !== "<") continue;
    const close = content.indexOf(">", cursor + 1);
    if (close < 0 || close >= end) break;
    const candidate = content.slice(cursor + 1, close);
    if (looksLikeLocalAngle(candidate))
      result.push(located(content, cursor + 1, close));
    cursor = close;
  }
  return result;
}

function located(
  content: string,
  start: number,
  end: number,
): LocatedDestination {
  return { destination: content.slice(start, end), start, end };
}

function closingBracket(raw: string, start: number): number {
  let depth = 0;
  for (let cursor = start; cursor < raw.length; cursor += 1) {
    if (raw[cursor] === "\\") {
      cursor += 1;
      continue;
    }
    if (raw[cursor] === "[") depth += 1;
    else if (raw[cursor] === "]") {
      depth -= 1;
      if (depth === 0) return cursor;
    }
  }
  return -1;
}

function unescapedIndex(raw: string, character: string, start: number): number {
  for (let cursor = start; cursor < raw.length; cursor += 1) {
    if (raw[cursor] === "\\") cursor += 1;
    else if (raw[cursor] === character) return cursor;
  }
  return -1;
}

function skipWhitespace(raw: string, start: number): number {
  let cursor = start;
  while (cursor < raw.length && /\s/u.test(raw[cursor])) cursor += 1;
  return cursor;
}

function nodeBounds(node: Nodes): { start: number; end: number } | null {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? null : { start, end };
}

function lineColumn(
  content: string,
  offset: number,
): { line: number; column: number } {
  const prefix = content.slice(0, offset);
  const lines = prefix.split(/\r\n?|\n/u);
  return {
    line: lines.length,
    column: Array.from(lines.at(-1) ?? "").length + 1,
  };
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
