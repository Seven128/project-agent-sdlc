import {
  descendantsOf,
  liveProcessInstances,
  processSnapshot,
  rootProcessAlive,
  uniqueProcessInstances,
  type ProcessInstance,
} from "./long-task-process-table.js";

const PROCESS_TREE_GRACE_MS = 1_000;

export interface ProcessTreeObserver {
  stop(): void;
  wait(): Promise<void>;
  terminate(force: boolean): Promise<void>;
  forceQuiescence(): Promise<void>;
  assertQuiescent(): Promise<void>;
}

export function createProcessTreeObserver(
  rootPid: number,
): ProcessTreeObserver {
  if (process.platform === "win32")
    throw new Error("process_observer_windows_job_required");
  let stopped = false;
  const observed = new Map<number, ProcessInstance>();
  const monitor = observe();

  return {
    stop(): void {
      stopped = true;
    },
    wait(): Promise<void> {
      return monitor;
    },
    terminate(force: boolean): Promise<void> {
      return terminateProcessTree(rootPid, force, [...observed.values()], true);
    },
    forceQuiescence(): Promise<void> {
      return forceProcessTreeQuiescence(rootPid, observed);
    },
    assertQuiescent(): Promise<void> {
      return assertProcessTreeQuiescent(rootPid, observed);
    },
  };

  async function observe(): Promise<void> {
    do {
      const snapshot = await processSnapshot();
      if (snapshot.some((entry) => entry.pid === rootPid))
        for (const descendant of descendantsOf(rootPid, snapshot))
          observed.set(descendant.pid, descendant);
      if (stopped) return;
      await delay(25);
    } while (!stopped);
  }
}

async function forceProcessTreeQuiescence(
  rootPid: number,
  observed: ReadonlyMap<number, ProcessInstance>,
): Promise<void> {
  await terminateProcessTree(rootPid, true, [...observed.values()], true);
  const deadline = Date.now() + PROCESS_TREE_GRACE_MS;
  while (Date.now() < deadline) {
    const rootAlive = rootProcessAlive(rootPid);
    const descendantsAlive = liveProcessInstances([
      ...observed.values(),
    ]).length;
    const groupAlive = processGroupExists(rootPid);
    if (!rootAlive && descendantsAlive === 0 && !groupAlive) return;
    await delay(25);
  }
  throw new Error("process_observer_descendant_process_alive");
}

async function assertProcessTreeQuiescent(
  rootPid: number,
  observed: ReadonlyMap<number, ProcessInstance>,
): Promise<void> {
  const snapshot = await processSnapshot();
  const finalDescendants = snapshot.some((entry) => entry.pid === rootPid)
    ? descendantsOf(rootPid, snapshot)
    : [];
  const candidates = uniqueProcessInstances([
    ...observed.values(),
    ...finalDescendants,
  ]);
  const descendants = liveProcessInstances(candidates);
  if (!descendants.length && !processGroupExists(rootPid)) return;
  await terminateProcessTree(rootPid, true, descendants, false);
  throw new Error("process_observer_descendant_process_alive");
}

async function terminateProcessTree(
  rootPid: number,
  force: boolean,
  knownDescendants: readonly ProcessInstance[],
  includeRoot: boolean,
): Promise<void> {
  if (!Number.isSafeInteger(rootPid) || rootPid <= 0) return;
  const signal: NodeJS.Signals = force ? "SIGKILL" : "SIGTERM";
  if (includeRoot)
    try {
      process.kill(-rootPid, signal);
    } catch (error) {
      if (nodeErrorCode(error) !== "ESRCH") throw error;
    }
  const descendants = liveProcessInstances(knownDescendants);
  for (const descendant of descendants.reverse())
    try {
      process.kill(descendant.pid, signal);
    } catch (error) {
      if (nodeErrorCode(error) !== "ESRCH") throw error;
    }
}

function processGroupExists(rootPid: number): boolean {
  try {
    process.kill(-rootPid, 0);
    return true;
  } catch (error) {
    if (nodeErrorCode(error) === "ESRCH") return false;
    throw error;
  }
}

function nodeErrorCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
