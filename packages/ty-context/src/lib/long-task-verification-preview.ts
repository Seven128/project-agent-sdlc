import path from "node:path";
import type {
  CompiledCheckV2,
  CompiledDeliveryContractV2,
} from "./long-task-delivery-types.js";
import { loadActiveLongTaskAuthority } from "./long-task-state.js";
import { selectChecks } from "./long-task-verifier-v2.js";
import { repositoryRoot } from "./long-task-workspace.js";

export interface VerificationExecutionPreviewV1 {
  schema_version: "long-task-verification-preview-v1";
  compiled_identity: string;
  authority_revision: number;
  acceptance_authorized: false;
  executes_checks: false;
  writes_progress: false;
  selected_outcome: string | null;
  selected_check: string | null;
  main_raw_executions: MainRawExecutionPreviewV1[];
  counterfactual_executions: CounterfactualExecutionPreviewV1[];
  summary: {
    selected_checks: number;
    unique_main_runner_invocations: number;
    counterfactual_runner_invocation_upper_bound: number;
    declared_runner_invocation_upper_bound: number;
    declared_command_attempt_upper_bound: number;
  };
  limitations: string[];
}

interface MainRawExecutionPreviewV1 {
  raw_execution_identity: string;
  check_refs: string[];
  execution_target: CompiledCheckV2["execution_target"];
  execution_target_definition: CompiledCheckV2["execution_target_definition"];
  runner: RunnerPreviewV1;
  environment_requirements: CompiledCheckV2["environment_requirements"];
}

interface CounterfactualExecutionPreviewV1 {
  scope: "global" | "outcome";
  outcome_key: string | null;
  control_key: string;
  check_ref: string;
  raw_execution_identity: string;
  mutation:
    | { type: "remove_paths"; paths: string[] }
    | { type: "replace_file"; path: string; fixture_path: string }
    | {
        type: "replace_json_value";
        path: string;
        pointer: string;
        value: unknown;
      }
    | {
        type: "replace_text";
        path: string;
        match: string;
        replacement: string;
      };
  runner: RunnerPreviewV1;
}

type RunnerPreviewV1 = Pick<
  CompiledCheckV2["runner"],
  | "type"
  | "target"
  | "argv"
  | "cwd"
  | "timeout_ms"
  | "effect"
  | "retry_policy"
  | "idempotent"
  | "resolved_cwd"
  | "resolved_target"
  | "definition_sha256"
>;

export async function previewVerificationExecution(
  workdirInput: string,
  selection: { outcome?: string; check?: string } = {},
): Promise<VerificationExecutionPreviewV1> {
  const repository = await repositoryRoot(process.cwd());
  const active = (
    await loadActiveLongTaskAuthority(repository, { migrate_legacy: true })
  ).authority;
  if (!active) throw new Error("active_task_missing");
  if (active.workdir !== path.resolve(workdirInput))
    throw new Error("active_task_workdir_mismatch");
  return projectVerificationExecutionPreview(
    active.authority_snapshot,
    active.authority_revision,
    selection,
  );
}

