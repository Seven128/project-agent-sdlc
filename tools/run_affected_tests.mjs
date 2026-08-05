import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveAffectedChanges } from "./affected_change_discovery.mjs";
import { selectAffectedTests } from "./affected_test_selection.mjs";
import { npmCommandSpec } from "./npm_command_spec.mjs";
import { verifyPackageBuildFingerprint } from "./package_build_fingerprint.mjs";

const repository = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const options = parseArgs(process.argv.slice(2));
const changes = await resolveAffectedChanges({
  repository,
  explicitBase: options.base,
  explicitPaths: options.paths,
});
const changedPaths = changes.paths;
const selection = selectAffectedTests(changedPaths, {
  scope: options.scope,
  pathExists: (relative) => existsSync(path.join(repository, relative)),
});

console.log(
  JSON.stringify(
    {
      schema_version: "affected-test-plan-v2",
      discovery: changes.discovery,
      changed_paths: changedPaths,
      ...selection,
      build_skipped: options.noBuild,
    },
    null,
    2,
  ),
);

if (options.list) process.exit(0);

if (selection.requires_build && options.noBuild) {
  await verifyPackageBuildFingerprint({ repositoryRoot: repository });
}

if (selection.requires_build && !options.noBuild) {
  await runNpm(["run", "build", "--workspace", "project-tiny-context-harness"]);
}

if (selection.mode === "full-suite") {
  await runNpm([
    "run",
    "test:built",
    "--workspace",
    "project-tiny-context-harness",
  ]);
} else if (selection.mode === "long-task-suite") {
  await runNpm([
    "run",
    "test:long-task-workflow:built",
    "--workspace",
    "project-tiny-context-harness",
  ]);
} else if (selection.mode === "trust-boundary") {
  if (selection.tests.length > 0) {
    await run(process.execPath, [
      "--test",
      "--test-concurrency=1",
      ...selection.tests,
    ]);
  }
  await runNpm([
    "run",
    "test:long-task-trust:built",
    "--workspace",
    "project-tiny-context-harness",
  ]);
} else if (selection.tests.length > 0) {
  await run(process.execPath, [
    "--test",
    "--test-concurrency=1",
    ...selection.tests,
  ]);
}

function parseArgs(args) {
  const result = {
    base: null,
    list: false,
    noBuild: false,
    paths: [],
    scope: "auto",
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--list") result.list = true;
    else if (argument === "--no-build") result.noBuild = true;
    else if (argument === "--base")
      result.base = requiredValue(args, ++index, argument);
    else if (argument === "--path")
      result.paths.push(requiredValue(args, ++index, argument));
    else if (argument === "--scope")
      result.scope = requiredValue(args, ++index, argument);
    else if (argument === "--help") {
      console.log(`Usage: node tools/run_affected_tests.mjs [options]

Options:
  --list                 Print the selected plan without running it
  --no-build             Reuse an existing dist build
  --base <ref>           Compare the current HEAD with a specific Git ref
  --path <path>          Supply a changed path directly; may be repeated
  --scope <scope>        auto | trust | long-task | delivery-contract | all
`);
      process.exit(0);
    } else throw new Error(`unknown argument: ${argument}`);
  }
  return result;
}

function requiredValue(args, index, flag) {
  const value = args[index];
  if (!value || value.startsWith("--"))
    throw new Error(`${flag} requires a value`);
  return value;
}

async function runNpm(args) {
  const spec = npmCommandSpec(args);
  await run(spec.command, spec.args, "npm");
}

async function run(command, args, displayCommand = command) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repository,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal)
        reject(new Error(`${displayCommand} terminated by ${signal}`));
      else if (code === 0) resolve();
      else reject(new Error(`${displayCommand} exited with code ${code ?? 1}`));
    });
  });
}
