export interface StructuralClosureCostBaseline {
  schema_version: "structural-closure-cost-baseline-v1";
  workload: string;
  exact: {
    K_fact: number;
    K_rule: number;
    M_value: number;
    M_total: number;
  };
  maximum: {
    N_dag: number;
    source_bytes: number;
    contract_bytes: number;
    evidence_bytes: number;
    default_context_bytes: number;
    revision_changed_files: number;
    revision_changed_lines: number;
    revision_changed_bytes: number;
  };
  minimum: {
    source_duplicate_saved_bytes: number;
    contract_duplicate_saved_bytes: number;
  };
  profiles: Record<
    string,
    {
      compile_ms: number;
      preflight_ms: number;
      final_gate_ms: number;
      peak_rss_bytes: number;
    }
  >;
}

export interface StructuralClosureCostObservation {
  cardinality: {
    K_fact: number;
    K_rule: number;
    M_value: number;
    M_total: number;
    N_dag: number;
  };
  bytes: {
    source: number;
    contract: number;
    evidence: number;
    default_context: number;
  };
  phases_ms: {
    compile: number;
    preflight: number;
    final_gate: number;
  };
  peak_rss_bytes: number;
  duplicate_blocks: {
    source: {
      saved_bytes: number;
      remaining_beneficial_candidates: number;
    };
    contract: {
      saved_bytes: number;
      remaining_beneficial_candidates: number;
    };
  };
  revision_blast_radius: {
    changed_files: number;
    changed_lines: number;
    changed_bytes: number;
    changed_fact_revision_keys: string[];
    expected_changed_fact_revision_keys: string[];
    changed_obligation_revision_keys: string[];
    expected_changed_obligation_revision_keys: string[];
    unrelated_fact_revision_identities_unchanged: boolean;
    unrelated_obligation_revision_identities_unchanged: boolean;
    shared_structure_catalog_unchanged: boolean;
  };
  unrelated_axis: {
    K_fact_growth: number;
    M_value_growth: number;
    persisted_shared_metadata_growth_bytes: number;
  };
}

export function evaluateStructuralClosureCost(
  observation: StructuralClosureCostObservation,
  baseline: StructuralClosureCostBaseline,
  profile: string,
): string[] {
  const findings: string[] = [];
  if (baseline.schema_version !== "structural-closure-cost-baseline-v1")
    findings.push("baseline_schema_version_invalid");
  for (const field of ["K_fact", "K_rule", "M_value", "M_total"] as const)
    if (observation.cardinality[field] !== baseline.exact[field])
      findings.push(
        `cardinality_${field}_mismatch:${observation.cardinality[field]}:${baseline.exact[field]}`,
      );
  compareMaximum(
    findings,
    "N_dag",
    observation.cardinality.N_dag,
    baseline.maximum.N_dag,
  );
  for (const [field, value] of [
    ["source_bytes", observation.bytes.source],
    ["contract_bytes", observation.bytes.contract],
    ["evidence_bytes", observation.bytes.evidence],
    ["default_context_bytes", observation.bytes.default_context],
  ] as const)
    compareMaximum(findings, field, value, baseline.maximum[field]);
  const phaseBudget = baseline.profiles[profile];
  if (!phaseBudget) findings.push(`baseline_profile_missing:${profile}`);
  else {
    compareMaximum(
      findings,
      "compile_ms",
      observation.phases_ms.compile,
      phaseBudget.compile_ms,
    );
    compareMaximum(
      findings,
      "preflight_ms",
      observation.phases_ms.preflight,
      phaseBudget.preflight_ms,
    );
    compareMaximum(
      findings,
      "final_gate_ms",
      observation.phases_ms.final_gate,
      phaseBudget.final_gate_ms,
    );
    compareMaximum(
      findings,
      "peak_rss_bytes",
      observation.peak_rss_bytes,
      phaseBudget.peak_rss_bytes,
    );
  }
  compareMinimum(
    findings,
    "source_duplicate_saved_bytes",
    observation.duplicate_blocks.source.saved_bytes,
    baseline.minimum.source_duplicate_saved_bytes,
  );
  compareMinimum(
    findings,
    "contract_duplicate_saved_bytes",
    observation.duplicate_blocks.contract.saved_bytes,
    baseline.minimum.contract_duplicate_saved_bytes,
  );
  for (const [side, value] of [
    [
      "source",
      observation.duplicate_blocks.source.remaining_beneficial_candidates,
    ],
    [
      "contract",
      observation.duplicate_blocks.contract.remaining_beneficial_candidates,
    ],
  ] as const)
    if (value !== 0)
      findings.push(`remaining_beneficial_candidates:${side}:${value}`);
  compareMaximum(
    findings,
    "revision_changed_files",
    observation.revision_blast_radius.changed_files,
    baseline.maximum.revision_changed_files,
  );
  compareMaximum(
    findings,
    "revision_changed_lines",
    observation.revision_blast_radius.changed_lines,
    baseline.maximum.revision_changed_lines,
  );
  compareMaximum(
    findings,
    "revision_changed_bytes",
    observation.revision_blast_radius.changed_bytes,
    baseline.maximum.revision_changed_bytes,
  );
  for (const [field, value] of [
    [
      "fact_revision_key_set",
      sameStrings(
        observation.revision_blast_radius.changed_fact_revision_keys,
        observation.revision_blast_radius.expected_changed_fact_revision_keys,
      ),
    ],
    [
      "obligation_revision_key_set",
      sameStrings(
        observation.revision_blast_radius.changed_obligation_revision_keys,
        observation.revision_blast_radius
          .expected_changed_obligation_revision_keys,
      ),
    ],
    [
      "unrelated_fact_revision_identities",
      observation.revision_blast_radius
        .unrelated_fact_revision_identities_unchanged,
    ],
    [
      "unrelated_obligation_revision_identities",
      observation.revision_blast_radius
        .unrelated_obligation_revision_identities_unchanged,
    ],
    [
      "shared_structure_catalog",
      observation.revision_blast_radius.shared_structure_catalog_unchanged,
    ],
  ] as const)
    if (!value) findings.push(`revision_locality_failed:${field}`);
  for (const [field, value] of [
    ["K_fact_growth", observation.unrelated_axis.K_fact_growth],
    ["M_value_growth", observation.unrelated_axis.M_value_growth],
    [
      "persisted_shared_metadata_growth_bytes",
      observation.unrelated_axis.persisted_shared_metadata_growth_bytes,
    ],
  ] as const)
    if (value !== 0) findings.push(`unrelated_axis_growth:${field}:${value}`);
  return findings.sort();
}

function compareMaximum(
  findings: string[],
  field: string,
  value: number,
  maximum: number,
): void {
  if (!Number.isFinite(value) || value > maximum)
    findings.push(`maximum_exceeded:${field}:${value}:${maximum}`);
}

function compareMinimum(
  findings: string[],
  field: string,
  value: number,
  minimum: number,
): void {
  if (!Number.isFinite(value) || value < minimum)
    findings.push(`minimum_not_met:${field}:${value}:${minimum}`);
}

function sameStrings(left: string[], right: string[]): boolean {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}
