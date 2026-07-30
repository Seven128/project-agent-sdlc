import type {
  CompiledSourceItemV2,
  SourceItemKind,
} from "./long-task-delivery-types.js";
import {
  normalizeSourceItemText,
  parseSourceBackgroundMarker,
  parseSourceItemStartMarker,
  SOURCE_BACKGROUND_END,
  SOURCE_BACKGROUND_START,
  SOURCE_ITEM_END,
  SOURCE_ITEM_START,
  validateSourceBackgroundLine,
} from "./long-task-source-markers.js";
import { sha256Hex } from "./strict-codec.js";

interface OpenSourceItem {
  key: string;
  kind: SourceItemKind;
  aspect?: CompiledSourceItemV2["aspect"];
  risk_semantics?: CompiledSourceItemV2["risk_semantics"];
  lines: string[];
  line: number;
}

interface OpenSourceBackground {
  key: string;
  reason: string;
  substantiveLines: number;
  line: number;
}

export interface OwnedSourceParseState {
  sourcePath: string;
  items: CompiledSourceItemV2[];
  seen: Set<string>;
  seenBackground: Set<string>;
  open: OpenSourceItem | null;
  background: OpenSourceBackground | null;
}

export function consumeSourceItemBoundary(
  state: OwnedSourceParseState,
  line: string,
  lineNumber: number,
): boolean {
  const start = SOURCE_ITEM_START.exec(line);
  if (start) {
    assertNoOpenOwnedSection(state, lineNumber);
    state.open = {
      ...parseSourceItemStartMarker(state.sourcePath, lineNumber, start[1]),
      lines: [],
      line: lineNumber,
    };
    return true;
  }
  if (!SOURCE_ITEM_END.test(line)) return false;
  if (!state.open)
    throw new Error(
      `source_item_end_without_start:${state.sourcePath}:${lineNumber}`,
    );
  closeSourceItem(state);
  return true;
}

function closeSourceItem(state: OwnedSourceParseState): void {
  const open = state.open!;
  const normalizedText = normalizeSourceItemText(open.lines.join("\n"));
  if (!normalizedText)
    throw new Error(`source_item_empty:${state.sourcePath}:${open.key}`);
  if (state.seen.has(open.key))
    throw new Error(`source_item_key_duplicate:${open.key}`);
  state.seen.add(open.key);
  state.items.push({
    key: open.key,
    kind: open.kind,
    ...(open.aspect ? { aspect: open.aspect } : {}),
    source_path: state.sourcePath,
    normalized_text: normalizedText,
    text_sha256: sha256Hex(normalizedText),
    ...(open.risk_semantics ? { risk_semantics: open.risk_semantics } : {}),
  });
  state.open = null;
}

export function consumeBackgroundBoundary(
  state: OwnedSourceParseState,
  line: string,
  lineNumber: number,
): boolean {
  const start = SOURCE_BACKGROUND_START.exec(line);
  if (start) {
    assertNoOpenOwnedSection(state, lineNumber);
    const declaration = parseSourceBackgroundMarker(
      state.sourcePath,
      lineNumber,
      start[1],
    );
    if (state.seenBackground.has(declaration.key))
      throw new Error(`source_background_key_duplicate:${declaration.key}`);
    state.seenBackground.add(declaration.key);
    state.background = {
      ...declaration,
      substantiveLines: 0,
      line: lineNumber,
    };
    return true;
  }
  if (!SOURCE_BACKGROUND_END.test(line)) return false;
  if (!state.background)
    throw new Error(
      `source_background_end_without_start:${state.sourcePath}:${lineNumber}`,
    );
  if (!state.background.substantiveLines)
    throw new Error(
      `source_background_empty:${state.sourcePath}:${state.background.key}`,
    );
  state.background = null;
  return true;
}

export function assertNoOpenOwnedSection(
  state: OwnedSourceParseState,
  lineNumber: number,
): void {
  if (!state.open && !state.background) return;
  throw new Error(
    `source_section_nested_or_overlapping:${state.sourcePath}:${state.open?.key ?? state.background?.key}:${lineNumber}`,
  );
}

export function consumeOwnedText(
  state: OwnedSourceParseState,
  line: string,
  lineNumber: number,
): void {
  if (
    line.includes("ty-source-item:start") ||
    line.includes("ty-source-item:end") ||
    line.includes("ty-source-background:start") ||
    line.includes("ty-source-background:end")
  )
    throw new Error(
      `source_item_marker_invalid:${state.sourcePath}:${lineNumber}`,
    );
  if (state.open) state.open.lines.push(line);
  else if (state.background) {
    validateSourceBackgroundLine(
      state.sourcePath,
      state.background.key,
      state.background.reason,
      lineNumber,
      line,
    );
    if (line.trim()) state.background.substantiveLines += 1;
  } else if (line.trim())
    throw new Error(
      `source_text_unclassified:${state.sourcePath}:${lineNumber}`,
    );
}

export function assertOwnedSourceSectionsClosed(
  state: OwnedSourceParseState,
): void {
  if (state.open)
    throw new Error(
      `source_item_unclosed:${state.sourcePath}:${state.open.key}:${state.open.line}`,
    );
  if (state.background)
    throw new Error(
      `source_background_unclosed:${state.sourcePath}:${state.background.key}:${state.background.line}`,
    );
}
