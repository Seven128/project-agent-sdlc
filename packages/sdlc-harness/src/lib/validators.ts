import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { harnessPath, harnessRoot } from "./harness-root.js";
import { listFiles, pathExists, readText } from "./fs.js";
import { parseYaml } from "./yaml.js";

const execFileAsync = promisify(execFile);

export interface ValidatorReport {
  info: string[];
  errors: string[];
}

type Validator = (projectRoot: string) => Promise<ValidatorReport>;
const PARALLEL_MODES = new Set(["runtime_managed", "user_orchestrated"]);
const PARALLEL_PHASES = new Set(["REQUIREMENT_GATHERING", "SPRINTING", "TESTING"]);

const validators: Record<string, Validator> = {
  "validate-harness": validateHarness,
  "validate-current": validateCurrent,
  "validate-pm": validatePm,
  "validate-design": validateDesign,
  "validate-dev": validateDev
};

export async function runValidator(projectRoot: string, gate: string): Promise<ValidatorReport> {
  const normalized = normalizeGate(gate);
  const validator = validators[normalized];
  if (!validator) {
    return { info: [], errors: [`unknown validator: ${gate}`] };
  }
  return validator(projectRoot);
}

function normalizeGate(gate: string): string {
  return gate.replace(/^make\s+/, "").trim();
}

async function validateHarness(projectRoot: string): Promise<ValidatorReport> {
  const errors: string[] = [];
  const root = await harnessRoot(projectRoot);
  for (const required of [
    "AGENTS.md",
    ".docs/INDEX.md",
    harnessPath(root, "config.yaml"),
    harnessPath(root, "state", "lifecycle.yaml"),
    harnessPath(root, "state", "plan.yaml"),
    harnessPath(root, "skills"),
    harnessPath(root, "pjsdlc_managed", "templates"),
    harnessPath(root, "pjsdlc_managed", "policies")
  ]) {
    if (!(await pathExists(path.join(projectRoot, required)))) {
      errors.push(`missing ${required}`);
    }
  }
  return { info: [`validate-harness checked ${projectRoot} (${root})`], errors };
}

async function validateCurrent(projectRoot: string): Promise<ValidatorReport> {
  const root = await harnessRoot(projectRoot);
  const lifecycle = await readYamlObject(path.join(projectRoot, root, "state", "lifecycle.yaml"));
  const current = String(lifecycle.current_phase ?? "");
  const gateByPhase: Record<string, string> = {
    REQUIREMENT_GATHERING: "validate-pm",
    ARCHITECTING: "validate-design",
    SPRINTING: "validate-dev"
  };
  return runValidator(projectRoot, gateByPhase[current] ?? "validate-harness");
}

async function validatePm(projectRoot: string): Promise<ValidatorReport> {
  const docs = await markdownFiles(path.join(projectRoot, ".docs/01_product"));
  const text = await combinedText(docs);
  const errors: string[] = [];
  if (docs.length === 0) errors.push("No PRD deliverables found");
  if (!containsAny(text, ["acceptance", "验收"])) errors.push("PRD must include acceptance criteria");
  if (!containsAny(text, ["out of scope", "不做", "边界"])) errors.push("PRD must include out-of-scope boundaries");
  if (!containsAny(text, ["open questions", "未决", "待确认"])) errors.push("PRD must include open questions");
  return { info: [`validate-pm checked ${docs.length} file(s)`], errors };
}

async function validateDesign(projectRoot: string): Promise<ValidatorReport> {
  const architecture = await markdownFiles(path.join(projectRoot, ".docs/02_architecture"));
  const techPlan = await markdownFiles(path.join(projectRoot, ".docs/03_tech_plan"));
  const text = await combinedText([...architecture, ...techPlan]);
  const errors: string[] = [];
  if (architecture.length === 0) errors.push("No architecture deliverables found");
  if (techPlan.length === 0) errors.push("No technical plan deliverables found");
  if (!containsAny(text, ["prd", "requirement", "需求"])) errors.push("Design must cite product requirements");
  if (!containsAny(text, ["api", "interface", "接口", "contract", "契约"])) errors.push("Design must describe interfaces or contracts");
  if (!containsAny(text, ["task", "任务", "breakdown"])) errors.push("Design must include task breakdown");
  return { info: [`validate-design checked ${architecture.length + techPlan.length} file(s)`], errors };
}

