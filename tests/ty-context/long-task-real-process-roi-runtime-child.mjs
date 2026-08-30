import { readFile, writeFile } from "node:fs/promises";
import { spawnCommandOnce } from "../../packages/ty-context/dist/lib/long-task-command-process.js";
import {
  createWorkloadFixture,
  removeFixture,
} from "../../examples/delivery-benchmark/real-process-workload/runner/fixture-adapter.mjs";
import {
  enableRealProcessRoiLongTaskProfile,
  executeRealProcessRoiLifecycle,
} from "../../examples/delivery-benchmark/real-process-workload/runner/workload-executor.mjs";

const [requestPath, responsePath] = process.argv.slice(2);
if (!requestPath || !responsePath)
  throw new Error("real_process_roi_runtime_child_arguments");

try {
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  const value = await executeOperation(request);
  await writeFile(responsePath, JSON.stringify({ ok: true, value }), "utf8");
} catch (error) {
  const diagnostic =
    error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`${diagnostic}\n`);
  await writeFile(
    responsePath,
    JSON.stringify({
      ok: false,
      error: diagnostic,
    }),
    "utf8",
  );
  process.exitCode = 1;
}

async function executeOperation(request) {
  if (request.operation === "enable-capture")
    return captureEnableProfile(request.status, request.cli);
  if (request.operation === "enable-fixture") {
    applyFixtureEnvironment(request.environment);
    return enableRealProcessRoiLongTaskProfile(
      (_label, executable, args) => runCommand(executable, args, request.root),
      request.cli,
    );
  }
  if (request.operation === "create-fixture") {
    const fixture = await createWorkloadFixture(request.options);
    return {
      fixture,
      environment: fixtureEnvironment(),
    };
  }
  if (request.operation === "remove-fixture") {
    await removeFixture(request.fixture);
    return null;
  }
  if (request.operation === "execute-lifecycle") {
    applyFixtureEnvironment(request.environment);
    const commandRecords = [];
    const lifecycle = await executeRealProcessRoiLifecycle({
      ...request.options,
      commandRecords,
    });
    return { lifecycle, commandRecords };
  }
  throw new Error(
    `real_process_roi_runtime_child_operation:${request.operation}`,
  );
}

function fixtureEnvironment() {
  return {
    TY_CONTEXT_FIXTURE_FIRST_SCOPE:
      process.env.TY_CONTEXT_FIXTURE_FIRST_SCOPE ?? null,
    TY_CONTEXT_FIXTURE_SECOND_SCOPE:
      process.env.TY_CONTEXT_FIXTURE_SECOND_SCOPE ?? null,
  };
}

function applyFixtureEnvironment(environment) {
  for (const key of [
    "TY_CONTEXT_FIXTURE_FIRST_SCOPE",
    "TY_CONTEXT_FIXTURE_SECOND_SCOPE",
  ]) {
    const value = environment?.[key];
    if (typeof value !== "string" || value.length === 0)
      throw new Error(`real_process_roi_runtime_child_environment:${key}`);
    process.env[key] = value;
  }
}

async function captureEnableProfile(status, cli) {
  const calls = [];
  let result = null;
  let error = null;
  try {
    result = await enableRealProcessRoiLongTaskProfile(async (...args) => {
      calls.push(args);
      return { status };
    }, cli);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
  return { calls, error, result };
}

async function runCommand(executable, args, cwd) {
  try {
    const execution = await spawnCommandOnce(
      executable,
      args,
      cwd,
      120_000,
      process.env,
      true,
    );
    return {
      status: execution.exit_code,
      signal: null,
      spawn_error: null,
      stdout: execution.stdout.toString("utf8"),
      stderr: execution.stderr.toString("utf8"),
    };
  } catch (error) {
    return {
      status: null,
      signal: null,
      spawn_error: error instanceof Error ? error.message : String(error),
      stdout: "",
      stderr: "",
    };
  }
}
