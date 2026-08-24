import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import type {
  CompiledDeliveryContractV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { parseExternalConfirmationRecordV1 } from "./long-task-external-confirmation-shape.js";
import type {
  ExternalConfirmationCandidateV1,
  ExternalConfirmationRecordV1,
} from "./long-task-external-confirmation-types.js";
import {
  assertVerifierAuthorityCurrent,
  deliveryCompileFreshness,
} from "./long-task-freshness.js";
import { loadSemanticFactManifest } from "./semantic-fact-source-parser.js";
import type { SemanticFactManifestV1 } from "./semantic-fact-types.js";
import {
  assertMatchingActiveBinding,
  loadActiveLongTaskAuthority,
} from "./long-task-state.js";
import {
  captureWorkspaceManifest,
  currentGitState,
  repositoryRoot,
} from "./long-task-workspace.js";

const MAX_SUBMITTED_RECORD_BYTES = 16 * 1024 * 1024;

export interface ExternalAuthorityContextV1 {
  repository: string;
  workdir: string;
  compiled: CompiledDeliveryContractV2;
  manifest: WorkspaceManifestV2;
  candidate: ExternalConfirmationCandidateV1;
  candidate_dirty: string[];
  semantic_manifest: SemanticFactManifestV1;
}

export async function loadExternalAuthorityContext(
  workdirInput: string,
  requireCleanCandidate: boolean,
): Promise<ExternalAuthorityContextV1> {
  const repository = await repositoryRoot(process.cwd());
  const workdir = path.resolve(workdirInput);
  const active = (
    await loadActiveLongTaskAuthority(repository, { migrate_legacy: true })
  ).authority;
  if (!active) throw new Error("active_task_missing");
  if (active.workdir !== workdir)
    throw new Error("active_task_workdir_mismatch");
  const compiled = active.authority_snapshot;
  await assertMatchingActiveBinding(compiled);
  await assertVerifierAuthorityCurrent(repository, active.verifier_identity);
  const stale = await deliveryCompileFreshness(compiled);
  if (stale.length)
    throw new Error(`external_confirmation_authority_stale:${stale.join(",")}`);
  const git = await currentGitState(repository);
  if (requireCleanCandidate && git.dirty.length)
    throw new Error(
      `external_confirmation_requires_clean_candidate_commit:${git.dirty.join(",")}`,
    );
  const manifest = await captureWorkspaceManifest(repository, workdir);
  return {
    repository,
    workdir,
    compiled,
    manifest,
    candidate: {
      git_head: git.head,
      git_tree: git.tree,
      snapshot_sha256: manifest.snapshot_sha256,
    },
    candidate_dirty: git.dirty,
    semantic_manifest: (
      await loadSemanticFactManifest(repository, compiled.task.source_paths)
    ).manifest,
  };
}

export async function readSubmittedExternalConfirmationRecord(
  recordPathInput: string,
): Promise<ExternalConfirmationRecordV1> {
  const file = path.resolve(recordPathInput);
  const status = await lstat(file);
  if (status.isSymbolicLink())
    throw new Error(`external_confirmation_record_symlink_not_allowed:${file}`);
  if (!status.isFile())
    throw new Error(`external_confirmation_record_not_regular_file:${file}`);
  if (typeof status.nlink === "number" && status.nlink > 1)
    throw new Error(
      `external_confirmation_record_hardlink_not_allowed:${file}`,
    );
  if (status.size > MAX_SUBMITTED_RECORD_BYTES)
    throw new Error(`external_confirmation_record_too_large:${status.size}`);
  return parseExternalConfirmationRecordV1(
    JSON.parse(await readFile(file, "utf8")) as unknown,
  );
}
