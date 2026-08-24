import { createHash } from "node:crypto";
import { constants, watch } from "node:fs";
import type { BigIntStats, FSWatcher } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import path from "node:path";
import {
  JSON_POINTER_EXACT_LIMITS,
  assertJsonTree,
  decodeUtf8Json,
  extractJsonPointerExactObservationFromBytes,
  normalizeObservationArtifactPath,
  parseJsonWithoutDuplicateKeys,
  resolveJsonPointer,
  type JsonPointerExactBudget,
  type JsonPointerExactLocator,
  type JsonPointerExactObservation,
} from "./long-task-json-pointer-observation.js";
import type {
  WorkspaceFileV2,
  WorkspaceManifestV2,
} from "./long-task-workspace-runtime-types.js";

const OBSERVATION_HASH_READ_BUFFER_BYTES = 1_048_576;

export type StaticObservationFreezeErrorCode =
  | "static_observation_not_in_pre_run_snapshot"
  | "static_observation_changed_by_runner"
  | "static_observation_manifest_invalid"
  | "static_observation_path_escape"
  | "static_observation_root_invalid"
  | "static_observation_parent_not_directory"
  | "static_observation_symlink_not_allowed"
  | "static_observation_hardlink_not_allowed"
  | "static_observation_not_regular_file"
  | "static_observation_size_limit";

export class StaticObservationFreezeError extends Error {
  readonly code: StaticObservationFreezeErrorCode;
  readonly artifact_path: string;
  readonly cause_code: string | null;

  constructor(
    code: StaticObservationFreezeErrorCode,
    artifactPath: string,
    causeCode: string | null = null,
  ) {
    super(
      [code, artifactPath, causeCode]
        .filter((value): value is string => value !== null && value !== "")
        .join(":"),
    );
    this.name = "StaticObservationFreezeError";
    this.code = code;
    this.artifact_path = artifactPath;
    this.cause_code = causeCode;
  }
}

export interface StaticObservationManifestMembership {
  path: string;
  mode: number;
  declared_size: number;
  /** Git/blob identity from the workspace manifest; never a content digest. */
  manifest_object_identity: string;
}

export interface StaticObservationFileIdentity {
  device: string;
  inode: string;
  mode: number;
  links: string;
  size: number;
  modified_time_ns: string;
  changed_time_ns: string;
  birth_time_ns: string;
  content_sha256: string;
}

export interface VerifiedObservationInputFile {
  readonly artifact_path: string;
  readonly manifest_membership: StaticObservationManifestMembership;
  readonly pre_run_identity: StaticObservationFileIdentity;
  readonly post_run_identity: StaticObservationFileIdentity;
}

export interface VerifiedStaticObservationCarrier extends VerifiedObservationInputFile {
  copyFrozenBytes(): Uint8Array;
  extractJsonPointerExactObservation(input: {
    locator: JsonPointerExactLocator;
    sensitivity: string;
    budget?: JsonPointerExactBudget;
  }): JsonPointerExactObservation;
  extractJsonPointerExactValue(input: {
    locator: JsonPointerExactLocator;
    sensitivity: string;
    budget?: JsonPointerExactBudget;
  }): {
    raw_value: unknown;
    observation: JsonPointerExactObservation;
  };
}

export interface FrozenObservationInputFile {
  readonly artifact_path: string;
  readonly manifest_membership: StaticObservationManifestMembership;
  readonly pre_run_identity: StaticObservationFileIdentity;
  verifyPostRun(): Promise<VerifiedObservationInputFile>;
  dispose(): void;
}

export interface FrozenStaticObservationCarrier extends FrozenObservationInputFile {
  verifyPostRun(): Promise<VerifiedStaticObservationCarrier>;
}

export interface ObservationInputFreezeBudget {
  readonly seen_artifact_paths: Set<string>;
  total_artifact_bytes: number;
  readonly max_artifacts: number;
  readonly max_total_artifact_bytes: number;
}

