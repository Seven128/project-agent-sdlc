import type { ParsedDesignResourceHandoffInput } from "./design-resource-handoff-input-types.js";
import { parseSourceDocument } from "./long-task-source-item-parser.js";
import { forEachSourceLine } from "./source-line-scanner.js";

const DESIGN_RESOURCE_START =
  /^```yaml[ \t]+design-resource-handoff-(?:v1|v2)[ \t]*$/u;
const FORMAL_BLOCK_END = /^```[ \t]*$/u;

export interface DesignResourceHandoffBlockSpan {
  bodyStartOffset: number;
  bodyEndOffset: number;
}

export function containsDesignResourceHandoff(content: string): boolean {
  return scanDesignResourceHandoffBlocks(content).length > 0;
}

export function scanDesignResourceHandoffBlocks(
  content: string,
): DesignResourceHandoffBlockSpan[] {
  const blocks: DesignResourceHandoffBlockSpan[] = [];
  let bodyStartOffset: number | null = null;
  forEachSourceLine(content, (line, startOffset, _endOffset, nextOffset) => {
    if (bodyStartOffset === null) {
      if (DESIGN_RESOURCE_START.test(line)) bodyStartOffset = nextOffset;
      return;
    }
    if (!FORMAL_BLOCK_END.test(line)) return;
    blocks.push({
      bodyStartOffset,
      bodyEndOffset: startOffset,
    });
    bodyStartOffset = null;
  });
  return blocks;
}

export function parseDesignResourceHandoffMarkdown(
  handoffPath: string,
  content: string,
): ParsedDesignResourceHandoffInput {
  const blocks = scanDesignResourceHandoffBlocks(content);
  if (blocks.length !== 1)
    throw new Error(
      `design_resource_handoff_invalid:block_count:${handoffPath}:${blocks.length}`,
    );
  try {
    const parsedSource = parseSourceDocument(handoffPath, content);
    const handoff = parsedSource.designResourceHandoff;
    if (!handoff)
      throw new Error("design-resource-handoff block was not decoded");
    return {
      handoff_path: handoffPath,
      handoff,
      source_item_keys: parsedSource.items.map((item) => item.key),
      source_item_kinds: Object.fromEntries(
        parsedSource.items.map((item) => [item.key, item.kind]),
      ),
    } as ParsedDesignResourceHandoffInput;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.startsWith("design_resource_handoff_invalid:")) throw error;
    throw new Error(`design_resource_handoff_invalid:shape:${message}`);
  }
}
