import { execFile } from "node:child_process";
import { promisify } from "node:util";

const PROCESS_TABLE_OUTPUT_LIMIT = 2 * 1024 * 1024;
const execFileAsync = promisify(execFile);

export interface ProcessInstance {
  pid: number;
  parent_pid: number;
  start_identity: string | null;
}

export function processInstanceMatches(
  expected: Pick<ProcessInstance, "pid" | "start_identity">,
  current: Pick<ProcessInstance, "pid" | "start_identity">,
): boolean {
  if (expected.pid !== current.pid) return false;
  if (expected.start_identity === null || current.start_identity === null)
    return true;
  return expected.start_identity === current.start_identity;
}

export async function processSnapshot(): Promise<ProcessInstance[]> {
  let stdout: string;
  try {
    const result =
      process.platform === "win32"
        ? await execFileAsync(
            "powershell.exe",
            [
              "-NoLogo",
              "-NoProfile",
              "-NonInteractive",
              "-Command",
              '$rows = Get-CimInstance Win32_Process; foreach ($row in $rows) { $started = if ($null -eq $row.CreationDate) { "unknown" } else { $row.CreationDate.ToUniversalTime().Ticks }; "$($row.ProcessId) $($row.ParentProcessId) $started" }',
            ],
            {
              encoding: "utf8",
              windowsHide: true,
              timeout: 5_000,
              maxBuffer: PROCESS_TABLE_OUTPUT_LIMIT,
            },
          )
        : await execFileAsync("ps", ["-A", "-o", "pid=,ppid="], {
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
    const [pidText, parentText, startText] = line.trim().split(/\s+/u);
    const pid = Number.parseInt(pidText ?? "", 10);
    const parent = Number.parseInt(parentText ?? "", 10);
    if (!Number.isSafeInteger(pid) || !Number.isSafeInteger(parent)) continue;
    rows.push({
      pid,
      parent_pid: parent,
      start_identity:
        process.platform === "win32" && startText ? startText : null,
    });
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
  const seen = new Set<string>();
  while (pending.length) {
    const processInstance = pending.shift()!;
    const key = processInstanceKey(processInstance);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(processInstance);
    pending.push(...(children.get(processInstance.pid) ?? []));
  }
  return result;
}

export function liveProcessInstances(
  candidates: readonly ProcessInstance[],
  snapshot: readonly ProcessInstance[],
): ProcessInstance[] {
  if (process.platform !== "win32")
    return candidates.filter((candidate) => processIdExists(candidate.pid));
  const currentByPid = new Map(snapshot.map((entry) => [entry.pid, entry]));
  return candidates.filter((candidate) => {
    const current = currentByPid.get(candidate.pid);
    return current ? processInstanceMatches(candidate, current) : false;
  });
}

export function rootProcessAlive(
  rootPid: number,
  rootInstance: ProcessInstance | null,
  snapshot: readonly ProcessInstance[],
): boolean {
  if (process.platform !== "win32") return processIdExists(rootPid);
  const current = snapshot.find((entry) => entry.pid === rootPid);
  if (!current) return false;
  return rootInstance ? processInstanceMatches(rootInstance, current) : true;
}

export function uniqueProcessInstances(
  instances: readonly ProcessInstance[],
): ProcessInstance[] {
  return [
    ...new Map(
      instances.map((instance) => [processInstanceKey(instance), instance]),
    ).values(),
  ];
}

export function processInstanceKey(instance: ProcessInstance): string {
  return `${instance.pid}:${instance.start_identity ?? "pid-only"}`;
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

function nodeErrorCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
