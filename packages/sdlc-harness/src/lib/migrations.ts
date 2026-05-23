import path from "node:path";
import { rm } from "node:fs/promises";
import { readConfig } from "./config.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { harnessConfigPath, harnessPath, harnessRoot } from "./harness-root.js";
import type { ManagedFile } from "./types.js";
import { parseYaml, stringifyYaml } from "./yaml.js";

export const CURRENT_SCHEMA_VERSION = "1";

export interface Migration {
  from: string;
  to: string;
  description: string;
}

export const migrations: Migration[] = [];

export interface MigrationReport {
  changed: string[];
  skipped: string[];
}

export async function runMigrations(projectRoot: string): Promise<MigrationReport> {
  const report: MigrationReport = { changed: [], skipped: [] };
  const root = await harnessRoot(projectRoot);
  await migrateConfig(projectRoot, root, report);
  await migratePlan(projectRoot, root, report, "plan.yaml", "tasks.yaml");
  await migratePlan(projectRoot, root, report, "plan.draft.yaml", "tasks.draft.yaml");
  await removeLegacyCheckpoints(projectRoot, root, report);
  await ensureMemory(projectRoot, root, report);
  return report;
}

async function migrateConfig(projectRoot: string, root: string, report: MigrationReport): Promise<void> {
  const relativeConfigPath = await harnessConfigPath(projectRoot);
  const configPath = path.join(projectRoot, relativeConfigPath);
  if (!(await pathExists(configPath))) {
    report.skipped.push(relativeConfigPath);
    return;
  }
  const config = await readConfig(projectRoot);
  config.core.schema_version = CURRENT_SCHEMA_VERSION;
  config.managed_files = migrateManagedFiles(config.managed_files, root);
  config.local_overrides = config.local_overrides.map((item) =>
    item === ".harness/policies/*.local.yaml" ? harnessPath(root, "managed", "policies", "*.local.yaml") : item
  );
  if (await writeTextIfChanged(configPath, stringifyYaml(config))) {
    report.changed.push(relativeConfigPath);
  } else {
    report.skipped.push(relativeConfigPath);
  }
}

function migrateManagedFiles(managedFiles: ManagedFile[], root: string): ManagedFile[] {
  const migrated: ManagedFile[] = [];
  const seen = new Set<string>();
  const push = (item: ManagedFile) => {
    if (seen.has(item.path)) {
      return;
    }
    seen.add(item.path);
    migrated.push(item);
  };

  for (const item of managedFiles) {
    if (item.path === ".agents/skills" || item.path === ".harness/agents/skills") {
      push({ path: harnessPath(root, "skills"), strategy: "managed" });
      continue;
    }
    if (item.path === ".harness/templates") {
      push({ path: harnessPath(root, "managed", "templates"), strategy: "managed" });
      continue;
    }
    if (item.path === ".harness/policies") {
      push({ path: harnessPath(root, "managed", "policies"), strategy: "merge-with-local" });
      continue;
    }
    if (item.path === ".harness/make/sdlc-harness.mk") {
      push({ path: harnessPath(root, "managed", "make", "sdlc-harness.mk"), strategy: "managed" });
      continue;
    }
    push(item);
  }

  return migrated;
}

async function migratePlan(
  projectRoot: string,
  root: string,
  report: MigrationReport,
  planFileName: string,
  legacyFileName: string
): Promise<void> {
  const relativePlanPath = harnessPath(root, "state", planFileName);
  const planPath = path.join(projectRoot, relativePlanPath);
  const legacyTasksPath = path.join(projectRoot, harnessPath(root, "state", legacyFileName));
  const sourcePath = (await pathExists(planPath)) ? planPath : legacyTasksPath;
  if (!(await pathExists(sourcePath))) {
    report.skipped.push(relativePlanPath);
    return;
  }
  const data = (parseYaml(await readText(sourcePath)) ?? {}) as Record<string, unknown>;
  let changed = false;
  if (!("current_phase" in data)) {
    data.current_phase = "SPRINTING";
    changed = true;
  }
  if (!("current_task_id" in data)) {
    data.current_task_id = "";
    changed = true;
  }
  if (!Array.isArray(data.tasks)) {
    data.tasks = [];
    changed = true;
  }
  if (Array.isArray(data.tasks)) {
    for (const task of data.tasks) {
      if (!isRecord(task)) continue;
      if ("checkpoint" in task) {
        const checkpoint = String(task.checkpoint ?? "");
        if (isOpenTask(task) && checkpoint) {
          const contract = await readLegacyCheckpointContract(projectRoot, root, checkpoint);
          for (const field of ["allowed_paths", "required_gates", "acceptance_criteria"]) {
            if (!(field in task) && Array.isArray(contract[field])) {
              task[field] = contract[field];
            }
          }
        }
        delete task.checkpoint;
        changed = true;
      }
    }
  }
  if (changed || sourcePath !== planPath) {
    if (await writeTextIfChanged(planPath, stringifyYaml(data))) {
      report.changed.push(relativePlanPath);
    } else {
      report.skipped.push(relativePlanPath);
    }
    if (sourcePath !== planPath) {
      await rm(sourcePath, { force: true });
      report.changed.push(path.relative(projectRoot, sourcePath));
    }
  } else {
    report.skipped.push(relativePlanPath);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isOpenTask(task: Record<string, unknown>): boolean {
  return ["pending", "in_progress", "blocked", "pending_revision"].includes(String(task.status));
}

async function readLegacyCheckpointContract(
  projectRoot: string,
  root: string,
  checkpoint: string
): Promise<Record<string, unknown>> {
  const relative = checkpoint.replace("<harnessRoot>", root);
  const checkpointPath = path.join(projectRoot, relative);
  if (!(await pathExists(checkpointPath))) {
    return {};
  }
  const text = await readText(checkpointPath);
  const match = text.match(/## Task Contract[\s\S]*?```ya?ml\s*([\s\S]*?)```/i);
  if (!match) {
    return {};
  }
  return (parseYaml(match[1]) ?? {}) as Record<string, unknown>;
}

async function removeLegacyCheckpoints(projectRoot: string, root: string, report: MigrationReport): Promise<void> {
  const relativeCheckpointPath = harnessPath(root, "state", "checkpoints");
  const checkpointPath = path.join(projectRoot, relativeCheckpointPath);
  if (!(await pathExists(checkpointPath))) {
    report.skipped.push(relativeCheckpointPath);
    return;
  }
  await rm(checkpointPath, { recursive: true, force: true });
  report.changed.push(relativeCheckpointPath);
}

async function ensureMemory(projectRoot: string, root: string, report: MigrationReport): Promise<void> {
  const relativeMemoryPath = harnessPath(root, "state", "memory.md");
  const memoryPath = path.join(projectRoot, relativeMemoryPath);
  if (await pathExists(memoryPath)) {
    report.skipped.push(relativeMemoryPath);
    return;
  }
  const content = "# Project Memory\n\n记录跨阶段长期有效的稳定知识，并链接到 `.docs/` 正式出处。\n";
  if (await writeTextIfChanged(memoryPath, content)) {
    report.changed.push(relativeMemoryPath);
  }
}
