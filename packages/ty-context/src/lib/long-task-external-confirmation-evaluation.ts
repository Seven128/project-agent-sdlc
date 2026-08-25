import type { AcceptanceObligationReachabilityV1 } from "./long-task-acceptance-reachability.js";
import { sourceBackedExternalJudgmentAdmitted } from "./long-task-acceptance-reachability-helpers.js";
import type { ExternalConfirmationV2 } from "./long-task-delivery-types.js";
import {
  compiledExternalConfirmationIdentityAssurance,
  externalConfirmationActor,
  verifyExternalConfirmationAttestation,
} from "./long-task-external-confirmation-attestation.js";
import { externalArtifactSnapshotIntegrityIssues } from "./long-task-external-confirmation-artifacts.js";
import { readExternalConfirmationChallenge } from "./long-task-external-confirmation-challenge.js";
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
  ExternalConfirmationRecord,
  ExternalConfirmationRecordV2,
} from "./long-task-external-confirmation-types.js";

export async function evaluateExternalConfirmationRecord(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecord,
): Promise<ExternalConfirmationEvaluationV1> {
  if (record.schema_version === "long-task-external-confirmation-record-v1")
    return legacyExternalConfirmationEvaluation(context, confirmation, record);
  const relevant = deriveRelevantExternalInputIdentity(
    context.compiled,
    confirmation.key,
    context.manifest,
  );
  const identity = await recordIdentityIssues(
    context,
    confirmation,
    record,
    relevant,
  );
  const issues = [...identity.issues];
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
  const artifactIssues = await recordSetAndArtifactIssues(
    context,
    record,
    rows,
  );
  issues.push(...artifactIssues);
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
    actor_identity_assurance: identity.signature_verified
      ? "ed25519_verified"
      : identity.assurance?.scheme === "declared_only"
        ? "declared_only"
        : "invalid",
    identity_assurance: identity.assurance,
    signature_verified: identity.signature_verified,
    challenge_current: identity.challenge_current,
    artifact_snapshot_integrity: artifactIssues.length === 0,
    record_schema_version: record.schema_version,
    obligation_results: obligationResults.sort((left, right) =>
      left.obligation_ref.localeCompare(right.obligation_ref),
    ),
    issues: [...new Set(issues)].sort(),
  };
}

export async function externalConfirmationSubmissionEnvelopeIssues(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV2,
): Promise<string[]> {
  const relevant = deriveRelevantExternalInputIdentity(
    context.compiled,
    confirmation.key,
    context.manifest,
  );
  const identity = await recordIdentityIssues(
    context,
    confirmation,
    record,
    relevant,
  );
  const issues = [...identity.issues];
  if (!sameValue(record.candidate, context.candidate))
    issues.push("candidate_identity_stale");
  const rows = externalRows(context.compiled, confirmation.key);
  if (!rows.length && confirmation.blocks_target)
    issues.push("blocking_confirmation_has_no_exact_obligations");
  const expectedKeys = rows.map((row) => row.obligation_ref).sort();
  const actualKeys = record.results.map((row) => row.obligation_ref).sort();
  if (!sameSet(expectedKeys, actualKeys))
    issues.push("obligation_result_set_mismatch");
  const declarations = new Map(
    (confirmation.obligations ?? []).map((row) => [row.key, row]),
  );
  for (const row of rows) {
    const result = record.results.find(
      (candidate) => candidate.obligation_ref === row.obligation_ref,
    );
    const declaration = declarations.get(row.obligation_ref);
    if (!result || !declaration) continue;
    if (
      result.fact_ref !== row.fact_ref ||
      result.claim_ref !== row.claim_ref ||
      result.applicability_ref !== row.applicability_ref
    )
      issues.push(`obligation_identity_mismatch:${row.obligation_ref}`);
    if (result.result_kind !== declaration.result_kind)
      issues.push(`result_kind_mismatch:${row.obligation_ref}`);
    if (
      declaration.result_kind === "judgment" &&
      (record.actor.authority_kind === "external_system" ||
        !sourceBackedExternalJudgmentAdmitted(context.semantic_manifest, row) ||
        !result.rationale?.trim() ||
        !judgmentBasisCurrent(context, confirmation, declaration))
    )
      issues.push(`judgment_not_admitted:${row.obligation_ref}`);
  }
  return [...new Set(issues)].sort();
}

export async function emptyExternalConfirmationEvaluation(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  state: ExternalConfirmationEvaluationV1["state"],
  issues: string[],
): Promise<ExternalConfirmationEvaluationV1> {
  const relevant = deriveRelevantExternalInputIdentity(
    context.compiled,
    confirmation.key,
    context.manifest,
  );
  const assurance = compiledExternalConfirmationIdentityAssurance(
    context.compiled,
    confirmation.key,
  );
  const challenge = await readExternalConfirmationChallenge(
    context.repository,
    context.workdir,
    confirmation.key,
  );
  const challengeCurrent = Boolean(
    challenge.challenge &&
    challenge.challenge.compiled_identity ===
      context.compiled.compiled_identity &&
    challenge.challenge.authority_revision ===
      context.compiled.authority_revision,
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
    actor_identity_assurance:
      assurance?.scheme === "declared_only" ? "declared_only" : "invalid",
    identity_assurance: assurance,
    signature_verified: false,
    challenge_current: challengeCurrent,
    artifact_snapshot_integrity: false,
    record_schema_version: null,
    obligation_results: [],
    issues: [
      ...issues,
      ...(challenge.error ? [`challenge_invalid:${challenge.error}`] : []),
    ],
  };
}