export function createObservationInputFreezeBudget(input: {
  max_artifacts: number;
  max_total_artifact_bytes: number;
}): ObservationInputFreezeBudget {
  if (
    !Number.isSafeInteger(input.max_artifacts) ||
    input.max_artifacts <= 0 ||
    !Number.isSafeInteger(input.max_total_artifact_bytes) ||
    input.max_total_artifact_bytes <= 0
  )
    throw new Error("observation_input_freeze_budget_invalid");
  return {
    seen_artifact_paths: new Set<string>(),
    total_artifact_bytes: 0,
    max_artifacts: input.max_artifacts,
    max_total_artifact_bytes: input.max_total_artifact_bytes,
  };
}

export async function freezeStaticObservationCarrier(input: {
  snapshot_root: string;
  workspace_manifest: WorkspaceManifestV2;
  artifact_path: string;
  budget?: JsonPointerExactBudget;
  input_freeze_budget?: ObservationInputFreezeBudget;
}): Promise<FrozenStaticObservationCarrier> {
  const artifactPath = normalizeStaticArtifactPath(input.artifact_path);
  assertArtifactCount(input.budget, artifactPath);
  const prepared = await prepareFrozenObservationInput({
    snapshot_root: input.snapshot_root,
    workspace_manifest: input.workspace_manifest,
    artifact_path: artifactPath,
    max_file_bytes: JSON_POINTER_EXACT_LIMITS.max_file_bytes,
    budget: input.input_freeze_budget,
    retain_bytes: true,
  });
  accountForArtifact(input.budget, artifactPath, prepared.preRunIdentity.size);
  const frozenBytes = prepared.frozenBytes;
  if (!frozenBytes) throw new Error("static_observation_frozen_bytes_missing");
  return Object.freeze({
    artifact_path: artifactPath,
    manifest_membership: prepared.manifest,
    pre_run_identity: prepared.preRunIdentity,
    verifyPostRun: async (): Promise<VerifiedStaticObservationCarrier> => {
      try {
        const postRunIdentity = await prepared.verifyPostRunIdentity();
        return Object.freeze({
          artifact_path: artifactPath,
          manifest_membership: prepared.manifest,
          pre_run_identity: prepared.preRunIdentity,
          post_run_identity: postRunIdentity,
          copyFrozenBytes: (): Uint8Array => Uint8Array.from(frozenBytes),
          extractJsonPointerExactObservation: (input: {
            locator: JsonPointerExactLocator;
            sensitivity: string;
            budget?: JsonPointerExactBudget;
          }): JsonPointerExactObservation =>
            extractJsonPointerExactObservationFromBytes({
              artifact_path: artifactPath,
              bytes: frozenBytes,
              locator: input.locator,
              sensitivity: input.sensitivity,
              budget: input.budget,
            }),
          extractJsonPointerExactValue: (input: {
            locator: JsonPointerExactLocator;
            sensitivity: string;
            budget?: JsonPointerExactBudget;
          }): {
            raw_value: unknown;
            observation: JsonPointerExactObservation;
          } => {
            const observation = extractJsonPointerExactObservationFromBytes({
              artifact_path: artifactPath,
              bytes: frozenBytes,
              locator: input.locator,
              sensitivity: input.sensitivity,
              budget: input.budget,
            });
            const parsed = parseJsonWithoutDuplicateKeys(
              decodeUtf8Json(frozenBytes),
            );
            assertJsonTree(parsed, 0);
            return {
              raw_value: resolveJsonPointer(parsed, observation.locator.value),
              observation,
            };
          },
        });
      } finally {
        prepared.dispose();
      }
    },
    dispose: prepared.dispose,
  });
}

export async function freezeObservationInputFile(input: {
  snapshot_root: string;
  workspace_manifest: WorkspaceManifestV2;
  artifact_path: string;
  max_file_bytes: number;
  budget?: ObservationInputFreezeBudget;
}): Promise<FrozenObservationInputFile> {
  const prepared = await prepareFrozenObservationInput({
    ...input,
    retain_bytes: false,
  });
  return Object.freeze({
    artifact_path: prepared.artifactPath,
    manifest_membership: prepared.manifest,
    pre_run_identity: prepared.preRunIdentity,
    verifyPostRun: async (): Promise<VerifiedObservationInputFile> => {
      try {
        const postRunIdentity = await prepared.verifyPostRunIdentity();
        return Object.freeze({
          artifact_path: prepared.artifactPath,
          manifest_membership: prepared.manifest,
          pre_run_identity: prepared.preRunIdentity,
          post_run_identity: postRunIdentity,
        });
      } finally {
        prepared.dispose();
      }
    },
    dispose: prepared.dispose,
  });
}

