import {
  compareUtf8Paths,
  normalizeContextPath,
} from "../context-catalog/catalog-paths.js";
import type {
  ContextRouteAmbiguity,
  ContextRouteBudgetExceeded,
  ContextRouteGroup,
  ContextRouteReason,
  ContextRouteUnresolved,
} from "./context-route-types.js";

export function compareRouteReasons(
  left: ContextRouteReason,
  right: ContextRouteReason,
): number {
  return (
    compareUtf8Paths(left.kind, right.kind) ||
    compareUtf8Paths(left.input, right.input) ||
    compareUtf8Paths(left.detail, right.detail)
  );
}

export function sortRouteGroups(
  groups: Iterable<ContextRouteGroup>,
): ContextRouteGroup[] {
  return [...groups].sort(compareUtf8Paths);
}

export function stableRouteBudgetExceeded(
  values: readonly ContextRouteBudgetExceeded[],
): ContextRouteBudgetExceeded[] {
  const merged = new Map<string, ContextRouteBudgetExceeded>();
  for (const entry of values) {
    const normalized = {
      ...entry,
      ...(entry.path ? { path: normalizeContextPath(entry.path) } : {}),
    };
    const key = `${normalized.budget}\0${normalized.path ?? ""}`;
    const current = merged.get(key);
    merged.set(
      key,
      current
        ? {
            ...normalized,
            limit: Math.min(current.limit, normalized.limit),
            observed: Math.max(current.observed, normalized.observed),
          }
        : normalized,
    );
  }
  return [...merged.values()].sort(
    (left, right) =>
      compareUtf8Paths(left.budget, right.budget) ||
      compareUtf8Paths(left.path ?? "", right.path ?? "") ||
      left.limit - right.limit ||
      left.observed - right.observed,
  );
}

export function compareRouteAmbiguities(
  left: ContextRouteAmbiguity,
  right: ContextRouteAmbiguity,
): number {
  return (
    compareUtf8Paths(left.kind, right.kind) ||
    compareUtf8Paths(left.input, right.input) ||
    compareAreaCandidateLists(left.candidates, right.candidates) ||
    compareUtf8Paths(left.reason, right.reason)
  );
}

export function compareRouteUnresolved(
  left: ContextRouteUnresolved,
  right: ContextRouteUnresolved,
): number {
  return (
    compareUtf8Paths(left.kind, right.kind) ||
    compareUtf8Paths(left.input, right.input) ||
    compareUtf8Paths(left.reason, right.reason)
  );
}

function compareAreaCandidateLists(
  left: ContextRouteAmbiguity["candidates"],
  right: ContextRouteAmbiguity["candidates"],
): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const comparison =
      compareUtf8Paths(left[index].root, right[index].root) ||
      compareUtf8Paths(left[index].id, right[index].id) ||
      compareUtf8Paths(left[index].context, right[index].context);
    if (comparison !== 0) return comparison;
  }
  return left.length - right.length;
}
