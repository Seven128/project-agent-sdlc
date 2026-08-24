import type {
  CompiledSourceItemV2,
  MaterialSourceFragmentKind,
  MaterialSourceFragmentV2,
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
    "source_item_ref" | "ordinal" | "text_sha256"
  >,
): string {
  return `${fragment.source_item_ref}#fragment:${fragment.ordinal}:${fragment.text_sha256.slice(0, 16)}`;
}

export function deriveMaterialSourceFragments(
  item: CompiledSourceItemV2,
  designOwned = false,
): MaterialSourceFragmentV2[] {
  const lines = item.normalized_text.replace(/\r\n?/gu, "\n").split("\n");
  const domain = sourceAuthorityDomain(item, designOwned);
  const raw: Array<{
    kind: MaterialSourceFragmentKind;
    start: number;
    end: number;
    text: string;
  }> = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) {
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
      const bodyEnd = index < lines.length ? index : lines.length;
      const configRows = lines
        .slice(start + 1, bodyEnd)
        .map((line, offset) => ({ line, lineIndex: start + 1 + offset }))
        .filter((row) => row.line.trim());
      if (
        configRows.length > 0 &&
        configRows.every((row) => STRUCTURED_CONFIG.test(row.line))
      ) {
        for (const row of configRows)
          raw.push({
            kind: "structured_config_line",
            start: row.lineIndex,
            end: row.lineIndex,
            text: row.line,
          });
      } else {
        raw.push({
          kind: "fenced_code",
          start,
          end,
          text: lines.slice(start, end + 1).join("\n"),
        });
      }
      index = index < lines.length ? index + 1 : lines.length;
      continue;
    }
    if (TABLE_ROW.test(lines[index])) {
      if (!TABLE_SEPARATOR.test(lines[index]))
        raw.push({
          kind: "table_row",
          start: index,
          end: index,
          text: lines[index],
        });
      index += 1;
      continue;
    }
    if (GIVEN_WHEN_THEN.test(lines[index])) {
      raw.push({
        kind: "given_when_then",
        start: index,
        end: index,
        text: lines[index],
      });
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
      raw.push({
        kind: "structured_config_line",
        start: index,
        end: index,
        text: lines[index],
      });
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
  return raw.map((entry, ordinalIndex) => {
    const normalizedText = entry.text.trim();
    const textSha256 = sha256Hex(normalizedText);
    const base = {
      source_item_ref: item.key,
      source_path: item.source_path,
      authority_domain: domain,
      kind: entry.kind,
      ordinal: ordinalIndex + 1,
      start_line: entry.start + 1,
      end_line: entry.end + 1,
      normalized_text: normalizedText,
      text_sha256: textSha256,
    };
    return { ...base, key: materialSourceFragmentRef(base) };
  });
}

function isSpecialLine(line: string): boolean {
  return (
    FENCE_START.test(line) ||
    TABLE_ROW.test(line) ||
    GIVEN_WHEN_THEN.test(line) ||
    LIST_ITEM.test(line) ||
    STRUCTURED_CONFIG.test(line)
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
