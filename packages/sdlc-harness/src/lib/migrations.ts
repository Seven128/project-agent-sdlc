import path from "node:path";
import { readdir, rename, rm } from "node:fs/promises";
import { defaultConfig, readConfig } from "./config.js";
import { ensureDir, listFiles, pathExists, readText, writeTextIfChanged } from "./fs.js";
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

const SKILL_RENAMES: Record<string, string> = {
  manager: "pjsdlc_manager",
  pm_prd: "pjsdlc_pm_prd",
  architect_design: "pjsdlc_architect_design",
  dev_sprint: "pjsdlc_dev_sprint",
  implementation_doc: "pjsdlc_implementation_doc",
  reviewer: "pjsdlc_reviewer",
  tester: "pjsdlc_tester",
  release_manager: "pjsdlc_release_manager",
  rfc_recalibrate: "pjsdlc_rfc_recalibrate"
};

export async function runMigrations(projectRoot: string): Promise<MigrationReport> {
  const report: MigrationReport = { changed: [], skipped: [] };
  const root = await harnessRoot(projectRoot);
  await migrateConfig(projectRoot, root, report);
  await migrateLegacyManagedPaths(projectRoot, root, report);
  await migrateLifecycle(projectRoot, root, report);
  await migratePlan(projectRoot, root, report, "plan.yaml", "tasks.yaml");
  await migratePlan(projectRoot, root, report, "plan.draft.yaml", "tasks.draft.yaml");
  await removeLegacyGateResults(projectRoot, root, report);
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
  const currentCore = defaultConfig(root).core;
  config.core.package = currentCore.package;
  config.core.version = currentCore.version;
  config.core.schema_version = CURRENT_SCHEMA_VERSION;
  config.managed_files = migrateManagedFiles(config.managed_files, root);
  config.local_overrides = config.local_overrides.map((item) => migrateLocalOverride(item, root));
  if (await writeTextIfChanged(configPath, stringifyYaml(config))) {
    report.changed.push(relativeConfigPath);
  } else {
    report.skipped.push(relativeConfigPath);
  }
}

async function migrateLegacyManagedPaths(projectRoot: string, root: string, report: MigrationReport): Promise<void> {
  await movePromptTreeToSkillsIfDestinationMissing(projectRoot, harnessPath(root, "prompts"), harnessPath(root, "skills"), report);
  await moveIfDestinationMissing(projectRoot, ".agents/skills", harnessPath(root, "skills"), report);
  await moveIfDestinationMissing(projectRoot, ".harness/agents/skills", harnessPath(root, "skills"), report);
  await moveIfDestinationMissing(projectRoot, harnessPath(root, "managed"), harnessPath(root, "pjsdlc_managed"), report);
  await moveIfDestinationMissing(
    projectRoot,
    harnessPath(root, "templates"),
    harnessPath(root, "pjsdlc_managed", "templates"),
    report
  );
  await moveIfDestinationMissing(
    projectRoot,
    harnessPath(root, "policies"),
    harnessPath(root, "pjsdlc_managed", "policies"),
    report
  );
  await moveIfDestinationMissing(
    projectRoot,
    harnessPath(root, "make"),
    harnessPath(root, "pjsdlc_managed", "make"),
    report
  );
  await moveIfDestinationMissing(
    projectRoot,
    harnessPath(root, "overrides", "skills"),
    harnessPath(root, "pjsdlc_managed", "override_skills"),
    report
  );
}

async function movePromptTreeToSkillsIfDestinationMissing(
  projectRoot: string,
  legacyRelativePath: string,
  nextRelativePath: string,
  report: MigrationReport
): Promise<void> {
  const legacyPath = path.join(projectRoot, legacyRelativePath);
  if (!(await pathExists(legacyPath))) {
    report.skipped.push(legacyRelativePath);
    return;
  }
  const nextPath = path.join(projectRoot, nextRelativePath);
  if (await pathExists(nextPath)) {
    report.skipped.push(`${legacyRelativePath} -> ${nextRelativePath}`);
    return;
  }
  await ensureDir(path.dirname(nextPath));
  await rename(legacyPath, nextPath);
  const workflowPath = path.join(nextPath, "workflow");
  if (await pathExists(workflowPath)) {
    for (const entry of await readdir(workflowPath)) {
      await rename(path.join(workflowPath, entry), path.join(nextPath, entry));
    }
    await rm(workflowPath, { recursive: true, force: true });
  }
  for (const file of await listFiles(nextPath)) {
    if (path.basename(file) === "PROMPT.md") {
      await rename(file, path.join(path.dirname(file), "SKILL.md"));
    }
  }
  report.changed.push(`${legacyRelativePath} -> ${nextRelativePath}`);
}

async function moveIfDestinationMissing(
  projectRoot: string,
  legacyRelativePath: string,
  nextRelativePath: string,
  report: MigrationReport
): Promise<void> {
  const legacyPath = path.join(projectRoot, legacyRelativePath);
  const nextPath = path.join(projectRoot, nextRelativePath);
  if (legacyPath === nextPath) {
    report.skipped.push(legacyRelativePath);
    return;
  }
  if (!(await pathExists(legacyPath))) {
    report.skipped.push(legacyRelativePath);
    return;
  }
  if (await pathExists(nextPath)) {
    report.skipped.push(`${legacyRelativePath} -> ${nextRelativePath}`);
    return;
  }
  await ensureDir(path.dirname(nextPath));
  await rename(legacyPath, nextPath);
  report.changed.push(`${legacyRelativePath} -> ${nextRelativePath}`);
}

