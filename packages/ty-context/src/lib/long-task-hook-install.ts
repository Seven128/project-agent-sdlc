import { randomUUID } from "node:crypto";
import { promises as fs, type Stats } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SyncReport } from "./sync-engine.js";

const MANAGED_STATUS = "Tiny Context long-task live authority gate";
const PRE_TOOL_USE_MATCHER = "^(spawn_agent|Agent)$";
const LONG_TASK_IMPLEMENTATION_AGENT_MATCHER = "^long_task_implementation$";
const MANAGED_HOOK_EVENTS = [
  "PreToolUse",
  "SessionStart",
  "PostCompact",
  "Stop",
  "SubagentStart",
] as const;
const MANAGED_MATCHERS = new Set([
  PRE_TOOL_USE_MATCHER,
  LONG_TASK_IMPLEMENTATION_AGENT_MATCHER,
]);
const LEGACY_MANAGED_STATUSES = new Set([
  "Tiny Context long-task live authority gate",
  "Tiny Context long-task authority gate",
  "Tiny Context long-task completion gate",
  "Tiny Context composite completion gate",
]);
const LEGACY_REPO_LOCAL_COMMANDS = new Set([
  'node "$(git rev-parse --show-toplevel)/.codex/hooks/long-task-hook.mjs"',
  "powershell -NoProfile -Command \"$r=(git rev-parse --show-toplevel); node (Join-Path $r '.codex/hooks/long-task-hook.mjs')\"",
  "node .codex/hooks/long-task-hook.mjs",
  'node ".codex/hooks/long-task-hook.mjs"',
  "node .codex\\hooks\\long-task-hook.mjs",
  'node ".codex\\hooks\\long-task-hook.mjs"',
]);

export const LONG_TASK_HOOK_TRUST_REVIEW_NOTICE =
  "Codex Hook review required: open /hooks and trust the current Tiny Context project Hook before relying on PreToolUse, SubagentStart, SessionStart or Stop behavior. Tiny Context cannot observe or persist Codex Hook trust.";

export interface LongTaskHookFileOperations {
  lstat(target: string): Promise<Stats>;
  readFile(target: string, encoding: "utf8"): Promise<string>;
  mkdir(target: string, options: { recursive: true }): Promise<unknown>;
  writeFile(
    target: string,
    content: string,
    options: { flag: "wx" },
  ): Promise<void>;
  rename(source: string, destination: string): Promise<void>;
  rm(target: string, options: { force: true }): Promise<void>;
  randomId(): string;
}

const DEFAULT_FILE_OPERATIONS: LongTaskHookFileOperations = {
  lstat: (target) => fs.lstat(target),
  readFile: (target, encoding) => fs.readFile(target, encoding),
  mkdir: (target, options) => fs.mkdir(target, options),
  writeFile: (target, content, options) =>
    fs.writeFile(target, content, options),
  rename: (source, destination) => fs.rename(source, destination),
  rm: (target, options) => fs.rm(target, options),
  randomId: () => randomUUID(),
};

type HookTargetSnapshot =
  { kind: "absent" } | { kind: "regular"; content: string };

type LegacyScriptSnapshot = { kind: "absent" } | { kind: "regular" };

export async function installLongTaskHooks(
  projectRoot: string,
  report: SyncReport,
  fileOperations: Partial<LongTaskHookFileOperations> = {},
): Promise<void> {
  const operations = operationsWith(fileOperations);
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  const entry = path.join(packageRoot, "dist", "long-task-hook.js");
  const entryStatus = await lstatOrNull(entry, operations);
  if (!entryStatus || entryStatus.isSymbolicLink() || !entryStatus.isFile()) {
    report.blocked.push("package-owned dist/long-task-hook.js is missing");
    return;
  }

  const config = path.join(projectRoot, ".codex", "hooks.json");
  const legacyScript = path.join(
    projectRoot,
    ".codex",
    "hooks",
    "long-task-hook.mjs",
  );
  try {
    const legacy = await inspectLegacyScript(projectRoot, operations);
    const loaded = await readHookConfig(projectRoot, true, operations);
    const command = packageOwnedCommand(entry);
    const packageHooksWereCurrent = packageHooksAreCurrent(
      loaded.root,
      command,
    );
    const next = mergeManagedHooks(loaded.root, command);
    const content = `${JSON.stringify(next, null, 2)}\n`;

    if (
      loaded.snapshot.kind === "regular" &&
      loaded.snapshot.content === content
    ) {
      report.skipped.push(".codex/hooks.json");
    } else {
      await publishHookConfig(config, loaded.snapshot, content, operations);
      report.changed.push(".codex/hooks.json");
      if (!packageHooksWereCurrent) addNotice(report);
    }
    await removeLegacyScriptIfPresent(
      projectRoot,
      legacyScript,
      legacy,
      report,
      operations,
    );
  } catch (error) {
    report.blocked.push(`.codex/hooks.json: ${message(error)}`);
  }
}

