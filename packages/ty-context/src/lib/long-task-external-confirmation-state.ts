import { lstat, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import {
  assertProtectedRepositoryFile,
  assertSafeRepositoryFilePath,
  ensureSafeRepositoryDirectory,
} from "./repository-path-safety.js";
import { runtimePath } from "./long-task-state.js";
import type {
  ExternalConfirmationRecord,
  ExternalConfirmationRecordV2,
} from "./long-task-external-confirmation-types.js";
import {
  parseExternalConfirmationRecord,
  parseExternalConfirmationRecordV2,
} from "./long-task-external-confirmation-shape.js";
import { canonicalJson, sha256Hex } from "./strict-codec.js";

const EXTERNAL_CONFIRMATIONS_FOLDER = "external-confirmations";
const MAX_RECORD_BYTES = 16 * 1024 * 1024;

export interface StoredExternalConfirmationRecordV1 {
  record: ExternalConfirmationRecord | null;
  error: string | null;
}

export function externalConfirmationRecordPath(
  workdir: string,
  confirmationRef: string,
): string {
  assertConfirmationKey(confirmationRef);
  return runtimePath(
    workdir,
    `${EXTERNAL_CONFIRMATIONS_FOLDER}/${confirmationRef}.json`,
  );
}

export async function captureStoredExternalConfirmationRecordIdentities(
  repository: string,
  workdir: string,
  confirmationRefs: readonly string[],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const confirmationRef of [...new Set(confirmationRefs)].sort()) {
    const file = externalConfirmationRecordPath(workdir, confirmationRef);
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
      `external_confirmation_record:${confirmationRef}`,
    );
    result[confirmationRef] =
      `sha256:${sha256Hex(await readFile(protectedFile))}`;
  }
  return result;
}

export async function readStoredExternalConfirmationRecord(
  repository: string,
  workdir: string,
  confirmationRef: string,
): Promise<StoredExternalConfirmationRecordV1> {
  const file = externalConfirmationRecordPath(workdir, confirmationRef);
  const status = await lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!status) return { record: null, error: null };
  try {
    const protectedFile = await assertProtectedRepositoryFile(
      repository,
      file,
      `external_confirmation_record:${confirmationRef}`,
    );
    if (status.size > MAX_RECORD_BYTES)
      throw new Error(
        `external_confirmation_record_too_large:${confirmationRef}:${status.size}`,
      );
    return {
      record: parseExternalConfirmationRecord(
        JSON.parse(await readFile(protectedFile, "utf8")) as unknown,
      ),
      error: null,
    };
  } catch (error) {
    return { record: null, error: message(error) };
  }
}

export async function writeStoredExternalConfirmationRecord(
  repository: string,
  workdir: string,
  record: ExternalConfirmationRecordV2,
): Promise<string> {
  const parsed = parseExternalConfirmationRecordV2(record);
  const folder = path.dirname(
    externalConfirmationRecordPath(workdir, parsed.confirmation_ref),
  );
  await ensureSafeRepositoryDirectory(
    repository,
    repositoryRelative(repository, folder),
    `external_confirmation_folder:${parsed.confirmation_ref}`,
  );
  const file = externalConfirmationRecordPath(workdir, parsed.confirmation_ref);
  await assertSafeRepositoryFilePath(
    repository,
    repositoryRelative(repository, file),
    `external_confirmation_record:${parsed.confirmation_ref}`,
    { destinationMayBeAbsent: true },
  );
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(canonicalJson(parsed), "utf8");
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
  return file;
}

export async function revokeStoredExternalConfirmationRecord(
  repository: string,
  workdir: string,
  confirmationRef: string,
): Promise<boolean> {
  const file = externalConfirmationRecordPath(workdir, confirmationRef);
  const status = await lstat(file).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (!status) return false;
  const safe = await assertSafeRepositoryFilePath(
    repository,
    repositoryRelative(repository, file),
    `external_confirmation_record:${confirmationRef}`,
    { destinationMayBeAbsent: true },
  );
  await rm(safe.absolute, { force: true });
  return true;
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
    throw new Error("external_confirmation_state_outside_repository");
  return relative.replace(/\\/gu, "/");
}

function assertConfirmationKey(value: string): void {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(value))
    throw new Error(`external_confirmation_key_invalid:${value}`);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
