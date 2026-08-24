import type {
  CompiledDeliveryContractV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  loadExternalAuthorityContext,
  readSubmittedExternalConfirmationRecord,
  type ExternalAuthorityContextV1,
} from "./long-task-external-confirmation-context.js";
import {
  emptyExternalConfirmationEvaluation,
  evaluateExternalConfirmationRecord,
} from "./long-task-external-confirmation-evaluation.js";
import {
  externalRows,
  requiredConfirmation,
} from "./long-task-external-confirmation-identity.js";
import {
  externalFulfillableConfirmations,
  groupPreparationSessions,
} from "./long-task-external-confirmation-preparation.js";
import { externalConfirmationRecordHash } from "./long-task-external-confirmation-shape.js";
import {
  readStoredExternalConfirmationRecord,
  revokeStoredExternalConfirmationRecord,
  writeStoredExternalConfirmationRecord,
} from "./long-task-external-confirmation-state.js";
import type {
  ExternalConfirmationCandidateV1,
  ExternalConfirmationEvaluationV1,
  ExternalConfirmationPreparationV1,
} from "./long-task-external-confirmation-types.js";
import { loadSemanticFactManifest } from "./semantic-fact-source-parser.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export { deriveRelevantExternalInputIdentity } from "./long-task-external-confirmation-identity.js";

export async function prepareExternalConfirmations(
  workdirInput: string,
  confirmationRef?: string,
): Promise<ExternalConfirmationPreparationV1> {
  const context = await loadExternalAuthorityContext(workdirInput, true);
  const confirmations = externalFulfillableConfirmations(
    context,
    confirmationRef,
  );
  const sessions = groupPreparationSessions(confirmations, context.candidate);
  return {
    schema_version: "long-task-external-confirmation-preparation-v1",
    task_id: context.compiled.task.id,
    compiled_identity: context.compiled.compiled_identity,
    authority_revision: context.compiled.authority_revision,
    candidate: context.candidate,
    actor_identity_boundary:
      "declared_identity_and_record_integrity_only_not_authentication",
    confirmations,
    sessions,
    generated_at: new Date().toISOString(),
  };
}

export async function submitExternalConfirmation(input: {
  workdir: string;
  confirmation_ref: string;
  record_path: string;
}): Promise<ExternalConfirmationEvaluationV1> {
  const context = await loadExternalAuthorityContext(input.workdir, true);
  const confirmation = requiredConfirmation(
    context.compiled,
    input.confirmation_ref,
  );
  const record = await readSubmittedExternalConfirmationRecord(
    input.record_path,
  );
  if (record.confirmation_ref !== input.confirmation_ref)
    throw new Error(
      `external_confirmation_submit_ref_mismatch:${input.confirmation_ref}:${record.confirmation_ref}`,
    );
  const evaluation = await evaluateExternalConfirmationRecord(
    context,
    confirmation,
    record,
  );
  if (evaluation.state === "invalid" || evaluation.state === "stale")
    throw new Error(
      `external_confirmation_submit_rejected:${evaluation.state}:${evaluation.issues.join(",")}`,
    );
  await writeStoredExternalConfirmationRecord(
    context.repository,
    context.workdir,
    record,
  );
  return evaluation;
}

export async function externalConfirmationStatus(
  workdirInput: string,
): Promise<Record<string, unknown>> {
  const context = await loadExternalAuthorityContext(workdirInput, false);
  return {
    schema_version: "long-task-external-confirmation-status-v1",
    task_id: context.compiled.task.id,
    compiled_identity: context.compiled.compiled_identity,
    authority_revision: context.compiled.authority_revision,
    candidate: context.candidate,
    candidate_clean: context.candidate_dirty.length === 0,
    candidate_dirty: context.candidate_dirty,
    actor_identity_boundary:
      "declared_identity_and_record_integrity_only_not_authentication",
    confirmations: await evaluateExternalConfirmations(
      context.compiled,
      context.repository,
      context.workdir,
      context.manifest,
      context.candidate,
      context.semantic_manifest,
    ),
  };
}

export async function revokeExternalConfirmation(input: {
  workdir: string;
  confirmation_ref: string;
}): Promise<Record<string, unknown>> {
  const context = await loadExternalAuthorityContext(input.workdir, false);
  requiredConfirmation(context.compiled, input.confirmation_ref);
  const revoked = await revokeStoredExternalConfirmationRecord(
    context.repository,
    context.workdir,
    input.confirmation_ref,
  );
  return {
    schema_version: "long-task-external-confirmation-revoke-v1",
    confirmation_ref: input.confirmation_ref,
    status: revoked ? "revoked" : "not_present",
  };
}

export async function evaluateExternalConfirmations(
  compiled: CompiledDeliveryContractV2,
  repository: string,
  workdir: string,
  manifest: WorkspaceManifestV2,
  candidate: ExternalConfirmationCandidateV1,
  semanticManifestInput?: SemanticFactManifestV1,
): Promise<ExternalConfirmationEvaluationV1[]> {
  const semanticManifest =
    semanticManifestInput ??
    (await loadSemanticFactManifest(repository, compiled.task.source_paths))
      .manifest;
  const context: ExternalAuthorityContextV1 = {
    repository,
    workdir,
    compiled,
    manifest,
    candidate,
    candidate_dirty: [],
    semantic_manifest: semanticManifest,
  };
  const results: ExternalConfirmationEvaluationV1[] = [];
  for (const confirmation of [
    ...compiled.global.acceptance.external_confirmations,
  ].sort((left, right) => left.key.localeCompare(right.key))) {
    const stored = await readStoredExternalConfirmationRecord(
      repository,
      workdir,
      confirmation.key,
    );
    if (stored.error) {
      results.push(
        emptyExternalConfirmationEvaluation(context, confirmation, "invalid", [
          `record_invalid:${stored.error}`,
        ]),
      );
      continue;
    }
    if (!stored.record) {
      const exactRows = externalRows(compiled, confirmation.key);
      results.push(
        exactRows.length || !confirmation.blocks_target
          ? emptyExternalConfirmationEvaluation(
              context,
              confirmation,
              "pending",
              [],
            )
          : emptyExternalConfirmationEvaluation(
              context,
              confirmation,
              "invalid",
              ["blocking_confirmation_has_no_exact_obligations"],
            ),
      );
      continue;
    }
    results.push(
      await evaluateExternalConfirmationRecord(
        context,
        confirmation,
        stored.record,
      ),
    );
  }
  return results;
}

export const externalConfirmationRecordIntegrity = {
  hash: externalConfirmationRecordHash,
};
