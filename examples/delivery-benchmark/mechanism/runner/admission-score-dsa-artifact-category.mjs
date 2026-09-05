import { exactFailures, scoreRows } from "./admission-score-shared.mjs";

export function scoreDsaArtifactCategoryInvocation(mode, result, trace, hidden) {
  if (mode === "quality")
    return scoreRows(result, hidden, evaluateDsaExpectation, trace);
  throw new Error(`admission_score_dsa_artifact_mode_unsupported:${mode}`);
}

function evaluateDsaExpectation(row, expected) {
  const failures = [
    ...exactFailures(row, {
      decision: expected.decision,
      ...expected.exact,
    }),
  ];
  if (row.human_aesthetic_judgment_required !== true)
    failures.push("human_aesthetic_judgment_not_required");
  if (row.aesthetic_suitability_concluded !== false)
    failures.push("aesthetic_suitability_improperly_concluded");
  const rationale = row.reason_codes.join("\n");
  for (const pattern of expected.reason_patterns ?? [])
    if (!new RegExp(pattern, "iu").test(rationale))
      failures.push(`reason_pattern_missing:${pattern}`);
  return failures;
}