export function projectVerificationExecutionPreview(
  compiled: CompiledDeliveryContractV2,
  authorityRevision: number,
  selection: { outcome?: string; check?: string } = {},
): VerificationExecutionPreviewV1 {
  const selected = selectChecks(compiled, selection);
  const mainRawExecutions = mainExecutionPreviews(selected);
  const counterfactualExecutions = counterfactualExecutionPreviews(
    compiled,
    selected,
  );
  const declaredRunnerInvocationUpperBound =
    mainRawExecutions.length + counterfactualExecutions.length;
  return {
    schema_version: "long-task-verification-preview-v1",
    compiled_identity: compiled.compiled_identity,
    authority_revision: authorityRevision,
    acceptance_authorized: false,
    executes_checks: false,
    writes_progress: false,
    selected_outcome: selection.outcome ?? null,
    selected_check: selection.check ?? null,
    main_raw_executions: mainRawExecutions,
    counterfactual_executions: counterfactualExecutions,
    summary: {
      selected_checks: selected.length,
      unique_main_runner_invocations: mainRawExecutions.length,
      counterfactual_runner_invocation_upper_bound:
        counterfactualExecutions.length,
      declared_runner_invocation_upper_bound:
        declaredRunnerInvocationUpperBound,
      declared_command_attempt_upper_bound: [
        ...mainRawExecutions.map((entry) => entry.runner),
        ...counterfactualExecutions.map((entry) => entry.runner),
      ].reduce((total, runner) => total + maximumAttempts(runner), 0),
    },
    limitations: [
      "This preview does not evaluate current-snapshot pre-run findings; verification may stop before invoking a runner.",
      "Counts describe Harness runner invocations and declared retry attempts, not subprocesses, builds, elapsed time, or work performed internally by a project runner.",
      "The preview is not verification evidence and cannot authorize acceptance.",
    ],
  };
}

function mainExecutionPreviews(
  checks: CompiledCheckV2[],
): MainRawExecutionPreviewV1[] {
  const groups = new Map<string, CompiledCheckV2[]>();
  for (const check of checks) {
    const existing = groups.get(check.raw_execution_identity) ?? [];
    existing.push(check);
    groups.set(check.raw_execution_identity, existing);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([rawExecutionIdentity, groupedChecks]) => {
      const check = groupedChecks[0]!;
      return {
        raw_execution_identity: rawExecutionIdentity,
        check_refs: groupedChecks.map(checkRef).sort(),
        execution_target: check.execution_target,
        execution_target_definition: check.execution_target_definition,
        runner: runnerPreview(check),
        environment_requirements: check.environment_requirements,
      };
    });
}

function counterfactualExecutionPreviews(
  compiled: CompiledDeliveryContractV2,
  checks: CompiledCheckV2[],
): CounterfactualExecutionPreviewV1[] {
  const selected = new Map(checks.map((check) => [checkRef(check), check]));
  const result: CounterfactualExecutionPreviewV1[] = [];
  for (const control of compiled.global.acceptance.counterfactual_controls) {
    const check = selected.get(`GLOBAL:${control.check_key}`);
    if (check)
      result.push({
        scope: "global",
        outcome_key: null,
        control_key: control.key,
        check_ref: checkRef(check),
        raw_execution_identity: check.raw_execution_identity,
        mutation: control.mutation,
        runner: runnerPreview(check),
      });
  }
  for (const outcome of compiled.outcomes)
    for (const control of outcome.acceptance.counterfactual_controls) {
      const check = selected.get(`${outcome.key}:${control.check_key}`);
      if (check)
        result.push({
          scope: "outcome",
          outcome_key: outcome.key,
          control_key: control.key,
          check_ref: checkRef(check),
          raw_execution_identity: check.raw_execution_identity,
          mutation: control.mutation,
          runner: runnerPreview(check),
        });
    }
  return result.sort((left, right) =>
    `${left.check_ref}:${left.control_key}`.localeCompare(
      `${right.check_ref}:${right.control_key}`,
    ),
  );
}

function checkRef(check: CompiledCheckV2): string {
  return `${check.outcome_key ?? "GLOBAL"}:${check.key}`;
}

function runnerPreview(check: CompiledCheckV2): RunnerPreviewV1 {
  return {
    type: check.runner.type,
    target: check.runner.target,
    argv: check.runner.argv,
    cwd: check.runner.cwd,
    timeout_ms: check.runner.timeout_ms,
    effect: check.runner.effect,
    retry_policy: check.runner.retry_policy,
    idempotent: check.runner.idempotent,
    resolved_cwd: check.runner.resolved_cwd,
    resolved_target: check.runner.resolved_target,
    definition_sha256: check.runner.definition_sha256,
  };
}

function maximumAttempts(runner: RunnerPreviewV1): number {
  return runner.retry_policy === "transient_once" ? 2 : 1;
}
