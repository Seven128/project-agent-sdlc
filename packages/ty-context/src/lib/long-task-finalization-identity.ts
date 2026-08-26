import type {
  CompiledDeliveryContractV2,
  WorkspaceFingerprintV2,
} from "./long-task-delivery-types.js";
import { captureStoredExternalConfirmationArtifactIdentities } from "./long-task-external-confirmation-artifacts.js";
import { captureStoredExternalConfirmationChallengeIdentities } from "./long-task-external-confirmation-challenge.js";
import { readStoredExternalConfirmationRecord } from "./long-task-external-confirmation-state.js";
import { captureStoredExternalConfirmationRecordIdentities } from "./long-task-external-confirmation-state.js";
import type { ExternalConfirmationCandidateV1 } from "./long-task-external-confirmation-types.js";
import { captureProtectedAuthorityInputsIdentity } from "./long-task-freshness.js";
import type { ActiveLongTaskAuthorityV3 } from "./long-task-state.js";
import { canonicalValueJson, sha256Hex } from "./strict-codec.js";

export interface FinalizationIdentityV1 {
  active_authority_identity: string;
  authority_revision: number;
  verifier_identity_sha256: string;
  candidate: {
    git_head: string;
    git_tree: string;
    workspace_fingerprint: string;
  };
  compiled_identity: string;
  raw_contract_sha256: string;
  protected_authority_inputs_identity: string;
  external_records: Record<string, string>;
  external_challenges: Record<string, string>;
  external_artifacts: Record<string, string>;
}

export async function captureFinalizationIdentity(input: {
  repository: string;
  active: ActiveLongTaskAuthorityV3;
  compiled: CompiledDeliveryContractV2;
  candidate: ExternalConfirmationCandidateV1;
  workspace_fingerprint: string | Pick<WorkspaceFingerprintV2, "identity">;
}): Promise<FinalizationIdentityV1> {
  const confirmationRefs =
    input.compiled.global.acceptance.external_confirmations
      .map((confirmation) => confirmation.key)
      .sort();
  const [
    protectedAuthorityInputs,
    externalRecords,
    externalChallenges,
    externalArtifacts,
  ] = await Promise.all([
    captureProtectedAuthorityInputsIdentity(input.compiled),
    captureStoredExternalConfirmationRecordIdentities(
      input.repository,
      input.compiled.workdir,
      confirmationRefs,
    ),
    captureStoredExternalConfirmationChallengeIdentities(
      input.repository,
      input.compiled.workdir,
      confirmationRefs,
    ),
    captureExternalArtifactIdentities(
      input.repository,
      input.compiled.workdir,
      confirmationRefs,
    ),
  ]);
  return {
    active_authority_identity: input.active.active_authority_identity,
    authority_revision: input.active.authority_revision,
    verifier_identity_sha256: input.compiled.verifier_identity.bundle_sha256,
    candidate: {
      git_head: input.candidate.git_head,
      git_tree: input.candidate.git_tree,
      workspace_fingerprint:
        typeof input.workspace_fingerprint === "string"
          ? input.workspace_fingerprint
          : input.workspace_fingerprint.identity,
    },
    compiled_identity: input.compiled.compiled_identity,
    raw_contract_sha256: protectedAuthorityInputs.snapshot.raw_contract_sha256,
    protected_authority_inputs_identity: protectedAuthorityInputs.identity,
    external_records: externalRecords,
    external_challenges: externalChallenges,
    external_artifacts: externalArtifacts,
  };
}

export function finalizationIdentityDigest(
  identity: FinalizationIdentityV1,
): string {
  return sha256Hex(canonicalValueJson(identity));
}

async function captureExternalArtifactIdentities(
  repository: string,
  workdir: string,
  confirmationRefs: readonly string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const confirmationRef of confirmationRefs) {
    const stored = await readStoredExternalConfirmationRecord(
      repository,
      workdir,
      confirmationRef,
    );
    if (stored.error)
      throw new Error(
        `finalization_external_record_invalid:${confirmationRef}:${stored.error}`,
      );
    if (
      !stored.record ||
      stored.record.schema_version !==
        "long-task-external-confirmation-record-v2"
    )
      continue;
    const identities =
      await captureStoredExternalConfirmationArtifactIdentities(
        repository,
        workdir,
        stored.record.artifact_snapshots,
      );
    for (const [storeRef, identity] of Object.entries(identities)) {
      const previous = result[storeRef];
      if (previous && previous !== identity)
        throw new Error(
          `finalization_external_artifact_identity_conflict:${storeRef}`,
        );
      result[storeRef] = identity;
    }
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) => left.localeCompare(right)),
  );
}