async function recordIdentityIssues(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV2,
  relevant: ReturnType<typeof deriveRelevantExternalInputIdentity>,
): Promise<{
  issues: string[];
  assurance: ReturnType<typeof compiledExternalConfirmationIdentityAssurance>;
  signature_verified: boolean;
  challenge_current: boolean;
}> {
  const issues: string[] = [];
  if (record.confirmation_ref !== confirmation.key)
    issues.push("confirmation_ref_mismatch");
  if (record.compiled_identity !== context.compiled.compiled_identity)
    issues.push("compiled_identity_stale");
  if (record.authority_revision !== context.compiled.authority_revision)
    issues.push("authority_revision_stale");
  const actor = externalConfirmationActor(confirmation);
  if (!actor || !sameValue(record.actor, actor))
    issues.push("declared_actor_identity_mismatch");
  if (record.session.target_ref !== confirmation.target_ref)
    issues.push("target_ref_mismatch");
  if (record.session.environment_identity !== confirmation.environment_identity)
    issues.push("environment_identity_mismatch");
  if (Date.parse(record.session.completed_at) > Date.now() + 5 * 60_000)
    issues.push("session_completed_at_in_future");
  if (record.relevant_input_identity !== relevant.identity)
    issues.push("relevant_input_identity_stale");
  const challenge = await readExternalConfirmationChallenge(
    context.repository,
    context.workdir,
    confirmation.key,
  );
  if (challenge.error) issues.push(`challenge_invalid:${challenge.error}`);
  const challengeCurrent = Boolean(
    challenge.challenge &&
    challenge.challenge.compiled_identity ===
      context.compiled.compiled_identity &&
    challenge.challenge.authority_revision ===
      context.compiled.authority_revision &&
    challenge.challenge.challenge === record.challenge,
  );
  if (!challengeCurrent) issues.push("challenge_not_current");
  const assurance = compiledExternalConfirmationIdentityAssurance(
    context.compiled,
    confirmation.key,
  );
  const attestation = await verifyExternalConfirmationAttestation({
    repository: context.repository,
    confirmation_ref: confirmation.key,
    assurance,
    record,
  });
  issues.push(...attestation.issues);
  return {
    issues,
    assurance,
    signature_verified: attestation.verified,
    challenge_current: challengeCurrent,
  };
}

async function recordSetAndArtifactIssues(
  context: ExternalAuthorityContextV1,
  record: ExternalConfirmationRecordV2,
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
  if (!sameSet(evidenceRefs, Object.keys(record.artifact_snapshots).sort()))
    issues.push("artifact_snapshot_set_mismatch");
  issues.push(
    ...(await externalArtifactSnapshotIntegrityIssues(
      context.repository,
      context.workdir,
      record.artifact_snapshots,
    )),
  );
  return issues;
}

function evaluateObligationResults(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV2,
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
      confirmation,
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
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV2,
  row: AcceptanceObligationReachabilityV1,
  declaration: NonNullable<ExternalConfirmationV2["obligations"]>[number],
  result: ExternalConfirmationRecordV2["results"][number],
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
  if (result.result_kind !== declaration.result_kind)
    issues.push(`result_kind_mismatch:${row.obligation_ref}`);
  let verdict = result.verdict;
  let comparatorRecomputed = false;
  if (declaration.result_kind === "judgment") {
    if (record.actor.authority_kind === "external_system")
      issues.push(`judgment_actor_not_authorized:${row.obligation_ref}`);
    if (!result.rationale?.trim())
      issues.push(`judgment_rationale_missing:${row.obligation_ref}`);
    if (!sourceBackedExternalJudgmentAdmitted(context.semantic_manifest, row))
      issues.push(
        `judgment_objective_obligation_not_allowed:${row.obligation_ref}`,
      );
    if (!judgmentBasisCurrent(context, confirmation, declaration))
      issues.push(`judgment_basis_not_source_backed:${row.obligation_ref}`);
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
    /(?:_stale|candidate_identity_stale|challenge_not_current|artifact_snapshot_(?:content|size)_changed)/u;
  if (issues.some((issue) => stalePattern.test(issue))) return "stale";
  if (issues.some((issue) => !stalePattern.test(issue))) return "invalid";
  if (results.some((row) => row.verdict === "unable")) return "unable";
  if (results.some((row) => row.verdict === "failed")) return "failed";
  return rows.length && results.length === rows.length
    ? "fulfilled"
    : "invalid";
}

function judgmentBasisCurrent(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  declaration: NonNullable<ExternalConfirmationV2["obligations"]>[number],
): boolean {
  const basis = declaration.judgment_basis;
  if (!basis) return false;
  const sourceClaim = context.compiled.source_claims.find(
    (claim) => claim.key === basis.source_ref,
  );
  return Boolean(sourceClaim);
}

async function legacyExternalConfirmationEvaluation(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: Extract<
    ExternalConfirmationRecord,
    { schema_version: "long-task-external-confirmation-record-v1" }
  >,
): Promise<ExternalConfirmationEvaluationV1> {
  const relevant = deriveRelevantExternalInputIdentity(
    context.compiled,
    confirmation.key,
    context.manifest,
  );
  return {
    confirmation_ref: confirmation.key,
    owner: confirmation.owner,
    blocks_target: confirmation.blocks_target,
    state: "legacy_unattested",
    record_sha256: record.record_sha256,
    session_id: record.session.id,
    relevant_input_identity: relevant.identity,
    carried_forward_from_candidate: false,
    actor_identity_assurance: "legacy_unattested",
    identity_assurance: compiledExternalConfirmationIdentityAssurance(
      context.compiled,
      confirmation.key,
    ),
    signature_verified: false,
    challenge_current: false,
    artifact_snapshot_integrity: false,
    record_schema_version: record.schema_version,
    obligation_results: [],
    issues: ["record_v1_legacy_unattested"],
  };
}
