import { randomBytes } from "node:crypto";
import { lstat, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { CompiledDeliveryContractV2 } from "./long-task-delivery-types.js";
import {
  assertProtectedRepositoryFile,
  assertSafeRepositoryFilePath,
  ensureSafeRepositoryDirectory,
} from "./repository-path-safety.js";
import { runtimePath } from "./long-task-state.js";
import {
  canonicalJson,
  canonicalValueJson,
  sha256Hex,
} from "./strict-codec.js";

const CHALLENGE_FOLDER = "external-confirmations/challenges";
const MAX_CHALLENGE_RECORD_BYTES = 16 * 1024;
const HASH = /^[a-f0-9]{64}$/u;
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/u;

export interface ExternalConfirmationChallengeV1 {
  schema_version: "long-task-external-confirmation-challenge-v1";
  confirmation_ref: string;
  compiled_identity: string;
  authority_revision: number;
  challenge: string;
  rotated_at: string;
  challenge_state_sha256: string;
}

export interface ExternalConfirmationChallengeContext {
  repository: string;
  workdir: string;
  compiled: Pick<
    CompiledDeliveryContractV2,
    "compiled_identity" | "authority_revision"
  >;
}

export function externalConfirmationChallengePath(
  workdir: string,
  confirmationRef: string,
): string {
  assertConfirmationKey(confirmationRef);
  return runtimePath(workdir, `${CHALLENGE_FOLDER}/${confirmationRef}.json`);
}

export async function readOrCreateExternalConfirmationChallenge(
  context: ExternalConfirmationChallengeContext,
  confirmationRef: string,
): Promise<ExternalConfirmationChallengeV1> {
  const current = await readExternalConfirmationChallenge(
    context.repository,
    context.workdir,
    confirmationRef,
  );
  if (current.error)
    throw new Error(
      `external_confirmation_challenge_invalid:${confirmationRef}:${current.error}`,
    );
  if (
    current.challenge &&
    current.challenge.compiled_identity ===
      context.compiled.compiled_identity &&
    current.challenge.authority_revision === context.compiled.authority_revision
  )
    return current.challenge;
  return rotateExternalConfirmationChallenge(context, confirmationRef);
}

export async function rotateExternalConfirmationChallenge(
  context: ExternalConfirmationChallengeContext,
  confirmationRef: string,
): Promise<ExternalConfirmationChallengeV1> {
  const unsigned = {
    schema_version: "long-task-external-confirmation-challenge-v1" as const,
    confirmation_ref: confirmationRef,
    compiled_identity: context.compiled.compiled_identity,
    authority_revision: context.compiled.authority_revision,
    challenge: randomBytes(32).toString("base64url"),
    rotated_at: new Date().toISOString(),
  };
  const record = parseChallenge({
    ...unsigned,
    challenge_state_sha256: sha256Hex(canonicalValueJson(unsigned)),
  });
  await writeChallenge(context.repository, context.workdir, record);
  return record;
}

export async function readExternalConfirmationChallenge(
  repository: string,
  workdir: string,
  confirmationRef: string,
): Promise<{
  challenge: ExternalConfirmationChallengeV1 | null;
  error: string | null;
}> {
  const file = externalConfirmationChallengePath(workdir, confirmationRef);
  const status = await lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!status) return { challenge: null, error: null };
  try {
    const protectedFile = await assertProtectedRepositoryFile(
      repository,
      file,
      `external_confirmation_challenge:${confirmationRef}`,
    );
    if (status.size > MAX_CHALLENGE_RECORD_BYTES)
      throw new Error(`challenge_record_too_large:${status.size}`);
    return {
      challenge: parseChallenge(
        JSON.parse(await readFile(protectedFile, "utf8")) as unknown,
      ),
      error: null,
    };
  } catch (error) {
    return { challenge: null, error: message(error) };
  }
}

