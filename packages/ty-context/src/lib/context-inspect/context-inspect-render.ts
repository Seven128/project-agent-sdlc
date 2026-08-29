import type { ContextInspectResult } from "./context-inspect-types.js";

export function renderContextInspectText(result: ContextInspectResult): string {
  const lines = [
    `Context: ${result.path}`,
    `registration=${result.registration} source=${result.source ?? "none"} role=${result.role ?? "unknown"}`,
    `read_policy=${result.read_policy ?? "none"} bytes=${result.bytes}`,
    `default=${result.default_footprint.selected}${result.default_footprint.reasons.length > 0 ? ` reasons=${result.default_footprint.reasons.join(",")}` : ""}`,
    `read_when=${result.read_when ?? "none"}`,
    `triggers=${result.triggers.length > 0 ? result.triggers.join(", ") : "none"}`,
    `default_children=${result.default_children.length > 0 ? result.default_children.join(", ") : "none"}`,
    `referenced_by=${result.referenced_by.length}`,
  ];
  for (const reference of result.referenced_by)
    lines.push(
      `  ${reference.source_path}:${reference.line}:${reference.column} (${reference.kind})`,
    );
  lines.push(`references=${result.references.length}`);
  for (const reference of result.references)
    lines.push(
      `  ${reference.line}:${reference.column} ${reference.status} ${reference.target_path ?? reference.destination}`,
    );
  lines.push(
    `stable_key_declarations=${result.stable_key_declarations.length} conflicts=${result.stable_key_conflicts.length}`,
  );
  if (result.route) {
    lines.push(
      `route complete=${result.route.complete} catalog_valid=${result.route.catalog_valid} selected=${result.route.selected}`,
    );
    if (result.route.candidate)
      for (const reason of result.route.candidate.reasons)
        lines.push(`  ${reason.kind}: ${reason.input} — ${reason.detail}`);
    else
      lines.push(
        "  no path, trigger, bounded literal or manual selection reason matched this Context",
      );
  }
  for (const diagnostic of result.diagnostics)
    lines.push(
      `${diagnostic.severity}: ${diagnostic.code}: ${diagnostic.message}`,
    );
  return `${lines.join("\n")}\n`;
}
