import type {
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  CompiledOutcomeV2,
  ContextAuthoritySnapshotV2,
  DeliveryContractV2,
  InitialTaskBaseV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { validateActualRiskSurfaces } from "./long-task-risk-surfaces.js";
import {
  changedWorkspacePaths,
  changedWorkspacePathsFromHead,
  currentGitTree,
} from "./long-task-workspace.js";
import {
  assertWorkspaceScope,
  classifyWorkspaceScope,
  firstLockManagedWorkspacePaths,
  protectedWorkspacePaths,
} from "./long-task-workspace-scope.js";

interface CompileWorkspaceGuardOptions {
  live_gate?: boolean;
  initial_task_base?: InitialTaskBaseV2;
  previous_authority?: CompiledDeliveryContractV2 | null;
}

interface CompileWorkspaceGuardInput {
  repository: string;
  workdir: string;
  options: CompileWorkspaceGuardOptions;
  contract: DeliveryContractV2;
  contract_files: Record<string, string>;
  source_hashes: Record<string, string>;
  context_snapshot: ContextAuthoritySnapshotV2;
  workspace: WorkspaceManifestV2;
  global_checks: CompiledCheckV2[];
  outcomes: CompiledOutcomeV2[];
}

interface CompileWorkspaceGuardResult {
  previous: CompiledDeliveryContractV2 | null;
  initial_task_base: InitialTaskBaseV2;
}

export async function prepareCompileWorkspaceGuard(
  input: CompileWorkspaceGuardInput,
): Promise<CompileWorkspaceGuardResult> {
  const previous = input.options.live_gate
    ? null
    : (input.options.previous_authority ?? null);
  const existingInitialTaskBase =
    input.options.initial_task_base ?? previous?.initial_task_base ?? null;
  const changedPaths = existingInitialTaskBase
    ? changedWorkspacePaths(
        existingInitialTaskBase.workspace_manifest,
        input.workspace,
      )
    : await changedWorkspacePathsFromHead(input.repository, input.workdir);
  const firstLockManagedPaths = existingInitialTaskBase
    ? []
    : await firstLockManagedWorkspacePaths(input.repository, changedPaths);
  assertWorkspaceScope(
    classifyWorkspaceScope(
      input.contract,
      changedPaths,
      protectedWorkspacePaths({
        contract_files: input.contract_files,
        source_hashes: input.source_hashes,
        context_hashes: input.context_snapshot.sha256,
        checks: [
          ...input.global_checks,
          ...input.outcomes.flatMap((outcome) => outcome.acceptance.checks),
        ],
        additional_files: firstLockManagedPaths,
      }),
    ),
  );
  const initialTaskBase = existingInitialTaskBase ?? {
    git_commit: input.workspace.git_head,
    git_tree: await currentGitTree(input.repository),
    workspace_manifest: input.workspace,
  };
  await validateActualRiskSurfaces(
    input.repository,
    changedPaths,
    input.contract,
  );
  return { previous, initial_task_base: initialTaskBase };
}