interface PreparedFrozenObservationInput {
  artifactPath: string;
  manifest: StaticObservationManifestMembership;
  preRunIdentity: StaticObservationFileIdentity;
  frozenBytes: Buffer | null;
  verifyPostRunIdentity(): Promise<StaticObservationFileIdentity>;
  dispose(): void;
}

async function prepareFrozenObservationInput(input: {
  snapshot_root: string;
  workspace_manifest: WorkspaceManifestV2;
  artifact_path: string;
  max_file_bytes: number;
  budget?: ObservationInputFreezeBudget;
  retain_bytes: boolean;
}): Promise<PreparedFrozenObservationInput> {
  const artifactPath = normalizeStaticArtifactPath(input.artifact_path);
  const maxFileBytes = observationInputFileLimit(input.max_file_bytes);
  const manifestEntry = manifestMembership(
    input.workspace_manifest,
    artifactPath,
  );
  assertObservationInputCount(input.budget, artifactPath);
  const root = path.resolve(input.snapshot_root);
  const captured = await captureStaticObservationFile(
    root,
    artifactPath,
    maxFileBytes,
    input.retain_bytes,
  );
  accountForObservationInput(
    input.budget,
    artifactPath,
    captured.identity.size,
  );
  const manifest = freezeManifestMembership(manifestEntry);
  const preRunIdentity = freezeFileIdentity(captured.identity);
  const frozenBytes = captured.bytes ? Buffer.from(captured.bytes) : null;
  const mutationMonitor = monitorObservationInput(root, artifactPath);
  return {
    artifactPath,
    manifest,
    preRunIdentity,
    frozenBytes,
    verifyPostRunIdentity: async (): Promise<StaticObservationFileIdentity> => {
      let post: CapturedStaticObservationFile;
      try {
        await mutationMonitor.assertUnchanged();
        post = await captureStaticObservationFile(
          root,
          artifactPath,
          maxFileBytes,
          false,
          preRunIdentity,
        );
        if (post.identity.content_sha256 !== preRunIdentity.content_sha256)
          throw freezeError(
            "static_observation_changed_by_runner",
            artifactPath,
            "content_sha256",
          );
        await mutationMonitor.assertUnchanged();
      } catch (error) {
        if (
          error instanceof StaticObservationFreezeError &&
          error.code === "static_observation_changed_by_runner"
        )
          throw error;
        throw freezeError(
          "static_observation_changed_by_runner",
          artifactPath,
          freezeCause(error),
        );
      }
      return freezeFileIdentity(post.identity);
    },
    dispose: mutationMonitor.dispose,
  };
}

interface ObservationInputMutationMonitor {
  assertUnchanged(): Promise<void>;
  dispose(): void;
}

function monitorObservationInput(
  root: string,
  artifactPath: string,
): ObservationInputMutationMonitor {
  const absolute = path.resolve(root, ...artifactPath.split("/"));
  let changedCause: string | null = null;
  let disposed = false;
  let watcher: FSWatcher;
  try {
    watcher = watch(absolute, { persistent: false }, (eventType) => {
      changedCause ??= `filesystem_event.${eventType}`;
    });
  } catch (error) {
    throw freezeError(
      "static_observation_changed_by_runner",
      artifactPath,
      `monitor_unavailable.${nodeErrorCode(error)}`,
    );
  }
  watcher.on("error", (error) => {
    changedCause ??= `filesystem_monitor_error.${nodeErrorCode(error)}`;
  });
  return {
    assertUnchanged: async (): Promise<void> => {
      await settleFilesystemEvents();
      if (changedCause)
        throw freezeError(
          "static_observation_changed_by_runner",
          artifactPath,
          changedCause,
        );
    },
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      watcher.close();
    },
  };
}

