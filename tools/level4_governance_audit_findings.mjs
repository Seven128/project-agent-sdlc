import { assert } from "./long_task_real_process_roi_scoring.mjs";
import { assertExactKeys } from "./long_task_formal_total_cost_shared.mjs";

export function validateLevel4CurrentCandidateResults(
  results,
  evidenceReference,
  inputsById,
  commandsById,
) {
  assertExactKeys(
    results,
    [
      "benchmark_implementation_identity_sha256",
      "candidate_commit",
      "candidate_tree",
      "formal_report_input_id",
      "formal_verifier_command_id",
      "package_sha256",
      "runtime_tcb_identity_sha256",
      "validation_command_ids",
    ],
    "level4_audit_current_results_fields",
  );
  const formalReport = inputsById.get(results.formal_report_input_id);
  const formalVerifier = commandsById.get(results.formal_verifier_command_id);
  assert(
    results.candidate_commit === evidenceReference.candidate.commit &&
      results.candidate_tree === evidenceReference.candidate.tree &&
      results.package_sha256 === evidenceReference.candidate.package_sha256 &&
      results.benchmark_implementation_identity_sha256 ===
        evidenceReference.benchmark_implementation_identity_sha256 &&
      results.runtime_tcb_identity_sha256 ===
        evidenceReference.runtime_tcb_identity_sha256 &&
      formalReport?.role === "formal-verifier-report" &&
      formalVerifier?.exit_code === 0 &&
      formalVerifier.stdout_sha256 === formalReport.sha256 &&
      isFormalVerifierCommand(
        formalVerifier.argv,
        evidenceReference.candidate.commit,
      ) &&
      Array.isArray(results.validation_command_ids) &&
      results.validation_command_ids.length > 0 &&
      new Set(results.validation_command_ids).size ===
        results.validation_command_ids.length &&
      results.validation_command_ids.every(
        (id) => commandsById.get(id)?.exit_code === 0,
      ),
    "level4_audit_current_results",
  );
}

function isFormalVerifierCommand(argv, candidateCommit) {
  if (
    !Array.isArray(argv) ||
    argv.length !== 8 ||
    !/(?:^|[\\/])node(?:\.exe)?$/iu.test(argv[0]) ||
    !/(?:^|[\\/])verify_long_task_real_process_roi\.mjs$/u.test(argv[1])
  )
    return false;
  const allowed = new Set(["--candidate", "--formal-evidence", "--report"]);
  const values = new Map();
  for (let index = 2; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (
      !allowed.has(option) ||
      values.has(option) ||
      typeof value !== "string" ||
      value.length === 0 ||
      value.startsWith("--")
    )
      return false;
    values.set(option, value);
  }
  return (
    values.size === allowed.size &&
    values.get("--candidate") === candidateCommit
  );
}

export function validateLevel4Findings(findings, inputsById, commandsById) {
  assert(Array.isArray(findings), "level4_audit_findings");
  const ids = new Set();
  for (const finding of findings) {
    assertExactKeys(
      finding,
      [
        "command_refs",
        "finding_id",
        "input_refs",
        "severity",
        "status",
        "summary",
      ],
      "level4_audit_finding_fields",
    );
    assert(
      typeof finding.finding_id === "string" &&
        finding.finding_id.length > 0 &&
        !ids.has(finding.finding_id) &&
        ["blocker", "critical-counterexample", "p1", "p2", "note"].includes(
          finding.severity,
        ) &&
        ["open", "closed"].includes(finding.status) &&
        typeof finding.summary === "string" &&
        finding.summary.length > 0 &&
        Array.isArray(finding.input_refs) &&
        finding.input_refs.length > 0 &&
        finding.input_refs.every((id) => inputsById.has(id)) &&
        Array.isArray(finding.command_refs) &&
        finding.command_refs.length > 0 &&
        finding.command_refs.every((id) => commandsById.has(id)),
      "level4_audit_finding",
    );
    ids.add(finding.finding_id);
  }
}

export function validateLevel4AuditConclusion(conclusion, findings) {
  assertExactKeys(
    conclusion,
    [
      "governance_audit_passed",
      "open_blocker_count",
      "open_critical_counterexample_count",
      "open_p1_count",
    ],
    "level4_audit_conclusion_fields",
  );
  const openBlockers = countOpen(findings, "blocker");
  const openP1 = countOpen(findings, "p1");
  const openCriticalCounterexamples = countOpen(
    findings,
    "critical-counterexample",
  );
  assert(
    conclusion.open_blocker_count === openBlockers &&
      conclusion.open_p1_count === openP1 &&
      conclusion.open_critical_counterexample_count ===
        openCriticalCounterexamples &&
      conclusion.governance_audit_passed ===
        (openBlockers === 0 &&
          openP1 === 0 &&
          openCriticalCounterexamples === 0),
    "level4_audit_conclusion",
  );
}

function countOpen(findings, severity) {
  return findings.filter(
    (finding) => finding.status === "open" && finding.severity === severity,
  ).length;
}
