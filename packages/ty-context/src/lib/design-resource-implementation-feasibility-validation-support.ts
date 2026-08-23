import type { DesignResourceTechnicalSourceRecordV1 } from "./design-resource-implementation-feasibility-types.js";

const EXACT_VISUAL_VALUE_PATTERNS = [
  /#[0-9a-f]{3,8}\b/iu,
  /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\s*\(/iu,
  /\b\d+(?:\.\d+)?(?:px|rem|em|pt|pc|vh|vw|vmin|vmax|ch|ex|deg)\b/iu,
  /\b(?:color|background|font(?:-family|-size|-weight)?|line-height|border-radius|radius|padding|margin|gap|width|height|opacity|duration|easing|shadow)\s*[:=]\s*\S+/iu,
  /--[a-z0-9_-]+\s*:\s*\S+/iu,
] as const;

export function invalidFeasibility(code: string, detail: string): never {
  throw new Error(
    `design_resource_implementation_feasibility_invalid:${code}${detail ? `:${detail}` : ""}`,
  );
}

export function unique(values: string[], code: string, detail = ""): void {
  if (new Set(values).size !== values.length)
    invalidFeasibility(code, detail || values.join(","));
}

export function requireKnownRefs<T>(
  refs: string[],
  values: Map<string, T>,
  code: string,
  detail = "",
): void {
  for (const ref of refs)
    if (!values.has(ref))
      invalidFeasibility(code, detail ? `${detail}:${ref}` : ref);
}

export function requireSourceRole(
  refs: string[],
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
  role: DesignResourceTechnicalSourceRecordV1["roles"][number],
  code: string,
  detail: string,
): void {
  requireKnownRefs(refs, sources, code, detail);
  for (const ref of refs)
    if (!sources.get(ref)!.roles.includes(role))
      invalidFeasibility(code, `${detail}:${ref}:${role}`);
}

export function requireAtLeastOneSourceRole(
  refs: string[],
  sources: Map<string, DesignResourceTechnicalSourceRecordV1>,
  role: DesignResourceTechnicalSourceRecordV1["roles"][number],
  code: string,
  detail: string,
): void {
  if (!refs.some((ref) => sources.get(ref)?.roles.includes(role)))
    invalidFeasibility(code, `${detail}:${role}`);
}

export function assertSameSet(
  actual: string[],
  expected: string[],
  code: string,
): void {
  const left = [...actual].sort(compareText);
  const right = [...expected].sort(compareText);
  if (
    left.length !== right.length ||
    left.some((value, index) => value !== right[index])
  )
    invalidFeasibility(code, `${left.join(",")}:${right.join(",")}`);
}

export function assertNoExactVisualValues(
  values: string[],
  detail: string,
): void {
  for (const value of values)
    if (EXACT_VISUAL_VALUE_PATTERNS.some((pattern) => pattern.test(value)))
      invalidFeasibility("exact_visual_value_forbidden", detail);
}

export function cellPair(familyRef: string, profileRef: string): string {
  return `${familyRef}\0${profileRef}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
