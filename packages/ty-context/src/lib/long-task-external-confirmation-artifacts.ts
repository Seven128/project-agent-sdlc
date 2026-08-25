import { lstat, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";
import type { ExternalConfirmationRecordV2 } from "./long-task-external-confirmation-types.js";
import {
  assertProtectedRepositoryFile,
  assertSafeRepositoryFilePath,
  ensureSafeRepositoryDirectory,
} from "./repository-path-safety.js";
import { runtimePath } from "./long-task-state.js";
import { sha256Hex } from "./strict-codec.js";

const ARTIFACT_STORE_FOLDER = "external-confirmations/artifacts";
const MAX_ARTIFACT_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_ARTIFACT_BYTES = 64 * 1024 * 1024;

export function externalConfirmationArtifactStoreRef(sha256: string): string {
  if (!/^[a-f0-9]{64}$/u.test(sha256))
    throw new Error(`external_confirmation_artifact_hash_invalid:${sha256}`);
  return `${ARTIFACT_STORE_FOLDER}/${sha256}`;
}

export async function captureAndStoreExternalConfirmationArtifacts(
  repository: string,
  workdir: string,
  snapshots: ExternalConfirmationRecordV2["artifact_snapshots"],
): Promise<void> {
  const captured: Array<{ sha256: string; bytes: Buffer }> = [];
  let totalBytes = 0;
  for (const [evidenceRef, snapshot] of Object.entries(snapshots).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const expectedStoreRef = externalConfirmationArtifactStoreRef(
      snapshot.sha256,
    );
    if (snapshot.store_ref !== expectedStoreRef)
      throw new Error(
        `external_confirmation_artifact_store_ref_mismatch:${evidenceRef}`,
      );
    if (evidenceRef.startsWith(`${ARTIFACT_STORE_FOLDER}/`))
      throw new Error(
        `external_confirmation_artifact_source_store_ref_not_allowed:${evidenceRef}`,
      );
    const file = await assertProtectedRepositoryFile(
      repository,
      path.resolve(repository, ...evidenceRef.split("/")),
      `external_confirmation_artifact:${evidenceRef}`,
    );
    const info = await lstat(file);
    if (info.size > MAX_ARTIFACT_BYTES)
      throw new Error(
        `external_confirmation_artifact_too_large:${evidenceRef}:${info.size}`,
      );
    totalBytes += info.size;
    if (totalBytes > MAX_TOTAL_ARTIFACT_BYTES)
      throw new Error(
        `external_confirmation_artifacts_total_too_large:${totalBytes}`,
      );
    const bytes = await readFile(file);
    if (bytes.length !== info.size || bytes.length !== snapshot.size_bytes)
      throw new Error(
        `external_confirmation_artifact_size_mismatch:${evidenceRef}`,
      );
    if (sha256Hex(bytes) !== snapshot.sha256)
      throw new Error(
        `external_confirmation_artifact_content_mismatch:${evidenceRef}`,
      );
    captured.push({ sha256: snapshot.sha256, bytes });
  }
  const unique = new Map(captured.map((row) => [row.sha256, row.bytes]));
  for (const [sha256, bytes] of unique)
    await storeArtifact(repository, workdir, sha256, bytes);
}

export async function externalArtifactSnapshotIntegrityIssues(
  repository: string,
  workdir: string,
  snapshots: ExternalConfirmationRecordV2["artifact_snapshots"],
): Promise<string[]> {
  const issues: string[] = [];
  for (const [evidenceRef, snapshot] of Object.entries(snapshots).sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const expectedStoreRef = externalConfirmationArtifactStoreRef(
      snapshot.sha256,
    );
    if (snapshot.store_ref !== expectedStoreRef) {
      issues.push(`artifact_store_ref_mismatch:${evidenceRef}`);
      continue;
    }
    try {
      const file = await assertProtectedRepositoryFile(
        repository,
        runtimePath(workdir, snapshot.store_ref),
        `external_confirmation_artifact_snapshot:${evidenceRef}`,
      );
      const info = await lstat(file);
      const bytes = await readFile(file);
      if (
        info.size !== snapshot.size_bytes ||
        bytes.length !== snapshot.size_bytes
      )
        issues.push(`artifact_snapshot_size_changed:${evidenceRef}`);
      if (sha256Hex(bytes) !== snapshot.sha256)
        issues.push(`artifact_snapshot_content_changed:${evidenceRef}`);
    } catch (error) {
      issues.push(`artifact_snapshot_invalid:${evidenceRef}:${message(error)}`);
    }
  }
  return issues;
}

export async function captureStoredExternalConfirmationArtifactIdentities(
  repository: string,
  workdir: string,
  snapshots: ExternalConfirmationRecordV2["artifact_snapshots"],
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const snapshot of Object.values(snapshots).sort((left, right) =>
    left.store_ref.localeCompare(right.store_ref),
  )) {
    const file = await assertProtectedRepositoryFile(
      repository,
      runtimePath(workdir, snapshot.store_ref),
      `external_confirmation_artifact_snapshot:${snapshot.store_ref}`,
    );
    result[snapshot.store_ref] = `sha256:${sha256Hex(await readFile(file))}`;
  }
  return result;
}

// Legacy v1 audit helper. It never establishes fulfillment.
export async function externalArtifactIntegrityIssues(
  repository: string,
  artifacts: Record<string, string>,
): Promise<string[]> {
  const issues: string[] = [];
  for (const [relative, expectedHash] of Object.entries(artifacts)) {
    try {
      const file = await assertProtectedRepositoryFile(
        repository,
        path.resolve(repository, ...relative.split("/")),
        `external_confirmation_artifact:${relative}`,
      );
      const actualHash = sha256Hex(await readFile(file));
      if (actualHash !== expectedHash)
        issues.push(`artifact_content_changed:${relative}`);
    } catch (error) {
      issues.push(`artifact_invalid:${relative}:${message(error)}`);
    }
  }
  return issues;
}

async function storeArtifact(
  repository: string,
  workdir: string,
  sha256: string,
  bytes: Buffer,
): Promise<void> {
  const storeRef = externalConfirmationArtifactStoreRef(sha256);
  const folder = runtimePath(workdir, ARTIFACT_STORE_FOLDER);
  await ensureSafeRepositoryDirectory(
    repository,
    repositoryRelative(repository, folder),
    "external_confirmation_artifact_store",
  );
  const target = runtimePath(workdir, storeRef);
  const safe = await assertSafeRepositoryFilePath(
    repository,
    repositoryRelative(repository, target),
    `external_confirmation_artifact_store:${sha256}`,
    { destinationMayBeAbsent: true },
  );
  if (safe.status) {
    const existing = await readFile(safe.absolute);
    if (sha256Hex(existing) !== sha256 || existing.length !== bytes.length)
      throw new Error(
        `external_confirmation_artifact_store_collision:${sha256}`,
      );
    return;
  }
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  const handle = await open(temporary, "wx");
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await rm(temporary, { force: true });
    throw error;
  }
  await handle.close();
  try {
    await rename(temporary, target);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
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
    throw new Error("external_confirmation_artifact_outside_repository");
  return relative.replace(/\\/gu, "/");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
