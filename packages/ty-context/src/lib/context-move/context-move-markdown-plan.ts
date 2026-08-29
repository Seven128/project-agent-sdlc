import { compareUtf8Paths } from "../context-catalog/catalog-paths.js";
import { patchMarkdownLinksForContextMove } from "../context-mutation/markdown-link-patch.js";

export interface ContextMoveMarkdownPlan {
  target_content: string;
  updated_context_files: Map<string, string>;
  references_updated: Array<{
    source_path: string;
    line: number;
    column: number;
    previous_destination: string;
    next_destination: string;
  }>;
}

export function planContextMoveMarkdown(input: {
  files: ReadonlyMap<string, string>;
  from_path: string;
  to_path: string;
}): ContextMoveMarkdownPlan {
  const source = input.files.get(input.from_path);
  if (source === undefined)
    throw new Error(`context_move_source_content_missing:${input.from_path}`);
  const updated = new Map<string, string>();
  const references = [];
  let targetContent = source;
  for (const [file, content] of [...input.files].sort(([left], [right]) =>
    compareUtf8Paths(left, right),
  )) {
    const patch = patchMarkdownLinksForContextMove({
      content,
      source_path: file,
      from_path: input.from_path,
      to_path: input.to_path,
    });
    const outputPath = file === input.from_path ? input.to_path : file;
    if (file === input.from_path) targetContent = patch.content;
    else if (patch.content !== content) updated.set(file, patch.content);
    for (const change of patch.changes)
      references.push({
        source_path: outputPath,
        line: change.line,
        column: change.column,
        previous_destination: change.previous_destination,
        next_destination: change.next_destination,
      });
  }
  return {
    target_content: targetContent,
    updated_context_files: updated,
    references_updated: references,
  };
}
