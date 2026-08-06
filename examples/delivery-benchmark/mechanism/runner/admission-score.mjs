export function scoreAdmissionInvocation(track, mode, result, trace, hidden) {
  if (track === "dra-semantic-recovery" && mode === "quality")
    return scoreRows(result, hidden, evaluateDraExpectation, trace);
  if (track === "dra-semantic-recovery" && mode === "simple")
    return scoreSimplePath(result, trace);
  if (track === "build-reuse-buy" && mode === "quality")
    return scoreRows(result, hidden, evaluateBuildExpectation, trace);
  throw new Error(`admission_score_route_unsupported:${track}:${mode}`);
}

function scoreRows(result, hidden, evaluator, trace) {
  const rows = result?.case_results ?? [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const duplicates = rows.length - byId.size;
  const findings = hidden.expectations.map((expected) => {
    const row = byId.get(expected.id);
    const failures = row ? evaluator(row, expected) : ["missing_result"];
    return {
      id: expected.id,
      severity: expected.severity,
      category: expected.category,
      must_allow: expected.must_allow === true,
      passed: failures.length === 0,
      failures,
      false_blocking: row ? isFalseBlocking(row, expected) : false,
    };
  });
  if (duplicates)
    findings.push({
      id: "duplicate-results",
      severity: "critical",
      category: "result-integrity",
      must_allow: false,
      passed: false,
      failures: [`duplicate_count:${duplicates}`],
      false_blocking: false,
    });
  const failed = findings.filter((item) => !item.passed);
  return {
    hard_gate_passed: failed.length === 0 && !trace.environment_doubt,
    critical_defects: countSeverity(failed, "critical"),
    major_defects: countSeverity(failed, "major"),
    targeted_defects: failed.filter((item) =>
      ["critical", "major"].includes(item.severity),
    ).length,
    critical_categories: categoryCounts(
      failed.filter((item) => item.severity === "critical"),
    ),
    must_allow_false_blocking: findings.filter(
      (item) => item.must_allow && item.false_blocking,
    ).length,
    other_false_blocking: findings.filter(
      (item) => !item.must_allow && item.false_blocking,
    ).length,
    findings,
  };
}

function scoreSimplePath(result, trace) {
  const expected = {
    create_checkpoint: false,
    persisted_recovery_bytes: 0,
    user_pause: false,
    additional_provider_generation: false,
    formal_handoff_preflight: false,
    proposal_writeback: false,
    helper_write_transaction: false,
  };
  const failures = Object.entries(expected)
    .filter(([key, value]) => result?.[key] !== value)
    .map(([key]) => key);
  if ((result?.scope_expansion ?? []).length) failures.push("scope_expansion");
  if ((result?.tool_actions ?? []).length) failures.push("reported_tool_actions");
  if (trace.tool_calls !== 0) failures.push("observed_tool_calls");
  return { hard_gate_passed: failures.length === 0, failures };
}

function evaluateDraExpectation(row, expected) {
  const failures = exactFailures(row, expected.exact);
  appendAllowedFailures(failures, row, expected.allowed);
  appendCollectionFailures(failures, row, expected.contains, "missing", false);
  appendCollectionFailures(failures, row, expected.excludes, "unexpected", true);
  appendContainsAnyFailures(failures, row, expected.contains_any);
  appendAuthorityFailures(failures, row, expected.authority_rows);
  return failures;
}

function appendAllowedFailures(failures, row, allowed = {}) {
  for (const [field, values] of Object.entries(allowed))
    if (!values.includes(row[field]))
      failures.push(`${field}:not-allowed:${row[field]}`);
}

function appendCollectionFailures(
  failures,
  row,
  expectations = {},
  label,
  rejectMatches,
) {
  for (const [field, values] of Object.entries(expectations))
    for (const value of values) {
      const present = (row[field] ?? []).includes(value);
      if (present === rejectMatches)
        failures.push(`${field}:${label}:${value}`);
    }
}

function appendContainsAnyFailures(failures, row, rules = []) {
  for (const rule of rules)
    if (!rule.fields.some((field) => (row[field] ?? []).includes(rule.value)))
      failures.push(`contains_any:missing:${rule.value}`);
}

function appendAuthorityFailures(failures, row, authorities = []) {
  for (const authority of authorities)
    if (!(row.authority_rows ?? []).some((item) => allowedObject(item, authority)))
      failures.push(`authority_row_missing:${authority.key}`);
}

function evaluateBuildExpectation(row, expected) {
  const failures = [];
  if (row.decision !== expected.decision)
    failures.push(`decision:${row.decision}`);
  for (const value of expected.allowed_contains ?? [])
    if (!row.allowed_solution_set.includes(value))
      failures.push(`allowed_missing:${value}`);
  if (
    expected.allowed_contains_any &&
    !expected.allowed_contains_any.some((value) =>
      row.allowed_solution_set.includes(value),
    )
  )
    failures.push("allowed_any_missing");
  if (!expected.selected_allowed.includes(row.selected_solution))
    failures.push(`selected_not_allowed:${row.selected_solution}`);
  const prohibited = row.prohibited_failure_modes.join("\n");
  for (const pattern of expected.prohibited_patterns ?? [])
    if (!new RegExp(pattern, "iu").test(prohibited))
      failures.push(`prohibited_pattern_missing:${pattern}`);
  return failures;
}

function exactFailures(row, expected = {}) {
  return Object.entries(expected)
    .filter(([key, value]) => row[key] !== value)
    .map(([key, value]) => `${key}:${row[key]}!=${value}`);
}

function exactObject(actual, expected) {
  return Object.entries(expected).every(([key, value]) => actual[key] === value);
}

function allowedObject(actual, expected) {
  return Object.entries(expected).every(([key, value]) =>
    Array.isArray(value) ? value.includes(actual[key]) : actual[key] === value,
  );
}

function isFalseBlocking(row, expected) {
  const expectsAllow =
    expected.decision === "allow" ||
    ["allow", "idempotent"].includes(expected.exact?.disposition);
  if (!expectsAllow) return false;
  return (
    row.decision === "block" ||
    row.decision === "decision-required" ||
    ["block", "unavailable"].includes(row.disposition) ||
    row.selected_solution === "none"
  );
}

function categoryCounts(findings) {
  const result = {};
  for (const finding of findings)
    result[finding.category] = (result[finding.category] ?? 0) + 1;
  return result;
}

function countSeverity(findings, severity) {
  return findings.filter((item) => item.severity === severity).length;
}
