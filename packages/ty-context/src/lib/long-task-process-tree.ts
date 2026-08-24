import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  descendantsOf,
  liveProcessInstances,
  processInstanceKey,
  processInstanceMatches,
  processSnapshot,
  rootProcessAlive,
  uniqueProcessInstances,
  type ProcessInstance,
} from "./long-task-process-table.js";

export { processInstanceMatches } from "./long-task-process-table.js";

const PROCESS_TREE_GRACE_MS = 1_000;
const execFileAsync = promisify(execFile);

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
  let stopped = false;
  let rootInstance: ProcessInstance | null = null;
  const observed = new Map<string, ProcessInstance>();
  const monitor = observe();

  return {
    stop(): void {
      stopped = true;
    },
    wait(): Promise<void> {
      return monitor;
    },
    terminate(force: boolean): Promise<void> {
      return terminateProcessTree(
        rootPid,
        rootInstance,
        force,
        [...observed.values()],
        true,
      );
    },
    forceQuiescence(): Promise<void> {
      return forceProcessTreeQuiescence(rootPid, rootInstance, observed);
    },
    assertQuiescent(): Promise<void> {
      return assertProcessTreeQuiescent(rootPid, rootInstance, observed);
    },
  };

  async function observe(): Promise<void> {
    do {
      const snapshot = await processSnapshot();
      const currentRoot = snapshot.find((entry) => entry.pid === rootPid);
      if (
        currentRoot &&
        (!rootInstance || processInstanceMatches(rootInstance, currentRoot))
      ) {
        rootInstance ??= currentRoot;
        for (const descendant of descendantsOf(rootPid, snapshot))
          observed.set(processInstanceKey(descendant), descendant);
      }
      if (stopped) return;
      await delay(process.platform === "win32" ? 100 : 25);
    } while (!stopped);
  }
}

async function forceProcessTreeQuiescence(
  rootPid: number,
  rootInstance: ProcessInstance | null,
  observed: ReadonlyMap<string, ProcessInstance>,
): Promise<void> {
  await terminateProcessTree(
    rootPid,
    rootInstance,
    true,
    [...observed.values()],
    true,
  );
  const deadline = Date.now() + PROCESS_TREE_GRACE_MS;
  while (Date.now() < deadline) {
    const snapshot = await processSnapshot();
    const rootAlive = rootProcessAlive(rootPid, rootInstance, snapshot);
    const descendantsAlive = liveProcessInstances(
      [...observed.values()],
      snapshot,
    ).length;
    const groupAlive =
      process.platform !== "win32" && processGroupExists(rootPid);
    if (!rootAlive && descendantsAlive === 0 && !groupAlive) return;
    await delay(process.platform === "win32" ? 100 : 25);
  }
  throw new Error("process_observer_descendant_process_alive");
}

async function assertProcessTreeQuiescent(
  rootPid: number,
  rootInstance: ProcessInstance | null,
  observed: ReadonlyMap<string, ProcessInstance>,
): Promise<void> {
  const snapshot = await processSnapshot();
  const currentRoot = snapshot.find((entry) => entry.pid === rootPid);
  const finalDescendants =
    currentRoot &&
    (!rootInstance || processInstanceMatches(rootInstance, currentRoot))
      ? descendantsOf(rootPid, snapshot)
      : [];
  const candidates = uniqueProcessInstances([
    ...observed.values(),
    ...finalDescendants,
  ]);
  const descendants = liveProcessInstances(candidates, snapshot);
  const processGroupAlive =
    process.platform !== "win32" && processGroupExists(rootPid);
  if (!descendants.length && !processGroupAlive) return;
  await terminateProcessTree(rootPid, rootInstance, true, descendants, false);
  throw new Error("process_observer_descendant_process_alive");
}

async function terminateProcessTree(
  rootPid: number,
  rootInstance: ProcessInstance | null,
  force: boolean,
  knownDescendants: readonly ProcessInstance[],
  includeRoot: boolean,
): Promise<void> {
  if (!Number.isSafeInteger(rootPid) || rootPid <= 0) return;
  if (process.platform === "win32") {
    const snapshot = await processSnapshot();
    const currentRoot = snapshot.find((entry) => entry.pid === rootPid);
    const rootTarget =
      includeRoot &&
      currentRoot &&
      (!rootInstance || processInstanceMatches(rootInstance, currentRoot))
        ? currentRoot
        : null;
    const currentDescendants = rootTarget
      ? descendantsOf(rootPid, snapshot)
      : [];
    const descendants = liveProcessInstances(
      uniqueProcessInstances([...knownDescendants, ...currentDescendants]),
      snapshot,
    ).reverse();
    const targets = rootTarget ? [...descendants, rootTarget] : descendants;
    for (const target of targets)
      await execFileAsync(
        "taskkill.exe",
        ["/PID", String(target.pid), "/T", "/F"],
        {
          windowsHide: true,
          timeout: PROCESS_TREE_GRACE_MS,
        },
      ).catch(() => undefined);
    return;
  }
  const signal: NodeJS.Signals = force ? "SIGKILL" : "SIGTERM";
  if (includeRoot)
    try {
      process.kill(-rootPid, signal);
    } catch (error) {
      if (nodeErrorCode(error) !== "ESRCH") throw error;
    }
  const snapshot = await processSnapshot();
  const descendants = liveProcessInstances(knownDescendants, snapshot);
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
