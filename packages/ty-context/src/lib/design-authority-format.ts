import { DESIGN_AUTHORITY_BUNDLE_MARKER } from "./design-authority-types.js";
import { parseStrictYaml } from "./strict-codec.js";

export type DesignAuthorityDeclaredFormat = "bundle-v1" | null;

const DESIGN_AUTHORITY_FORMAT_NAMESPACE = "ty-context-design-authority-format";
const WHOLE_LINE_HTML_COMMENT = /^\s*<!--([\s\S]*?)-->\s*$/u;

export function declaredDesignAuthorityFormat(
  content: string,
): DesignAuthorityDeclaredFormat {
  const lines = content.replace(/\r\n?/gu, "\n").split("\n");
  const frontmatter = markdownFrontmatter(lines);
  const markers = machineMarkerLines(
    lines,
    frontmatter.body_start,
    frontmatter.unclosed,
  );
  const noncanonical = markers.find(
    (entry) => entry.line !== DESIGN_AUTHORITY_BUNDLE_MARKER,
  );
  if (noncanonical) invalidNoncanonicalMarker(noncanonical);
  if (markers.length === 0) return null;

  const bodyStart = frontmatter.body_start;
  if (frontmatter.unclosed)
    invalid(
      `bundle_marker_noncanonical:line=${markers[0].index + 1}:frontmatter_unclosed`,
    );
  if (frontmatter.source !== null)
    try {
      parseStrictYaml(frontmatter.source);
    } catch (error) {
      invalid(
        `bundle_marker_noncanonical:line=${markers[0].index + 1}:frontmatter_invalid:${message(error)}`,
      );
    }
  if (markers.length > 1) invalid("bundle_marker_duplicate");
  const firstBodyLine = lines.findIndex(
    (line, index) => index >= bodyStart && line.trim().length > 0,
  );
  if (firstBodyLine !== markers[0].index)
    invalid(`bundle_marker_misplaced:line=${markers[0].index + 1}`);
  return "bundle-v1";
}

function markdownFrontmatter(lines: string[]): {
  body_start: number;
  source: string | null;
  unclosed: boolean;
} {
  if (lines[0] !== "---")
    return { body_start: 0, source: null, unclosed: false };
  for (let index = 1; index < lines.length; index += 1)
    if (lines[index] === "---")
      return {
        body_start: index + 1,
        source: lines.slice(1, index).join("\n"),
        unclosed: false,
      };
  return { body_start: 1, source: null, unclosed: true };
}

function machineMarkerLines(
  lines: string[],
  bodyStart: number,
  frontmatterUnclosed: boolean,
): { index: number; line: string }[] {
  const result: { index: number; line: string }[] = [];
  let fence: { marker: "`" | "~"; width: number } | null = null;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (frontmatterUnclosed || index < bodyStart) {
      if (isReservedFormatComment(line)) result.push({ index, line });
      continue;
    }
    const fenceLine = /^\s*(`{3,}|~{3,})(.*)$/u.exec(line);
    if (fence) {
      if (
        fenceLine &&
        fence.marker === fenceLine[1][0] &&
        fenceLine[1].length >= fence.width &&
        fenceLine[2].trim().length === 0
      )
        fence = null;
      continue;
    }
    if (fenceLine) {
      fence = {
        marker: fenceLine[1][0] as "`" | "~",
        width: fenceLine[1].length,
      };
      continue;
    }
    if (isReservedFormatComment(line)) result.push({ index, line });
  }
  return result;
}

function isReservedFormatComment(line: string): boolean {
  const comment = WHOLE_LINE_HTML_COMMENT.exec(line);
  return Boolean(
    comment &&
    comment[1].toLowerCase().includes(DESIGN_AUTHORITY_FORMAT_NAMESPACE),
  );
}

function invalidNoncanonicalMarker(entry: {
  index: number;
  line: string;
}): never {
  invalid(
    `bundle_marker_noncanonical:line=${entry.index + 1}:expected=${JSON.stringify(DESIGN_AUTHORITY_BUNDLE_MARKER)}:actual=${diagnosticLine(entry.line)}`,
  );
}

function diagnosticLine(line: string): string {
  const limit = 256;
  return JSON.stringify(
    line.length <= limit
      ? line
      : `${line.slice(0, limit)}…(${line.length} chars)`,
  );
}

function invalid(reason: string): never {
  throw new Error(`design_authority_invalid:${reason}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