async function validateDev(projectRoot: string): Promise<ValidatorReport> {
  const errors: string[] = [];
  const root = await harnessRoot(projectRoot);
  const tasksData = await readYamlObject(path.join(projectRoot, root, "state", "plan.yaml"));
  validateParallelExecutionContract(tasksData, errors);
  const tasks = Array.isArray(tasksData.tasks) ? (tasksData.tasks as Array<Record<string, unknown>>) : [];
  const nextTaskSequence = tasksData.next_task_sequence;
  if (!Number.isInteger(nextTaskSequence) || Number(nextTaskSequence) <= 0) {
    errors.push("plan.yaml must define positive integer next_task_sequence");
  }
  const open = tasks.filter((task) => ["pending", "in_progress", "blocked", "pending_revision"].includes(String(task.status)));
  if (open.length > 0) errors.push(`Open tasks remain: ${open.map((task) => task.id).join(", ")}`);
  let maxTaskSequence = 0;
  for (const task of tasks) {
    for (const field of ["id", "title", "status", "summary", "implementation_doc"]) {
      if (!task[field]) errors.push(`Task missing ${field}: ${String(task.id ?? "unknown")}`);
    }
    const taskId = String(task.id ?? "");
    const match = taskId.match(/^DEV-(\d+)$/);
    if (match) {
      maxTaskSequence = Math.max(maxTaskSequence, Number(match[1]));
    }
    if (["pending", "in_progress", "blocked", "pending_revision"].includes(String(task.status))) {
      if ("gate_result" in task) {
        errors.push(`Open task ${task.id} must not define gate_result`);
      }
      for (const field of ["docs", "allowed_paths", "required_gates", "acceptance_criteria"]) {
        if (!task[field]) errors.push(`Open task ${task.id} missing ${field}`);
      }
      if (!Array.isArray(task.allowed_paths) || task.allowed_paths.length === 0) {
        errors.push(`Open task ${task.id} must define allowed_paths`);
      }
      if (!Array.isArray(task.required_gates) || task.required_gates.length === 0) {
        errors.push(`Open task ${task.id} must define required_gates`);
      }
    } else {
      errors.push(`Completed task ${task.id} must not remain in plan.yaml`);
      for (const field of ["docs", "allowed_paths", "required_gates", "acceptance_criteria", "working_notes", "gate_result"]) {
        if (task[field]) errors.push(`Closed task ${task.id} must not retain ${field}`);
      }
    }
  }
  if (Number.isInteger(nextTaskSequence) && Number(nextTaskSequence) <= maxTaskSequence) {
    errors.push("next_task_sequence must be greater than task ids currently in plan.yaml");
  }
  return { info: [`validate-dev checked ${tasks.length} task(s)`], errors };
}

