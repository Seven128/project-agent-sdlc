import type {
  CompiledSourceItemV2,
  SourceItemKind,
} from "./long-task-delivery-types.js";
import { parseDesignResourceHandoffShape } from "./design-resource-handoff-shape.js";
import {
  normalizeSourceItemText,
  parseSourceBackgroundMarker,
  parseSourceItemStartMarker,
  SOURCE_BACKGROUND_END,
  SOURCE_BACKGROUND_START,
  SOURCE_ITEM_END,
  SOURCE_ITEM_START,
} from "./long-task-source-markers.js";
import { parseStrictYaml, sha256Hex } from "./strict-codec.js";

const DESIGN_RESOURCE_START =
  /^\s*```yaml[ \t]+design-resource-handoff-v1[ \t]*$/u;
const FORMAL_BLOCK_END = /^\s*```[ \t]*$/u;

interface OpenSourceItem {
  key: string;
  kind: SourceItemKind;
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

interface OpenFormalBlock {
  owner: "design-resource-handoff-v1";
  lines: string[];
  line: number;
}

interface SourceParseState {
  sourcePath: string;
  items: CompiledSourceItemV2[];
  seen: Set<string>;
  seenBackground: Set<string>;
  open: OpenSourceItem | null;
  background: OpenSourceBackground | null;
  formalBlock: OpenFormalBlock | null;
  designResourceBlocks: number;
}

export function parseSourceItems(
  sourcePath: string,
  content: string,
): CompiledSourceItemV2[] {
  const state = sourceParseState(sourcePath);
  const lines = content.replace(/\r\n?/gu, "\n").split("\n");
  for (const [index, line] of lines.entries())
    consumeSourceLine(state, line, index + 1);
  assertSourceSectionsClosed(state);
  return state.items;
}

function sourceParseState(sourcePath: string): SourceParseState {
  return {
    sourcePath,
    items: [],
    seen: new Set<string>(),
    seenBackground: new Set<string>(),
    open: null,
    background: null,
    formalBlock: null,
    designResourceBlocks: 0,
  };
}

function consumeSourceLine(
  state: SourceParseState,
  line: string,
  lineNumber: number,
): void {
  if (consumeOpenFormalBlock(state, line)) return;
  if (startFormalBlock(state, line, lineNumber)) return;
  if (consumeSourceItemBoundary(state, line, lineNumber)) return;
  if (consumeBackgroundBoundary(state, line, lineNumber)) return;
  consumeOwnedText(state, line, lineNumber);
}

function consumeOpenFormalBlock(
  state: SourceParseState,
  line: string,
): boolean {
  if (!state.formalBlock) return false;
  if (!FORMAL_BLOCK_END.test(line)) {
    state.formalBlock.lines.push(line);
    return true;
  }
  try {
    parseDesignResourceHandoffShape(
      parseStrictYaml(state.formalBlock.lines.join("\n")),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `source_formal_block_invalid:${state.sourcePath}:${state.formalBlock.line}:${message}`,
    );
  }
  state.formalBlock = null;
  return true;
}

function startFormalBlock(
  state: SourceParseState,
  line: string,
  lineNumber: number,
): boolean {
  if (!DESIGN_RESOURCE_START.test(line)) return false;
  assertNoOpenOwnedSection(state, lineNumber);
  state.designResourceBlocks += 1;
  if (state.designResourceBlocks > 1)
    throw new Error(
      `source_formal_block_duplicate:${state.sourcePath}:design-resource-handoff-v1`,
    );
  state.formalBlock = {
    owner: "design-resource-handoff-v1",
    lines: [],
    line: lineNumber,
  };
  return true;
}

function consumeSourceItemBoundary(
  state: SourceParseState,
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

function closeSourceItem(state: SourceParseState): void {
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
    source_path: state.sourcePath,
    normalized_text: normalizedText,
    text_sha256: sha256Hex(normalizedText),
    ...(open.risk_semantics ? { risk_semantics: open.risk_semantics } : {}),
  });
  state.open = null;
}

function consumeBackgroundBoundary(
  state: SourceParseState,
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

function assertNoOpenOwnedSection(
  state: SourceParseState,
  lineNumber: number,
): void {
  if (!state.open && !state.background) return;
  throw new Error(
    `source_section_nested_or_overlapping:${state.sourcePath}:${state.open?.key ?? state.background?.key}:${lineNumber}`,
  );
}

function consumeOwnedText(
  state: SourceParseState,
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
    if (line.trim()) state.background.substantiveLines += 1;
  } else if (line.trim())
    throw new Error(
      `source_text_unclassified:${state.sourcePath}:${lineNumber}`,
    );
}

function assertSourceSectionsClosed(state: SourceParseState): void {
  if (state.open)
    throw new Error(
      `source_item_unclosed:${state.sourcePath}:${state.open.key}:${state.open.line}`,
    );
  if (state.background)
    throw new Error(
      `source_background_unclosed:${state.sourcePath}:${state.background.key}:${state.background.line}`,
    );
  if (state.formalBlock)
    throw new Error(
      `source_formal_block_unclosed:${state.sourcePath}:${state.formalBlock.owner}:${state.formalBlock.line}`,
    );
}

export { normalizeSourceItemText } from "./long-task-source-markers.js";
