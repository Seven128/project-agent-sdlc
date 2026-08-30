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
  files: ReadonlyMap<
    string,
    { path: string; physical_path: string; content: string }
  >;
  from_path: string;
  to_path: string;
  from_physical_path: string;
  to_physical_path: string;
}): ContextMoveMarkdownPlan {
  const source = input.files.get(input.from_path);
  if (source === undefined)
    throw new Error(`context_move_source_content_missing:${input.from_path}`);
  const updated = new Map<string, string>();
  const references = [];
  let targetContent = source.content;
  for (const [file, markdown] of [...input.files].sort(([left], [right]) =>
    compareUtf8Paths(left, right),
  )) {
    const patch = patchMarkdownLinksForContextMove({
      content: markdown.content,
      source_path: file,
      source_physical_path: markdown.physical_path,
      from_path: input.from_path,
      from_physical_path: input.from_physical_path,
      to_path: input.to_path,
      to_physical_path: input.to_physical_path,
    });
    const outputPath = file === input.from_path ? input.to_path : file;
    if (file === input.from_path) targetContent = patch.content;
    else if (patch.content !== markdown.content)
      updated.set(file, patch.content);
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
