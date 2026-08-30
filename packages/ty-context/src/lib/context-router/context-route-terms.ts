import { CONTEXT_ROUTE_BUDGETS } from "./context-route-budget.js";
import { stableRouteBudgetExceeded } from "./context-route-order.js";
import type {
  ContextRouteBudgetExceeded,
  ContextRouteTerm,
  ContextRouteTermSource,
} from "./context-route-types.js";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
]);

export interface ContextRouteTermBuildResult {
  terms: ContextRouteTerm[];
  exceeded: ContextRouteBudgetExceeded[];
}

export function buildContextRouteTerms(input: {
  task: string;
  explicit_terms: string[];
  paths: string[];
  manifest_triggers: string[];
  case_sensitive: boolean;
}): ContextRouteTermBuildResult {
  const exceeded: ContextRouteBudgetExceeded[] = [];
  const terms: ContextRouteTerm[] = [];
  const normalizedSeen = new Set<string>();
  let order = 0;
  const add = (value: string, source: ContextRouteTermSource): void => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const length = codePointLength(trimmed);
    const minimum =
      source === "explicit"
        ? CONTEXT_ROUTE_BUDGETS.explicit_term_min_code_points
        : CONTEXT_ROUTE_BUDGETS.automatic_term_min_code_points;
    if (length < minimum) return;
    if (length > CONTEXT_ROUTE_BUDGETS.term_max_code_points) {
      exceeded.push({
        budget: "term_max_code_points",
        limit: CONTEXT_ROUTE_BUDGETS.term_max_code_points,
        observed: length,
      });
      return;
    }
    const normalized = normalizeRouteText(trimmed, input.case_sensitive);
    if (normalizedSeen.has(normalized)) return;
    normalizedSeen.add(normalized);
    terms.push({ value: trimmed.normalize("NFC"), normalized, source, order });
    order += 1;
  };

  if (input.explicit_terms.length > CONTEXT_ROUTE_BUDGETS.explicit_terms) {
    exceeded.push({
      budget: "explicit_terms",
      limit: CONTEXT_ROUTE_BUDGETS.explicit_terms,
      observed: input.explicit_terms.length,
    });
  }
  for (const term of input.explicit_terms.slice(
    0,
    CONTEXT_ROUTE_BUDGETS.explicit_terms,
  ))
    add(term, "explicit");

  const automatic: Array<{ value: string; source: ContextRouteTermSource }> =
    [];
  for (const value of quotedPhrases(input.task))
    automatic.push({ value, source: "quoted_phrase" });

  const lexical = lexicalTokens(input.task);
  for (const value of lexical.filter(isCodeIdentifier))
    automatic.push({ value, source: "code_identifier" });
  for (const value of pathFragments([...lexical, ...input.paths]))
    automatic.push({ value, source: "path_fragment" });

  const normalizedTask = normalizeRouteText(input.task, input.case_sensitive);
  for (const trigger of input.manifest_triggers) {
    const normalizedTrigger = normalizeRouteText(trigger, input.case_sensitive);
    if (normalizedTrigger && normalizedTask.includes(normalizedTrigger))
      automatic.push({ value: trigger, source: "manifest_trigger" });
  }
  for (const value of lexical.filter(isStableName))
    automatic.push({ value, source: "stable_name" });

  const automaticSeen = new Set<string>();
  const uniqueAutomatic = automatic.filter(({ value }) => {
    const normalized = normalizeRouteText(value.trim(), input.case_sensitive);
    if (
      !normalized ||
      automaticSeen.has(normalized) ||
      normalizedSeen.has(normalized)
    )
      return false;
    automaticSeen.add(normalized);
    return true;
  });
  if (uniqueAutomatic.length > CONTEXT_ROUTE_BUDGETS.automatic_terms) {
    exceeded.push({
      budget: "automatic_terms",
      limit: CONTEXT_ROUTE_BUDGETS.automatic_terms,
      observed: uniqueAutomatic.length,
    });
  }
  for (const entry of uniqueAutomatic.slice(
    0,
    CONTEXT_ROUTE_BUDGETS.automatic_terms,
  ))
    add(entry.value, entry.source);

  return { terms, exceeded: stableRouteBudgetExceeded(exceeded) };
}

export function normalizeRouteText(
  value: string,
  caseSensitive: boolean,
): string {
  const normalized = value.normalize("NFC");
  return caseSensitive ? normalized : normalized.toLowerCase();
}

function quotedPhrases(value: string): string[] {
  const pairs = new Map([
    ['"', '"'],
    ["'", "'"],
    ["“", "”"],
    ["‘", "’"],
  ]);
  const result: string[] = [];
  const points = Array.from(value);
  for (let index = 0; index < points.length; index += 1) {
    const close = pairs.get(points[index]);
    if (!close) continue;
    const start = index + 1;
    while (index + 1 < points.length && points[index + 1] !== close) index += 1;
    if (index + 1 >= points.length) break;
    result.push(points.slice(start, index + 1).join(""));
    index += 1;
  }
  return result;
}

function lexicalTokens(value: string): string[] {
  const result: string[] = [];
  let current = "";
  const flush = (): void => {
    if (current) result.push(current);
    current = "";
  };
  for (const point of Array.from(value)) {
    if (isLexicalCharacter(point)) current += point;
    else flush();
  }
  flush();
  return result;
}

function isLexicalCharacter(value: string): boolean {
  const code = value.codePointAt(0) ?? 0;
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    value === "_" ||
    value === "$" ||
    value === "-" ||
    value === "." ||
    value === "/" ||
    value === "\\"
  );
}

function isCodeIdentifier(value: string): boolean {
  if (value.includes("/") || value.includes("\\")) return false;
  const startsCorrectly =
    isAsciiLetter(value[0] ?? "") || "_$".includes(value[0] ?? "");
  if (!startsCorrectly) return false;
  return (
    value.includes("_") ||
    value.includes("$") ||
    value.includes(".") ||
    hasCamelBoundary(value)
  );
}

function isStableName(value: string): boolean {
  if (value.includes("/") || value.includes("\\") || isCodeIdentifier(value))
    return false;
  const normalized = value.toLowerCase();
  return codePointLength(value) >= 3 && !STOP_WORDS.has(normalized);
}

function hasCamelBoundary(value: string): boolean {
  for (let index = 1; index < value.length; index += 1) {
    const previous = value.charCodeAt(index - 1);
    const current = value.charCodeAt(index);
    if (previous >= 97 && previous <= 122 && current >= 65 && current <= 90)
      return true;
  }
  return false;
}

function pathFragments(values: string[]): string[] {
  const result: string[] = [];
  for (const raw of values) {
    if (!raw.includes("/") && !raw.includes("\\")) continue;
    const normalized = raw.replaceAll("\\", "/").replace(/^\.\//u, "");
    result.push(normalized);
    for (const segment of normalized.split("/"))
      if (segment) result.push(segment);
  }
  return result;
}

function isAsciiLetter(value: string): boolean {
  const code = value.charCodeAt(0);
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}
