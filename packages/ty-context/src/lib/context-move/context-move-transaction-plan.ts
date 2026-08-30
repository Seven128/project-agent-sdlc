import {
  absentMutationFileState,
  captureMutationFileState,
  mutationFileStateFromBytes,
  mutationTemporaryPath,
} from "../context-mutation/mutation-cas.js";
import {
  contextCatalogIdentity,
  contextFootprintState,
} from "../context-mutation/mutation-staged-fs.js";
import type {
  ContextMutationPlan,
  MutationFileChange,
  MutationFileState,
} from "../context-mutation/mutation-types.js";
import type {
  CatalogRegisteredContext,
  ContextCatalog,
} from "../context-catalog/catalog-types.js";
import { canonicalValueJson, sha256Hex } from "../strict-codec.js";
import type { ContextMoveFileProjection } from "./context-move-types.js";

const MANIFEST_PATH = "project_context/context.toml";

export async function buildContextMoveTransactionPlan(input: {
  repository: string;
  owner: CatalogRegisteredContext;
  normalized: { from_path: string; to_path: string };
  directories: string[];
  source_before: MutationFileState;
  manifest_before: MutationFileState;
  manifest_bytes: Buffer;
  target_bytes: Buffer;
  updated_files: ReadonlyMap<string, string>;
  before_catalog: ContextCatalog;
  after_catalog: ContextCatalog;
  reference_issues: string[];
}): Promise<{
  plan: ContextMutationPlan;
  projections: ContextMoveFileProjection[];
}> {
  const raw: Array<
    Omit<
      MutationFileChange,
      | "commit_order"
      | "temporary_path"
      | "temporary_state"
      | "published_before"
      | "published_after"
    >
  > = [];
  raw.push({
    path: input.normalized.to_path,
    before: absentMutationFileState(),
    after: mutationFileStateFromBytes(
      input.target_bytes,
      input.source_before.mode!,
    ),
  });
  for (const [file, content] of [...input.updated_files].sort()) {
    const before = await captureMutationFileState(input.repository, file);
    raw.push({
      path: file,
      before,
      after: mutationFileStateFromBytes(
        Buffer.from(content, "utf8"),
        before.mode!,
      ),
    });
  }
  raw.push({
    path: MANIFEST_PATH,
    before: input.manifest_before,
    after: mutationFileStateFromBytes(
      input.manifest_bytes,
      input.manifest_before.mode!,
    ),
  });
  raw.push({
    path: input.normalized.from_path,
    before: input.source_before,
    after: absentMutationFileState(),
  });
  const afterFootprint = contextFootprintState(input.after_catalog);
  const operationData = {
    kind: "move" as const,
    ...input.normalized,
    owner_source: input.owner.source,
    role: input.owner.role,
    read_policy: input.owner.read_policy ?? null,
    expected_reference_issues: input.reference_issues,
    expected_default_paths: afterFootprint.paths,
    expected_default_bytes: afterFootprint.bytes,
  };
  const beforeIdentity = contextCatalogIdentity(input.before_catalog);
  const afterIdentity = contextCatalogIdentity(input.after_catalog);
  const transactionId = sha256Hex(
    canonicalValueJson({
      operation: "move",
      catalog_before_identity: beforeIdentity,
      catalog_after_identity: afterIdentity,
      directories: input.directories,
      files: raw.map((entry, commit_order) => ({
        path: entry.path,
        before_sha256: entry.before.sha256,
        after_sha256: entry.after.sha256,
        commit_order,
      })),
      operation_data: operationData,
    }),
  );
  const files = raw.map((entry, commitOrder) => ({
    ...entry,
    commit_order: commitOrder,
    temporary_path: mutationTemporaryPath(
      entry.path,
      transactionId,
      commitOrder,
    ),
    temporary_state: null,
    published_before: null,
    published_after: null,
  }));
  return {
    plan: {
      transaction_id: transactionId,
      operation: "move",
      catalog_before_identity: beforeIdentity,
      catalog_after_identity: afterIdentity,
      directories: input.directories.map((directory) => ({
        path: directory,
        before_exists: false as const,
      })),
      files,
      operation_data: operationData,
    },
    projections: files.map(fileProjection),
  };
}

function fileProjection(change: MutationFileChange): ContextMoveFileProjection {
  return {
    path: change.path,
    action: !change.before.exists
      ? "create"
      : !change.after.exists
        ? "delete"
        : "update",
    before_sha256: change.before.sha256,
    after_sha256: change.after.sha256,
    before_bytes: byteLength(change.before),
    after_bytes: byteLength(change.after),
  };
}

function byteLength(state: MutationFileState): number {
  return state.bytes_base64 === null
    ? 0
    : Buffer.from(state.bytes_base64, "base64").length;
}
