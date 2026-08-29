import type { ContextRegisterResult } from "./context-register-types.js";

export function renderContextRegisterText(
  result: ContextRegisterResult,
): string {
  const lines = [
    `Context register ${result.applied ? "committed" : "dry-run"}`,
    `Path: ${result.path}`,
    `Role: ${result.role}`,
    `Read policy: ${result.read_policy}`,
    `Manifest: ${result.manifest.before_sha256} -> ${result.manifest.after_sha256} (${signed(result.manifest.bytes_delta)} bytes)`,
    `Default footprint: ${result.default_footprint.before.path_count}/${result.default_footprint.before.bytes} -> ${result.default_footprint.after.path_count}/${result.default_footprint.after.bytes}`,
    `Transaction: ${result.transaction.id} (${result.transaction.state})`,
    "",
    result.manifest.diff.trimEnd(),
  ];
  for (const diagnostic of result.diagnostics)
    lines.push(`warning: ${diagnostic}`);
  if (!result.applied)
    lines.push(
      "",
      "No files changed. Re-run with --apply to commit this exact plan after a fresh CAS check.",
    );
  return `${lines.join("\n")}\n`;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}
