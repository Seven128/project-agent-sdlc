import type { AcceptanceObligationReachabilityV1 } from "./long-task-acceptance-reachability.js";
import type { ExternalConfirmationV2 } from "./long-task-delivery-types.js";
import { externalArtifactIntegrityIssues } from "./long-task-external-confirmation-artifacts.js";
import type { ExternalAuthorityContextV1 } from "./long-task-external-confirmation-context.js";
import { objectiveExternalComparison } from "./long-task-external-confirmation-expected.js";
import {
  deriveRelevantExternalInputIdentity,
  externalRows,
  sameSet,
  sameValue,
} from "./long-task-external-confirmation-identity.js";
import type {
  ExternalConfirmationEvaluationV1,
  ExternalConfirmationObligationResultV1,
  ExternalConfirmationRecordV1,
} from "./long-task-external-confirmation-types.js";

export async function evaluateExternalConfirmationRecord(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV1,
): Promise<ExternalConfirmationEvaluationV1> {
  const relevant = deriveRelevantExternalInputIdentity(
    context.compiled,
    confirmation.key,
    context.manifest,
  );
  const issues = recordIdentityIssues(context, confirmation, record, relevant);
  const candidateMatches = sameValue(record.candidate, context.candidate);
  const carriedForward =
    !candidateMatches &&
    relevant.mode === "bounded_paths" &&
    record.relevant_input_identity === relevant.identity;
  if (!candidateMatches && !carriedForward)
    issues.push("candidate_identity_stale");

  const rows = externalRows(context.compiled, confirmation.key);
  if (!rows.length && confirmation.blocks_target)
    issues.push("blocking_confirmation_has_no_exact_obligations");
  issues.push(...(await recordSetAndArtifactIssues(context, record, rows)));
  const obligationResults = evaluateObligationResults(
    context,
    confirmation,
    record,
    rows,
    issues,
  );
  return {
    confirmation_ref: confirmation.key,
    owner: confirmation.owner,
    blocks_target: confirmation.blocks_target,
    state: evaluationState(issues, rows, obligationResults),
    record_sha256: record.record_sha256,
    session_id: record.session.id,
    relevant_input_identity: relevant.identity,
    carried_forward_from_candidate: carriedForward,
    actor_identity_assurance: "declared_identity_and_record_integrity_only",
    obligation_results: obligationResults.sort((left, right) =>
      left.obligation_ref.localeCompare(right.obligation_ref),
    ),
    issues: [...new Set(issues)].sort(),
  };
}

export function emptyExternalConfirmationEvaluation(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  state: ExternalConfirmationEvaluationV1["state"],
  issues: string[],
): ExternalConfirmationEvaluationV1 {
  const relevant = deriveRelevantExternalInputIdentity(
    context.compiled,
    confirmation.key,
    context.manifest,
  );
  return {
    confirmation_ref: confirmation.key,
    owner: confirmation.owner,
    blocks_target: confirmation.blocks_target,
    state,
    record_sha256: null,
    session_id: null,
    relevant_input_identity: relevant.identity,
    carried_forward_from_candidate: false,
    actor_identity_assurance: "declared_identity_and_record_integrity_only",
    obligation_results: [],
    issues,
  };
}

function recordIdentityIssues(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV1,
  relevant: ReturnType<typeof deriveRelevantExternalInputIdentity>,
): string[] {
  const issues: string[] = [];
  if (record.confirmation_ref !== confirmation.key)
    issues.push("confirmation_ref_mismatch");
  if (record.compiled_identity !== context.compiled.compiled_identity)
    issues.push("compiled_identity_stale");
  if (record.authority_revision !== context.compiled.authority_revision)
    issues.push("authority_revision_stale");
  if (!confirmation.actor || !sameValue(record.actor, confirmation.actor))
    issues.push("declared_actor_identity_mismatch");
  if (record.session.target_ref !== confirmation.target_ref)
    issues.push("target_ref_mismatch");
  if (record.session.environment_identity !== confirmation.environment_identity)
    issues.push("environment_identity_mismatch");
  if (Date.parse(record.session.completed_at) > Date.now() + 5 * 60_000)
    issues.push("session_completed_at_in_future");
  if (record.relevant_input_identity !== relevant.identity)
    issues.push("relevant_input_identity_stale");
  return issues;
}

