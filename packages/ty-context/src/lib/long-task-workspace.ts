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
