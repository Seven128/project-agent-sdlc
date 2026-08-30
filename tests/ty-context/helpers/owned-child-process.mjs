import { spawnCommandOnce } from "../../../packages/ty-context/dist/lib/long-task-command-process.js";

export const OWNED_CHILD_PROCESS_OUTPUT_LIMIT_BYTES = 2 * 1024 * 1024;

export async function runOwnedChildProcess(
  executable,
  args,
  { cwd = process.cwd(), env = process.env, timeoutMs } = {},
) {
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0)
    throw new Error("owned_child_process_timeout_invalid");
  try {
    const execution = await spawnCommandOnce(
      executable,
      args,
      cwd,
      timeoutMs,
      env,
      true,
    );
    return {
      status: execution.exit_code,
      signal: null,
      stdout: execution.stdout.toString("utf8"),
      stderr: execution.stderr.toString("utf8"),
    };
  } catch (error) {
    throw ownedChildError(error);
  }
}

function ownedChildError(error) {
  const detail = error instanceof Error ? error.message : String(error);
  const reason =
    detail === "command_timeout"
      ? "timeout"
      : detail === "command_output_limit_exceeded"
        ? "output_limit"
        : detail.includes("descendant_process_alive")
          ? "tree_unsettled"
          : "execution";
  return new Error(`owned_child_process_${reason}:${detail}`, {
    cause: error,
  });
}
