import {
  appendContextManifestBlock,
  type ManifestContextBlockInput,
} from "../context-mutation/manifest-lossless-patch.js";
import {
  captureMutationFileState,
  mutationFileStateFromBytes,
  mutationTemporaryPath,
} from "../context-mutation/mutation-cas.js";
import { executeContextMutationPlan } from "../context-mutation/mutation-commit.js";
import {
  assertMutationCatalogValid,
  assertNoUnfinishedContextMutation,
  decodeMutationUtf8,
  loadMutationCatalog,
  mutationCatalogFailure,
  mutationIoFailure,
  mutationMessage,
  mutationStateBytes,
  sameMutationArray,
} from "../context-mutation/mutation-command-support.js";
import {
  contextCatalogIdentity,
  contextFootprintState,
  stagedFileOverrides,
} from "../context-mutation/mutation-staged-fs.js";
import type { ContextMutationPlan } from "../context-mutation/mutation-types.js";
import { canonicalValueJson, sha256Hex } from "../strict-codec.js";
import { CliCommandError } from "../cli-exit.js";
import { validateContextRegistrationContent } from "../validators.js";
import { normalizeContextRegisterInput } from "./context-register-input.js";
import {
  assertRegistrationTarget,
  assertStagedRegistration,
  readContextContent,
  renderAppendDiff,
} from "./context-register-support.js";
import type {
  ContextRegisterInput,
  ContextRegisterResult,
} from "./context-register-types.js";

const MANIFEST_PATH = "project_context/context.toml";

export async function registerContext(
  input: ContextRegisterInput,
): Promise<ContextRegisterResult> {
  const planned = await planContextRegistration(input);
  if (!input.apply) return planned.result;
  try {
    await executeContextMutationPlan(input.project_root, planned.plan);
  } catch (error) {
    if (error instanceof CliCommandError) throw error;
    mutationIoFailure(
      `context register transaction stopped: ${mutationMessage(error)}; inspect recovery with ty-context context transaction status`,
      error,
    );
  }
  return {
    ...planned.result,
    applied: true,
    transaction: {
      ...planned.result.transaction,
      state: "committed",
    },
  };
}

export interface PlannedContextRegistration {
  plan: ContextMutationPlan;
  result: ContextRegisterResult;
}

