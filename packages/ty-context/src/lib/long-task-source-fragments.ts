import type {
  CompiledSourceItemV2,
  MaterialFragmentScanResultV2,
  MaterialSourceFragmentKind,
  MaterialSourceFragmentV2,
  MaterialTextInputV2,
  SourceAuthorityDomain,
} from "./long-task-source-authority-types.js";
import { sha256Hex } from "./strict-codec.js";

export {
  deriveSemanticSourceAnchors,
  semanticSourceAnchorRef,
} from "./long-task-source-anchors.js";

const FENCE_START = /^\s*(`{3,}|~{3,})([^`]*)$/u;
const TABLE_ROW = /^\s*\|.*\|\s*$/u;
const TABLE_SEPARATOR = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/u;
const MARKDOWN_SEPARATOR =
  /^\s{0,3}((?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})$/u;
const HEADING = /^\s{0,3}#{1,6}(?:\s+\S|\s*$)/u;
const BLOCKQUOTE = /^\s{0,3}>/u;
const TEXTUAL_HTML = /^\s*<(?:[A-Za-z][A-Za-z0-9:-]*(?:\s|>|\/)|!--)/u;
const GIVEN_WHEN_THEN =
  /^\s*(?:(?:[-*+] |\d+[.)] ))?(?:(?:Given|When|Then|And|But)\b|(?:假如|当|那么|并且|但是)(?=\s|[:：]))/iu;