async function settleFilesystemEvents(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
}

interface CapturedStaticObservationFile {
  identity: StaticObservationFileIdentity;
  bytes: Uint8Array | null;
}

interface StaticObservationMetadata {
  device: string;
  inode: string;
  mode: number;
  links: string;
  size: number;
  modified_time_ns: string;
  changed_time_ns: string;
  birth_time_ns: string;
}

const STATIC_OBSERVATION_METADATA_KEYS = Object.freeze([
  "device",
  "inode",
  "mode",
  "links",
  "size",
  "modified_time_ns",
  "changed_time_ns",
  "birth_time_ns",
] as const satisfies readonly (keyof StaticObservationMetadata)[]);

async function captureStaticObservationFile(
  root: string,
  artifactPath: string,
  maxFileBytes: number,
  retainBytes: boolean,
  expected?: StaticObservationFileIdentity,
): Promise<CapturedStaticObservationFile> {
  const rootInfo = await lstat(root, { bigint: true }).catch((error) => {
    throw freezeError(
      "static_observation_root_invalid",
      artifactPath,
      nodeErrorCode(error),
    );
  });
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory())
    throw freezeError("static_observation_root_invalid", artifactPath);
  const canonicalRoot = await realpath(root);
  const absolute = path.resolve(root, ...artifactPath.split("/"));
  assertContained(root, absolute, artifactPath);
  const pathInfo = await inspectNoFollowPath(root, artifactPath, expected);
  const canonicalFile = await realpath(absolute).catch((error) => {
    throw freezeError(
      expected
        ? "static_observation_changed_by_runner"
        : "static_observation_not_in_pre_run_snapshot",
      artifactPath,
      nodeErrorCode(error),
    );
  });
  assertContained(canonicalRoot, canonicalFile, artifactPath);
  const noFollow =
    typeof constants.O_NOFOLLOW === "number" ? constants.O_NOFOLLOW : 0;
  const handle = await open(absolute, constants.O_RDONLY | noFollow).catch(
    (error) => {
      throw freezeError(
        expected
          ? "static_observation_changed_by_runner"
          : openFailureCode(error),
        artifactPath,
        nodeErrorCode(error),
      );
    },
  );
  try {
    const opened = await handle.stat({ bigint: true });
    assertRegularFile(opened, artifactPath);
    const openedMetadata = fileMetadata(opened);
    assertMetadataEqual(pathInfo, openedMetadata, artifactPath, expected);
    if (expected)
      assertMetadataEqual(expected, openedMetadata, artifactPath, expected);
    if (openedMetadata.size > maxFileBytes)
      throw freezeError("static_observation_size_limit", artifactPath);
    const content = await readAndHashBounded(
      handle,
      artifactPath,
      maxFileBytes,
      retainBytes,
      openedMetadata.size,
    );
    const afterRead = fileMetadata(await handle.stat({ bigint: true }));
    assertMetadataEqual(openedMetadata, afterRead, artifactPath, expected);
    const pathAfter = fileMetadata(
      await lstat(absolute, { bigint: true }).catch((error) => {
        throw freezeError(
          expected
            ? "static_observation_changed_by_runner"
            : "static_observation_not_in_pre_run_snapshot",
          artifactPath,
          nodeErrorCode(error),
        );
      }),
    );
    assertMetadataEqual(afterRead, pathAfter, artifactPath, expected);
    const canonicalAfter = await realpath(absolute);
    assertContained(canonicalRoot, canonicalAfter, artifactPath);
    if (canonicalAfter !== canonicalFile)
      throw freezeError(
        expected
          ? "static_observation_changed_by_runner"
          : "static_observation_symlink_not_allowed",
        artifactPath,
        "realpath_changed",
      );
    return {
      identity: {
        ...openedMetadata,
        content_sha256: content.sha256,
      },
      bytes: content.bytes,
    };
  } finally {
    await handle.close();
  }
}

