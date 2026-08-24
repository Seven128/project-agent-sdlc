import type {
  DesignResourceImplementationFeasibilityV1,
  DesignResourceTechnicalSourceRecordV1,
} from "./design-resource-implementation-feasibility-types.js";

const EXACT_VISUAL_VALUE_PATTERNS = [
  /#[0-9a-f]{3,8}\b/iu,
  /\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\s*\(/iu,
  /\b\d+(?:\.\d+)?(?:px|rem|em|pt|pc|vh|vw|vmin|vmax|ch|ex|deg)\b/iu,
  /\b(?:color|background|font(?:-family|-size|-weight)?|line-height|border-radius|radius|padding|margin|gap|width|height|opacity|duration|easing|shadow)\s*[:=]\s*\S+/iu,
  /--[a-z0-9_-]+\s*:\s*\S+/iu,
] as const;

const TIME_VALUE_PATTERN =
  /\b\d+(?:\.\d+)?\s*(?:milliseconds?|msecs?|ms|seconds?|secs?|sec|s)\b/giu;
const MOTION_TIME_CONTEXT =
  /\b(?:animation|transition|motion|duration|delay|easing|timeline|keyframes?|fade|spring|stagger|enter|exit|hover|press|ease(?:-in|-out|-in-out)?)\b/iu;
const TECHNICAL_TIME_CONTEXT =
  /\b(?:build|compile|bundle|generation|ci|tests?|startup|initialization|latency|timeout|network|benchmark|runtime\s+cost|render\s+cost|benchmark\s+execution)\b/iu;
const TIME_CONTEXT_RADIUS = 80;

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
    if (
      EXACT_VISUAL_VALUE_PATTERNS.some((pattern) => pattern.test(value)) ||
      hasForbiddenTimeValue(value)
    )
      invalidFeasibility("exact_visual_value_forbidden", detail);
}

function hasForbiddenTimeValue(value: string): boolean {
  for (const match of value.matchAll(TIME_VALUE_PATTERN)) {
    const index = match.index;
    const context = value.slice(
      Math.max(0, index - TIME_CONTEXT_RADIUS),
      Math.min(value.length, index + match[0].length + TIME_CONTEXT_RADIUS),
    );
    if (MOTION_TIME_CONTEXT.test(context)) return true;
    if (!TECHNICAL_TIME_CONTEXT.test(context)) return true;
  }
  return false;
}

export function validateNoExactVisualValueCarriers(
  document: DesignResourceImplementationFeasibilityV1,
): void {
  for (const observation of document.substrate_observations)
    if (observation.reason !== null)
      assertNoExactVisualValues(
        [observation.reason],
        `substrate_observation:${observation.kind}:reason`,
      );
  for (const cell of document.component_family_cells)
    for (const realization of cell.feasible_realizations) {
      assertNoExactVisualValues(
        realization.observed_costs,
        `realization:${realization.key}:observed_costs`,
      );
      assertNoExactVisualValues(
        realization.observed_risks,
        `realization:${realization.key}:observed_risks`,
      );
    }
  for (const blocker of document.blockers)
    assertNoExactVisualValues(
      [blocker.description],
      `blocker:${blocker.key}:description`,
    );
}

export function cellPair(familyRef: string, profileRef: string): string {
  return `${familyRef}\0${profileRef}`;
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
