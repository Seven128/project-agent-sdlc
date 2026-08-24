import { executeCheckRunner } from "./long-task-check-runner.js";
import type {
  CompiledCheckV2,
  RawCommandExecutionV2,
} from "./long-task-delivery-types.js";
import type { PreparedExecutionObservationGroupV2 } from "./long-task-execution-observation.js";

export const MAX_OVERLAPPING_RUNNERS = 3;

interface PreparedRawExecutionTask {
  overlap_eligible: boolean;
  run(): Promise<{
    raw_execution_identity: string;
    raw: RawCommandExecutionV2;
    prepared: PreparedExecutionObservationGroupV2;
  }>;
}

export async function executePreparedRawExecutionGroups(input: {
  selected_groups: readonly (readonly CompiledCheckV2[])[];
  complete_groups: readonly (readonly CompiledCheckV2[])[];
  prepared_groups: readonly PreparedExecutionObservationGroupV2[];
}): Promise<Map<string, RawCommandExecutionV2>> {
  try {
    const tasks = preparedRawExecutionTasks(input);
    const pending: Awaited<ReturnType<PreparedRawExecutionTask["run"]>>[] = [];
    for (let index = 0; index < tasks.length;) {
      const batch = eligibleRunnerBatch(tasks, index);
      pending.push(...(await Promise.all(batch.map((task) => task.run()))));
      index += batch.length;
    }
    const finalized = await Promise.all(
      pending.map(async (entry) => ({
        raw_execution_identity: entry.raw_execution_identity,
        raw: await entry.prepared.finalize(entry.raw),
      })),
    );
    return new Map(
      finalized.map((entry) => [entry.raw_execution_identity, entry.raw]),
    );
  } finally {
    await Promise.all(
      input.prepared_groups.map((prepared) => prepared.dispose()),
    );
  }
}

function preparedRawExecutionTasks(input: {
  selected_groups: readonly (readonly CompiledCheckV2[])[];
  complete_groups: readonly (readonly CompiledCheckV2[])[];
  prepared_groups: readonly PreparedExecutionObservationGroupV2[];
}): PreparedRawExecutionTask[] {
  return input.selected_groups.map((group, index) => {
    const prepared = input.prepared_groups[index];
    const complete = input.complete_groups[index];
    if (!prepared || !complete)
      throw new Error("raw_execution_group_prepare_missing");
    return {
      overlap_eligible: rawExecutionGroupMayOverlap(complete),
      run: async () => ({
        raw_execution_identity: group[0].raw_execution_identity,
        raw: await executeCheckRunner(
          group[0],
          prepared.execution_root,
          prepared.runner_context,
        ),
        prepared,
      }),
    };
  });
}

function eligibleRunnerBatch(
  tasks: readonly PreparedRawExecutionTask[],
  index: number,
): PreparedRawExecutionTask[] {
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

export function rawExecutionGroupMayOverlap(
  checks: readonly CompiledCheckV2[],
): boolean {
  if (!checks.length) return false;
  const runner = checks[0].runner;
  if (
    runner.effect !== "read_only" ||
    !runner.idempotent ||
    runner.retry_policy !== "none" ||
    checks[0].environment_requirements.some(
      (requirement) => requirement.kind === "loopback_tcp",
    )
  )
    return false;
  const processChecks = checks.filter((check) =>
    (check.observation_authorities ?? []).some(
      (authority) => authority.authority === "package_process_json_exact",
    ),
  );
  if (!processChecks.length) return false;
  const closureIdentities = new Set(
    processChecks.map(
      (check) => check.process_runtime_closure?.closure_identity ?? null,
    ),
  );
  return closureIdentities.size === 1 && !closureIdentities.has(null);
}