async function inspectNoFollowPath(
  root: string,
  artifactPath: string,
  expected?: StaticObservationFileIdentity,
): Promise<StaticObservationMetadata> {
  let current = root;
  const segments = artifactPath.split("/");
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    const info = await lstat(current, { bigint: true }).catch((error) => {
      throw freezeError(
        expected
          ? "static_observation_changed_by_runner"
          : "static_observation_not_in_pre_run_snapshot",
        artifactPath,
        nodeErrorCode(error),
      );
    });
    if (info.isSymbolicLink())
      throw freezeError(
        expected
          ? "static_observation_changed_by_runner"
          : "static_observation_symlink_not_allowed",
        artifactPath,
        "symbolic_link",
      );
    if (index < segments.length - 1) {
      if (!info.isDirectory())
        throw freezeError(
          expected
            ? "static_observation_changed_by_runner"
            : "static_observation_parent_not_directory",
          artifactPath,
        );
      continue;
    }
    assertRegularFile(info, artifactPath);
    return fileMetadata(info);
  }
  throw freezeError("static_observation_path_escape", artifactPath);
}

function manifestMembership(
  manifest: WorkspaceManifestV2,
  artifactPath: string,
): StaticObservationManifestMembership {
  const matches = manifest.files.filter((entry) => entry.path === artifactPath);
  if (!matches.length)
    throw freezeError(
      "static_observation_not_in_pre_run_snapshot",
      artifactPath,
    );
  if (matches.length !== 1)
    throw freezeError("static_observation_manifest_invalid", artifactPath);
  const entry = matches[0];
  if (!isManifestRegularFile(entry))
    throw freezeError("static_observation_not_regular_file", artifactPath);
  return {
    path: entry.path,
    mode: entry.mode,
    declared_size: entry.size,
    manifest_object_identity: entry.sha256,
  };
}

function isManifestRegularFile(entry: WorkspaceFileV2): boolean {
  return (entry.mode & 0o170000) === 0o100000;
}

function normalizeStaticArtifactPath(value: string): string {
  try {
    return normalizeObservationArtifactPath(value);
  } catch {
    throw freezeError("static_observation_path_escape", value);
  }
}

function assertRegularFile(info: BigIntStats, artifactPath: string): void {
  if (info.isSymbolicLink())
    throw freezeError("static_observation_symlink_not_allowed", artifactPath);
  if (!info.isFile())
    throw freezeError("static_observation_not_regular_file", artifactPath);
  if (info.nlink > 1n)
    throw freezeError("static_observation_hardlink_not_allowed", artifactPath);
}

function fileMetadata(info: BigIntStats): StaticObservationMetadata {
  return {
    device: info.dev.toString(),
    inode: info.ino.toString(),
    mode: Number(info.mode),
    links: info.nlink.toString(),
    size: Number(info.size),
    modified_time_ns: info.mtimeNs.toString(),
    changed_time_ns: info.ctimeNs.toString(),
    birth_time_ns: info.birthtimeNs.toString(),
  };
}

function assertMetadataEqual(
  left: StaticObservationMetadata,
  right: StaticObservationMetadata,
  artifactPath: string,
  postRunExpected?: StaticObservationFileIdentity,
): void {
  const mismatch = STATIC_OBSERVATION_METADATA_KEYS.find(
    (key) => left[key] !== right[key],
  );
  if (!mismatch) return;
  throw freezeError(
    postRunExpected
      ? "static_observation_changed_by_runner"
      : "static_observation_not_in_pre_run_snapshot",
    artifactPath,
    `file_identity.${mismatch}`,
  );
}

