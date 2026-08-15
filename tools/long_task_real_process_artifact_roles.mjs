import path from "node:path";

const rootRoles = new Map([
  ["frozen-config.json", "frozen_config"],
  ["environment.json", "environment"],
  ["aggregate.json", "aggregate"],
  ["formal-evidence-index.json", "formal_evidence_index"],
]);

const formalRoles = new Map([
  ["event.json", "raw_event"],
  ["output.bin", "scenario_output"],
  ["stdout.log", "formal_stdout"],
  ["stderr.log", "formal_stderr"],
  ["human.json", "human_interaction_trace"],
  ["process-accounting.json", "process_accounting"],
  ["storage-ledger.json", "storage_ledger"],
  ["state-payload.bin", "state_payload"],
  ["provider-event.json", "provider_event"],
  ["raw-prompt.bin", "raw_prompt"],
  ["candidate-observation.json", "candidate_observation"],
]);

const lifecycleRoles = new Map([
  ["setup.json", "setup_record"],
  ["run.json", "run_record"],
  ["executor-options.json", "executor_options"],
  ["commands.ndjson", "command_index"],
  ["case-result.json", "case_result"],
  ["recovery-result.json", "recovery_result"],
]);

export function realProcessArtifactRole(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const rootRole = rootRoles.get(normalized);
  if (rootRole) return rootRole;
  if (normalized.startsWith("inputs/formal-evidence-precollection/"))
    return "precollection_input";
  if (normalized.startsWith("inputs/")) return "frozen_input";
  const name = path.posix.basename(normalized);
  if (normalized.startsWith("formal-evidence/")) {
    const formalRole = formalRoles.get(name);
    if (formalRole) return formalRole;
    throw new Error(
      `real_process_roi_formal_artifact_unexpected:${normalized}`,
    );
  }
  const lifecycleRole = lifecycleRoles.get(name);
  if (lifecycleRole) return lifecycleRole;
  if (name === "command.json" || name.endsWith(".command.json"))
    return "command_record";
  if (name.endsWith(".stdout.log")) return "stdout";
  if (name.endsWith(".stderr.log")) return "stderr";
  if (name.endsWith(".tgz")) return "package_tarball";
  throw new Error(`real_process_roi_artifact_role_unexpected:${normalized}`);
}

function normalizeRelativePath(relative) {
  if (
    typeof relative !== "string" ||
    relative.length === 0 ||
    relative.includes("\\") ||
    path.posix.isAbsolute(relative) ||
    relative
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  )
    throw new Error(`real_process_roi_artifact_path:${relative}`);
  return relative;
}
