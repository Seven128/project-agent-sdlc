export function scoreRows(result, hidden, evaluator, trace) {
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
    hard_gate_passed: failed.length === 0,
    provenance_verified: !trace.environment_doubt,
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

export function exactFailures(row, expected = {}) {
  return Object.entries(expected)
    .filter(([key, value]) => row[key] !== value)
    .map(([key, value]) => `${key}:${row[key]}!=${value}`);
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
