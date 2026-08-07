import { exactFailures, scoreRows } from "./admission-score-shared.mjs";

export function scoreDraAdmissionInvocation(mode, result, trace, hidden) {
  if (mode === "quality")
    return scoreRows(result, hidden, evaluateDraExpectation, trace);
  if (mode === "simple") return scoreSimplePath(result, trace);
  throw new Error(`admission_score_dra_mode_unsupported:${mode}`);
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
  if ((result?.tool_actions ?? []).length)
    failures.push("reported_tool_actions");
  if (trace.tool_calls !== 0) failures.push("observed_tool_calls");
  return {
    hard_gate_passed: failures.length === 0,
    provenance_verified: !trace.environment_doubt,
    failures,
  };
}

function evaluateDraExpectation(row, expected) {
  const failures = exactFailures(row, expected.exact);
  appendAllowedFailures(failures, row, expected.allowed);
  appendCollectionFailures(failures, row, expected.contains, "missing", false);
  appendCollectionFailures(
    failures,
    row,
    expected.excludes,
    "unexpected",
    true,
  );
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
    if (
      !(row.authority_rows ?? []).some((item) => allowedObject(item, authority))
    )
      failures.push(`authority_row_missing:${authority.key}`);
}

function allowedObject(actual, expected) {
  return Object.entries(expected).every(([key, value]) =>
    Array.isArray(value) ? value.includes(actual[key]) : actual[key] === value,
  );
}
