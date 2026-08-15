import { assert } from "./long_task_real_process_roi_scoring.mjs";

export async function consumeFormalExecutionArtifact(
  runArtifactIndex,
  consumedArtifacts,
  reference,
  role,
  maximumBytes,
) {
  assert(
    typeof reference === "string" &&
      reference.startsWith("formal-evidence/") &&
      !consumedArtifacts.has(reference),
    `formal_execution_artifact_ref:${reference}`,
  );
  const bytes = await runArtifactIndex.read(reference, role, maximumBytes);
  consumedArtifacts.add(reference);
  return bytes;
}