export async function uninstallLongTaskHooks(
  projectRoot: string,
  report: SyncReport,
  fileOperations: Partial<LongTaskHookFileOperations> = {},
): Promise<void> {
  const operations = operationsWith(fileOperations);
  const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
  const command = packageOwnedCommand(
    path.join(packageRoot, "dist", "long-task-hook.js"),
  );
  const config = path.join(projectRoot, ".codex", "hooks.json");
  const legacyScript = path.join(
    projectRoot,
    ".codex",
    "hooks",
    "long-task-hook.mjs",
  );
  try {
    const legacy = await inspectLegacyScript(projectRoot, operations);
    const loaded = await readHookConfig(projectRoot, false, operations);
    let removed = 0;
    const hooks = hookMap(loaded.root);
    for (const event of MANAGED_HOOK_EVENTS) {
      if (!Array.isArray(hooks[event])) continue;
      const cleaned = removeManagedHookEntries(hooks[event], command);
      removed += cleaned.removed;
      if (cleaned.groups.length) hooks[event] = cleaned.groups;
      else delete hooks[event];
    }
    if (removed > 0 && loaded.snapshot.kind === "regular") {
      loaded.root.hooks = hooks;
      if (
        Object.keys(hooks).length === 0 &&
        Object.keys(loaded.root).length === 1
      )
        await removeHookConfig(config, loaded.snapshot, operations);
      else
        await publishHookConfig(
          config,
          loaded.snapshot,
          `${JSON.stringify(loaded.root, null, 2)}\n`,
          operations,
        );
      report.changed.push(".codex/hooks.json");
    }
    await removeLegacyScriptIfPresent(
      projectRoot,
      legacyScript,
      legacy,
      report,
      operations,
    );
  } catch (error) {
    report.blocked.push(`.codex/hooks.json: ${message(error)}`);
  }
}

export function packageOwnedCommand(entry: string): string {
  return `node "${path.resolve(entry).replace(/"/gu, '\\"')}"`;
}

export function removeManagedHookEntries(
  groups: unknown,
  currentPackageCommand = "",
): { groups: unknown[]; removed: number } {
  if (!Array.isArray(groups)) return { groups: [], removed: 0 };
  const retained: unknown[] = [];
  let removed = 0;
  for (const groupValue of groups) {
    if (!isObject(groupValue) || !Array.isArray(groupValue.hooks)) {
      retained.push(groupValue);
      continue;
    }
    const hooks = groupValue.hooks.filter((entry) => {
      if (!isManagedHookEntry(entry, currentPackageCommand)) return true;
      removed += 1;
      return false;
    });
    if (hooks.length > 0) {
      retained.push({ ...groupValue, hooks });
      continue;
    }
    const keys = Object.keys(groupValue);
    if (keys.every((key) => key === "hooks")) continue;
    if (
      MANAGED_MATCHERS.has(String(groupValue.matcher ?? "")) &&
      keys.every((key) => key === "matcher" || key === "hooks")
    )
      continue;
    retained.push({ ...groupValue, hooks });
  }
  return { groups: retained, removed };
}

export function isManagedHookEntry(
  entry: unknown,
  currentPackageCommand = "",
): boolean {
  const row = object(entry);
  if (row.type !== "command") return false;
  const commands = [row.command, row.commandWindows]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim());
  if (commands.some((command) => LEGACY_REPO_LOCAL_COMMANDS.has(command)))
    return true;
  const status = String(row.statusMessage ?? "");
  if (!LEGACY_MANAGED_STATUSES.has(status)) return false;
  return commands.some(
    (command) =>
      (Boolean(currentPackageCommand) && command === currentPackageCommand) ||
      isHistoricalPackageOwnedCommand(command),
  );
}