export async function planContextRegistration(
  input: ContextRegisterInput,
): Promise<PlannedContextRegistration> {
  const normalized = normalizeContextRegisterInput(input);
  await assertNoUnfinishedContextMutation(input.project_root);
  const beforeCatalog = await loadMutationCatalog(input.project_root);
  assertMutationCatalogValid(
    beforeCatalog,
    "context register requires a valid Catalog",
  );
  const registrationFile = assertRegistrationTarget(
    beforeCatalog,
    normalized.path,
  );
  const manifestBefore = await captureMutationFileState(
    input.project_root,
    MANIFEST_PATH,
  );
  if (!manifestBefore.exists || manifestBefore.mode === null)
    mutationCatalogFailure("project_context/context.toml is missing");
  const manifestText = decodeMutationUtf8(
    mutationStateBytes(manifestBefore),
    MANIFEST_PATH,
  );
  if (manifestText !== beforeCatalog.manifest_content)
    mutationIoFailure("Context Catalog changed while planning register");
  const contextContent = await readContextContent(
    input.project_root,
    registrationFile,
  );
  const recoveryErrors = validateContextRegistrationContent(
    input.project_root,
    normalized.path,
    contextContent,
    normalized.role,
    normalized.read_policy,
  );
  if (recoveryErrors.length)
    mutationCatalogFailure(
      `Context is not recoverable for registration: ${recoveryErrors.join("; ")}`,
    );
  const manifestPatchInput: ManifestContextBlockInput = {
    path: normalized.path,
    role: normalized.role,
    read_policy: normalized.read_policy,
    read_when: normalized.read_when,
    triggers: normalized.triggers,
    default_children: normalized.default_children,
  };
  let patch;
  try {
    patch = appendContextManifestBlock(manifestText, manifestPatchInput);
  } catch (error) {
    mutationCatalogFailure(
      `Manifest cannot be patched losslessly: ${mutationMessage(error)}`,
      error,
    );
  }
  const afterBytes = Buffer.from(patch.content, "utf8");
  const overrides = stagedFileOverrides([[MANIFEST_PATH, afterBytes]]);
  const afterCatalog = await loadMutationCatalog(input.project_root, overrides);
  assertMutationCatalogValid(
    afterCatalog,
    "staged Context registration is invalid",
  );
  assertStagedRegistration(afterCatalog, normalized);
  const beforeFootprint = contextFootprintState(beforeCatalog);
  const afterFootprint = contextFootprintState(afterCatalog);
  const afterState = mutationFileStateFromBytes(
    afterBytes,
    manifestBefore.mode,
  );
  const operationData = {
    kind: "register" as const,
    context_path: normalized.path,
    role: normalized.role,
    read_policy: normalized.read_policy,
    expected_default_paths: afterFootprint.paths,
    expected_default_bytes: afterFootprint.bytes,
  };
  const catalogBeforeIdentity = contextCatalogIdentity(beforeCatalog);
  const catalogAfterIdentity = contextCatalogIdentity(afterCatalog);
  const transactionId = sha256Hex(
    canonicalValueJson({
      operation: "register",
      catalog_before_identity: catalogBeforeIdentity,
      catalog_after_identity: catalogAfterIdentity,
      file: {
        path: MANIFEST_PATH,
        before_sha256: manifestBefore.sha256,
        after_sha256: afterState.sha256,
        mode: manifestBefore.mode,
      },
      operation_data: operationData,
    }),
  );
  const plan: ContextMutationPlan = {
    transaction_id: transactionId,
    operation: "register",
    catalog_before_identity: catalogBeforeIdentity,
    catalog_after_identity: catalogAfterIdentity,
    directories: [],
    files: [
      {
        path: MANIFEST_PATH,
        physical_path: MANIFEST_PATH,
        before: manifestBefore,
        after: afterState,
        commit_order: 0,
        temporary_path: mutationTemporaryPath(MANIFEST_PATH, transactionId, 0),
        temporary_state: null,
        published_before: null,
        published_after: null,
      },
    ],
    operation_data: operationData,
  };
  return {
    plan,
    result: {
      schema_version: 1,
      operation: "register",
      applied: false,
      path: normalized.path,
      role: normalized.role,
      read_policy: normalized.read_policy,
      manifest: {
        path: MANIFEST_PATH,
        before_sha256: manifestBefore.sha256!,
        after_sha256: afterState.sha256!,
        before_bytes: mutationStateBytes(manifestBefore).length,
        after_bytes: afterBytes.length,
        bytes_delta:
          afterBytes.length - mutationStateBytes(manifestBefore).length,
        diff: renderAppendDiff(MANIFEST_PATH, patch.inserted_block),
      },
      default_footprint: {
        changed:
          beforeFootprint.bytes !== afterFootprint.bytes ||
          !sameMutationArray(beforeFootprint.paths, afterFootprint.paths),
        before: beforeFootprint,
        after: afterFootprint,
        added: afterFootprint.paths.filter(
          (file) => !beforeFootprint.paths.includes(file),
        ),
        removed: beforeFootprint.paths.filter(
          (file) => !afterFootprint.paths.includes(file),
        ),
      },
      catalog: {
        before_identity: catalogBeforeIdentity,
        after_identity: catalogAfterIdentity,
      },
      diagnostics: afterCatalog.diagnostics
        .filter((entry) => entry.severity === "warning")
        .map((entry) => entry.message),
      transaction: {
        id: transactionId,
        state: "dry-run",
        journal_present: false,
      },
    },
  };
}