function migrateLocalOverride(item: string, root: string): string {
  if (
    item === harnessPath(root, "overrides/**") ||
    item === harnessPath(root, "overrides", "skills", "*.md") ||
    item === harnessPath(root, "overrides", "skills", "**")
  ) {
    return harnessPath(root, "pjsdlc_managed", "override_skills", "*.md");
  }
  if (
    item === ".harness/policies/*.local.yaml" ||
    item === harnessPath(root, "managed", "policies", "*.local.yaml")
  ) {
    return harnessPath(root, "pjsdlc_managed", "policies", "*.local.yaml");
  }
  return item;
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
    if (
      item.path === ".agents/skills" ||
      item.path === ".harness/agents/skills" ||
      item.path === harnessPath(root, "skills") ||
      item.path === harnessPath(root, "prompts")
    ) {
      push({ path: harnessPath(root, "skills"), strategy: "managed" });
      continue;
    }
    if (item.path === ".harness/templates" || item.path === harnessPath(root, "managed", "templates")) {
      push({ path: harnessPath(root, "pjsdlc_managed", "templates"), strategy: "managed" });
      continue;
    }
    if (item.path === ".harness/policies" || item.path === harnessPath(root, "managed", "policies")) {
      push({ path: harnessPath(root, "pjsdlc_managed", "policies"), strategy: "merge-with-local" });
      continue;
    }
    if (item.path === ".harness/make/sdlc-harness.mk" || item.path === harnessPath(root, "managed", "make", "sdlc-harness.mk")) {
      push({ path: harnessPath(root, "pjsdlc_managed", "make", "sdlc-harness.mk"), strategy: "managed" });
      continue;
    }
    push(item);
  }

  if (!seen.has("Makefile")) {
    const agentsIndex = migrated.findIndex((item) => item.path === "AGENTS.md");
    const makefileEntry: ManagedFile = { path: "Makefile", strategy: "merge-block" };
    if (agentsIndex >= 0) {
      migrated.splice(agentsIndex + 1, 0, makefileEntry);
    } else {
      migrated.unshift(makefileEntry);
    }
  }

  return migrated;
}

async function migrateLifecycle(projectRoot: string, root: string, report: MigrationReport): Promise<void> {
  const relativeLifecyclePath = harnessPath(root, "state", "lifecycle.yaml");
  const lifecyclePath = path.join(projectRoot, relativeLifecyclePath);
  if (!(await pathExists(lifecyclePath))) {
    report.skipped.push(relativeLifecyclePath);
    return;
  }
  const data = (parseYaml(await readText(lifecyclePath)) ?? {}) as Record<string, unknown>;
  let changed = false;
  const activeSkill = String(data.active_skill ?? data.active_prompt ?? "");
  if (SKILL_RENAMES[activeSkill]) {
    data.active_skill = SKILL_RENAMES[activeSkill];
    changed = true;
  } else if (activeSkill && !data.active_skill) {
    data.active_skill = activeSkill;
    changed = true;
  }
  if ("active_prompt" in data) {
    delete data.active_prompt;
    changed = true;
  }
  if ("history" in data) {
    delete data.history;
    changed = true;
  }
  if (!changed) {
    report.skipped.push(relativeLifecyclePath);
    return;
  }
  if (await writeTextIfChanged(lifecyclePath, stringifyYaml(data))) {
    report.changed.push(relativeLifecyclePath);
  } else {
    report.skipped.push(relativeLifecyclePath);
  }
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
    const retainedTasks: unknown[] = [];
    let maxTaskSequence = 0;
    for (const task of data.tasks) {
      if (!isRecord(task)) {
        retainedTasks.push(task);
        continue;
      }
      const taskId = String(task.id ?? "");
      const match = taskId.match(/^DEV-(\d+)$/);
      if (match) {
        maxTaskSequence = Math.max(maxTaskSequence, Number(match[1]));
      }
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
      if ("gate_result" in task && isOpenTask(task)) {
        delete task.gate_result;
        changed = true;
      }
      if (["done", "cancelled"].includes(String(task.status))) {
        changed = true;
        continue;
      }
      retainedTasks.push(task);
    }
    if (retainedTasks.length !== data.tasks.length) {
      data.tasks = retainedTasks;
      changed = true;
    }
    const nextTaskSequence = data.next_task_sequence;
    if (!Number.isInteger(nextTaskSequence) || Number(nextTaskSequence) <= maxTaskSequence) {
      data.next_task_sequence = maxTaskSequence + 1;
      changed = true;
    }
  }
  const currentTaskId = String(data.current_task_id ?? "");
  if (currentTaskId && !taskById(data, currentTaskId)) {
    data.current_task_id = "";
    changed = true;
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

function taskById(planData: Record<string, unknown>, taskId: string): Record<string, unknown> | undefined {
  const tasks = Array.isArray(planData.tasks) ? planData.tasks : [];
  return tasks.find((task): task is Record<string, unknown> => isRecord(task) && task.id === taskId);
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

async function removeLegacyGateResults(projectRoot: string, root: string, report: MigrationReport): Promise<void> {
  const relativeGateResultsPath = harnessPath(root, "state", "gate_results.log");
  const gateResultsPath = path.join(projectRoot, relativeGateResultsPath);
  if (!(await pathExists(gateResultsPath))) {
    report.skipped.push(relativeGateResultsPath);
    return;
  }
  await rm(gateResultsPath, { force: true });
  report.changed.push(relativeGateResultsPath);
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