async function readAndHashBounded(
  handle: Awaited<ReturnType<typeof open>>,
  artifactPath: string,
  limit: number,
  retainBytes: boolean,
  expectedSize: number,
): Promise<{ bytes: Uint8Array | null; sha256: string }> {
  const buffer = Buffer.allocUnsafe(
    Math.min(
      OBSERVATION_HASH_READ_BUFFER_BYTES,
      limit + 1,
      Math.max(1, expectedSize + 1),
    ),
  );
  const chunks: Buffer[] = [];
  const hash = createHash("sha256");
  let offset = 0;
  while (true) {
    const { bytesRead } = await handle.read(
      buffer,
      0,
      buffer.byteLength,
      offset,
    );
    if (!bytesRead) break;
    offset += bytesRead;
    if (offset > limit)
      throw freezeError("static_observation_size_limit", artifactPath);
    const chunk = buffer.subarray(0, bytesRead);
    hash.update(chunk);
    if (retainBytes) chunks.push(Buffer.from(chunk));
  }
  return {
    bytes: retainBytes ? Uint8Array.from(Buffer.concat(chunks, offset)) : null,
    sha256: hash.digest("hex"),
  };
}

function observationInputFileLimit(value: number): number {
  const limit = value;
  if (!Number.isSafeInteger(limit) || limit <= 0)
    throw new Error("observation_input_freeze_file_limit_invalid");
  return limit;
}

function assertContained(
  root: string,
  target: string,
  artifactPath: string,
): void {
  const relative = path.relative(root, target);
  if (
    relative === "" ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  )
    throw freezeError("static_observation_path_escape", artifactPath);
}

function assertArtifactCount(
  budget: JsonPointerExactBudget | undefined,
  artifactPath: string,
): void {
  if (
    budget &&
    !budget.seen_artifact_paths.has(artifactPath) &&
    budget.seen_artifact_paths.size >=
      JSON_POINTER_EXACT_LIMITS.max_artifacts_per_check
  )
    throw new Error("observation_artifact_count_limit");
}

function assertObservationInputCount(
  budget: ObservationInputFreezeBudget | undefined,
  artifactPath: string,
): void {
  if (
    budget &&
    !budget.seen_artifact_paths.has(artifactPath) &&
    budget.seen_artifact_paths.size >= budget.max_artifacts
  )
    throw new Error("observation_input_freeze_artifact_count_limit");
}

function accountForObservationInput(
  budget: ObservationInputFreezeBudget | undefined,
  artifactPath: string,
  bytes: number,
): void {
  if (!budget || budget.seen_artifact_paths.has(artifactPath)) return;
  if (budget.total_artifact_bytes + bytes > budget.max_total_artifact_bytes)
    throw new Error("observation_input_freeze_total_size_limit");
  budget.seen_artifact_paths.add(artifactPath);
  budget.total_artifact_bytes += bytes;
}

function accountForArtifact(
  budget: JsonPointerExactBudget | undefined,
  artifactPath: string,
  bytes: number,
): void {
  if (!budget || budget.seen_artifact_paths.has(artifactPath)) return;
  if (
    budget.total_artifact_bytes + bytes >
    JSON_POINTER_EXACT_LIMITS.max_total_artifact_bytes
  )
    throw new Error("observation_artifact_total_size_limit");
  budget.seen_artifact_paths.add(artifactPath);
  budget.total_artifact_bytes += bytes;
}

function freezeManifestMembership(
  value: StaticObservationManifestMembership,
): StaticObservationManifestMembership {
  return Object.freeze({ ...value });
}

function freezeFileIdentity(
  value: StaticObservationFileIdentity,
): StaticObservationFileIdentity {
  return Object.freeze({ ...value });
}

function freezeError(
  code: StaticObservationFreezeErrorCode,
  artifactPath: string,
  causeCode: string | null = null,
): StaticObservationFreezeError {
  return new StaticObservationFreezeError(code, artifactPath, causeCode);
}

function openFailureCode(error: unknown): StaticObservationFreezeErrorCode {
  return nodeErrorCode(error) === "ENOENT"
    ? "static_observation_not_in_pre_run_snapshot"
    : nodeErrorCode(error) === "ELOOP"
      ? "static_observation_symlink_not_allowed"
      : "static_observation_not_regular_file";
}

function freezeCause(error: unknown): string {
  if (error instanceof StaticObservationFreezeError)
    return error.cause_code ?? error.code;
  return nodeErrorCode(error);
}

function nodeErrorCode(error: unknown): string {
  return (
    (error as NodeJS.ErrnoException | undefined)?.code ??
    (error instanceof Error ? error.message : String(error))
  );
}
