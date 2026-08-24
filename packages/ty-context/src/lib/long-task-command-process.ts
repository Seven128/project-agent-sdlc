import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

import {
  createProcessTreeObserver,
  type ProcessTreeObserver,
} from "./long-task-process-tree.js";

const OUTPUT_LIMIT = 2 * 1024 * 1024;
const PROCESS_TREE_GRACE_MS = 1_000;

export interface SpawnedCommandExecution {
  exit_code: number;
  stdout: Buffer;
  stderr: Buffer;
  pid: number;
  started_at: string;
  completed_at: string;
}

interface SpawnCommandState {
  child: ChildProcessWithoutNullStreams;
  pid: number;
  processTree: ProcessTreeObserver | null;
  treeMonitor: Promise<void>;
  treeMonitorError: unknown;
  stdout: Buffer[];
  stderr: Buffer[];
  size: number;
  settled: boolean;
  terminationReason: Error | null;
  terminationTask: Promise<void> | null;
  timer: NodeJS.Timeout | null;
  forceTimer: NodeJS.Timeout | null;
  abandonTimer: NodeJS.Timeout | null;
  startedAt: string;
  resolve: (value: SpawnedCommandExecution) => void;
  reject: (reason: unknown) => void;
}

export function spawnCommandOnce(
  executable: string,
  argv: string[],
  cwd: string,
  timeoutMs: number,
  environment: NodeJS.ProcessEnv,
  containProcessTree: boolean,
): Promise<SpawnedCommandExecution> {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, argv, {
      cwd,
      shell: false,
      windowsHide: true,
      env: environment,
      detached: containProcessTree && process.platform !== "win32",
    });
    const pid = child.pid ?? -1;
    const processTree =
      containProcessTree && pid > 0 ? createProcessTreeObserver(pid) : null;
    const state: SpawnCommandState = {
      child,
      pid,
      processTree,
      treeMonitor: Promise.resolve(),
      treeMonitorError: null,
      stdout: [],
      stderr: [],
      size: 0,
      settled: false,
      terminationReason: null,
      terminationTask: null,
      timer: null,
      forceTimer: null,
      abandonTimer: null,
      startedAt: new Date().toISOString(),
      resolve,
      reject,
    };
    if (processTree)
      state.treeMonitor = processTree.wait().catch((error) => {
        state.treeMonitorError = error;
      });
    child.stdout.on("data", captureOutput(state, state.stdout));
    child.stderr.on("data", captureOutput(state, state.stderr));
    child.on("error", (error) => handleSpawnError(state, error));
    child.on("close", (code) => void handleClose(state, code));
    state.timer = setTimeout(
      () => terminateExecution(state, "command_timeout"),
      timeoutMs,
    );
    if (pid < 0) terminateExecution(state, "command_spawn_pid_unavailable");
  });
}

function captureOutput(
  state: SpawnCommandState,
  target: Buffer[],
): (chunk: Buffer) => void {
  return (chunk) => {
    state.size += chunk.length;
    if (state.size > OUTPUT_LIMIT) {
      terminateExecution(state, "command_output_limit_exceeded");
      return;
    }
    target.push(Buffer.from(chunk));
  };
}

function handleSpawnError(state: SpawnCommandState, error: Error): void {
  if (state.settled) return;
  state.settled = true;
  state.processTree?.stop();
  clearExecutionTimers(state);
  const spawnError = new Error(`command_spawn_error:${message(error)}`);
  if (!state.processTree) {
    state.reject(spawnError);
    return;
  }
  void state.processTree
    .terminate(true)
    .catch(() => undefined)
    .finally(() => state.reject(spawnError));
}

async function handleClose(
  state: SpawnCommandState,
  code: number | null,
): Promise<void> {
  state.processTree?.stop();
  clearExecutionTimers(state);
  if (state.settled) return;
  state.settled = true;
  if (state.terminationReason) {
    await finishBoundedTermination(state);
    state.reject(state.terminationReason);
    return;
  }
  if (!(await assertTreeClosure(state))) return;
  state.resolve({
    exit_code: code ?? -1,
    stdout: Buffer.concat(state.stdout),
    stderr: Buffer.concat(state.stderr),
    pid: state.pid,
    started_at: state.startedAt,
    completed_at: new Date().toISOString(),
  });
}

async function finishBoundedTermination(
  state: SpawnCommandState,
): Promise<void> {
  try {
    await state.terminationTask;
    await state.treeMonitor;
    if (state.processTree) await state.processTree.forceQuiescence();
  } catch {
    // Preserve the original bounded termination reason after the hard cleanup.
  }
}

async function assertTreeClosure(state: SpawnCommandState): Promise<boolean> {
  if (!state.processTree) return true;
  try {
    await state.treeMonitor;
    if (state.treeMonitorError) throw state.treeMonitorError;
    await state.processTree.assertQuiescent();
    return true;
  } catch (error) {
    await state.processTree.terminate(true).catch(() => undefined);
    state.reject(error);
    return false;
  }
}

function terminateExecution(state: SpawnCommandState, reason: string): void {
  if (state.settled || state.terminationReason) return;
  state.terminationReason = new Error(reason);
  state.processTree?.stop();
  startGracefulTermination(state);
  state.forceTimer = setTimeout(
    () => startForcedTermination(state),
    PROCESS_TREE_GRACE_MS,
  );
  state.forceTimer.unref();
  state.abandonTimer = setTimeout(
    () => abandonExecution(state),
    PROCESS_TREE_GRACE_MS * 2,
  );
  state.abandonTimer.unref();
}

function startGracefulTermination(state: SpawnCommandState): void {
  if (state.processTree)
    state.terminationTask = state.processTree
      .terminate(false)
      .catch((error) => {
        state.treeMonitorError ??= error;
      });
  else {
    state.child.kill();
    state.terminationTask = Promise.resolve();
  }
}

function startForcedTermination(state: SpawnCommandState): void {
  if (state.processTree)
    state.terminationTask = state.processTree.terminate(true).catch((error) => {
      state.treeMonitorError ??= error;
    });
  else state.child.kill("SIGKILL");
}

function abandonExecution(state: SpawnCommandState): void {
  if (state.settled) return;
  state.settled = true;
  state.child.stdout.destroy();
  state.child.stderr.destroy();
  const cleanup = state.processTree
    ? state.processTree.forceQuiescence().catch(() => undefined)
    : Promise.resolve();
  void cleanup.finally(() => state.reject(state.terminationReason!));
}

function clearExecutionTimers(state: SpawnCommandState): void {
  if (state.timer) clearTimeout(state.timer);
  if (state.forceTimer) clearTimeout(state.forceTimer);
  if (state.abandonTimer) clearTimeout(state.abandonTimer);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
