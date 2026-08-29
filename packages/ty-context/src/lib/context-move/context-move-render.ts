import type { ContextMoveResult } from "./context-move-types.js";

export function renderContextMoveText(result: ContextMoveResult): string {
  const lines = [
    `Context move: ${result.from_path} -> ${result.to_path}`,
    `State: ${result.applied ? "committed" : "dry-run"}`,
    `Apply readiness: ${result.can_apply ? "ready" : "blocked"}`,
    `Owner: ${result.owner.source}/${result.owner.role}`,
    `Transaction: ${result.transaction.id}`,
  ];
  if (result.directories_created.length)
    lines.push(
      "Directories created on apply:",
      ...result.directories_created.map((entry) => `- ${entry}`),
    );
  lines.push("File plan:");
  for (const file of result.files)
    lines.push(
      `- ${file.action} ${file.path} (${file.before_bytes} -> ${file.after_bytes} bytes)`,
    );
  lines.push(
    `Manifest replacements: ${result.manifest.replacements.length}`,
    `Markdown references updated: ${result.links.references_updated.length}`,
    `Repository scan: ${result.scan.complete ? "complete" : "incomplete"}; ${result.scan.files_scanned} files, ${result.scan.bytes_scanned} bytes`,
  );
  if (result.unresolved.length) {
    lines.push("Unresolved exact references (apply is refused):");
    for (const entry of result.unresolved)
      lines.push(
        `- ${entry.path}:${entry.line}:${entry.column} ${entry.kind}: ${entry.matched}`,
      );
  }
  if (result.scan.limits_exceeded.length)
    lines.push(
      "Scan limits (apply is refused):",
      ...result.scan.limits_exceeded.map((entry) => `- ${entry}`),
    );
  lines.push(
    `Default footprint: ${result.default_footprint.before.path_count}/${result.default_footprint.before.bytes} -> ${result.default_footprint.after.path_count}/${result.default_footprint.after.bytes}`,
    "Dry-run is the default; --apply uses the CAS/journal transaction and has no force bypass.",
  );
  return `${lines.join("\n")}\n`;
}
