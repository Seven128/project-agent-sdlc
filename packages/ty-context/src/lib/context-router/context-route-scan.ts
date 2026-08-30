import { open } from "node:fs/promises";
import { compareUtf8Paths } from "../context-catalog/catalog-paths.js";
import type { CatalogFile } from "../context-catalog/catalog-types.js";
import { CONTEXT_ROUTE_BUDGETS } from "./context-route-budget.js";
import { stableRouteBudgetExceeded } from "./context-route-order.js";
import type {
  ContextRouteBudgetExceeded,
  ContextRouteMatch,
  ContextRouteScanReport,
  ContextRouteTerm,
} from "./context-route-types.js";
import { normalizeRouteText } from "./context-route-terms.js";

export interface ContextRouteFileMatches {
  matches: ContextRouteMatch[];
  matched_terms: string[];
  output_truncated: boolean;
}

export interface ContextRouteScanResult {
  scan: ContextRouteScanReport;
  matches_by_path: Map<string, ContextRouteFileMatches>;
  output_truncated: boolean;
}

export async function scanContextCatalogFiles(input: {
  files: CatalogFile[];
  terms: ContextRouteTerm[];
  case_sensitive: boolean;
  max_search_results: number;
}): Promise<ContextRouteScanResult> {
  const files = [...input.files].sort((left, right) =>
    compareUtf8Paths(left.path, right.path),
  );
  const exceeded: ContextRouteBudgetExceeded[] = [];
  if (files.length > CONTEXT_ROUTE_BUDGETS.candidate_files) {
    exceeded.push({
      budget: "candidate_files",
      limit: CONTEXT_ROUTE_BUDGETS.candidate_files,
      observed: files.length,
    });
  }
  const selectedFiles = files.slice(0, CONTEXT_ROUTE_BUDGETS.candidate_files);
  const matchesByPath = new Map<string, ContextRouteFileMatches>();
  let bytesScanned = 0;
  let filesScanned = 0;
  let outputCount = 0;
  let outputTruncated = false;

  for (const file of selectedFiles) {
    if (file.bytes > CONTEXT_ROUTE_BUDGETS.per_file_scan_bytes) {
      exceeded.push({
        budget: "per_file_scan_bytes",
        limit: CONTEXT_ROUTE_BUDGETS.per_file_scan_bytes,
        observed: file.bytes,
        path: file.path,
      });
    }
    const remaining = CONTEXT_ROUTE_BUDGETS.aggregate_scan_bytes - bytesScanned;
    if (remaining <= 0) {
      exceeded.push({
        budget: "aggregate_scan_bytes",
        limit: CONTEXT_ROUTE_BUDGETS.aggregate_scan_bytes,
        observed:
          bytesScanned +
          Math.min(file.bytes, CONTEXT_ROUTE_BUDGETS.per_file_scan_bytes),
        path: file.path,
      });
      break;
    }
    const byteLimit = Math.min(
      file.bytes,
      CONTEXT_ROUTE_BUDGETS.per_file_scan_bytes,
      remaining,
    );
    if (
      bytesScanned +
        Math.min(file.bytes, CONTEXT_ROUTE_BUDGETS.per_file_scan_bytes) >
      CONTEXT_ROUTE_BUDGETS.aggregate_scan_bytes
    ) {
      exceeded.push({
        budget: "aggregate_scan_bytes",
        limit: CONTEXT_ROUTE_BUDGETS.aggregate_scan_bytes,
        observed:
          bytesScanned +
          Math.min(file.bytes, CONTEXT_ROUTE_BUDGETS.per_file_scan_bytes),
        path: file.path,
      });
    }

    const content = await readPrefix(file.absolute_path, byteLimit);
    bytesScanned += content.bytes;
    filesScanned += 1;
    const normalized = normalizeRouteText(content.text, input.case_sensitive);
    const fileResult = matchFile(normalized, input.terms);
    if (fileResult.matched_terms.length === 0) continue;
    if (fileResult.output_truncated) outputTruncated = true;

    const remainingOutput = Math.max(0, input.max_search_results - outputCount);
    const projected = fileResult.matches.slice(0, remainingOutput);
    if (projected.length < fileResult.matches.length || remainingOutput === 0)
      outputTruncated = true;
    outputCount += projected.length;
    matchesByPath.set(file.path, {
      matches: projected,
      matched_terms: fileResult.matched_terms,
      output_truncated: fileResult.output_truncated,
    });
  }

  return {
    scan: {
      files_considered: files.length,
      files_scanned: filesScanned,
      bytes_scanned: bytesScanned,
      budget_exceeded: exceeded.length > 0,
      exceeded: stableRouteBudgetExceeded(exceeded),
    },
    matches_by_path: matchesByPath,
    output_truncated: outputTruncated,
  };
}

async function readPrefix(
  absolutePath: string,
  limit: number,
): Promise<{ text: string; bytes: number }> {
  const handle = await open(absolutePath, "r");
  try {
    const buffer = Buffer.alloc(limit);
    const { bytesRead } = await handle.read(buffer, 0, limit, 0);
    return {
      text: buffer.subarray(0, bytesRead).toString("utf8"),
      bytes: bytesRead,
    };
  } finally {
    await handle.close();
  }
}

function matchFile(
  content: string,
  terms: ContextRouteTerm[],
): ContextRouteFileMatches {
  const found: Array<
    ContextRouteMatch & { offset: number; term_order: number }
  > = [];
  const matchedTerms: string[] = [];
  for (const term of terms) {
    let offset = content.indexOf(term.normalized);
    if (offset < 0) continue;
    matchedTerms.push(term.value);
    let count = 0;
    while (
      offset >= 0 &&
      count <= CONTEXT_ROUTE_BUDGETS.per_file_output_matches
    ) {
      found.push({
        term: term.value,
        term_source: term.source,
        line: 0,
        column: 0,
        offset,
        term_order: term.order,
      });
      count += 1;
      offset = content.indexOf(
        term.normalized,
        offset + Math.max(1, term.normalized.length),
      );
    }
  }
  found.sort(
    (left, right) =>
      left.offset - right.offset || left.term_order - right.term_order,
  );
  const limited = found.slice(0, CONTEXT_ROUTE_BUDGETS.per_file_output_matches);
  const starts = lineStarts(content);
  return {
    matched_terms: matchedTerms,
    matches: limited.map(({ offset, term_order: _termOrder, ...entry }) => {
      const location = lineAndColumn(content, starts, offset);
      return { ...entry, ...location };
    }),
    output_truncated: found.length > limited.length,
  };
}

function lineStarts(value: string): number[] {
  const starts = [0];
  for (let index = 0; index < value.length; index += 1)
    if (value[index] === "\n") starts.push(index + 1);
  return starts;
}

function lineAndColumn(
  value: string,
  starts: number[],
  offset: number,
): { line: number; column: number } {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return {
    line: low + 1,
    column: Array.from(value.slice(starts[low], offset)).length + 1,
  };
}
