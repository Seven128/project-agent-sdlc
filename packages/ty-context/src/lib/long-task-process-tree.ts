import {
  type ProcessTreeController,
  type ProcessTreeOptions,
  type ProcessTreeRuntime,
  systemProcessTreeRuntime,
} from "./long-task-process-tree-runtime.js";
import { windowsProcessTreeController } from "./long-task-process-tree-windows.js";

export type { ProcessTreeController, ProcessTreeOptions };
export const PROCESS_TREE_GRACE_MS = 1_000;

export function createProcessTreeController(
  options: ProcessTreeOptions,
  runtime: ProcessTreeRuntime = systemProcessTreeRuntime(),
): ProcessTreeController {
  return runtime.kind === "windows"
    ? windowsProcessTreeController(options, runtime, PROCESS_TREE_GRACE_MS)
    : posixController(options, runtime);
}

function posixController(
  options: ProcessTreeOptions,
  runtime: ProcessTreeRuntime,
): ProcessTreeController {
  const observed = new Set<number>();
  const observe = async (): Promise<void> => {
    for (const pid of descendants(await runtime.snapshot(), options.rootPid))
      observed.add(pid);
  };
  const terminate = async (force: boolean): Promise<void> => {
    await ignoreGone(() => runtime.terminateGroup(options.rootPid, force));
    await observe();
    for (const pid of [...observed].reverse())
      await ignoreGone(() => runtime.terminatePid(pid, force));
  };
  const live = (): boolean =>
    [...observed].some(runtime.processIdExists) ||
    runtime.processGroupExists(options.rootPid);
  return {
    observeUntil: (stopped) => observeUntil(observe, stopped, runtime),
    terminate,
    assertQuiescent: async () => {
      await observe();
      if (!live()) return;
      await terminate(true);
      throw new Error("process_observer_descendant_process_alive");
    },
    forceQuiescence: async () => {
      await terminate(true);
      const deadline = runtime.now() + PROCESS_TREE_GRACE_MS;
      while (runtime.now() < deadline) {
        if (!live()) return;
        await runtime.sleep(25);
      }
      throw new Error("process_observer_descendant_process_alive");
    },
  };
}

async function observeUntil(
  observe: () => Promise<void>,
  stopped: () => boolean,
  runtime: ProcessTreeRuntime,
): Promise<void> {
  do {
    await observe();
    if (stopped()) return;
    await runtime.sleep(25);
  } while (!stopped());
}

function descendants(
  rows: Awaited<ReturnType<ProcessTreeRuntime["snapshot"]>>,
  rootPid: number,
): number[] {
  const children = new Map<number, number[]>();
  for (const row of rows) {
    const current = children.get(row.parent_pid);
    if (current) current.push(row.pid);
    else children.set(row.parent_pid, [row.pid]);
  }
  const result: number[] = [];
  const pending = [...(children.get(rootPid) ?? [])];
  const seen = new Set<number>();
  while (pending.length > 0) {
    const pid = pending.shift()!;
    if (seen.has(pid)) continue;
    seen.add(pid);
    result.push(pid);
    pending.push(...(children.get(pid) ?? []));
  }
  return result;
}

async function ignoreGone(action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (error) {
    if (nodeErrorCode(error) !== "ESRCH") throw error;
  }
}

function nodeErrorCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}
