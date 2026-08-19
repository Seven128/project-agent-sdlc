import { randomUUID } from "node:crypto";
import { promises as fs, type Stats } from "node:fs";
import path from "node:path";
import { parse as parseToml } from "smol-toml";
import { packageAssetPath } from "./paths.js";
import type { SyncReport } from "./sync-engine.js";

export const LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH =
  ".codex/agents/long-task-implementation.toml";
export const LONG_TASK_CODEX_AGENT_PROFILE_MANAGED_MARKER =
  "# ty-context:managed:long-task-implementation-worker";

const ASSET_SEGMENTS = ["agents", "long-task-implementation.toml"] as const;
const PROFILE_ROOT_FIELDS = new Set([
  "name",
  "description",
  "developer_instructions",
  "model",
  "model_reasoning_effort",
  "agents",
]);
const PROFILE_AGENT_FIELDS = new Set(["enabled"]);

export interface LongTaskCodexAgentProfile {
  name: "long_task_implementation";
  description: string;
  developer_instructions: string;
  model: string;
  model_reasoning_effort: string;
  agents: { enabled: false };
}

export type LongTaskCodexAgentProfileValidation =
  | { valid: true; profile: LongTaskCodexAgentProfile }
  | { valid: false; errors: string[] };

export type LongTaskCodexAgentProfileAvailability =
  | {
      available: true;
      relativePath: typeof LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH;
    }
  | { available: false; reason: string };

export interface LongTaskCodexAgentProfileFileOperations {
  lstat(target: string): Promise<Stats>;
  realpath(target: string): Promise<string>;
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

const DEFAULT_FILE_OPERATIONS: LongTaskCodexAgentProfileFileOperations = {
  lstat: (target) => fs.lstat(target),
  realpath: (target) => fs.realpath(target),
  readFile: (target, encoding) => fs.readFile(target, encoding),
  mkdir: (target, options) => fs.mkdir(target, options),
  writeFile: (target, content, options) =>
    fs.writeFile(target, content, options),
  rename: (source, destination) => fs.rename(source, destination),
  rm: (target, options) => fs.rm(target, options),
  randomId: () => randomUUID(),
};

export function parseAndValidateLongTaskCodexAgentProfile(
  content: string,
): LongTaskCodexAgentProfileValidation {
  const errors: string[] = [];
  const normalized = content.replace(/\r\n/gu, "\n");
  if (!hasManagedMarker(normalized))
    errors.push("managed_marker_missing_or_invalid");

  let decoded: unknown;
  try {
    decoded = parseToml(normalized);
  } catch {
    return { valid: false, errors: [...errors, "toml_invalid"] };
  }
  const root = record(decoded);
  if (!root) return { valid: false, errors: [...errors, "profile_not_table"] };

  for (const key of Object.keys(root).sort())
    if (!PROFILE_ROOT_FIELDS.has(key)) errors.push(`unsupported_field:${key}`);
  if (root.name !== "long_task_implementation")
    errors.push("name_must_be_long_task_implementation");
  if (!nonEmptyString(root.description)) errors.push("description_required");
  if (!nonEmptyString(root.developer_instructions))
    errors.push("developer_instructions_required");
  if (!staticString(root.model)) errors.push("model_must_be_static_nonempty");
  if (!staticString(root.model_reasoning_effort))
    errors.push("model_reasoning_effort_must_be_static_nonempty");

  const agents = record(root.agents);
  if (!agents) errors.push("agents_table_required");
  else {
    for (const key of Object.keys(agents).sort())
      if (!PROFILE_AGENT_FIELDS.has(key))
        errors.push(`unsupported_agents_field:${key}`);
    if (agents.enabled !== false) errors.push("agents_enabled_must_be_false");
  }
  if (errors.length) return { valid: false, errors };
  return {
    valid: true,
    profile: {
      name: "long_task_implementation",
      description: root.description as string,
      developer_instructions: root.developer_instructions as string,
      model: root.model as string,
      model_reasoning_effort: root.model_reasoning_effort as string,
      agents: { enabled: false },
    },
  };
}

export async function syncLongTaskCodexAgentProfile(
  projectRoot: string,
  resolvedHarnessRoot: string,
  enabled: boolean,
  report: SyncReport,
  fileOperations: Partial<LongTaskCodexAgentProfileFileOperations> = {},
): Promise<void> {
  if (resolvedHarnessRoot !== ".codex") return;
  const operations = operationsWith(fileOperations);
  const asset = await readValidPackageProfile(operations);
  if (!asset.valid) {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: optional package asset ${asset.reason}`,
    );
    return;
  }
  const destination = path.join(
    projectRoot,
    LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
  );
  if (!enabled) {
    await removeManagedProfile(projectRoot, destination, report, operations);
    return;
  }

  const inspected = await inspectProfileDestination(
    projectRoot,
    destination,
    operations,
  );
  if (inspected.kind === "conflict") {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: optional adapter conflict (${inspected.reason})`,
    );
    return;
  }
  let previous: string | null = null;
  if (inspected.kind === "regular") {
    previous = await operations.readFile(destination, "utf8");
    if (!hasManagedMarker(previous)) {
      report.skipped.push(
        `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: user-owned (managed marker absent)`,
      );
      return;
    }
    if (previous === asset.content) {
      report.skipped.push(LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH);
      return;
    }
  }

