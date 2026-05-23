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
    harnessPath(root, "managed", "templates"),
    harnessPath(root, "managed", "policies")
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
  const tasks = Array.isArray(tasksData.tasks) ? (tasksData.tasks as Array<Record<string, unknown>>) : [];
  if (tasks.length === 0) errors.push("plan.yaml must contain at least one task");
  const open = tasks.filter((task) => ["pending", "in_progress", "blocked", "pending_revision"].includes(String(task.status)));
  if (open.length > 0) errors.push(`Open tasks remain: ${open.map((task) => task.id).join(", ")}`);
  for (const task of tasks) {
    for (const field of ["id", "title", "status", "summary", "implementation_doc"]) {
      if (!task[field]) errors.push(`Task missing ${field}: ${String(task.id ?? "unknown")}`);
    }
    if (["pending", "in_progress", "blocked", "pending_revision"].includes(String(task.status))) {
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
      for (const field of ["docs", "allowed_paths", "required_gates", "acceptance_criteria", "working_notes"]) {
        if (task[field]) errors.push(`Closed task ${task.id} must not retain ${field}`);
      }
    }
  }
  for (const task of tasks.filter((task) => task.status === "done")) {
    if (task.gate_result !== "PASS") errors.push(`Done task ${task.id} must have gate_result PASS`);
    const implementationDoc = String(task.implementation_doc ?? "");
    if (implementationDoc && !(await pathExists(path.join(projectRoot, implementationDoc)))) {
      errors.push(`Implementation doc missing for ${task.id}: ${implementationDoc}`);
    }
  }
  return { info: [`validate-dev checked ${tasks.length} task(s)`], errors };
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
