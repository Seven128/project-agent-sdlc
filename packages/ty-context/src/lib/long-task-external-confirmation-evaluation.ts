import type { EffectiveExternalObligationV1 } from "./long-task-acceptance-reachability-types.js";
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
  allEffectiveExternalRows,
  blockingExternalRows,
  deriveRelevantExternalInputIdentity,
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
  const envelopeIssues = [...identity.issues];
  const candidateMatches = sameValue(record.candidate, context.candidate);
  const carriedForward =
    !candidateMatches &&
    relevant.mode === "bounded_paths" &&
    record.relevant_input_identity === relevant.identity;
  if (!candidateMatches && !carriedForward)
    envelopeIssues.push("candidate_identity_stale");

  const rows = allEffectiveExternalRows(context.compiled, confirmation.key);
  const blockingRows = blockingExternalRows(context.compiled, confirmation.key);
  const unboundBlocking = !rows.length && confirmation.blocks_target;
  const unboundBlockingIssues = unboundBlocking
    ? ["blocking_confirmation_has_no_exact_obligations"]
    : [];
  const recordIssues = await recordSetAndArtifactIssues(context, record, rows);
  const obligationEvaluation = evaluateObligationResults(
    context,
    confirmation,
    record,
    rows,
  );
  const blockingIssues = uniqueIssues([
    ...envelopeIssues,
    ...unboundBlockingIssues,
    ...recordIssues.blocking_issues,
    ...obligationEvaluation.blocking_issues,
  ]);
  const advisoryIssues = uniqueIssues([
    ...envelopeIssues,
    ...recordIssues.advisory_issues,
    ...obligationEvaluation.advisory_issues,
  ]);
  const issues = uniqueIssues([
    ...envelopeIssues,
    ...unboundBlockingIssues,
    ...recordIssues.envelope_issues,
    ...recordIssues.blocking_issues,
    ...recordIssues.advisory_issues,
    ...obligationEvaluation.blocking_issues,
    ...obligationEvaluation.advisory_issues,
  ]);
  const obligationResults = obligationEvaluation.results;
  const advisoryRows = rows.filter((row) => row.completion_role === "advisory");
  const blockingState = blockingRows.length
    ? evaluationState(
        blockingIssues,
        blockingRows,
        obligationResults.filter(
          (result) => result.completion_role === "blocking",
        ),
      )
    : null;
  const advisoryState = advisoryRows.length
    ? evaluationState(
        advisoryIssues,
        advisoryRows,
        obligationResults.filter(
          (result) => result.completion_role === "advisory",
        ),
        blockingRows.length ? "pending" : "invalid",
      )
    : null;
  return {
    confirmation_ref: confirmation.key,
    owner: confirmation.owner,
    blocks_target: blockingRows.length > 0 || unboundBlocking,
    state:
      blockingState ??
      advisoryState ??
      evaluationState(issues, rows, obligationResults),
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
    artifact_snapshot_integrity: recordIssues.artifact_snapshot_integrity,
    record_schema_version: record.schema_version,
    obligation_results: obligationResults.sort((left, right) =>
      left.obligation_ref.localeCompare(right.obligation_ref),
    ),
    effective_blocking_obligation_refs: blockingRows
      .map((row) => row.obligation_ref)
      .sort(),
    effective_advisory_obligation_refs: rows
      .filter((row) => row.completion_role === "advisory")
      .map((row) => row.obligation_ref)
      .sort(),
    blocking_issues: blockingIssues,
    advisory_state: advisoryState,
    advisory_issues: advisoryIssues,
    issues,
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
  const rows = allEffectiveExternalRows(context.compiled, confirmation.key);
  if (!rows.length && confirmation.blocks_target)
    issues.push("blocking_confirmation_has_no_exact_obligations");
  const resultSetIssues = externalResultSetIssueGroups(rows, record.results);
  issues.push(
    ...resultSetIssues.envelope_issues,
    ...resultSetIssues.blocking_issues,
  );
  const declarations = new Map(
    (confirmation.obligations ?? []).map((row) => [row.key, row]),
  );
  for (const row of rows) {
    const result = record.results.find(
      (candidate) => candidate.obligation_ref === row.obligation_ref,
    );
    const declaration = declarations.get(row.obligation_ref);
    if (!result || !declaration) continue;
    if (row.completion_role !== "blocking") continue;
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
      (!sourceBackedExternalJudgmentAdmitted(
        context.compiled,
        context.semantic_manifest,
        row,
        declaration.judgment_basis,
        record.actor.authority_kind,
      ) ||
        !result.rationale?.trim())
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
  const rows = allEffectiveExternalRows(context.compiled, confirmation.key);
  const blockingRows = rows.filter((row) => row.completion_role === "blocking");
  const unboundBlocking = !rows.length && confirmation.blocks_target;
  const evaluationIssues = uniqueIssues([
    ...issues,
    ...(challenge.error ? [`challenge_invalid:${challenge.error}`] : []),
  ]);
  return {
    confirmation_ref: confirmation.key,
    owner: confirmation.owner,
    blocks_target: blockingRows.length > 0 || unboundBlocking,
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
    effective_blocking_obligation_refs: blockingRows
      .map((row) => row.obligation_ref)
      .sort(),
    effective_advisory_obligation_refs: rows
      .filter((row) => row.completion_role === "advisory")
      .map((row) => row.obligation_ref)
      .sort(),
    blocking_issues:
      blockingRows.length || unboundBlocking ? evaluationIssues : [],
    advisory_state: rows.some((row) => row.completion_role === "advisory")
      ? state
      : null,
    advisory_issues: rows.some((row) => row.completion_role === "advisory")
      ? evaluationIssues
      : [],
    issues: evaluationIssues,
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
  rows: EffectiveExternalObligationV1[],
): Promise<RecordAndArtifactIssueGroups> {
  const resultSet = externalResultSetIssueGroups(rows, record.results);
  const result: RecordAndArtifactIssueGroups = {
    envelope_issues: [...resultSet.envelope_issues],
    blocking_issues: [...resultSet.blocking_issues],
    advisory_issues: [...resultSet.advisory_issues],
    artifact_snapshot_integrity: true,
  };
  const rolesByEvidenceRef = externalArtifactEvidenceRoles(rows, record);
  for (const [evidenceRef, roles] of rolesByEvidenceRef) {
    const snapshot = record.artifact_snapshots[evidenceRef];
    if (!snapshot) {
      result.artifact_snapshot_integrity = false;
      addRoleIssues(result, roles, [
        `artifact_snapshot_set_mismatch:${evidenceRef}`,
      ]);
      continue;
    }
    const issues = await externalArtifactSnapshotIntegrityIssues(
      context.repository,
      context.workdir,
      { [evidenceRef]: snapshot },
    );
    if (issues.length) {
      result.artifact_snapshot_integrity = false;
      addRoleIssues(result, roles, issues);
    }
  }
  for (const evidenceRef of Object.keys(record.artifact_snapshots))
    if (!rolesByEvidenceRef.has(evidenceRef)) {
      result.artifact_snapshot_integrity = false;
      result.envelope_issues.push(
        `artifact_snapshot_set_mismatch:${evidenceRef}`,
      );
    }
  result.envelope_issues = uniqueIssues(result.envelope_issues);
  result.blocking_issues = uniqueIssues([
    ...result.envelope_issues,
    ...result.blocking_issues,
  ]);
  result.advisory_issues = uniqueIssues([
    ...result.envelope_issues,
    ...result.advisory_issues,
  ]);
  return result;
}

interface RecordAndArtifactIssueGroups {
  envelope_issues: string[];
  blocking_issues: string[];
  advisory_issues: string[];
  artifact_snapshot_integrity: boolean;
}

type ExternalArtifactRole = "blocking" | "advisory";

function externalArtifactEvidenceRoles(
  rows: EffectiveExternalObligationV1[],
  record: ExternalConfirmationRecordV2,
): Map<string, Set<ExternalArtifactRole>> {
  const roleByObligation = new Map(
    rows.map((row) => [row.obligation_ref, row.completion_role]),
  );
  const result = new Map<string, Set<ExternalArtifactRole>>();
  for (const obligationResult of record.results) {
    const role = roleByObligation.get(obligationResult.obligation_ref);
    if (!role) continue;
    for (const evidenceRef of obligationResult.evidence_refs) {
      const roles = result.get(evidenceRef) ?? new Set<ExternalArtifactRole>();
      roles.add(role);
      result.set(evidenceRef, roles);
    }
  }
  return result;
}

export function partitionExternalConfirmationArtifactSnapshots(
  rows: EffectiveExternalObligationV1[],
  record: ExternalConfirmationRecordV2,
): {
  blocking_or_shared: ExternalConfirmationRecordV2["artifact_snapshots"];
  advisory_only: ExternalConfirmationRecordV2["artifact_snapshots"];
} {
  const rolesByEvidenceRef = externalArtifactEvidenceRoles(rows, record);
  const blockingOrShared: ExternalConfirmationRecordV2["artifact_snapshots"] =
    {};
  const advisoryOnly: ExternalConfirmationRecordV2["artifact_snapshots"] = {};
  for (const [evidenceRef, snapshot] of Object.entries(
    record.artifact_snapshots,
  )) {
    const roles = rolesByEvidenceRef.get(evidenceRef);
    if (roles?.has("blocking")) blockingOrShared[evidenceRef] = snapshot;
    else if (roles?.has("advisory")) advisoryOnly[evidenceRef] = snapshot;
  }
  return {
    blocking_or_shared: blockingOrShared,
    advisory_only: advisoryOnly,
  };
}

function addRoleIssues(
  result: RecordAndArtifactIssueGroups,
  roles: ReadonlySet<ExternalArtifactRole>,
  issues: string[],
): void {
  if (roles.has("blocking")) result.blocking_issues.push(...issues);
  if (roles.has("advisory")) result.advisory_issues.push(...issues);
}

function evaluateObligationResults(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV2,
  rows: EffectiveExternalObligationV1[],
): {
  results: ExternalConfirmationObligationResultV1[];
  blocking_issues: string[];
  advisory_issues: string[];
} {
  const declarationByKey = new Map(
    (confirmation.obligations ?? []).map((row) => [row.key, row]),
  );
  const results: ExternalConfirmationObligationResultV1[] = [];
  const blockingIssues: string[] = [];
  const advisoryIssues: string[] = [];
  for (const row of rows) {
    const result = record.results.find(
      (candidate) => candidate.obligation_ref === row.obligation_ref,
    );
    const declaration = declarationByKey.get(row.obligation_ref);
    if (!result) continue;
    if (!declaration) {
      const target =
        row.completion_role === "blocking" ? blockingIssues : advisoryIssues;
      target.push(
        `external_confirmation_obligation_declaration_missing:${row.obligation_ref}`,
      );
      continue;
    }
    const evaluated = evaluateObligationResult(
      context,
      confirmation,
      record,
      row,
      declaration,
      result,
    );
    const target =
      row.completion_role === "blocking" ? blockingIssues : advisoryIssues;
    target.push(...evaluated.issues);
    if (evaluated.result) results.push(evaluated.result);
  }
  return {
    results,
    blocking_issues: blockingIssues,
    advisory_issues: advisoryIssues,
  };
}

function evaluateObligationResult(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  record: ExternalConfirmationRecordV2,
  row: EffectiveExternalObligationV1,
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
    if (!result.rationale?.trim())
      issues.push(`judgment_rationale_missing:${row.obligation_ref}`);
    if (
      !sourceBackedExternalJudgmentAdmitted(
        context.compiled,
        context.semantic_manifest,
        row,
        declaration.judgment_basis,
        record.actor.authority_kind,
      )
    )
      issues.push(
        `judgment_objective_obligation_not_allowed:${row.obligation_ref}`,
      );
  } else if (result.verdict === "unable") {
    if (!result.rationale?.trim())
      issues.push(`unable_rationale_missing:${row.obligation_ref}`);
  } else if (!Object.hasOwn(result, "actual")) {
    issues.push(`objective_actual_missing:${row.obligation_ref}`);
  } else {
    const comparison = objectiveExternalComparison(
      context.compiled,
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
      completion_role: row.completion_role,
      acceptance_effect: row.acceptance_effect,
      comparator_recomputed: comparatorRecomputed,
      evidence_refs: [...result.evidence_refs].sort(),
    },
    issues,
  };
}

function evaluationState(
  issues: string[],
  rows: EffectiveExternalObligationV1[],
  results: ExternalConfirmationObligationResultV1[],
  incompleteState: "invalid" | "pending" = "invalid",
): ExternalConfirmationEvaluationV1["state"] {
  const stalePattern =
    /(?:_stale|candidate_identity_stale|challenge_not_current|artifact_snapshot_(?:content|size)_changed)/u;
  if (issues.some((issue) => stalePattern.test(issue))) return "stale";
  if (issues.some((issue) => !stalePattern.test(issue))) return "invalid";
  if (results.some((row) => row.verdict === "unable")) return "unable";
  if (results.some((row) => row.verdict === "failed")) return "failed";
  return rows.length && results.length === rows.length
    ? "fulfilled"
    : incompleteState;
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
  const rows = allEffectiveExternalRows(context.compiled, confirmation.key);
  const blockingRows = rows.filter((row) => row.completion_role === "blocking");
  const unboundBlocking = !rows.length && confirmation.blocks_target;
  return {
    confirmation_ref: confirmation.key,
    owner: confirmation.owner,
    blocks_target: blockingRows.length > 0 || unboundBlocking,
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
    effective_blocking_obligation_refs: blockingRows
      .map((row) => row.obligation_ref)
      .sort(),
    effective_advisory_obligation_refs: rows
      .filter((row) => row.completion_role === "advisory")
      .map((row) => row.obligation_ref)
      .sort(),
    blocking_issues:
      blockingRows.length || unboundBlocking
        ? [
            "record_v1_legacy_unattested",
            ...(unboundBlocking
              ? ["blocking_confirmation_has_no_exact_obligations"]
              : []),
          ]
        : [],
    advisory_state: rows.some((row) => row.completion_role === "advisory")
      ? "legacy_unattested"
      : null,
    advisory_issues: rows.some((row) => row.completion_role === "advisory")
      ? ["record_v1_legacy_unattested"]
      : [],
    issues: ["record_v1_legacy_unattested"],
  };
}

function externalResultSetIssueGroups(
  rows: EffectiveExternalObligationV1[],
  results: ExternalConfirmationRecordV2["results"],
): Pick<
  RecordAndArtifactIssueGroups,
  "envelope_issues" | "blocking_issues" | "advisory_issues"
> {
  const rowByKey = new Map(rows.map((row) => [row.obligation_ref, row]));
  const actualKeys = results.map((row) => row.obligation_ref);
  const envelopeIssues: string[] = [];
  const blockingIssues: string[] = [];
  if (
    new Set(actualKeys).size !== actualKeys.length ||
    actualKeys.some((key) => !rowByKey.has(key))
  )
    envelopeIssues.push("obligation_result_set_mismatch");
  for (const row of rows)
    if (
      row.completion_role === "blocking" &&
      !actualKeys.includes(row.obligation_ref)
    )
      blockingIssues.push(
        `obligation_result_set_mismatch:${row.obligation_ref}`,
      );
  return {
    envelope_issues: envelopeIssues,
    blocking_issues: blockingIssues,
    advisory_issues: [],
  };
}

function uniqueIssues(issues: string[]): string[] {
  return [...new Set(issues)].sort();
}
