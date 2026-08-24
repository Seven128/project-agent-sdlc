import type {
  LongTaskFindingV2,
  RepairFrontierCheckV1,
  RepairFrontierGroupV1,
} from "./long-task-delivery-types.js";
import {
  intersects,
  normalizedClaimRefs,
  rootCauseKey,
  unique,
} from "./long-task-repair-frontier-utils.js";

export function groupRepairFindings(
  findings: LongTaskFindingV2[],
  checks: RepairFrontierCheckV1[],
  stillValidByCheck: Map<string, string>,
): RepairFrontierGroupV1[] {
  const grouped = new Map<string, LongTaskFindingV2[]>();
  for (const finding of findings) {
    const root = rootCauseKey(finding);
    const group = grouped.get(root);
    if (group) group.push(finding);
    else grouped.set(root, [finding]);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([root, rows]) =>
      repairFrontierGroup(root, rows, checks, stillValidByCheck),
    );
}

function repairFrontierGroup(
  root: string,
  rows: LongTaskFindingV2[],
  checks: RepairFrontierCheckV1[],
  stillValidByCheck: Map<string, string>,
): RepairFrontierGroupV1 {
  const matchingChecks = checks.filter((check) =>
    rows.some((row) => findingMatchesCheck(row, check)),
  );
  return {
    root_cause_key: root,
    finding_codes: unique(rows.map((row) => row.code)),
    source_fragment_refs: unique(
      rows.flatMap((row) => row.source_fragment_refs ?? []),
    ),
    affected_fact_refs: unique(rows.flatMap((row) => row.fact_refs ?? [])),
    affected_proof_obligation_refs: unique(
      rows.flatMap((row) => row.proof_obligation_refs ?? []),
    ),
    affected_claim_refs: unique(
      rows.flatMap((row) => normalizedClaimRefs(row)),
    ),
    expected_authority_refs: unique(
      rows.flatMap((row) => row.expected_authority_refs ?? []),
    ),
    actual_evidence_refs: unique(
      rows.flatMap((row) => row.actual_evidence_refs ?? []),
    ),
    suggested_implementation_owners: unique(
      rows.flatMap((row) =>
        row.implementation_owner ? [row.implementation_owner.label] : [],
      ),
    ),
    suggested_owner_paths: unique(
      rows.flatMap(
        (row) => row.implementation_owner?.path_globs ?? row.owner_paths ?? [],
      ),
    ),
    verification_owners: unique(
      rows.flatMap((row) => verificationOwnerRefs(row)),
    ),
    invalidation_reasons: unique(
      rows.flatMap((row) => row.invalidation_reasons ?? [row.code]),
    ),
    rerun_obligation_refs: unique(
      rows.flatMap((row) => row.rerun_obligation_refs ?? []),
    ),
    minimum_diagnostic_reverify: matchingChecks.map((check) => check.check_ref),
    still_valid_diagnostic_evidence: groupStillValidEvidence(
      rows,
      stillValidByCheck,
    ),
  };
}

function findingMatchesCheck(
  finding: LongTaskFindingV2,
  check: RepairFrontierCheckV1,
): boolean {
  return (
    (finding.check_key !== null &&
      finding.check_key === check.check_key &&
      (finding.outcome_key ?? null) === check.outcome_key) ||
    intersects(finding.rerun_obligation_refs ?? [], check.obligation_refs)
  );
}

function groupStillValidEvidence(
  rows: LongTaskFindingV2[],
  stillValidByCheck: Map<string, string>,
): string[] {
  const outcomeKeys = new Set(
    rows
      .map((row) => row.outcome_key ?? row.owning_outcome_key)
      .filter((value): value is string => Boolean(value)),
  );
  return unique(
    [...stillValidByCheck.entries()]
      .filter(([ref]) => {
        const outcome = ref.startsWith("GLOBAL.")
          ? null
          : ref.slice(0, ref.indexOf("."));
        return outcome === null
          ? outcomeKeys.size === 0
          : outcomeKeys.has(outcome);
      })
      .map(([, evidence]) => evidence),
  );
}

function verificationOwnerRefs(finding: LongTaskFindingV2): string[] {
  const owner = finding.verification_owner;
  if (owner?.kind === "machine_check")
    return [`${owner.outcome_key ?? "GLOBAL"}.${owner.check_key}`];
  if (owner?.kind === "external_confirmation")
    return [`EXTERNAL.${owner.confirmation_ref}:${owner.owner}`];
  return [];
}
