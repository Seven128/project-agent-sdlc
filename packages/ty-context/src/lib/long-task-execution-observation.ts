import { chmod, copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type {
  CheckRunnerExecutionContextV2,
  CompiledCheckV2,
  CompiledObservationAuthorityV2,
  PackageObservationValueV2,
  RawCommandExecutionV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import { createJsonPointerExactBudget } from "./long-task-json-pointer-observation.js";
import { matchesRepoPattern } from "./long-task-paths.js";
import {
  StaticObservationFreezeError,
  createObservationInputFreezeBudget,
  freezeObservationInputFile,
  freezeStaticObservationCarrier,
  type FrozenObservationInputFile,
  type VerifiedObservationInputFile,
  type VerifiedStaticObservationCarrier,
} from "./long-task-static-observation-freeze.js";

const PROCESS_INPUT_FREEZE_LIMITS = Object.freeze({
  max_artifacts: 4_096,
  max_file_bytes: 268_435_456,
  max_total_artifact_bytes: 536_870_912,
});

type PackageObservationAuthority = CompiledObservationAuthorityV2 & {
  authority: "package_static_json_exact" | "package_process_json_exact";
};

interface AuthorityCarrierState {
  check: CompiledCheckV2;
  authority: PackageObservationAuthority;
  artifact_paths: string[];
  reason: string | null;
}

interface ObservationCarrierGroup {
  artifact_path: string;
  authority_states: AuthorityCarrierState[];
  frozen: FrozenObservationInputFile | null;
}

export interface PreparedExecutionObservationGroupV2 {
  readonly execution_root: string;
  readonly runner_context: CheckRunnerExecutionContextV2;
  finalize(raw: RawCommandExecutionV2): Promise<RawCommandExecutionV2>;
  dispose(): Promise<void>;
}

function createProcessInputFreezeBudget(): ReturnType<
  typeof createObservationInputFreezeBudget
> {
  return createObservationInputFreezeBudget({
    max_artifacts: PROCESS_INPUT_FREEZE_LIMITS.max_artifacts,
    max_total_artifact_bytes:
      PROCESS_INPUT_FREEZE_LIMITS.max_total_artifact_bytes,
  });
}

/**
 * Freezes every selected Raw Execution group's observation inputs before the
 * caller is allowed to start any runner. Keeping this as one owner prevents a
 * prior execution from priming a later group's supposedly pre-run carrier.
 */
export async function prepareExecutionObservationUniverse(input: {
  groups: readonly (readonly CompiledCheckV2[])[];
  snapshot_root: string;
  workspace_manifest: WorkspaceManifestV2;
  protected_authority_paths?: readonly string[];
}): Promise<PreparedExecutionObservationGroupV2[]> {
  const prepared: PreparedExecutionObservationGroupV2[] = [];
  const processInputBudget = createProcessInputFreezeBudget();
  for (const checks of input.groups)
    prepared.push(
      await prepareExecutionObservationGroupWithBudget({
        checks,
        snapshot_root: input.snapshot_root,
        workspace_manifest: input.workspace_manifest,
        protected_authority_paths: input.protected_authority_paths,
        process_input_budget: processInputBudget,
      }),
    );
  return prepared;
}

export async function prepareExecutionObservationGroup(input: {
  checks: readonly CompiledCheckV2[];
  snapshot_root: string;
  workspace_manifest: WorkspaceManifestV2;
  protected_authority_paths?: readonly string[];
}): Promise<PreparedExecutionObservationGroupV2> {
  return prepareExecutionObservationGroupWithBudget({
    ...input,
    process_input_budget: createProcessInputFreezeBudget(),
  });
}

async function prepareExecutionObservationGroupWithBudget(input: {
  checks: readonly CompiledCheckV2[];
  snapshot_root: string;
  workspace_manifest: WorkspaceManifestV2;
  protected_authority_paths?: readonly string[];
  process_input_budget: ReturnType<typeof createObservationInputFreezeBudget>;
}): Promise<PreparedExecutionObservationGroupV2> {
  if (!input.checks.length)
    throw new Error("execution_observation_check_group_required");
  const rawIdentity = input.checks[0].raw_execution_identity;
  if (
    input.checks.some((check) => check.raw_execution_identity !== rawIdentity)
  )
    throw new Error("execution_observation_raw_identity_mismatch");

  const states = authorityCarrierStates(input.checks, input.workspace_manifest);
  const groups = observationCarrierGroups(states);
  const exactBudget = createJsonPointerExactBudget();
  const processInputBudget = input.process_input_budget;
  const processExecution = states.some(
    (state) => state.authority.authority === "package_process_json_exact",
  );
  const executionRoot = processExecution
    ? await mkdtemp(path.join(os.tmpdir(), "ty-context-process-snapshot-"))
    : input.snapshot_root;
  if (processExecution)
    await mkdir(
      path.resolve(executionRoot, input.checks[0].runner.resolved_cwd),
      { recursive: true },
    );
  for (const group of groups) {
    if (
      (input.protected_authority_paths ?? []).some((pattern) =>
        matchesRepoPattern(group.artifact_path, pattern),
      )
    ) {
      for (const state of group.authority_states)
        recordAuthorityFailure(
          state,
          "observation_expected_authority_forbidden",
        );
      continue;
    }
    try {
      const includesStaticAuthority = group.authority_states.some(
        (state) => state.authority.authority === "package_static_json_exact",
      );
      const includesProcessAuthority = group.authority_states.some(
        (state) => state.authority.authority === "package_process_json_exact",
      );
      let sourceIdentity:
        FrozenObservationInputFile["pre_run_identity"] | null = null;
      if (processExecution) {
        const sourceFrozen = await freezeObservationInputFile({
          snapshot_root: input.snapshot_root,
          workspace_manifest: input.workspace_manifest,
          artifact_path: group.artifact_path,
          max_file_bytes: PROCESS_INPUT_FREEZE_LIMITS.max_file_bytes,
          budget: processInputBudget,
        });
        try {
          const target = path.resolve(
            executionRoot,
            ...group.artifact_path.split("/"),
          );
          await mkdir(path.dirname(target), { recursive: true });
          await copyFile(
            path.resolve(
              input.snapshot_root,
              ...group.artifact_path.split("/"),
            ),
            target,
          );
          const verifiedSource = await sourceFrozen.verifyPostRun();
          sourceIdentity = verifiedSource.pre_run_identity;
          await chmod(target, sourceIdentity.mode & 0o777);
        } finally {
          sourceFrozen.dispose();
        }
      }
      group.frozen = includesStaticAuthority
        ? await freezeStaticObservationCarrier({
            snapshot_root: executionRoot,
            workspace_manifest: input.workspace_manifest,
            artifact_path: group.artifact_path,
            budget: exactBudget,
            input_freeze_budget: includesProcessAuthority
              ? processInputBudget
              : undefined,
          })
        : await freezeObservationInputFile({
            snapshot_root: executionRoot,
            workspace_manifest: input.workspace_manifest,
            artifact_path: group.artifact_path,
            max_file_bytes: PROCESS_INPUT_FREEZE_LIMITS.max_file_bytes,
            budget: processInputBudget,
          });
      if (
        sourceIdentity &&
        (group.frozen.pre_run_identity.content_sha256 !==
          sourceIdentity.content_sha256 ||
          group.frozen.pre_run_identity.size !== sourceIdentity.size)
      )
        throw new Error("process_observation_input_snapshot_copy_mismatch");
    } catch (error) {
      const reason = observationFailureReason(error);
      for (const state of group.authority_states)
        recordAuthorityFailure(state, reason);
    }
  }

  const processAuthorities = states
    .filter(
      (state) => state.authority.authority === "package_process_json_exact",
    )
    .map((state) => state.authority);
  let disposed = false;
  const dispose = async (): Promise<void> => {
    if (disposed) return;
    disposed = true;
    for (const group of groups) group.frozen?.dispose();
    if (processExecution)
      await rm(executionRoot, { recursive: true, force: true });
  };
  return {
    execution_root: executionRoot,
    runner_context: {
      snapshot_sha256: input.workspace_manifest.snapshot_sha256,
      observation_authorities: processAuthorities,
    },
    finalize: async (
      raw: RawCommandExecutionV2,
    ): Promise<RawCommandExecutionV2> => {
      try {
        const verified = new Map<string, VerifiedObservationInputFile>();
        for (const group of groups) {
          if (!group.frozen) continue;
          try {
            verified.set(
              group.artifact_path,
              await group.frozen.verifyPostRun(),
            );
          } catch (error) {
            const reason = observationFailureReason(error);
            for (const state of group.authority_states)
              recordAuthorityFailure(state, reason);
          }
        }
        return {
          ...raw,
          package_observations: finalizePackageObservations(
            states,
            verified,
            raw.package_observations ?? [],
            exactBudget,
          ),
        };
      } finally {
        await dispose();
      }
    },
    dispose,
  };
}

function authorityCarrierStates(
  checks: readonly CompiledCheckV2[],
  manifest: WorkspaceManifestV2,
): AuthorityCarrierState[] {
  const states: AuthorityCarrierState[] = [];
  for (const check of checks)
    for (const authority of check.observation_authorities ?? []) {
      if (
        authority.authority !== "package_static_json_exact" &&
        authority.authority !== "package_process_json_exact"
      )
        continue;
      const state: AuthorityCarrierState = {
        check,
        authority: authority as PackageObservationAuthority,
        artifact_paths: [],
        reason: null,
      };
      const carrierPatterns = authority.carrier_refs.flatMap(
        (carrier) => carrier.carrier_paths,
      );
      addPatternClosure(state, manifest, carrierPatterns);
      if (authority.authority === "package_process_json_exact") {
        addPatternClosure(state, manifest, check.input_paths);
        addExactManifestPath(state, manifest, check.runner.resolved_target);
        state.artifact_paths.push(
          ...argvAttributedRepositoryFiles(state, manifest),
        );
      }
      state.artifact_paths = [...new Set(state.artifact_paths)].sort();
      if (
        authority.authority === "package_static_json_exact" &&
        state.artifact_paths.length !== 1
      )
        recordAuthorityFailure(state, "static_observation_manifest_invalid");
      states.push(state);
    }
  return states;
}

function addPatternClosure(
  state: AuthorityCarrierState,
  manifest: WorkspaceManifestV2,
  patterns: readonly string[],
): void {
  for (const pattern of new Set(patterns)) {
    let matches: string[];
    try {
      matches = manifest.files
        .filter((file) => matchesRepoPattern(file.path, pattern))
        .map((file) => file.path);
    } catch {
      recordAuthorityFailure(state, "static_observation_manifest_invalid");
      continue;
    }
    if (!matches.length) {
      recordAuthorityFailure(
        state,
        "static_observation_not_in_pre_run_snapshot",
      );
      continue;
    }
    state.artifact_paths.push(...matches);
  }
}

function addExactManifestPath(
  state: AuthorityCarrierState,
  manifest: WorkspaceManifestV2,
  artifactPath: string,
): void {
  const matches = manifest.files.filter((file) => file.path === artifactPath);
  if (matches.length !== 1) {
    recordAuthorityFailure(
      state,
      matches.length
        ? "static_observation_manifest_invalid"
        : "static_observation_not_in_pre_run_snapshot",
    );
    return;
  }
  state.artifact_paths.push(artifactPath);
}

function argvAttributedRepositoryFiles(
  state: AuthorityCarrierState,
  manifest: WorkspaceManifestV2,
): string[] {
  const { authority, check } = state;
  const argv = [
    ...check.runner.executable_argv_prefix,
    ...check.runner.argv,
    ...(authority.runtime_requirements.declared_root_argv ?? []),
  ];
  return manifest.files
    .map((file) => file.path)
    .filter((artifactPath) =>
      argv.some((argument) =>
        argumentReferencesArtifact(
          argument,
          artifactPath,
          check.runner.resolved_cwd,
        ),
      ),
    );
}

function argumentReferencesArtifact(
  argument: string,
  artifactPath: string,
  cwd: string,
): boolean {
  const normalizedArgument = portableArgument(argument);
  const repositoryPath = portableArgument(artifactPath);
  const relativeFromCwd = portableArgument(
    path.posix.relative(cwd === "." ? "" : cwd, artifactPath),
  );
  return [repositoryPath, relativeFromCwd, `./${relativeFromCwd}`].some(
    (candidate) => candidate !== "" && normalizedArgument.includes(candidate),
  );
}

function portableArgument(value: string): string {
  return value.replace(/\\/gu, "/").toLowerCase();
}

function observationCarrierGroups(
  states: readonly AuthorityCarrierState[],
): ObservationCarrierGroup[] {
  const groups = new Map<string, ObservationCarrierGroup>();
  for (const state of states)
    for (const artifactPath of state.artifact_paths) {
      const existing = groups.get(artifactPath);
      if (existing) existing.authority_states.push(state);
      else
        groups.set(artifactPath, {
          artifact_path: artifactPath,
          authority_states: [state],
          frozen: null,
        });
    }
  return [...groups.values()].sort((left, right) =>
    left.artifact_path.localeCompare(right.artifact_path),
  );
}

function finalizePackageObservations(
  states: readonly AuthorityCarrierState[],
  verified: ReadonlyMap<string, VerifiedObservationInputFile>,
  submitted: readonly PackageObservationValueV2[],
  budget: ReturnType<typeof createJsonPointerExactBudget>,
): PackageObservationValueV2[] {
  const processStates = states.filter(
    (state) => state.authority.authority === "package_process_json_exact",
  );
  const observations = submitted.filter((candidate) => {
    const matching = processStates.filter((state) =>
      packageObservationMatchesAuthority(candidate, state.authority),
    );
    return !matching.some((state) => state.reason !== null);
  });

  for (const state of processStates)
    if (state.reason)
      observations.push(failedObservation(state.authority, state.reason));

  for (const state of states.filter(
    (candidate) =>
      candidate.authority.authority === "package_static_json_exact",
  )) {
    if (state.reason) {
      observations.push(failedObservation(state.authority, state.reason));
      continue;
    }
    const carrier = verified.get(state.artifact_paths[0]);
    if (!carrier || !isVerifiedStaticObservationCarrier(carrier)) {
      observations.push(
        failedObservation(
          state.authority,
          "static_observation_not_in_pre_run_snapshot",
        ),
      );
      continue;
    }
    try {
      const extracted = carrier.extractJsonPointerExactValue({
        locator: {
          kind: "json_pointer",
          value: state.authority.locator_policy.value,
        },
        sensitivity: "plain",
        budget,
      });
      observations.push({
        authority: "package_static_json_exact",
        observation_identity: state.authority.observation_identity,
        assertion_ref: state.authority.assertion_ref,
        obligation_ref: state.authority.obligation_ref,
        method: state.authority.method,
        raw_value: extracted.raw_value,
        observation: extracted.observation,
        reason: null,
      });
    } catch (error) {
      observations.push(
        failedObservation(state.authority, observationFailureReason(error)),
      );
    }
  }
  return observations;
}

function isVerifiedStaticObservationCarrier(
  value: VerifiedObservationInputFile,
): value is VerifiedStaticObservationCarrier {
  return "extractJsonPointerExactValue" in value;
}

function packageObservationMatchesAuthority(
  observation: PackageObservationValueV2,
  authority: CompiledObservationAuthorityV2,
): boolean {
  return (
    observation.authority === authority.authority &&
    observation.observation_identity === authority.observation_identity &&
    observation.assertion_ref === authority.assertion_ref &&
    observation.obligation_ref === authority.obligation_ref &&
    observation.method === authority.method
  );
}

function failedObservation(
  authority: PackageObservationAuthority,
  reason: string,
): PackageObservationValueV2 {
  return {
    authority: authority.authority,
    observation_identity: authority.observation_identity,
    assertion_ref: authority.assertion_ref,
    obligation_ref: authority.obligation_ref,
    method: authority.method,
    raw_value: undefined,
    observation: null,
    reason,
  };
}

function recordAuthorityFailure(
  state: AuthorityCarrierState,
  reason: string,
): void {
  if (state.reason) return;
  state.reason =
    state.authority.authority === "package_process_json_exact"
      ? processInputFailureReason(reason)
      : reason;
}

function processInputFailureReason(reason: string): string {
  if (reason === "observation_expected_authority_forbidden") return reason;
  if (reason.startsWith("process_observation_input_")) return reason;
  if (reason.startsWith("static_observation_"))
    return `process_observation_input_${reason.slice("static_observation_".length)}`;
  return "process_observation_input_freeze_invalid";
}

function observationFailureReason(error: unknown): string {
  if (error instanceof StaticObservationFreezeError) return error.code;
  return error instanceof Error ? error.message : String(error);
}