function validateParallelExecutionContract(plan: Record<string, unknown>, errors: string[]): void {
  const contract = plan.parallel_execution;
  if (contract === undefined || contract === null) return;
  if (!isRecord(contract)) {
    errors.push("parallel_execution must be a mapping");
    return;
  }

  if (contract.enabled !== true) errors.push("parallel_execution.enabled must be true when present");
  if (contract.trigger !== "user_requested") errors.push('parallel_execution.trigger must be "user_requested"');
  if (!PARALLEL_MODES.has(String(contract.mode ?? ""))) {
    errors.push("parallel_execution.mode must be runtime_managed or user_orchestrated");
  }
  if (!PARALLEL_PHASES.has(String(contract.phase ?? ""))) {
    errors.push("parallel_execution.phase must be REQUIREMENT_GATHERING, SPRINTING, or TESTING");
  }
  if (contract.coordinator !== "main_agent") errors.push('parallel_execution.coordinator must be "main_agent"');

  if (contract.phase === "SPRINTING") {
    if (!contract.linked_task_id) errors.push("SPRINTING parallel_execution must define linked_task_id");
    if (contract.linked_task_id !== plan.current_task_id) {
      errors.push("SPRINTING parallel_execution.linked_task_id must match current_task_id");
    }
  }

  const workers = contract.workers;
  if (!Array.isArray(workers) || workers.length === 0) {
    errors.push("parallel_execution.workers must be a non-empty list");
  } else {
    const seen = new Set<string>();
    workers.forEach((worker, index) => {
      const prefix = `parallel_execution.workers[${index}]`;
      if (!isRecord(worker)) {
        errors.push(`${prefix} must be a mapping`);
        return;
      }
      const workerId = String(worker.id ?? "");
      if (!workerId.trim()) {
        errors.push(`${prefix}.id must be a non-empty string`);
      } else if (seen.has(workerId)) {
        errors.push(`parallel_execution worker id must be unique: ${workerId}`);
      }
      seen.add(workerId);
      if (typeof worker.writes_repo !== "boolean") errors.push(`${prefix}.writes_repo must be a boolean`);
      for (const field of ["owned_paths", "forbidden_paths", "expected_output", "required_gates"]) {
        if (!Array.isArray(worker[field])) errors.push(`${prefix}.${field} must be a list`);
      }
      if (Array.isArray(worker.expected_output) && worker.expected_output.length === 0) {
        errors.push(`${prefix}.expected_output must not be empty`);
      }
      if (Array.isArray(worker.required_gates) && worker.required_gates.length === 0) {
        errors.push(`${prefix}.required_gates must not be empty`);
      }
      if (worker.writes_repo === true) {
        if (typeof worker.branch !== "string" || !worker.branch.trim()) {
          errors.push(`${prefix}.branch is required when writes_repo is true`);
        }
        if (typeof worker.worktree !== "string" || !worker.worktree.trim()) {
          errors.push(`${prefix}.worktree is required when writes_repo is true`);
        }
        if (!Array.isArray(worker.owned_paths) || worker.owned_paths.length === 0) {
          errors.push(`${prefix}.owned_paths must not be empty when writes_repo is true`);
        }
      }
    });
  }

  const integration = contract.integration;
  if (!isRecord(integration)) {
    errors.push("parallel_execution.integration must be a mapping");
    return;
  }
  if (integration.owner !== "main_agent") errors.push('parallel_execution.integration.owner must be "main_agent"');
  if (typeof integration.merge_strategy !== "string" || !integration.merge_strategy.trim()) {
    errors.push("parallel_execution.integration.merge_strategy must be a non-empty string");
  }
  if (!Array.isArray(integration.required_gates) || integration.required_gates.length === 0) {
    errors.push("parallel_execution.integration.required_gates must be a non-empty list");
  }
  if (!Array.isArray(integration.fact_source_updates) || integration.fact_source_updates.length === 0) {
    errors.push("parallel_execution.integration.fact_source_updates must be a non-empty list");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readYamlObject(filePath: string): Promise<Record<string, unknown>> {
  if (!(await pathExists(filePath))) return {};
  return (parseYaml(await readText(filePath)) ?? {}) as Record<string, unknown>;
}

async function markdownFiles(root: string): Promise<string[]> {
  const files = await listFiles(root);
  return files.filter((file) => file.endsWith(".md") && !file.endsWith("overview.md"));
}

async function combinedText(files: string[]): Promise<string> {
  const parts = await Promise.all(files.map((file) => readText(file)));
  return parts.join("\n").toLowerCase();
}

function containsAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle.toLowerCase()));
}

export async function changedFiles(projectRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--porcelain"], { cwd: projectRoot });
    return stdout
      .split("\n")
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