function mergeManagedHooks(
  root: Record<string, unknown>,
  command: string,
): Record<string, unknown> {
  const hooks = hookMap(root);
  root.hooks = hooks;
  for (const event of MANAGED_HOOK_EVENTS) {
    const current = hooks[event];
    if (current !== undefined && !Array.isArray(current))
      throw new Error(`hook_event_not_array:${event}`);
    const cleaned = removeManagedHookEntries(current ?? [], command);
    cleaned.groups.push(managedHookGroup(event, command));
    hooks[event] = cleaned.groups;
  }
  return root;
}

function managedHookGroup(
  event: (typeof MANAGED_HOOK_EVENTS)[number],
  command: string,
) {
  return {
    ...(event === "PreToolUse" ? { matcher: PRE_TOOL_USE_MATCHER } : {}),
    ...(event === "SubagentStart"
      ? { matcher: LONG_TASK_IMPLEMENTATION_AGENT_MATCHER }
      : {}),
    hooks: [
      {
        type: "command",
        command,
        commandWindows: command,
        timeout: event === "Stop" ? 3600 : 10,
        statusMessage: MANAGED_STATUS,
      },
    ],
  };
}

function packageHooksAreCurrent(
  root: Record<string, unknown>,
  command: string,
): boolean {
  let hooks: Record<string, unknown>;
  try {
    hooks = hookMap(root);
  } catch {
    return false;
  }
  return MANAGED_HOOK_EVENTS.every((event) => {
    const groups = hooks[event];
    if (!Array.isArray(groups)) return false;
    const matches: Array<{
      group: Record<string, unknown>;
      entry: Record<string, unknown>;
    }> = [];
    for (const groupValue of groups) {
      if (!isObject(groupValue) || !Array.isArray(groupValue.hooks)) continue;
      for (const entryValue of groupValue.hooks) {
        if (!isManagedHookEntry(entryValue, command)) continue;
        matches.push({ group: groupValue, entry: object(entryValue) });
      }
    }
    if (matches.length !== 1) return false;
    const [{ group, entry }] = matches;
    const expectedMatcher =
      event === "PreToolUse"
        ? PRE_TOOL_USE_MATCHER
        : event === "SubagentStart"
          ? LONG_TASK_IMPLEMENTATION_AGENT_MATCHER
          : undefined;
    return (
      entry.type === "command" &&
      entry.command === command &&
      entry.commandWindows === command &&
      entry.timeout === (event === "Stop" ? 3600 : 10) &&
      entry.statusMessage === MANAGED_STATUS &&
      (expectedMatcher === undefined
        ? !Object.hasOwn(group, "matcher")
        : group.matcher === expectedMatcher)
    );
  });
}

async function readHookConfig(
  projectRoot: string,
  createDirectory: boolean,
  operations: LongTaskHookFileOperations,
): Promise<{
  root: Record<string, unknown>;
  snapshot: HookTargetSnapshot;
}> {
  const directory = await inspectCodexDirectory(
    projectRoot,
    createDirectory,
    operations,
  );
  if (directory === "absent") return { root: {}, snapshot: { kind: "absent" } };
  const config = path.join(projectRoot, ".codex", "hooks.json");
  const status = await lstatOrNull(config, operations);
  if (!status) return { root: {}, snapshot: { kind: "absent" } };
  if (status.isSymbolicLink())
    throw new Error("destination_symlink_or_junction");
  if (!status.isFile()) throw new Error("destination_not_regular_file");
  const content = await operations.readFile(config, "utf8");
  let decoded: unknown;
  try {
    decoded = JSON.parse(content);
  } catch {
    throw new Error("invalid JSON");
  }
  if (!isObject(decoded)) throw new Error("root_not_object");
  hookMap(decoded);
  return { root: decoded, snapshot: { kind: "regular", content } };
}

function hookMap(root: Record<string, unknown>): Record<string, unknown> {
  if (root.hooks === undefined) return {};
  if (!isObject(root.hooks)) throw new Error("hooks_not_object");
  return root.hooks;
}

async function inspectCodexDirectory(
  projectRoot: string,
  create: boolean,
  operations: LongTaskHookFileOperations,
): Promise<"regular" | "absent"> {
  const directory = path.join(projectRoot, ".codex");
  let status = await lstatOrNull(directory, operations);
  if (!status && create) {
    await operations.mkdir(directory, { recursive: true });
    status = await lstatOrNull(directory, operations);
  }
  if (!status) return "absent";
  if (status.isSymbolicLink())
    throw new Error("parent_symlink_or_junction:.codex");
  if (!status.isDirectory()) throw new Error("parent_not_directory:.codex");
  return "regular";
}

