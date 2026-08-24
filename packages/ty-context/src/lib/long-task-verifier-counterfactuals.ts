import type {
  CheckExecutionResultV2,
  CompiledCheckV2,
  CompiledDeliveryContractV2,
  LongTaskFindingV2,
  RawCommandExecutionV2,
  WorkspaceManifestV2,
} from "./long-task-delivery-types.js";
import {
  counterfactualExecutionMayOverlap,
  evaluateGlobalCounterfactuals,
  evaluateOutcomeCounterfactuals,
} from "./long-task-evidence-v2.js";
import { MAX_OVERLAPPING_RUNNERS } from "./long-task-verifier-execution.js";

interface CounterfactualEvaluationTask {
  overlap_eligible: boolean;
  run(): Promise<LongTaskFindingV2[]>;
}

export async function evaluateSelectedCounterfactuals(input: {
  compiled: CompiledDeliveryContractV2;
  selected_checks: readonly CompiledCheckV2[];
  complete_checks: readonly CompiledCheckV2[];
  snapshot_root: string;
  snapshot_manifest: WorkspaceManifestV2;
  observation_authority_paths: readonly string[];
  baseline_results: readonly CheckExecutionResultV2[];
  baseline_executions: ReadonlyMap<string, RawCommandExecutionV2>;
}): Promise<LongTaskFindingV2[]> {
  const passingCheckIds = new Set(
    input.baseline_results
      .filter((result) => result.status === "passed")
      .map((result) => result.internal_id),
  );
  const tasks = [
    ...globalCounterfactualTasks(input, passingCheckIds),
    ...outcomeCounterfactualTasks(input, passingCheckIds),
  ];
  const findings: LongTaskFindingV2[] = [];
  for (let index = 0; index < tasks.length;) {
    const batch = eligibleCounterfactualBatch(tasks, index);
    const results = await Promise.all(batch.map((task) => task.run()));
    for (const result of results) findings.push(...result);
    index += batch.length;
  }
  return findings;
}

function globalCounterfactualTasks(
  input: Parameters<typeof evaluateSelectedCounterfactuals>[0],
  passingCheckIds: ReadonlySet<string>,
): CounterfactualEvaluationTask[] {
  const selectedCheckKeys = new Set(
    input.selected_checks
      .filter(
        (check) =>
          check.outcome_key === null && passingCheckIds.has(check.internal_id),
      )
      .map((check) => check.key),
  );
  return input.compiled.global.acceptance.counterfactual_controls
    .filter((control) => selectedCheckKeys.has(control.check_key))
    .map((control) => {
      const selectedCompiled = {
        ...input.compiled,
        global: {
          ...input.compiled.global,
          acceptance: {
            ...input.compiled.global.acceptance,
            counterfactual_controls: [control],
          },
        },
      };
      const check = input.compiled.global.acceptance.checks.find(
        (candidate) => candidate.key === control.check_key,
      )!;
      return {
        overlap_eligible: counterfactualExecutionMayOverlap({
          check,
          control,
          protected_authority_paths: input.observation_authority_paths,
        }),
        run: () =>
          evaluateGlobalCounterfactuals(
            selectedCompiled,
            input.snapshot_root,
            new Set([control.check_key]),
            input.snapshot_manifest,
            input.baseline_results,
            input.baseline_executions,
            input.complete_checks,
          ),
      };
    });
}

function outcomeCounterfactualTasks(
  input: Parameters<typeof evaluateSelectedCounterfactuals>[0],
  passingCheckIds: ReadonlySet<string>,
): CounterfactualEvaluationTask[] {
  const selectedOutcomeKeys = new Set(
    input.selected_checks
      .map((check) => check.outcome_key)
      .filter((key): key is string => Boolean(key)),
  );
  return input.compiled.outcomes
    .filter((outcome) => selectedOutcomeKeys.has(outcome.key))
    .flatMap((outcome) => {
      const selectedCheckKeys = new Set(
        input.selected_checks
          .filter(
            (check) =>
              check.outcome_key === outcome.key &&
              passingCheckIds.has(check.internal_id),
          )
          .map((check) => check.key),
      );
      return outcome.acceptance.counterfactual_controls
        .filter((control) => selectedCheckKeys.has(control.check_key))
        .map((control) => {
          const check = outcome.acceptance.checks.find(
            (candidate) => candidate.key === control.check_key,
          )!;
          const selectedOutcome = {
            ...outcome,
            acceptance: {
              ...outcome.acceptance,
              counterfactual_controls: [control],
            },
          };
          return {
            overlap_eligible: counterfactualExecutionMayOverlap({
              check,
              control,
              protected_authority_paths: input.observation_authority_paths,
            }),
            run: () =>
              evaluateOutcomeCounterfactuals(
                selectedOutcome,
                input.snapshot_root,
                input.snapshot_manifest,
                input.observation_authority_paths,
                input.baseline_results,
                input.baseline_executions,
                input.complete_checks,
              ),
          };
        });
    });
}

function eligibleCounterfactualBatch(
  tasks: readonly CounterfactualEvaluationTask[],
  index: number,
): CounterfactualEvaluationTask[] {
  const first = tasks[index];
  if (!first) return [];
  const batch = [first];
  if (!first.overlap_eligible) return batch;
  while (batch.length < MAX_OVERLAPPING_RUNNERS) {
    const next = tasks[index + batch.length];
    if (!next?.overlap_eligible) break;
    batch.push(next);
  }
  return batch;
}