const LIST_ITEM = /^\s*(?:[-*+] |\d+[.)] )\S/u;
const STRUCTURED_CONFIG =
  /^\s*(?:(?:["']?[A-Za-z_][\w.-]*["']?)\s*[:=]\s*\S|--[a-z0-9][a-z0-9-]*(?:[ =]\S+)?|[A-Z][A-Z0-9_]*\s*=\s*\S)/u;

export function sourceAuthorityDomain(
  item: CompiledSourceItemV2,
  designOwned: boolean,
): SourceAuthorityDomain {
  if (designOwned) return "design";
  if (item.kind === "acceptance") return "acceptance";
  if (item.kind === "external_confirmation") return "external";
  if (
    ["technical_obligation", "forbidden_shortcut", "risk_fact"].includes(
      item.kind,
    )
  )
    return "technical";
  return "product";
}

export function materialSourceFragmentRef(
  fragment: Pick<
    MaterialSourceFragmentV2,
    "input_key" | "ordinal" | "text_sha256"
  >,
): string {
  return `${fragment.input_key}#fragment:${fragment.ordinal}:${fragment.text_sha256.slice(0, 16)}`;
}

export function deriveMaterialSourceFragments(
  item: CompiledSourceItemV2,
  designOwned = false,
): MaterialSourceFragmentV2[] {
  return scanMaterialTextInput({
    input_key: item.key,
    input_kind: "source_item",
    source_ref: item.source_path,
    sha256: item.text_sha256,
    authority_source_item_refs: [item.key],
    authority_domain: sourceAuthorityDomain(item, designOwned),
    normalized_text: item.normalized_text,
  }).fragments;
}

export function scanMaterialTextInput(
  input: MaterialTextInputV2,
): MaterialFragmentScanResultV2 {
  const lines = input.normalized_text.replace(/\r\n?/gu, "\n").split("\n");
  const raw: Array<{
    kind: MaterialSourceFragmentKind;
    start: number;
    end: number;
    text: string;
  }> = [];
  const excludedSeparatorLines: number[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }
    if (isSeparator(lines[index])) {
      excludedSeparatorLines.push(index + 1);
      index += 1;
      continue;
    }
    const fence = FENCE_START.exec(lines[index]);
    if (fence) {
      const start = index;
      const marker = fence[1][0];
      const width = fence[1].length;
      index += 1;
      while (
        index < lines.length &&
        !new RegExp(`^\\s*${escapeRegex(marker)}{${width},}\\s*$`, "u").test(
          lines[index],
        )
      )
        index += 1;
      const end = Math.min(index, lines.length - 1);
      raw.push({
        kind: "fenced_code",
        start,
        end,
        text: lines.slice(start, end + 1).join("\n"),
      });
      index = index < lines.length ? index + 1 : lines.length;
      continue;
    }
    if (HEADING.test(lines[index])) {
      raw.push(singleLine("heading", index, lines[index]));
      index += 1;
      continue;
    }
    if (BLOCKQUOTE.test(lines[index])) {
      const start = index;
      while (index < lines.length && BLOCKQUOTE.test(lines[index])) index += 1;
      raw.push({
        kind: "blockquote",
        start,
        end: index - 1,
        text: lines.slice(start, index).join("\n"),
      });
      continue;
    }
    if (TEXTUAL_HTML.test(lines[index])) {
      const start = index;
      index += 1;
      while (
        index < lines.length &&
        lines[index].trim() &&
        !isSpecialLine(lines[index])
      )
        index += 1;
      raw.push({
        kind: "textual_html",
        start,
        end: index - 1,
        text: lines.slice(start, index).join("\n"),
      });
      continue;
    }
    if (TABLE_ROW.test(lines[index])) {
      raw.push(singleLine("table_row", index, lines[index]));
      index += 1;
      continue;
    }
    if (GIVEN_WHEN_THEN.test(lines[index])) {
      raw.push(singleLine("given_when_then", index, lines[index]));
      index += 1;
      continue;
    }
    if (LIST_ITEM.test(lines[index])) {
      const start = index;
      index += 1;
      while (
        index < lines.length &&
        lines[index].trim() &&
        /^\s{2,}\S/u.test(lines[index]) &&
        !isSpecialLine(lines[index])
      )
        index += 1;
      raw.push({
        kind: "list_item",
        start,
        end: index - 1,
        text: lines.slice(start, index).join("\n"),
      });
      continue;
    }
    if (STRUCTURED_CONFIG.test(lines[index])) {
      raw.push(singleLine("structured_config_line", index, lines[index]));
      index += 1;
      continue;
    }
    const start = index;
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !isSpecialLine(lines[index])
    )
      index += 1;
    raw.push({
      kind: "paragraph",
      start,
      end: index - 1,
      text: lines.slice(start, index).join("\n"),
    });
  }

  const fragments = raw.map((entry, ordinalIndex) => {
    const normalizedText = entry.text.trim();
    const textSha256 = sha256Hex(normalizedText);
    const base = {
      input_key: input.input_key,
      source_item_ref: input.authority_source_item_refs[0],
      authority_source_item_refs: [...input.authority_source_item_refs],
      source_path: input.source_ref,
      authority_domain: input.authority_domain,
      kind: entry.kind,
      ordinal: ordinalIndex + 1,
      start_line: entry.start + 1,
      end_line: entry.end + 1,
      normalized_text: normalizedText,
      text_sha256: textSha256,
    };
    return { ...base, key: materialSourceFragmentRef(base) };
  });
  const materialNonblankLines = lines.flatMap((line, lineIndex) =>
    line.trim() ? [lineIndex + 1] : [],
  );
  const coveredLines = fragments.flatMap((fragment) => {
    const result: number[] = [];
    for (let line = fragment.start_line; line <= fragment.end_line; line += 1)
      if (lines[line - 1].trim()) result.push(line);
    return result;
  });
  assertExactCoverage(
    input.input_key,
    materialNonblankLines,
    coveredLines,
    excludedSeparatorLines,
  );
  return {
    fragments,
    coverage: {
      material_nonblank_lines: materialNonblankLines,
      covered_lines: coveredLines,
      excluded_separator_lines: excludedSeparatorLines,
    },
  };
}

function singleLine(
  kind: MaterialSourceFragmentKind,
  index: number,
  text: string,
) {
  return { kind, start: index, end: index, text };
}

function isSeparator(line: string): boolean {
  return TABLE_SEPARATOR.test(line) || MARKDOWN_SEPARATOR.test(line);
}

function isSpecialLine(line: string): boolean {
  return (
    FENCE_START.test(line) ||
    isSeparator(line) ||
    HEADING.test(line) ||
    BLOCKQUOTE.test(line) ||
    TEXTUAL_HTML.test(line) ||
    TABLE_ROW.test(line) ||
    GIVEN_WHEN_THEN.test(line) ||
    LIST_ITEM.test(line) ||
    STRUCTURED_CONFIG.test(line)
  );
}

function assertExactCoverage(
  inputKey: string,
  material: number[],
  covered: number[],
  excluded: number[],
): void {
  const seen = new Set<number>();
  for (const line of [...covered, ...excluded]) {
    if (seen.has(line))
      throw new Error(`material_fragment_coverage_overlap:${inputKey}:${line}`);
    seen.add(line);
  }
  if (
    material.length !== seen.size ||
    material.some((line) => !seen.has(line)) ||
    [...seen].some((line) => !material.includes(line))
  )
    throw new Error(
      `material_fragment_coverage_mismatch:${inputKey}:${material.join(",")}:${[
        ...seen,
      ]
        .sort((left, right) => left - right)
        .join(",")}`,
    );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
