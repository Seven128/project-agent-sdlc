import { execFile } from "node:child_process";
import { promisify } from "node:util";

const PROCESS_TABLE_OUTPUT_LIMIT = 2 * 1024 * 1024;
const execFileAsync = promisify(execFile);

export interface ProcessInstance {
  pid: number;
  parent_pid: number;
}

export async function processSnapshot(): Promise<ProcessInstance[]> {
  assertNonWindowsProcessTree();
  let stdout: string;
  try {
    const result = await execFileAsync("ps", ["-A", "-o", "pid=,ppid="], {
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: PROCESS_TABLE_OUTPUT_LIMIT,
    });
    stdout = result.stdout;
  } catch (error) {
    throw new Error(
      `process_observer_process_tree_inspection_unavailable:${message(error)}`,
    );
  }
  const rows: ProcessInstance[] = [];
  for (const line of stdout.split(/\r?\n/u)) {
    const [pidText, parentText] = line.trim().split(/\s+/u);
    const pid = Number.parseInt(pidText ?? "", 10);
    const parent = Number.parseInt(parentText ?? "", 10);
    if (!Number.isSafeInteger(pid) || !Number.isSafeInteger(parent)) continue;
    rows.push({ pid, parent_pid: parent });
  }
  return rows;
}

export function descendantsOf(
  rootPid: number,
  snapshot: readonly ProcessInstance[],
): ProcessInstance[] {
  const children = new Map<number, ProcessInstance[]>();
  for (const processInstance of snapshot) {
    const row = children.get(processInstance.parent_pid);
    if (row) row.push(processInstance);
    else children.set(processInstance.parent_pid, [processInstance]);
  }
  const result: ProcessInstance[] = [];
  const pending = [...(children.get(rootPid) ?? [])];
  const seen = new Set<number>();
  while (pending.length) {
    const processInstance = pending.shift()!;
    if (seen.has(processInstance.pid)) continue;
    seen.add(processInstance.pid);
    result.push(processInstance);
    pending.push(...(children.get(processInstance.pid) ?? []));
  }
  return result;
}

export function liveProcessInstances(
  candidates: readonly ProcessInstance[],
): ProcessInstance[] {
  assertNonWindowsProcessTree();
  return candidates.filter((candidate) => processIdExists(candidate.pid));
}

export function rootProcessAlive(rootPid: number): boolean {
  assertNonWindowsProcessTree();
  return processIdExists(rootPid);
}

export function uniqueProcessInstances(
  instances: readonly ProcessInstance[],
): ProcessInstance[] {
  return [
    ...new Map(instances.map((instance) => [instance.pid, instance])).values(),
  ];
}

function processIdExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (nodeErrorCode(error) === "ESRCH") return false;
    throw error;
  }
}

function assertNonWindowsProcessTree(): void {
  if (process.platform === "win32")
    throw new Error("process_observer_windows_job_required");
}

function nodeErrorCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
