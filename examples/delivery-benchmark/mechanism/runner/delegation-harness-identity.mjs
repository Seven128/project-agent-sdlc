import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  isManagedHookEntry,
  packageOwnedCommand,
} from "../../../../packages/ty-context/dist/lib/long-task-hook-install.js";
import { verifyPackageBuildFingerprint } from "../../../../tools/package_build_fingerprint.mjs";
import { digest, readRegularContained } from "./delegation-guidance-io.mjs";
import { REPO_ROOT } from "./shared.mjs";

const CLI_RELATIVE = "packages/ty-context/dist/cli.js";
const HOOK_RELATIVE = "packages/ty-context/dist/long-task-hook.js";
const EVENTS = [
  ["PreToolUse", "^(spawn_agent|Agent)$", 10],
  ["SessionStart", null, 10],
  ["PostCompact", null, 10],
  ["Stop", null, 3600],
  ["SubagentStart", "^long_task_implementation$", 10],
];

export async function preflightDelegationHarnessRuntime(harnessCli, repoRoot = REPO_ROOT) {
  const root = path.resolve(repoRoot);
  const expectedCli = path.join(root, ...CLI_RELATIVE.split("/"));
  if (!samePath(harnessCli, expectedCli))
    throw new Error("delegation_formal_harness_cli_mismatch");
  const [cliBytes, hookBytes, build, packageJson] = await Promise.all([
    readRegularContained(root, expectedCli),
    readRegularContained(root, path.join(root, ...HOOK_RELATIVE.split("/"))),
    verifyPackageBuildFingerprint({ repositoryRoot: root }),
    readFile(path.join(root, "packages/ty-context/package.json"), "utf8").then(JSON.parse),
  ]);
  return {
    schema_version: "tiny-context-delegation-harness-runtime-v1",
    package_version: packageJson.version,
    build_input_sha256: build.input_sha256,
    build_dist_sha256: build.dist_sha256,
    cli_relative_path: CLI_RELATIVE,
    cli_content_sha256: digest(cliBytes),
    hook_relative_path: HOOK_RELATIVE,
    hook_content_sha256: digest(hookBytes),
  };
}

export async function finalizeDelegationHarnessRuntime(runDir, base, repoRoot = REPO_ROOT) {
  const root = path.resolve(repoRoot);
  const current = await preflightDelegationHarnessRuntime(
    path.join(root, ...CLI_RELATIVE.split("/")),
    root,
  );
  if (JSON.stringify(current) !== JSON.stringify(base))
    throw new Error("delegation_harness_build_changed_during_prepare");
  const hookPath = path.join(root, ...HOOK_RELATIVE.split("/"));
  const command = packageOwnedCommand(hookPath);
  const configBytes = await readRegularContained(
    runDir,
    path.join(runDir, ".codex", "hooks.json"),
  );
  let config;
  try {
    config = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(configBytes));
  } catch {
    throw new Error("delegation_prepared_hook_config_invalid");
  }
  const hookBindings = EVENTS.map(([event, matcher, timeout]) =>
    inspectEvent(config, event, matcher, timeout, command),
  );
  const identity = {
    ...base,
    hook_command_sha256: digest(command),
    hook_bindings_sha256: digest(JSON.stringify(hookBindings)),
  };
  return { ...identity, identity_sha256: digest(JSON.stringify(identity)) };
}

export async function delegationHarnessIdentityMetrics(expected, runDir) {
  try {
    const root = REPO_ROOT;
    const base = await preflightDelegationHarnessRuntime(
      path.join(root, ...CLI_RELATIVE.split("/")),
      root,
    );
    const current = await finalizeDelegationHarnessRuntime(runDir, base, root);
    return {
      correct: JSON.stringify(expected) === JSON.stringify(current),
      expected,
      current,
    };
  } catch (error) {
    return {
      correct: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

function inspectEvent(config, event, matcher, timeout, command) {
  const groups = config?.hooks?.[event];
  if (!Array.isArray(groups))
    throw new Error(`delegation_prepared_hook_event_missing:${event}`);
  const matches = [];
  for (const group of groups) {
    if (!group || typeof group !== "object" || !Array.isArray(group.hooks)) continue;
    for (const entry of group.hooks) {
      if (!isManagedHookEntry(entry, command)) continue;
      if (
        entry.command === command &&
        entry.commandWindows === command &&
        entry.timeout === timeout &&
        (matcher === null ? !Object.hasOwn(group, "matcher") : group.matcher === matcher)
      )
        matches.push(entry);
    }
  }
  if (matches.length !== 1)
    throw new Error(`delegation_prepared_hook_binding_mismatch:${event}`);
  return { event, matcher, timeout, command_sha256: digest(command) };
}

function samePath(left, right) {
  const normalize = (value) => {
    const resolved = path.resolve(value ?? "").replace(/\\/gu, "/");
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}
