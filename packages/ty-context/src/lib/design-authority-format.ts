import { DESIGN_AUTHORITY_BUNDLE_MARKER } from "./design-authority-types.js";
import { parseStrictYaml } from "./strict-codec.js";

export type DesignAuthorityDeclaredFormat = "bundle-v1" | null;

export function declaredDesignAuthorityFormat(
  content: string,
): DesignAuthorityDeclaredFormat {
  const lines = content.replace(/\r\n?/gu, "\n").split("\n");
  const frontmatter = markdownFrontmatter(lines);
  const bodyStart = frontmatter.body_start;
  const markers = machineMarkerLines(lines, bodyStart);
  const noncanonical = markers.find(
    (entry) => entry.line.trim() === DESIGN_AUTHORITY_BUNDLE_MARKER &&
      entry.line !== DESIGN_AUTHORITY_BUNDLE_MARKER,
  );
  if (noncanonical)
    invalid(`bundle_marker_noncanonical:line=${noncanonical.index + 1}`);
  const exact = markers.filter(
    (entry) => entry.line === DESIGN_AUTHORITY_BUNDLE_MARKER,
  );
  if (exact.length > 1) invalid("bundle_marker_duplicate");
  if (frontmatter.unclosed && exact.length)
    invalid("bundle_entry_frontmatter_unclosed");
  const firstBodyLine = lines.findIndex(
    (line, index) => index >= bodyStart && line.trim().length > 0,
  );
  if (exact.length === 0) return null;
  if (firstBodyLine !== exact[0].index)
    invalid(`bundle_marker_misplaced:line=${exact[0].index + 1}`);
  if (frontmatter.source !== null)
    try {
      parseStrictYaml(frontmatter.source);
    } catch (error) {
      invalid(`bundle_entry_frontmatter_invalid:${message(error)}`);
    }
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
): { index: number; line: string }[] {
  const result: { index: number; line: string }[] = [];
  let fence: { marker: "`" | "~"; width: number } | null = null;
  for (let index = bodyStart; index < lines.length; index += 1) {
    const line = lines[index];
    const opening = /^\s*(`{3,}|~{3,})/u.exec(line);
    if (opening) {
      const marker = opening[1][0] as "`" | "~";
      if (!fence) fence = { marker, width: opening[1].length };
      else if (fence.marker === marker && opening[1].length >= fence.width)
        fence = null;
      continue;
    }
    if (!fence && line.trim() === DESIGN_AUTHORITY_BUNDLE_MARKER)
      result.push({ index, line });
  }
  return result;
}

function invalid(reason: string): never {
  throw new Error(`design_authority_invalid:${reason}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
