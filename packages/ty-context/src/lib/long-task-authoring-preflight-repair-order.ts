import type { AuthoringPreflightDiagnosticV1 } from "./long-task-authoring-preflight-types.js";
import { canonicalJson, sha256Hex } from "./strict-codec.js";

const STRUCTURAL_BLOCKERS = new Set([
  "requirement_key_duplicate",
  "control_key_duplicate",
  "obligation_key_duplicate",
  "forbidden_shortcut_key_duplicate",
]);

const COVERAGE_FOLLOW_UPS = new Set([
  "product_claim_uncovered",
  "product_claim_required_surfaces_missing",
  "global_claim_uncovered",
]);

/**
 * Adds repair-order metadata only when a structural duplicate makes the
 * identity of an uncovered Claim ambiguous. The structural diagnostic must be
 * reviewed first, but the coverage finding is never treated as automatically
 * resolved. No diagnostic is hidden, merged, reclassified or removed.
 */
export function applyDiagnosticRepairOrder(
  diagnostics: AuthoringPreflightDiagnosticV1[],
): AuthoringPreflightDiagnosticV1[] {
  const groups = diagnostics.map((diagnostic) => ({
    diagnostic,
    entity: repairEntity(diagnostic),
  }));
  const blockersByEntity = new Map<
    string,
    Array<{ index: number; id: string }>
  >();

  for (const [index, item] of groups.entries()) {
    if (!item.entity || !STRUCTURAL_BLOCKERS.has(item.diagnostic.code))
      continue;
    const blockers = blockersByEntity.get(item.entity) ?? [];
    blockers.push({ index, id: stableDiagnosticId(item.diagnostic) });
    blockersByEntity.set(item.entity, blockers);
  }

  const linkedBlockerIndexes = new Set<number>();
  const dependencies = new Map<number, string[]>();
  for (const [index, item] of groups.entries()) {
    if (!item.entity || !COVERAGE_FOLLOW_UPS.has(item.diagnostic.code))
      continue;
    const blockers = blockersByEntity.get(item.entity);
    if (!blockers?.length) continue;
    blockers.forEach((blocker) => linkedBlockerIndexes.add(blocker.index));
    dependencies.set(
      index,
      [...new Set(blockers.map((blocker) => blocker.id))].sort(),
    );
  }

  return diagnostics.map((diagnostic, index) => {
    const blockedBy = dependencies.get(index);
    if (blockedBy)
      return {
        ...diagnostic,
        diagnostic_id: stableDiagnosticId(diagnostic),
        repair_group: groups[index]!.entity!,
        repair_priority: "dependent" as const,
        blocked_by: blockedBy,
      };
    if (linkedBlockerIndexes.has(index))
      return {
        ...diagnostic,
        diagnostic_id: stableDiagnosticId(diagnostic),
        repair_group: groups[index]!.entity!,
        repair_priority: "primary" as const,
      };
    return diagnostic;
  });
}

function stableDiagnosticId(
  diagnostic: AuthoringPreflightDiagnosticV1,
): string {
  return `diag-${sha256Hex(
    canonicalJson({
      level: diagnostic.level,
      code: diagnostic.code,
      message: diagnostic.message,
      outcome_key: diagnostic.outcome_key ?? null,
      check_key: diagnostic.check_key ?? null,
      refs: diagnostic.refs ?? [],
      repair_hint: diagnostic.repair_hint ?? null,
    }),
  ).slice(0, 16)}`;
}

function repairEntity(
  diagnostic: AuthoringPreflightDiagnosticV1,
): string | null {
  const refs = diagnostic.refs ?? [];
  switch (diagnostic.code) {
    case "requirement_key_duplicate":
      return scopedClaim(refs, "requirement");
    case "control_key_duplicate":
      return scopedClaim(refs, "control");
    case "obligation_key_duplicate":
      return scopedClaim(refs, "obligation");
    case "forbidden_shortcut_key_duplicate":
      return scopedClaim(refs, "forbidden_shortcut");
    case "product_claim_uncovered":
      return refs.length === 1 ? refs[0] : null;
    case "product_claim_required_surfaces_missing":
      return (
        refs.find((ref) =>
          /^[a-z0-9][a-z0-9-]*\.(?:result|requirement\.|control\.|control_relation\.|non_completing\.|obligation\.|forbidden_shortcut\.)/u.test(
            ref,
          ),
        ) ?? null
      );
    case "global_claim_uncovered":
      return refs.length === 1 ? refs[0] : null;
    default:
      return null;
  }
}

function scopedClaim(refs: string[], kind: string): string | null {
  const [scope, key] = refs;
  return scope && key ? `${scope}.${kind}.${key}` : null;
}
