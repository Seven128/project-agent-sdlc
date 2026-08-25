import type { AcceptanceObligationReachabilityV1 } from "./long-task-acceptance-reachability.js";
import type { ExternalConfirmationV2 } from "./long-task-delivery-types.js";
import type { ExternalAuthorityContextV1 } from "./long-task-external-confirmation-context.js";
import {
  compiledExternalConfirmationIdentityAssurance,
  externalConfirmationActor,
} from "./long-task-external-confirmation-attestation.js";
import { readOrCreateExternalConfirmationChallenge } from "./long-task-external-confirmation-challenge.js";
import { expectedForExternalObligation } from "./long-task-external-confirmation-expected.js";
import {
  deriveRelevantExternalInputIdentity,
  externalRows,
  requiredConfirmation,
} from "./long-task-external-confirmation-identity.js";
import type {
  ExternalConfirmationCandidateV1,
  ExternalConfirmationPreparationConfirmationV1,
  ExternalConfirmationPreparationObligationV1,
  ExternalConfirmationPreparationSessionV1,
} from "./long-task-external-confirmation-types.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export async function externalFulfillableConfirmations(
  context: ExternalAuthorityContextV1,
  confirmationRef?: string,
): Promise<ExternalConfirmationPreparationConfirmationV1[]> {
  if (confirmationRef) requiredConfirmation(context.compiled, confirmationRef);
  const declarations =
    context.compiled.global.acceptance.external_confirmations.filter(
      (confirmation) =>
        (!confirmationRef || confirmation.key === confirmationRef) &&
        externalRows(context.compiled, confirmation.key).length > 0,
    );
  const selected = (
    await Promise.all(
      declarations.map((confirmation) =>
        prepareConfirmation(context, confirmation),
      ),
    )
  ).sort((left, right) =>
    left.confirmation_ref.localeCompare(right.confirmation_ref),
  );
  if (confirmationRef && !selected.length)
    throw new Error(`external_confirmation_not_fulfillable:${confirmationRef}`);
  return selected;
}

export function groupPreparationSessions(
  confirmations: ExternalConfirmationPreparationConfirmationV1[],
  candidate: ExternalConfirmationCandidateV1,
): ExternalConfirmationPreparationSessionV1[] {
  const groups = new Map<
    string,
    ExternalConfirmationPreparationConfirmationV1[]
  >();
  for (const confirmation of confirmations) {
    const rows = groups.get(confirmation.session_group) ?? [];
    rows.push(confirmation);
    groups.set(confirmation.session_group, rows);
  }
  return [...groups.entries()]
    .map(([sessionGroup, rows]) => {
      const first = rows[0]!;
      return {
        session_group: sessionGroup,
        suggested_session_id: `external-${sessionGroup.slice(0, 16)}-${candidate.snapshot_sha256.slice(0, 12)}`,
        actor: first.actor,
        identity_assurance: first.identity_assurance,
        target_ref: first.target_ref,
        environment_identity: first.environment_identity,
        scenario: first.scenario,
        evidence_requirements: first.evidence_requirements,
        confirmation_refs: rows.map((row) => row.confirmation_ref).sort(),
        obligations: rows
          .flatMap((row) => row.obligations)
          .sort((left, right) =>
            left.obligation_ref.localeCompare(right.obligation_ref),
          ),
      };
    })
    .sort((left, right) =>
      left.session_group.localeCompare(right.session_group),
    );
}

async function prepareConfirmation(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
): Promise<ExternalConfirmationPreparationConfirmationV1> {
  if (
    !confirmation.actor ||
    !confirmation.target_ref ||
    !confirmation.environment_identity ||
    !confirmation.scenario ||
    !confirmation.evidence_requirements?.length ||
    !confirmation.obligations?.length
  )
    throw new Error(
      `external_confirmation_declaration_incomplete:${confirmation.key}`,
    );
  const actor = externalConfirmationActor(confirmation);
  const identityAssurance = compiledExternalConfirmationIdentityAssurance(
    context.compiled,
    confirmation.key,
  );
  if (!actor || !identityAssurance || identityAssurance.scheme !== "ed25519")
    throw new Error(
      `external_confirmation_authenticated_actor_required:${confirmation.key}`,
    );
  const challenge = await readOrCreateExternalConfirmationChallenge(
    context,
    confirmation.key,
  );
  const relevant = deriveRelevantExternalInputIdentity(
    context.compiled,
    confirmation.key,
    context.manifest,
  );
  const obligations = externalRows(context.compiled, confirmation.key)
    .map((row) => prepareObligation(context, confirmation, row))
    .sort((left, right) =>
      left.obligation_ref.localeCompare(right.obligation_ref),
    );
  const groups = [...new Set(obligations.map((row) => row.session_group))];
  if (groups.length !== 1 || !groups[0])
    throw new Error(
      `external_confirmation_session_group_invalid:${confirmation.key}`,
    );
  const prepared = {
    confirmation_ref: confirmation.key,
    description: confirmation.description,
    owner: confirmation.owner,
    actor,
    identity_assurance: identityAssurance,
    target_ref: confirmation.target_ref,
    environment_identity: confirmation.environment_identity,
    scenario: confirmation.scenario,
    evidence_requirements: confirmation.evidence_requirements,
    session_group: groups[0],
    relevant_input_identity: relevant.identity,
    relevant_input_mode: relevant.mode,
    relevant_input_paths: relevant.paths,
    challenge: challenge.challenge,
    obligations,
  };
  return {
    ...prepared,
    signable_canonical_digest: sha256Hex(
      canonicalValueJson({
        schema_version: "long-task-external-confirmation-signing-context-v2",
        compiled_identity: context.compiled.compiled_identity,
        authority_revision: context.compiled.authority_revision,
        candidate: context.candidate,
        ...prepared,
      }),
    ),
  };
}

function prepareObligation(
  context: ExternalAuthorityContextV1,
  confirmation: ExternalConfirmationV2,
  row: AcceptanceObligationReachabilityV1,
): ExternalConfirmationPreparationObligationV1 {
  const declaration = confirmation.obligations!.find(
    (obligation) => obligation.key === row.obligation_ref,
  );
  if (!declaration)
    throw new Error(
      `external_confirmation_obligation_declaration_missing:${confirmation.key}:${row.obligation_ref}`,
    );
  return {
    ...row,
    result_kind: declaration.result_kind,
    expected: expectedForExternalObligation(
      context.compiled,
      context.semantic_manifest,
      row,
      declaration.expected_authority_ref,
    ),
  };
}
