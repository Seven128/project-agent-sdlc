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
  captureAndStoreExternalConfirmationArtifacts,
  MAX_TOTAL_EXTERNAL_CONFIRMATION_ARTIFACT_BYTES,
} from "./long-task-external-confirmation-artifacts.js";
import {
  readOrCreateExternalConfirmationChallenge,
  rotateExternalConfirmationChallenge,
} from "./long-task-external-confirmation-challenge.js";
import {
  emptyExternalConfirmationEvaluation,
  evaluateExternalConfirmationRecord,
  externalConfirmationSubmissionEnvelopeIssues,
  partitionExternalConfirmationArtifactSnapshots,
} from "./long-task-external-confirmation-evaluation.js";
import {
  allEffectiveExternalRows,
  requiredConfirmation,
} from "./long-task-external-confirmation-identity.js";
import {
  externalFulfillableConfirmations,
  groupPreparationSessions,
} from "./long-task-external-confirmation-preparation.js";
import {
  externalConfirmationRecordHash,
  externalConfirmationRecordV2Hash,
} from "./long-task-external-confirmation-shape.js";
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
import { withActiveAuthorityLock } from "./long-task-state.js";
import { repositoryRoot } from "./long-task-workspace.js";
import { loadSemanticFactManifest } from "./semantic-fact-source-parser.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";

export { deriveRelevantExternalInputIdentity } from "./long-task-external-confirmation-identity.js";

export async function prepareExternalConfirmations(
  workdirInput: string,
  confirmationRef?: string,
): Promise<ExternalConfirmationPreparationV1> {
  const repository = await repositoryRoot(process.cwd());
  return withActiveAuthorityLock(
    repository,
    "external_confirmation",
    async () => {
      const context = await loadExternalAuthorityContext(workdirInput, true);
      const confirmations = await externalFulfillableConfirmations(
        context,
        confirmationRef,
      );
      const sessions = groupPreparationSessions(
        confirmations,
        context.candidate,
      );
      return {
        schema_version: "long-task-external-confirmation-preparation-v2",
        acceptance_effect: "none",
        notice: "Preparation output does not establish acceptance.",
        task_id: context.compiled.task.id,
        compiled_identity: context.compiled.compiled_identity,
        authority_revision: context.compiled.authority_revision,
        candidate: context.candidate,
        actor_identity_boundary:
          "detached_ed25519_required_for_blocking_fulfillment",
        confirmations,
        sessions,
        generated_at: new Date().toISOString(),
      };
    },
  );
}

export async function submitExternalConfirmation(input: {
  workdir: string;
  confirmation_ref: string;
  record_path: string;
}): Promise<ExternalConfirmationEvaluationV1> {
  const repository = await repositoryRoot(process.cwd());
  return withActiveAuthorityLock(
    repository,
    "external_confirmation",
    async () => {
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
      if (record.schema_version !== "long-task-external-confirmation-record-v2")
        throw new Error(
          "external_confirmation_submit_rejected:legacy_unattested",
        );
      const envelopeIssues = await externalConfirmationSubmissionEnvelopeIssues(
        context,
        confirmation,
        record,
      );
      if (envelopeIssues.length)
        throw new Error(
          `external_confirmation_submit_rejected:${envelopeIssues.join(",")}`,
        );
      const rows = allEffectiveExternalRows(context.compiled, confirmation.key);
      const artifactPartitions = partitionExternalConfirmationArtifactSnapshots(
        rows,
        record,
      );
      await captureAndStoreExternalConfirmationArtifacts(
        context.repository,
        context.workdir,
        artifactPartitions.blocking_or_shared,
      );
      const blockingArtifactBytes = Object.values(
        artifactPartitions.blocking_or_shared,
      ).reduce((total, snapshot) => total + snapshot.size_bytes, 0);
      if (Object.keys(artifactPartitions.advisory_only).length)
        await captureAndStoreExternalConfirmationArtifacts(
          context.repository,
          context.workdir,
          artifactPartitions.advisory_only,
          {
            max_total_bytes: Math.max(
              0,
              MAX_TOTAL_EXTERNAL_CONFIRMATION_ARTIFACT_BYTES -
                blockingArtifactBytes,
            ),
          },
        ).catch(() => {
          // The role-scoped evaluation below records an absent or invalid
          // advisory partition without contaminating a fulfilled blocking row.
        });
      const evaluation = await evaluateExternalConfirmationRecord(
        context,
        confirmation,
        record,
      );
      if (
        evaluation.state === "invalid" ||
        evaluation.state === "stale" ||
        evaluation.state === "legacy_unattested"
      )
        throw new Error(
          `external_confirmation_submit_rejected:${evaluation.state}:${evaluation.issues.join(",")}`,
        );
      await writeStoredExternalConfirmationRecord(
        context.repository,
        context.workdir,
        record,
      );
      return evaluation;
    },
  );
}

export async function externalConfirmationStatus(
  workdirInput: string,
): Promise<Record<string, unknown>> {
  const context = await loadExternalAuthorityContext(workdirInput, false);
  return {
    schema_version: "long-task-external-confirmation-status-v2",
    task_id: context.compiled.task.id,
    compiled_identity: context.compiled.compiled_identity,
    authority_revision: context.compiled.authority_revision,
    candidate: context.candidate,
    candidate_clean: context.candidate_dirty.length === 0,
    candidate_dirty: context.candidate_dirty,
    actor_identity_boundary:
      "detached_ed25519_required_for_blocking_fulfillment",
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
  const repository = await repositoryRoot(process.cwd());
  return withActiveAuthorityLock(
    repository,
    "external_confirmation",
    async () => {
      const context = await loadExternalAuthorityContext(input.workdir, false);
      requiredConfirmation(context.compiled, input.confirmation_ref);
      const challenge = await rotateExternalConfirmationChallenge(
        context,
        input.confirmation_ref,
      );
      const revoked = await revokeStoredExternalConfirmationRecord(
        context.repository,
        context.workdir,
        input.confirmation_ref,
      );
      return {
        schema_version: "long-task-external-confirmation-revoke-v2",
        confirmation_ref: input.confirmation_ref,
        status: revoked ? "revoked" : "not_present",
        challenge_rotated: true,
        challenge: challenge.challenge,
      };
    },
  );
}

export async function rotateExternalConfirmation(input: {
  workdir: string;
  confirmation_ref: string;
}): Promise<Record<string, unknown>> {
  const repository = await repositoryRoot(process.cwd());
  return withActiveAuthorityLock(
    repository,
    "external_confirmation",
    async () => {
      const context = await loadExternalAuthorityContext(input.workdir, false);
      requiredConfirmation(context.compiled, input.confirmation_ref);
      const challenge = await rotateExternalConfirmationChallenge(
        context,
        input.confirmation_ref,
      );
      return {
        schema_version: "long-task-external-confirmation-rotate-v1",
        confirmation_ref: input.confirmation_ref,
        challenge: challenge.challenge,
        rotated_at: challenge.rotated_at,
      };
    },
  );
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
        await emptyExternalConfirmationEvaluation(
          context,
          confirmation,
          "invalid",
          [`record_invalid:${stored.error}`],
        ),
      );
      continue;
    }
    if (!stored.record) {
      const exactRows = allEffectiveExternalRows(compiled, confirmation.key);
      results.push(
        exactRows.length || !confirmation.blocks_target
          ? await emptyExternalConfirmationEvaluation(
              context,
              confirmation,
              "pending",
              [],
            )
          : await emptyExternalConfirmationEvaluation(
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
  hash_v1: externalConfirmationRecordHash,
  hash_v2: externalConfirmationRecordV2Hash,
};