  try {
    await atomicWriteLongTaskCodexAgentProfile(
      destination,
      asset.content,
      operations,
      async () => {
        const current = await inspectProfileDestination(
          projectRoot,
          destination,
          operations,
        );
        if (previous === null && current.kind !== "absent")
          throw new Error("destination_changed_before_rename");
        if (previous !== null) {
          if (current.kind !== "regular")
            throw new Error("destination_changed_before_rename");
          if ((await operations.readFile(destination, "utf8")) !== previous)
            throw new Error("destination_content_changed_before_rename");
        }
      },
    );
    report.changed.push(LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH);
  } catch (error) {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: optional adapter write failed (${message(error)})`,
    );
  }
}

export async function longTaskCodexAgentProfileBootstrapPaths(
  projectRoot: string,
  resolvedHarnessRoot: string,
  enabled: boolean,
  fileOperations: Partial<LongTaskCodexAgentProfileFileOperations> = {},
): Promise<string[]> {
  const availability = await inspectLongTaskCodexAgentProfileAvailability(
    projectRoot,
    resolvedHarnessRoot,
    enabled,
    fileOperations,
  );
  return availability.available ? [availability.relativePath] : [];
}

export async function inspectLongTaskCodexAgentProfileAvailability(
  projectRoot: string,
  resolvedHarnessRoot: string,
  enabled: boolean,
  fileOperations: Partial<LongTaskCodexAgentProfileFileOperations> = {},
): Promise<LongTaskCodexAgentProfileAvailability> {
  if (!enabled) return { available: false, reason: "profile_disabled" };
  if (resolvedHarnessRoot !== ".codex")
    return { available: false, reason: "unsupported_harness_root" };
  const operations = operationsWith(fileOperations);
  const asset = await readValidPackageProfile(operations);
  if (!asset.valid)
    return {
      available: false,
      reason: `package_asset_${normalizeReason(asset.reason)}`,
    };
  const destination = path.join(
    projectRoot,
    LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
  );
  const inspected = await inspectProfileDestination(
    projectRoot,
    destination,
    operations,
  );
  if (inspected.kind === "absent")
    return { available: false, reason: "installed_profile_missing" };
  if (inspected.kind === "conflict")
    return {
      available: false,
      reason: `installed_profile_conflict:${inspected.reason}`,
    };
  const existing = await operations.readFile(destination, "utf8");
  const validation = parseAndValidateLongTaskCodexAgentProfile(existing);
  if (!validation.valid)
    return {
      available: false,
      reason: `installed_profile_invalid:${validation.errors.join(",")}`,
    };
  if (existing !== asset.content)
    return { available: false, reason: "installed_profile_outdated" };
  return {
    available: true,
    relativePath: LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH,
  };
}

export function isManagedLongTaskCodexAgentProfile(content: string): boolean {
  return parseAndValidateLongTaskCodexAgentProfile(content).valid;
}

export async function atomicWriteLongTaskCodexAgentProfile(
  destination: string,
  content: string,
  operations: LongTaskCodexAgentProfileFileOperations = DEFAULT_FILE_OPERATIONS,
  beforeRename: () => Promise<void> = async () => undefined,
): Promise<void> {
  await operations.mkdir(path.dirname(destination), { recursive: true });
  const temp = `${destination}.tmp-${process.pid}-${operations.randomId()}`;
  let renamed = false;
  try {
    await operations.writeFile(temp, content, { flag: "wx" });
    await beforeRename();
    await operations.rename(temp, destination);
    renamed = true;
  } finally {
    if (!renamed) await operations.rm(temp, { force: true }).catch(() => {});
  }
}

async function removeManagedProfile(
  projectRoot: string,
  destination: string,
  report: SyncReport,
  operations: LongTaskCodexAgentProfileFileOperations,
): Promise<void> {
  const inspected = await inspectProfileDestination(
    projectRoot,
    destination,
    operations,
  );
  if (inspected.kind === "absent") return;
  if (inspected.kind === "conflict") {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: optional adapter conflict (${inspected.reason})`,
    );
    return;
  }
  const existing = await operations.readFile(destination, "utf8");
  if (!hasManagedMarker(existing)) {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: user-owned (managed marker absent)`,
    );
    return;
  }
  const current = await inspectProfileDestination(
    projectRoot,
    destination,
    operations,
  );
  if (
    current.kind !== "regular" ||
    (await operations.readFile(destination, "utf8")) !== existing
  ) {
    report.skipped.push(
      `${LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH}: optional adapter changed before disable`,
    );
    return;
  }
  await operations.rm(destination, { force: true });
  report.changed.push(LONG_TASK_CODEX_AGENT_PROFILE_RELATIVE_PATH);
}

async function readValidPackageProfile(
  operations: LongTaskCodexAgentProfileFileOperations,
): Promise<
  { valid: true; content: string } | { valid: false; reason: string }
> {
  const source = packageAssetPath(...ASSET_SEGMENTS);
  const sourceStat = await lstatOrNull(source, operations);
  if (!sourceStat) return { valid: false, reason: "unavailable" };
  if (sourceStat.isSymbolicLink() || !sourceStat.isFile())
    return { valid: false, reason: "is not a regular file" };
  const content = await operations.readFile(source, "utf8");
  const validation = parseAndValidateLongTaskCodexAgentProfile(content);
  if (!validation.valid)
    return {
      valid: false,
      reason: `is invalid (${validation.errors.join(",")})`,
    };
  return { valid: true, content };
}

async function inspectProfileDestination(
  projectRoot: string,
  destination: string,
  operations: LongTaskCodexAgentProfileFileOperations,
): Promise<
  | { kind: "absent" }
  | { kind: "regular" }
  | { kind: "conflict"; reason: string }
> {
  const lexicalRoot = path.resolve(projectRoot);
  const canonicalRoot = await operations.realpath(lexicalRoot);
  let cursor = lexicalRoot;
  for (const segment of [".codex", "agents"]) {
    cursor = path.join(cursor, segment);
    const status = await lstatOrNull(cursor, operations);
    if (!status) continue;
    if (status.isSymbolicLink())
      return { kind: "conflict", reason: `parent_symlink:${segment}` };
    if (!status.isDirectory())
      return { kind: "conflict", reason: `parent_not_directory:${segment}` };
    if (!inside(canonicalRoot, await operations.realpath(cursor)))
      return {
        kind: "conflict",
        reason: `parent_outside_repository:${segment}`,
      };
  }

  const status = await lstatOrNull(destination, operations);
  if (!status) return { kind: "absent" };
  if (status.isSymbolicLink())
    return { kind: "conflict", reason: "destination_symlink" };
  if (!status.isFile())
    return { kind: "conflict", reason: "destination_not_regular_file" };
  if (!inside(canonicalRoot, await operations.realpath(destination)))
    return { kind: "conflict", reason: "destination_outside_repository" };
  return { kind: "regular" };
}

function operationsWith(
  overrides: Partial<LongTaskCodexAgentProfileFileOperations>,
): LongTaskCodexAgentProfileFileOperations {
  return { ...DEFAULT_FILE_OPERATIONS, ...overrides };
}

async function lstatOrNull(
  target: string,
  operations: LongTaskCodexAgentProfileFileOperations,
): Promise<Stats | null> {
  try {
    return await operations.lstat(target);
  } catch (error) {
    if (code(error) === "ENOENT") return null;
    throw error;
  }
}

function inside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function staticString(value: unknown): value is string {
  return (
    nonEmptyString(value) &&
    value === value.trim() &&
    !/[\r\n$%{}]/u.test(value)
  );
}

function hasManagedMarker(content: string): boolean {
  return (
    content.replace(/\r\n/gu, "\n").split("\n", 1)[0] ===
    LONG_TASK_CODEX_AGENT_PROFILE_MANAGED_MARKER
  );
}

function code(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeReason(reason: string): string {
  return reason.replace(/[^a-z0-9:_-]+/giu, "_").replace(/^_+|_+$/gu, "");
}
