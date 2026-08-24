import type {
  CompiledCheckV2,
  LongTaskFindingV2,
} from "./long-task-delivery-types.js";

export function normalizedClaimRefs(finding: LongTaskFindingV2): string[] {
  return unique(
    (finding.claim_keys ?? []).map((claim) =>
      finding.outcome_key && !claim.startsWith(`${finding.outcome_key}.`)
        ? `${finding.outcome_key}.${claim}`
        : claim,
    ),
  );
}

export function checkRef(
  check: Pick<CompiledCheckV2, "outcome_key" | "key">,
): string {
  return `${check.outcome_key ?? "GLOBAL"}.${check.key}`;
}

export function rootCauseKey(finding: LongTaskFindingV2): string {
  const scope = finding.outcome_key ?? finding.owning_outcome_key ?? "GLOBAL";
  if (finding.check_key) return `${scope}.${finding.check_key}`;
  if (finding.binding_ref) return `${scope}.binding:${finding.binding_ref}`;
  if (finding.proof_obligation_refs?.length)
    return `${scope}.proof:${finding.proof_obligation_refs[0]}`;
  if (finding.fact_refs?.length) return `${scope}.fact:${finding.fact_refs[0]}`;
  return `${scope}.finding:${finding.code}`;
}

export function intersects(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}