async function recordSetAndArtifactIssues(
  context: ExternalAuthorityContextV1,
  record: ExternalConfirmationRecordV1,
  rows: AcceptanceObligationReachabilityV1[],
): Promise<string[]> {
  const issues: string[] = [];
  const expectedKeys = rows.map((row) => row.obligation_ref).sort();
  const actualKeys = record.results.map((row) => row.obligation_ref).sort();
  if (!sameSet(expectedKeys, actualKeys))
    issues.push("obligation_result_set_mismatch");
  const evidenceRefs = [
    ...new Set(record.results.flatMap((result) => result.evidence_refs)),
  ].sort();
  if (!sameSet(evidenceRefs, Object.keys(record.artifact_hashes).sort()))
    issues.push("artifact_hash_set_mismatch");
  issues.push(
    ...(await externalArtifactIntegrityIssues(
      context.repository,
      record.artifact_hashes,
    )),
  );
  return issues;
}

function evaluateObligationResults(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV1,
  rows: AcceptanceObligationReachabilityV1[],
  issues: string[],
): ExternalConfirmationObligationResultV1[] {
  const declarationByKey = new Map(
    (confirmation.obligations ?? []).map((row) => [row.key, row]),
  );
  const results: ExternalConfirmationObligationResultV1[] = [];
  for (const row of rows) {
    const result = record.results.find(
      (candidate) => candidate.obligation_ref === row.obligation_ref,
    );
    const declaration = declarationByKey.get(row.obligation_ref);
    if (!result || !declaration) continue;
    const evaluated = evaluateObligationResult(
      context,
      record,
      row,
      declaration,
      result,
    );
    issues.push(...evaluated.issues);
    if (evaluated.result) results.push(evaluated.result);
  }
  return results;
}

function evaluateObligationResult(
  context: ExternalAuthorityContextV1,
  record: ExternalConfirmationRecordV1,
  row: AcceptanceObligationReachabilityV1,
  declaration: NonNullable<ExternalConfirmationV2["obligations"]>[number],
  result: ExternalConfirmationRecordV1["results"][number],
): {
  result: ExternalConfirmationObligationResultV1 | null;
  issues: string[];
} {
  const issues: string[] = [];
  if (
    result.fact_ref !== row.fact_ref ||
    result.claim_ref !== row.claim_ref ||
    result.applicability_ref !== row.applicability_ref
  )
    return {
      result: null,
      issues: [`obligation_identity_mismatch:${row.obligation_ref}`],
    };
  let verdict = result.verdict;
  let comparatorRecomputed = false;
  if (declaration.result_kind === "judgment") {
    if (record.actor.authority_kind === "external_system")
      issues.push(`judgment_actor_not_authorized:${row.obligation_ref}`);
    if (!result.rationale?.trim())
      issues.push(`judgment_rationale_missing:${row.obligation_ref}`);
  } else if (result.verdict === "unable") {
    if (!result.rationale?.trim())
      issues.push(`unable_rationale_missing:${row.obligation_ref}`);
  } else if (!Object.hasOwn(result, "actual")) {
    issues.push(`objective_actual_missing:${row.obligation_ref}`);
  } else {
    const comparison = objectiveExternalComparison(
      context.semantic_manifest,
      row,
      result.actual,
    );
    if (!comparison)
      issues.push(`objective_comparator_not_admitted:${row.obligation_ref}`);
    else {
      comparatorRecomputed = true;
      const computedVerdict = comparison.passed ? "passed" : "failed";
      if (result.verdict !== computedVerdict)
        issues.push(`objective_verdict_mismatch:${row.obligation_ref}`);
      verdict = computedVerdict;
    }
  }
  return {
    result: {
      obligation_ref: row.obligation_ref,
      fact_ref: row.fact_ref,
      claim_ref: row.claim_ref,
      applicability_ref: row.applicability_ref,
      outcome_key: row.outcome_key,
      verdict,
      result_kind: declaration.result_kind,
      comparator_recomputed: comparatorRecomputed,
      evidence_refs: [...result.evidence_refs].sort(),
    },
    issues,
  };
}

function evaluationState(
  issues: string[],
  rows: AcceptanceObligationReachabilityV1[],
  results: ExternalConfirmationObligationResultV1[],
): ExternalConfirmationEvaluationV1["state"] {
  const stalePattern =
    /(?:_stale|candidate_identity_stale|artifact_content_changed)/u;
  if (issues.some((issue) => stalePattern.test(issue))) return "stale";
  if (issues.some((issue) => !stalePattern.test(issue))) return "invalid";
  if (results.some((row) => row.verdict === "unable")) return "unable";
  if (results.some((row) => row.verdict === "failed")) return "failed";
  return rows.length && results.length === rows.length
    ? "fulfilled"
    : "invalid";
}