async function inspectLegacyScript(
  projectRoot: string,
  operations: LongTaskHookFileOperations,
): Promise<LegacyScriptSnapshot> {
  if (
    (await inspectCodexDirectory(projectRoot, false, operations)) === "absent"
  )
    return { kind: "absent" };
  const parent = path.join(projectRoot, ".codex", "hooks");
  const parentStatus = await lstatOrNull(parent, operations);
  if (!parentStatus) return { kind: "absent" };
  if (parentStatus.isSymbolicLink())
    throw new Error("legacy_parent_symlink_or_junction");
  if (!parentStatus.isDirectory())
    throw new Error("legacy_parent_not_directory");
  const target = path.join(parent, "long-task-hook.mjs");
  const targetStatus = await lstatOrNull(target, operations);
  if (!targetStatus) return { kind: "absent" };
  if (targetStatus.isSymbolicLink())
    throw new Error("legacy_hook_symlink_or_junction");
  if (!targetStatus.isFile()) throw new Error("legacy_hook_not_regular_file");
  return { kind: "regular" };
}

async function removeLegacyScriptIfPresent(
  projectRoot: string,
  target: string,
  initial: LegacyScriptSnapshot,
  report: SyncReport,
  operations: LongTaskHookFileOperations,
): Promise<void> {
  if (initial.kind === "absent") return;
  const current = await inspectLegacyScript(projectRoot, operations);
  if (current.kind !== "regular")
    throw new Error("legacy_hook_changed_before_delete");
  await operations.rm(target, { force: true });
  report.changed.push(".codex/hooks/long-task-hook.mjs");
}

async function publishHookConfig(
  target: string,
  initial: HookTargetSnapshot,
  content: string,
  operations: LongTaskHookFileOperations,
): Promise<void> {
  const temp = `${target}.tmp-${process.pid}-${operations.randomId()}`;
  let renamed = false;
  try {
    await operations.writeFile(temp, content, { flag: "wx" });
    await assertTargetUnchanged(target, initial, operations);
    await operations.rename(temp, target);
    renamed = true;
  } finally {
    if (!renamed) await operations.rm(temp, { force: true }).catch(() => {});
  }
}

async function removeHookConfig(
  target: string,
  initial: HookTargetSnapshot,
  operations: LongTaskHookFileOperations,
): Promise<void> {
  await assertTargetUnchanged(target, initial, operations);
  await operations.rm(target, { force: true });
}

async function assertTargetUnchanged(
  target: string,
  initial: HookTargetSnapshot,
  operations: LongTaskHookFileOperations,
): Promise<void> {
  const projectRoot = path.dirname(path.dirname(target));
  await inspectCodexDirectory(projectRoot, false, operations);
  const status = await lstatOrNull(target, operations);
  if (initial.kind === "absent") {
    if (status) throw new Error("concurrent change: destination appeared");
    return;
  }
  if (!status || status.isSymbolicLink() || !status.isFile())
    throw new Error("concurrent change: destination type changed");
  if ((await operations.readFile(target, "utf8")) !== initial.content)
    throw new Error("concurrent change: destination content changed");
}

function addNotice(report: SyncReport): void {
  (report.notices ??= []).push(LONG_TASK_HOOK_TRUST_REVIEW_NOTICE);
}

function operationsWith(
  overrides: Partial<LongTaskHookFileOperations>,
): LongTaskHookFileOperations {
  return { ...DEFAULT_FILE_OPERATIONS, ...overrides };
}

async function lstatOrNull(
  target: string,
  operations: LongTaskHookFileOperations,
): Promise<Stats | null> {
  try {
    return await operations.lstat(target);
  } catch (error) {
    if (code(error) === "ENOENT") return null;
    throw error;
  }
}

function isHistoricalPackageOwnedCommand(command: string): boolean {
  const match = /^node "([^"\r\n]+)"$/u.exec(command);
  if (!match) return false;
  const absolute = match[1];
  if (
    !path.isAbsolute(absolute) &&
    !path.win32.isAbsolute(absolute) &&
    !path.posix.isAbsolute(absolute)
  )
    return false;
  const normalized = absolute.replace(/\\/gu, "/");
  return (
    /\/node_modules\/project-tiny-context-harness\/dist\/long-task-hook\.js$/u.test(
      normalized,
    ) || /\/packages\/ty-context\/dist\/long-task-hook\.js$/u.test(normalized)
  );
}

function object(value: unknown): Record<string, unknown> {
  return isObject(value) ? value : {};
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function code(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
