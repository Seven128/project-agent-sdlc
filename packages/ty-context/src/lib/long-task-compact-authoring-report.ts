export type CompactAuthoringStatusV1 =
  | "already_compact"
  | "equivalent_projection_available"
  | "not_beneficial"
  | "not_applicable"
  | "blocked";

export interface CompactAuthoringByteDeltaV1 {
  before_canonical_bytes: number;
  after_canonical_bytes: number;
  reduction_bytes: number;
  reduction_ratio: number;
}

export interface LongTaskCompactAuthoringReportV1 {
  schema_version: "long-task-compact-authoring-report-v1";
  status: CompactAuthoringStatusV1;
  authority_lock_present: boolean;
  applied: boolean;
  apply_allowed: boolean;
  source_path: string | null;
  contract_path: string | null;
  canonical_bytes: {
    source: CompactAuthoringByteDeltaV1;
    contract: CompactAuthoringByteDeltaV1;
    combined: CompactAuthoringByteDeltaV1;
  };
  counts: {
    facts_before: number;
    facts_after: number;
    obligations_before: number;
    obligations_after: number;
    assertions_before: number;
    assertions_after: number;
    fact_revision_identities_before: number;
    fact_revision_identities_after: number;
    obligation_revision_identities_before: number;
    obligation_revision_identities_after: number;
  };
  equivalence: {
    normalized_semantic_manifest: boolean;
    normalized_contract: boolean;
    fact_identity_set: boolean;
    obligation_identity_set: boolean;
    retained_source_outside_formal_block: boolean;
  };
  diagnostic_code: string;
  reason: string;
  repair_command: string | null;
}

const EQUIVALENT_REDUCTION_WARNING_THRESHOLD = 0.1;

export function compactAuthoringWarningThreshold(): number {
  return EQUIVALENT_REDUCTION_WARNING_THRESHOLD;
}

export function compactAuthoringByteDelta(
  before: number,
  after: number,
): CompactAuthoringByteDeltaV1 {
  const reduction = before - after;
  return {
    before_canonical_bytes: before,
    after_canonical_bytes: after,
    reduction_bytes: reduction,
    reduction_ratio:
      before === 0
        ? 0
        : Math.round((reduction / before) * 1_000_000) / 1_000_000,
  };
}

export function emptyCompactAuthoringReport(): LongTaskCompactAuthoringReportV1 {
  const emptyBytes = compactAuthoringByteDelta(0, 0);
  return {
    schema_version: "long-task-compact-authoring-report-v1",
    status: "blocked",
    authority_lock_present: false,
    applied: false,
    apply_allowed: false,
    source_path: null,
    contract_path: null,
    canonical_bytes: {
      source: { ...emptyBytes },
      contract: { ...emptyBytes },
      combined: { ...emptyBytes },
    },
    counts: {
      facts_before: 0,
      facts_after: 0,
      obligations_before: 0,
      obligations_after: 0,
      assertions_before: 0,
      assertions_after: 0,
      fact_revision_identities_before: 0,
      fact_revision_identities_after: 0,
      obligation_revision_identities_before: 0,
      obligation_revision_identities_after: 0,
    },
    equivalence: {
      normalized_semantic_manifest: false,
      normalized_contract: false,
      fact_identity_set: false,
      obligation_identity_set: false,
      retained_source_outside_formal_block: false,
    },
    diagnostic_code: "compact_authoring_not_analyzed",
    reason: "Compact authoring was not analyzed.",
    repair_command: null,
  };
}

export function blockedCompactAuthoringReport(
  report: LongTaskCompactAuthoringReportV1,
  code: string,
  reason: string,
): LongTaskCompactAuthoringReportV1 {
  return {
    ...report,
    status: "blocked",
    applied: false,
    apply_allowed: false,
    diagnostic_code: code,
    reason,
    repair_command: null,
  };
}

export function compactAuthoringErrorCode(error: unknown): string {
  return (
    compactAuthoringErrorMessage(error).split(":")[0] ||
    "compact_authoring_failed"
  );
}

export function compactAuthoringErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
