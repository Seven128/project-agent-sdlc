export function draPassingRow(expected) {
  const row = {
    id: expected.id,
    disposition: "block",
    accepted_keys: [],
    rejected_keys: [],
    unresolved_keys: [],
    authority_rows: [],
    checkpoint: "none",
    write_action: "none",
    audit_status: "not-applicable",
    audit_types: [],
    reason_codes: [],
    derived_live_state: false,
    handoff_ready: false,
    next_action: "follow policy",
    ...expected.exact,
  };
  for (const [field, values] of Object.entries(expected.allowed ?? {}))
    row[field] = values[0];
  for (const [field, values] of Object.entries(expected.contains ?? {}))
    row[field] = [...values];
  for (const rule of expected.contains_any ?? [])
    row[rule.fields[0]] = [...(row[rule.fields[0]] ?? []), rule.value];
  row.authority_rows = structuredClone(expected.authority_rows ?? []);
  for (const authority of row.authority_rows)
    for (const [key, value] of Object.entries(authority))
      if (Array.isArray(value)) authority[key] = value[0];
  return row;
}

export function buildPassingRow(expected) {
  const allowed = [
    ...(expected.allowed_contains ?? []),
    ...(expected.allowed_contains_any ?? []).slice(0, 1),
  ];
  for (const selected of expected.selected_allowed)
    if (!allowed.includes(selected)) allowed.push(selected);
  return {
    id: expected.id,
    decision: expected.decision,
    allowed_solution_set: allowed,
    prohibited_failure_modes: [...(expected.prohibited_patterns ?? [])],
    selected_solution: expected.selected_allowed[0],
    rationale_codes: ["fixture-supported"],
  };
}

export function syntheticPair(replicate) {
  return {
    track: "build-reuse-buy",
    global_execution_envelope_sha256: "global-frozen",
    track_config_sha256: "track-frozen",
    pair_id: `pair-${replicate}`,
    replicate,
    requested_model: "gpt-5.6-terra",
    requested_reasoning_effort: "medium",
    requested_provider: "openai",
    fixture_identity: "fixture",
    environment_identity: "environment",
    candidate_git: {
      branch: "main",
      commit: "1".repeat(40),
      tree: "2".repeat(40),
      main_commit: "1".repeat(40),
      working_tree_clean: true,
    },
    environment_doubt: false,
    pairwise_win: true,
    quality: {
      baseline_targeted_defects: 4,
      candidate_targeted_defects: 2,
      targeted_defect_delta: 2,
      targeted_defect_reduction: 0.5,
      quality_win: true,
      critical_category_regressions: [],
      candidate_must_allow_false_blocking: 0,
      baseline_other_false_blocking: 0,
      candidate_other_false_blocking: 0,
    },
    baseline: { quality: { wall_ms: 100, tokens: 1000 } },
    candidate: { quality: { wall_ms: 100, tokens: 1000 } },
  };
}
