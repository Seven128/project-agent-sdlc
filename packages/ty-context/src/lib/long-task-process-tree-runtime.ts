import { execFile } from "node:child_process";
import { promisify } from "node:util";

const PROCESS_SNAPSHOT_LIMIT = 2 * 1024 * 1024;
const execFileAsync = promisify(execFile);

export interface ProcessSnapshotRow {
  pid: number;
  parent_pid: number;
  creation_filetime_utc: string | null;
}

export interface ProcessIdentity {
  pid: number;
  creation_filetime_utc: string;
}

export interface ProcessTreeRuntime {
  kind: "posix" | "windows";
  now(): number;
  sleep(milliseconds: number): Promise<void>;
  snapshot(): Promise<readonly ProcessSnapshotRow[]>;
  terminatePid(pid: number, force: boolean): Promise<void>;
  terminateGroup(rootPid: number, force: boolean): Promise<void>;
  processIdExists(pid: number): boolean;
  processGroupExists(rootPid: number): boolean;
}

export interface ProcessTreeOptions {
  rootPid: number;
  spawnedAtMs: number;
  rootIsOpen(): boolean;
  terminateRoot(force: boolean): void;
}

export interface ProcessTreeController {
  observeUntil(stopped: () => boolean): Promise<void>;
  terminate(force: boolean): Promise<void>;
  assertQuiescent(completedAtMs: number): Promise<void>;
  forceQuiescence(completedAtMs: number): Promise<void>;
}

export function systemProcessTreeRuntime(): ProcessTreeRuntime {
  return {
    kind: process.platform === "win32" ? "windows" : "posix",
    now: Date.now,
    sleep: (milliseconds) =>
      new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
    snapshot: process.platform === "win32" ? windowsSnapshot : posixSnapshot,
    terminatePid,
    terminateGroup,
    processIdExists,
    processGroupExists,
  };
}

export function unixMsToWindowsFileTime(milliseconds: number): bigint {
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0)
    throw new Error("process_observer_process_time_invalid");
  return (BigInt(milliseconds) + 11_644_473_600_000n) * 10_000n;
}

export function windowsTaskkillArguments(pid: number): string[] {
  if (!Number.isSafeInteger(pid) || pid <= 0)
    throw new Error("process_observer_process_id_invalid");
  return ["/PID", String(pid), "/F"];
}

export function processIdentity(row: ProcessSnapshotRow): ProcessIdentity {
  if (row.creation_filetime_utc === null)
    throw new Error("process_observer_process_tree_identity_ambiguous");
  return { pid: row.pid, creation_filetime_utc: row.creation_filetime_utc };
}

export function processIdentityKey(value: ProcessIdentity): string {
  return `${value.pid}:${value.creation_filetime_utc}`;
}

export function processIdentitiesEqual(
  left: ProcessIdentity,
  right: ProcessIdentity | null,
): boolean {
  return Boolean(
    right && processIdentityKey(left) === processIdentityKey(right),
  );
}

export function sameProcessSnapshot(
  row: ProcessSnapshotRow | undefined,
  expected: ProcessIdentity,
): boolean {
  return Boolean(
    row &&
    row.pid === expected.pid &&
    row.creation_filetime_utc === expected.creation_filetime_utc,
  );
}

export function indexProcessRows(
  rows: readonly ProcessSnapshotRow[],
): Map<number, ProcessSnapshotRow> {
  const result = new Map<number, ProcessSnapshotRow>();
  for (const row of rows) {
    if (result.has(row.pid))
      throw new Error("process_observer_process_tree_identity_ambiguous");
    result.set(row.pid, row);
  }
  return result;
}

export function processCreatedWithin(
  row: ProcessSnapshotRow,
  lower: bigint,
  upper: bigint,
): boolean {
  if (row.creation_filetime_utc === null) return true;
  const created = BigInt(row.creation_filetime_utc);
  return created >= lower && created <= upper;
}

async function windowsSnapshot(): Promise<readonly ProcessSnapshotRow[]> {
  const command = [
    "$ErrorActionPreference='Stop'",
    "Get-CimInstance Win32_Process | ForEach-Object {",
    "$created=if($null -eq $_.CreationDate){''}else{$_.CreationDate.ToUniversalTime().ToFileTimeUtc().ToString([System.Globalization.CultureInfo]::InvariantCulture)}",
    '"{0}`t{1}`t{2}" -f $_.ProcessId,$_.ParentProcessId,$created',
    "}",
  ].join("; ");
  const stdout = await commandOutput("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    command,
  ]);
  return stdout
    .split(/\r?\n/u)
    .filter((line) => line.length > 0)
    .map(parseWindowsRow);
}

function parseWindowsRow(line: string): ProcessSnapshotRow {
  const fields = line.split("\t");
  if (fields.length !== 3)
    throw new Error("process_observer_process_snapshot_invalid");
  const pid = parsePid(fields[0], true);
  const parentPid = parsePid(fields[1], true);
  const creation = fields[2];
  if (creation !== "" && !/^\d+$/u.test(creation))
    throw new Error("process_observer_process_snapshot_invalid");
  return {
    pid,
    parent_pid: parentPid,
    creation_filetime_utc: creation === "" ? null : BigInt(creation).toString(),
  };
}

async function posixSnapshot(): Promise<readonly ProcessSnapshotRow[]> {
  const stdout = await commandOutput("ps", ["-A", "-o", "pid=,ppid="]);
  return stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pid, parentPid, ...extra] = line.split(/\s+/u);
      if (extra.length > 0)
        throw new Error("process_observer_process_snapshot_invalid");
      return {
        pid: parsePid(pid, false),
        parent_pid: parsePid(parentPid, true),
        creation_filetime_utc: null,
      };
    });
}

async function commandOutput(
  executable: string,
  argv: readonly string[],
): Promise<string> {
  try {
    const result = await execFileAsync(executable, [...argv], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 5_000,
      maxBuffer: PROCESS_SNAPSHOT_LIMIT,
    });
    return result.stdout;
  } catch (error) {
    throw new Error(
      `process_observer_process_tree_inspection_unavailable:${message(error)}`,
    );
  }
}

async function terminatePid(pid: number, force: boolean): Promise<void> {
  if (process.platform === "win32") {
    await execFileAsync("taskkill.exe", windowsTaskkillArguments(pid), {
      windowsHide: true,
      timeout: 1_000,
    });
    return;
  }
  process.kill(pid, force ? "SIGKILL" : "SIGTERM");
}

async function terminateGroup(rootPid: number, force: boolean): Promise<void> {
  if (process.platform === "win32") return;
  process.kill(-rootPid, force ? "SIGKILL" : "SIGTERM");
}

function processIdExists(pid: number): boolean {
  return signalZero(pid);
}

function processGroupExists(rootPid: number): boolean {
  return process.platform !== "win32" && signalZero(-rootPid);
}

function signalZero(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (nodeErrorCode(error) === "ESRCH") return false;
    throw error;
  }
}

function parsePid(value: string | undefined, allowZero: boolean): number {
  if (!/^(?:0|[1-9]\d*)$/u.test(value ?? ""))
    throw new Error("process_observer_process_snapshot_invalid");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < (allowZero ? 0 : 1))
    throw new Error("process_observer_process_snapshot_invalid");
  return parsed;
}

function nodeErrorCode(error: unknown): string | null {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
