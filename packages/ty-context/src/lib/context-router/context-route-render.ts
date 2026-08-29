import type { ContextRouteResult } from "./context-route-types.js";

export function renderContextRouteText(
  result: ContextRouteResult,
  explain: boolean,
): string {
  const lines = [
    "Experimental Context route (diagnostic only)",
    `complete=${result.complete} catalog_valid=${result.catalog_valid} output_truncated=${result.output_truncated}`,
    `scan files=${result.scan.files_scanned}/${result.scan.files_considered} bytes=${result.scan.bytes_scanned}`,
    `default Context: ${result.default_context.length} file(s)`,
  ];
  if (result.scan.exceeded.length > 0) {
    for (const item of result.scan.exceeded)
      lines.push(
        `budget exceeded: ${item.budget} observed=${item.observed} limit=${item.limit}${item.path ? ` path=${item.path}` : ""}`,
      );
  }
  for (const candidate of [
    ...result.candidates,
    ...result.unregistered_matches,
  ]) {
    lines.push(
      `${candidate.registration === "unregistered" ? "unregistered" : "candidate"}: ${candidate.path} (${candidate.bytes} bytes; ${candidate.groups.join(",")})`,
    );
    if (!explain) continue;
    for (const reason of candidate.reasons)
      lines.push(`  ${reason.kind}: ${reason.input} — ${reason.detail}`);
    for (const match of candidate.matches)
      lines.push(
        `  match ${match.line}:${match.column} ${match.term_source}=${JSON.stringify(match.term)}`,
      );
  }
  for (const item of result.ambiguous)
    lines.push(
      `ambiguous: ${item.input} -> ${item.candidates.map((entry) => `${entry.id}:${entry.root}`).join(", ")}`,
    );
  for (const item of result.unresolved)
    lines.push(`unresolved: ${item.input} — ${item.reason}`);
  for (const diagnostic of result.diagnostics)
    lines.push(
      `${diagnostic.severity}: ${diagnostic.code}: ${diagnostic.message}`,
    );
  lines.push(
    "This output neither establishes Authority nor replaces the Workflow-required bounded Context search.",
  );
  return `${lines.join("\n")}\n`;
}
