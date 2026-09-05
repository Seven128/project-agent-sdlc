import { scoreRows } from "./admission-score-shared.mjs";

export function scoreBuildReuseBuyInvocation(mode, result, trace, hidden) {
  if (mode === "quality")
    return scoreRows(result, hidden, evaluateBuildExpectation, trace);
  throw new Error(`admission_score_build_reuse_buy_mode_unsupported:${mode}`);
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
  for (const pattern of expected.prohibited_excludes ?? [])
    if (new RegExp(pattern, "iu").test(prohibited))
      failures.push(`legal_alternative_mislabeled:${pattern}`);
  const rationale = row.rationale_codes.join("\n");
  for (const pattern of expected.rationale_patterns ?? [])
    if (!new RegExp(pattern, "iu").test(rationale))
      failures.push(`rationale_pattern_missing:${pattern}`);
  return failures;
}
