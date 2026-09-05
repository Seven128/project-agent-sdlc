import { lstat } from "node:fs/promises";
import path from "node:path";
import { gitCommonDir, gitConfigGet, gitConfigUnset } from "./git.js";
import { sha256Hex } from "./strict-codec.js";
import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import { removeMaintenanceFile } from "./maintenance-write.js";
import type { MutationFileState } from "./context-mutation/mutation-types.js";

export interface RetirementBinding {
  common: string;
  record: string;
  marker_key: string;
  marker: string | null;
  before: MutationFileState;
}
export async function inspectRetirementBinding(
  repository: string,
): Promise<RetirementBinding | null> {
  let common: string;
  try {
    common = await gitCommonDir(repository);
  } catch (error) {
    if (String(error).includes("not a git repository")) return null;
    throw error;
  }
  const resolved = path.resolve(repository).replaceAll("\\", "/");
  const identity =
    "wt-" +
    sha256Hex(process.platform === "win32" ? resolved.toLowerCase() : resolved);
  const record = `ty-context/long-task/worktrees/${identity}/active.json`;
  try {
    await lstat(path.join(common, record + ".lock"));
    throw new Error(
      "retirement_blocked: old operation lock exists; settle it with the compatible old lifecycle. A lock does not establish host session state.",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const before = await captureMutationFileState(common, record);
  const marker_key = `ty-context.longTask.${identity}`;
  const marker = await gitConfigGet(repository, marker_key);
  if (before.exists) {
    const active = JSON.parse(
      Buffer.from(before.bytes_base64!, "base64").toString("utf8"),
    );
    const normalize = (value: string) =>
      process.platform === "win32"
        ? path.resolve(value).toLowerCase()
        : path.resolve(value);
    if (
      active.schema_version !== "active-long-task-authority-v3" ||
      active.worktree_identity !== identity ||
      typeof active.repository_root !== "string" ||
      normalize(active.repository_root) !== normalize(repository)
    )
      throw new Error(
        `retirement_blocked: unsupported or mismatched old active record ${record}; resolve with compatible old tool`,
      );
  }
  return { common, record, marker_key, marker, before };
}
export async function retireOwnBinding(
  repository: string,
  expected: RetirementBinding | null,
): Promise<void> {
  if (!expected) return;
  const current = await inspectRetirementBinding(repository);
  if (
    !current ||
    current.common !== expected.common ||
    current.record !== expected.record ||
    (current.marker !== null && current.marker !== expected.marker) ||
    (current.before.exists && current.before.sha256 !== expected.before.sha256)
  )
    throw new Error(
      "retirement_blocked: current worktree binding changed; do not touch another worktree or changed record",
    );
  if (current.before.exists)
    await removeMaintenanceFile(current.common, current.record, current.before);
  if (current.marker !== null)
    await gitConfigUnset(repository, current.marker_key);
}
