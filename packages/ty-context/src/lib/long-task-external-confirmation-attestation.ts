import { createPublicKey, verify } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type {
  CompiledExternalConfirmationIdentityAssuranceV2,
  DeliveryContractV2,
  ExternalConfirmationV2,
} from "./long-task-contract-types.js";
import type {
  CompiledDeliveryContractV2,
  ContextAuthoritySnapshotV2,
} from "./long-task-delivery-types.js";
import { externalConfirmationV2SignablePayload } from "./long-task-external-confirmation-shape.js";
import type {
  ExternalConfirmationActorV1,
  ExternalConfirmationRecordV2,
} from "./long-task-external-confirmation-types.js";
import { normalizeContextAuthoritySnapshot } from "./long-task-context-authority.js";
import { assertProtectedRepositoryFile } from "./repository-path-safety.js";
import { sha256Hex } from "./strict-codec.js";

const MAX_PUBLIC_KEY_BYTES = 64 * 1024;

export async function compileExternalConfirmationIdentityAssurances(input: {
  contract: DeliveryContractV2;
  repository: string;
  source_hashes: Record<string, string>;
  context_snapshot: ContextAuthoritySnapshotV2;
}): Promise<Record<string, CompiledExternalConfirmationIdentityAssuranceV2>> {
  const result: Record<
    string,
    CompiledExternalConfirmationIdentityAssuranceV2
  > = {};
  const context = normalizeContextAuthoritySnapshot(input.context_snapshot);
  const controllingContext = new Set(context.controlling_files);
  for (const confirmation of input.contract.global.acceptance
    .external_confirmations) {
    const assurance = confirmation.actor?.identity_assurance;
    if (!assurance) continue;
    if (assurance.scheme === "declared_only") {
      result[confirmation.key] = assurance;
      continue;
    }
    const expectedHash =
      input.source_hashes[assurance.public_key_ref] ??
      (controllingContext.has(assurance.public_key_ref)
        ? context.sha256[assurance.public_key_ref]
        : undefined);
    if (!expectedHash)
      throw new Error(
        `external_confirmation_public_key_not_controlling_source:${confirmation.key}:${assurance.public_key_ref}`,
      );
    const file = await assertProtectedRepositoryFile(
      input.repository,
      path.resolve(input.repository, ...assurance.public_key_ref.split("/")),
      `external_confirmation_public_key:${confirmation.key}`,
    );
    const info = await stat(file);
    if (info.size > MAX_PUBLIC_KEY_BYTES)
      throw new Error(
        `external_confirmation_public_key_too_large:${confirmation.key}:${info.size}`,
      );
    const bytes = await readFile(file);
    const actualHash = sha256Hex(bytes);
    if (actualHash !== expectedHash)
      throw new Error(
        `external_confirmation_public_key_identity_mismatch:${confirmation.key}`,
      );
    assertEd25519PublicKey(bytes, confirmation.key);
    result[confirmation.key] = {
      ...assurance,
      public_key_sha256: actualHash,
    };
  }
  return Object.fromEntries(
    Object.entries(result).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function externalConfirmationActor(
  confirmation: ExternalConfirmationV2,
): ExternalConfirmationActorV1 | null {
  if (!confirmation.actor) return null;
  return {
    id: confirmation.actor.id,
    role: confirmation.actor.role,
    authority_kind: confirmation.actor.authority_kind,
  };
}

export function compiledExternalConfirmationIdentityAssurance(
  compiled: CompiledDeliveryContractV2,
  confirmationRef: string,
): CompiledExternalConfirmationIdentityAssuranceV2 | null {
  return (
    compiled.external_confirmation_identity_assurances?.[confirmationRef] ??
    null
  );
}

export async function verifyExternalConfirmationAttestation(input: {
  repository: string;
  confirmation_ref: string;
  assurance: CompiledExternalConfirmationIdentityAssuranceV2 | null;
  record: ExternalConfirmationRecordV2;
}): Promise<{ verified: boolean; issues: string[] }> {
  const issues: string[] = [];
  const assurance = input.assurance;
  if (!assurance || assurance.scheme !== "ed25519")
    return {
      verified: false,
      issues: ["blocking_actor_identity_not_ed25519"],
    };
  if (input.record.attestation.scheme !== assurance.scheme)
    issues.push("attestation_scheme_mismatch");
  if (input.record.attestation.key_id !== assurance.key_id)
    issues.push("attestation_key_id_mismatch");
  let publicKeyBytes: Buffer;
  try {
    const file = await assertProtectedRepositoryFile(
      input.repository,
      path.resolve(input.repository, ...assurance.public_key_ref.split("/")),
      `external_confirmation_public_key:${input.confirmation_ref}`,
    );
    const info = await stat(file);
    if (info.size > MAX_PUBLIC_KEY_BYTES)
      throw new Error(`public_key_too_large:${info.size}`);
    publicKeyBytes = await readFile(file);
    if (sha256Hex(publicKeyBytes) !== assurance.public_key_sha256)
      issues.push("public_key_identity_stale");
  } catch (error) {
    issues.push(`public_key_invalid:${message(error)}`);
    return { verified: false, issues };
  }
  if (issues.length) return { verified: false, issues };
  try {
    const key = assertEd25519PublicKey(publicKeyBytes, input.confirmation_ref);
    const signature = Buffer.from(
      input.record.attestation.signature_base64,
      "base64",
    );
    const verified = verify(
      null,
      Buffer.from(externalConfirmationV2SignablePayload(input.record), "utf8"),
      key,
      signature,
    );
    return {
      verified,
      issues: verified ? [] : ["attestation_signature_invalid"],
    };
  } catch (error) {
    return {
      verified: false,
      issues: [`attestation_verification_failed:${message(error)}`],
    };
  }
}

function assertEd25519PublicKey(bytes: Buffer, confirmationRef: string) {
  let key;
  try {
    key = createPublicKey(bytes);
  } catch (error) {
    throw new Error(
      `external_confirmation_public_key_invalid:${confirmationRef}:${message(error)}`,
    );
  }
  if (key.type !== "public" || key.asymmetricKeyType !== "ed25519")
    throw new Error(
      `external_confirmation_public_key_not_ed25519:${confirmationRef}`,
    );
  return key;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
