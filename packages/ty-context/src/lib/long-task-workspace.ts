import { realpath } from "node:fs/promises";
import path from "node:path";
import { assertProtectedRepositoryDirectory as assertProtectedDirectory } from "./repository-path-safety.js";

export { resolveInsideRepository } from "./repository-path-safety.js";
export {
  currentGitState,
  currentGitTree,
  gitCommonDir,
  gitConfigGet,
  gitConfigSet,
  gitConfigUnset,
  gitPath,
  repoRelative,
  repositoryRoot,
} from "./long-task-git.js";
export {
  captureWorkspaceFingerprint,
  captureWorkspaceManifest,
  changedWorkspacePaths,
  changedWorkspacePathsFromHead,
} from "./long-task-workspace-manifest.js";
export { createWorkspaceSnapshot } from "./long-task-workspace-snapshot.js";
export type { WorkspaceSnapshotV2 } from "./long-task-workspace-snapshot.js";

export async function canonicalExistingLongTaskWorkdir(
  repository: string,
  workdirInput: string,
): Promise<string> {
  const [canonicalRepository, physical] = await Promise.all([
    realpath(path.resolve(repository)),
    realpath(path.resolve(workdirInput)),
  ]);
  return assertProtectedDirectory(
    canonicalRepository,
    physical,
    "long_task_workdir",
  );
}
