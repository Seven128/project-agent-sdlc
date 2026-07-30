import type { CompiledSourceItemV2 } from "./long-task-delivery-types.js";
import { parseDesignResourceHandoffInputShape } from "./design-resource-handoff-shape.js";
import type { DesignResourceHandoffInputV1 } from "./design-resource-handoff-types.js";
import { parseSemanticFactManifestShape } from "./semantic-fact-manifest-shape.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import {
  assertNoOpenOwnedSection,
  assertOwnedSourceSectionsClosed,
  consumeBackgroundBoundary,
  consumeOwnedText,
  consumeSourceItemBoundary,
  type OwnedSourceParseState,
} from "./long-task-source-owned-sections.js";
import { formalBlockBody, forEachSourceLine } from "./source-line-scanner.js";
import { parseStrictYaml } from "./strict-codec.js";

const DESIGN_RESOURCE_START =
  /^\s*```yaml[ \t]+design-resource-handoff-v1[ \t]*$/u;
const SEMANTIC_FACT_START =
  /^\s*```yaml[ \t]+semantic-fact-manifest-v1[ \t]*$/u;
const FORMAL_BLOCK_END = /^\s*```[ \t]*$/u;

interface OpenFormalBlock {
  owner: "design-resource-handoff-v1" | "semantic-fact-manifest-v1";
  bodyStartOffset: number;
  line: number;
}

interface SourceParseState extends OwnedSourceParseState {
  content: string;
  formalBlock: OpenFormalBlock | null;
  designResourceBlocks: number;
  semanticFactBlocks: number;
  designResourceHandoff: DesignResourceHandoffInputV1 | null;
  semanticFactManifest: SemanticFactManifestV1 | null;
}

export interface ParsedSourceDocument {
  items: CompiledSourceItemV2[];
  designResourceHandoff: DesignResourceHandoffInputV1 | null;
  semanticFactManifest: SemanticFactManifestV1 | null;
}

export function parseSourceItems(
  sourcePath: string,
  content: string,
): CompiledSourceItemV2[] {
  return parseSourceDocument(sourcePath, content).items;
}

export function parseSourceDocument(
  sourcePath: string,
  content: string,
): ParsedSourceDocument {
  const state = sourceParseState(sourcePath, content);
  forEachSourceLine(
    content,
    (line, startOffset, _endOffset, nextOffset, lineNumber) =>
      consumeSourceLine(state, line, lineNumber, startOffset, nextOffset),
  );
  assertSourceSectionsClosed(state);
  return {
    items: state.items,
    designResourceHandoff: state.designResourceHandoff,
    semanticFactManifest: state.semanticFactManifest,
  };
}

function sourceParseState(
  sourcePath: string,
  content: string,
): SourceParseState {
  return {
    sourcePath,
    content,
    items: [],
    seen: new Set<string>(),
    seenBackground: new Set<string>(),
    open: null,
    background: null,
    formalBlock: null,
    designResourceBlocks: 0,
    semanticFactBlocks: 0,
    designResourceHandoff: null,
    semanticFactManifest: null,
  };
}

function consumeSourceLine(
  state: SourceParseState,
  line: string,
  lineNumber: number,
  startOffset: number,
  nextOffset: number,
): void {
  if (consumeOpenFormalBlock(state, line, startOffset)) return;
  if (startFormalBlock(state, line, lineNumber, nextOffset)) return;
  if (consumeSourceItemBoundary(state, line, lineNumber)) return;
  if (consumeBackgroundBoundary(state, line, lineNumber)) return;
  consumeOwnedText(state, line, lineNumber);
}

function consumeOpenFormalBlock(
  state: SourceParseState,
  line: string,
  startOffset: number,
): boolean {
  if (!state.formalBlock) return false;
  if (!FORMAL_BLOCK_END.test(line)) return true;
  try {
    const value = parseStrictYaml(
      formalBlockBody(
        state.content,
        state.formalBlock.bodyStartOffset,
        startOffset,
        state.formalBlock.owner === "design-resource-handoff-v1",
      ),
    );
    if (state.formalBlock.owner === "design-resource-handoff-v1")
      state.designResourceHandoff = parseDesignResourceHandoffInputShape(value);
    else state.semanticFactManifest = parseSemanticFactManifestShape(value);
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
  nextOffset: number,
): boolean {
  const owner = DESIGN_RESOURCE_START.test(line)
    ? "design-resource-handoff-v1"
    : SEMANTIC_FACT_START.test(line)
      ? "semantic-fact-manifest-v1"
      : null;
  if (!owner) return false;
  assertNoOpenOwnedSection(state, lineNumber);
  if (owner === "design-resource-handoff-v1") {
    state.designResourceBlocks += 1;
    if (state.designResourceBlocks > 1)
      throw new Error(
        `source_formal_block_duplicate:${state.sourcePath}:design-resource-handoff-v1`,
      );
  } else {
    state.semanticFactBlocks += 1;
    if (state.semanticFactBlocks > 1)
      throw new Error(
        `source_formal_block_duplicate:${state.sourcePath}:semantic-fact-manifest-v1`,
      );
  }
  state.formalBlock = {
    owner,
    bodyStartOffset: nextOffset,
    line: lineNumber,
  };
  return true;
}

function assertSourceSectionsClosed(state: SourceParseState): void {
  assertOwnedSourceSectionsClosed(state);
  if (state.formalBlock)
    throw new Error(
      `source_formal_block_unclosed:${state.sourcePath}:${state.formalBlock.owner}:${state.formalBlock.line}`,
    );
}

export { normalizeSourceItemText } from "./long-task-source-markers.js";