export async function captureStoredExternalConfirmationChallengeIdentities(
  repository: string,
  workdir: string,
  confirmationRefs: readonly string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const confirmationRef of [...new Set(confirmationRefs)].sort()) {
    const file = externalConfirmationChallengePath(workdir, confirmationRef);
    const status = await lstat(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    if (!status) {
      result[confirmationRef] = "absent";
      continue;
    }
    const protectedFile = await assertProtectedRepositoryFile(
      repository,
      file,
      `external_confirmation_challenge:${confirmationRef}`,
    );
    result[confirmationRef] =
      `sha256:${sha256Hex(await readFile(protectedFile))}`;
  }
  return result;
}

async function writeChallenge(
  repository: string,
  workdir: string,
  record: ExternalConfirmationChallengeV1,
): Promise<void> {
  const file = externalConfirmationChallengePath(
    workdir,
    record.confirmation_ref,
  );
  await ensureSafeRepositoryDirectory(
    repository,
    repositoryRelative(repository, path.dirname(file)),
    `external_confirmation_challenge_folder:${record.confirmation_ref}`,
  );
  await assertSafeRepositoryFilePath(
    repository,
    repositoryRelative(repository, file),
    `external_confirmation_challenge:${record.confirmation_ref}`,
    { destinationMayBeAbsent: true },
  );
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(canonicalJson(record), "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await rm(temporary, { force: true });
    throw error;
  }
  await handle.close();
  try {
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

function parseChallenge(value: unknown): ExternalConfirmationChallengeV1 {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("challenge_record_not_object");
  const row = value as Record<string, unknown>;
  const expectedKeys = [
    "schema_version",
    "confirmation_ref",
    "compiled_identity",
    "authority_revision",
    "challenge",
    "rotated_at",
    "challenge_state_sha256",
  ];
  const actualKeys = Object.keys(row).sort();
  if (actualKeys.join("\0") !== [...expectedKeys].sort().join("\0"))
    throw new Error("challenge_record_keys_invalid");
  if (row.schema_version !== "long-task-external-confirmation-challenge-v1")
    throw new Error("challenge_record_schema_invalid");
  if (
    typeof row.confirmation_ref !== "string" ||
    !/^[a-z0-9][a-z0-9-]*$/u.test(row.confirmation_ref)
  )
    throw new Error("challenge_confirmation_ref_invalid");
  if (
    typeof row.compiled_identity !== "string" ||
    !HASH.test(row.compiled_identity)
  )
    throw new Error("challenge_compiled_identity_invalid");
  if (
    !Number.isSafeInteger(row.authority_revision) ||
    (row.authority_revision as number) < 0
  )
    throw new Error("challenge_authority_revision_invalid");
  if (typeof row.challenge !== "string" || !CHALLENGE.test(row.challenge))
    throw new Error("challenge_value_invalid");
  if (
    typeof row.rotated_at !== "string" ||
    !Number.isFinite(Date.parse(row.rotated_at)) ||
    new Date(Date.parse(row.rotated_at)).toISOString() !== row.rotated_at
  )
    throw new Error("challenge_timestamp_invalid");
  if (
    typeof row.challenge_state_sha256 !== "string" ||
    !HASH.test(row.challenge_state_sha256)
  )
    throw new Error("challenge_state_hash_invalid");
  const record = row as unknown as ExternalConfirmationChallengeV1;
  const { challenge_state_sha256: _hash, ...unsigned } = record;
  if (sha256Hex(canonicalValueJson(unsigned)) !== record.challenge_state_sha256)
    throw new Error("challenge_state_integrity_mismatch");
  return record;
}

function repositoryRelative(repository: string, candidate: string): string {
  const relative = path.relative(
    path.resolve(repository),
    path.resolve(candidate),
  );
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw new Error("external_confirmation_challenge_outside_repository");
  return relative.replace(/\\/gu, "/");
}

function assertConfirmationKey(value: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(value))
    throw new Error(`external_confirmation_key_invalid:${value}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
