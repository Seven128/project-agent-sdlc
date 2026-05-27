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
const TASK_PHASES = new Set(["REQUIREMENT_GATHERING", "ARCHITECTING", "SPRINTING", "REVIEWING", "TESTING", "RELEASING", "RFC_RECALIBRATION"]);
const PARALLEL_ALLOWED_PHASES = new Set(["REQUIREMENT_GATHERING", "SPRINTING", "TESTING"]);
const TASK_STATUSES = new Set(["pending", "in_progress", "done", "blocked", "pending_revision", "cancelled"]);
const OPEN_TASK_STATUSES = new Set(["pending", "in_progress", "blocked", "pending_revision"]);
const DESIGN_CATEGORIES = [
  {
    label: "AI copilot/provider",
    triggerTerms: ["ai provider", "ai output", "aioutput", "llm", "copilot", "副驾驶"],
    architectureTerms: ["ai provider", "ai output", "llm", "copilot", "副驾驶", "模型", "智能", "prompt"]
  },
  {
    label: "external system boundary",
    triggerTerms: ["external system", "external integration", "webhook", "外部系统", "第三方", "微信", "工商", "税务", "社保", "公积金", "金蝶", "对象存储"],
    architectureTerms: ["external system", "external integration", "webhook", "adapter", "适配", "边界", "外部系统", "第三方", "微信", "工商", "税务", "社保", "公积金", "金蝶", "对象存储"]
  },
  {
    label: "compliance/permission/audit",
    triggerTerms: ["compliance", "authorization", "audit log", "audit trail", "合规", "授权", "客户确认", "回执归档", "权限模型", "权限控制", "权限架构", "审计架构", "审计日志"],
    architectureTerms: ["compliance", "permission", "authorization", "audit", "合规", "权限", "审计", "授权", "客户确认", "回执归档"]
  }
];

const validators: Record<string, Validator> = {
  "validate-harness": validateHarness,
  "validate-current": validateCurrent,
  "validate-plan": validatePlan,
  "validate-pm": validatePm,
  "validate-design": validateDesign,
  "validate-dev": validateDev,
  "validate-review": validateReview,
  "validate-test": validateTest,
  "validate-release": validateRelease,
  "validate-rfc": validateRfc
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
    SPRINTING: "validate-dev",
    REVIEWING: "validate-review",
    TESTING: "validate-test",
    RELEASING: "validate-release",
    RFC_RECALIBRATION: "validate-rfc"
  };
  return runValidator(projectRoot, gateByPhase[current] ?? "validate-harness");
}

async function validatePm(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, false);
  const docs = await markdownFiles(path.join(projectRoot, ".docs/01_product"));
  const text = await combinedText(docs);
  const errors: string[] = [...plan.errors];
  if (docs.length === 0) errors.push("No PRD deliverables found");
  if (!containsAny(text, ["acceptance", "验收"])) errors.push("PRD must include acceptance criteria");
  if (!containsAny(text, ["out of scope", "不做", "边界"])) errors.push("PRD must include out-of-scope boundaries");
  if (!containsAny(text, ["open questions", "未决", "待确认"])) errors.push("PRD must include open questions");
  return { info: [`validate-pm checked ${docs.length} file(s)`], errors };
}

async function validateDesign(projectRoot: string): Promise<ValidatorReport> {
  const root = await harnessRoot(projectRoot);
  const lifecycle = await readYamlObject(path.join(projectRoot, root, "state", "lifecycle.yaml"));
  const plan = await validatePlanState(projectRoot, String(lifecycle.current_phase ?? "") !== "ARCHITECTING");
  const architecture = await markdownFiles(path.join(projectRoot, ".docs/02_architecture"));
  const techPlan = await markdownFiles(path.join(projectRoot, ".docs/03_tech_plan"));
  const product = await markdownFiles(path.join(projectRoot, ".docs/01_product"));
  const text = await combinedText([...architecture, ...techPlan]);
  const errors: string[] = [...plan.errors];
  if (architecture.length === 0) errors.push("No architecture deliverables found");
  if (techPlan.length === 0) errors.push("No technical plan deliverables found");
  if (!containsAny(text, ["prd", "requirement", "需求"])) errors.push("Design must cite product requirements");
  if (!containsAny(text, ["api", "interface", "接口", "contract", "契约"])) errors.push("Design must describe interfaces or contracts");
  if (!containsAny(text, ["task", "任务", "breakdown"])) errors.push("Design must include task breakdown");
  const draft = await validateDesignDraft(projectRoot, root, techPlan);
  errors.push(...draft.errors);
  errors.push(...(await validateCrossCuttingArchitecture(projectRoot, product, techPlan, architecture, draft.tasks)));
  return { info: [`validate-design checked ${architecture.length + techPlan.length} file(s)`], errors };
}

async function validatePlan(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, true);
  const pathErrors = await validateChangedPaths(projectRoot, plan.plan, true);
  return { info: [`validate-plan checked ${plan.taskCount} task(s)`], errors: [...plan.errors, ...pathErrors] };
}

async function validateDesignDraft(
  projectRoot: string,
  root: string,
  techPlanFiles: string[]
): Promise<{ errors: string[]; tasks: Array<Record<string, unknown>> }> {
  const errors: string[] = [];
  const draft = await readYamlObject(path.join(projectRoot, root, "state", "plan.draft.yaml"));
  if ("current_phase" in draft) {
    errors.push("plan.draft.yaml must not define current_phase; lifecycle.yaml is the single source for current_phase");
  }
  if ("current_task_id" in draft) {
    errors.push("plan.draft.yaml must not define current_task_id because drafts are not active task state");
  }

  const rawTasks = draft.tasks;
  if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
    errors.push("plan.draft.yaml must contain at least one task before leaving ARCHITECTING");
    return { errors, tasks: [] };
  }

  const tasks = rawTasks.filter(isRecord);
  const availableTechPlans = new Set(techPlanFiles.map((file) => repoRelative(projectRoot, file)));
  const developmentTasks: Array<Record<string, unknown>> = [];
  const primaryRefs: string[] = [];
  rawTasks.forEach((rawTask, index) => {
    if (!isRecord(rawTask)) {
      errors.push(`Task draft #${index + 1} must be a mapping`);
      return;
    }
    validateDraftTaskShape(rawTask, index, errors);
    if (rawTask.status !== "pending") {
      errors.push(`Draft task ${String(rawTask.id ?? "")} should start as pending`);
    }
    if (!isDevelopmentDraft(rawTask)) return;

    developmentTasks.push(rawTask);
    if (!isRecord(rawTask.docs)) {
      errors.push(`Draft task ${String(rawTask.id ?? "")} docs must be a mapping`);
      return;
    }
    const techRefs = asStringList(rawTask.docs.tech_plan);
    if (techRefs.length === 0) {
      errors.push(`Draft task ${String(rawTask.id ?? "")} must reference at least one tech plan slice in docs.tech_plan`);
      return;
    }
    const normalizedRefs = techRefs.map(normalizeDocRef);
    for (const ref of normalizedRefs) {
      if (!ref.startsWith(".docs/03_tech_plan/")) {
        errors.push(`Draft task ${String(rawTask.id ?? "")} docs.tech_plan must point into .docs/03_tech_plan/: ${ref}`);
      } else if (!availableTechPlans.has(ref)) {
        errors.push(`Draft task ${String(rawTask.id ?? "")} references missing or generated tech plan slice: ${ref}`);
      }
    }
    primaryRefs.push(normalizedRefs[0]);
  });

  if (developmentTasks.length === 0) {
    errors.push("plan.draft.yaml must contain at least one development task with implementation_doc");
  }
  if (developmentTasks.length > 1 && new Set(primaryRefs).size !== primaryRefs.length) {
    errors.push("Draft development tasks must reference distinct primary tech plan slices in docs.tech_plan");
  }
  return { errors, tasks };
}

function validateDraftTaskShape(task: Record<string, unknown>, index: number, errors: string[]): void {
  const prefix = `Task #${index + 1}`;
  for (const field of ["id", "title", "status", "summary"]) {
    if (!task[field]) errors.push(`${prefix} missing field: ${field}`);
  }
  const taskId = String(task.id ?? "");
  if (!/^[A-Z]+-\d+$/.test(taskId)) {
    errors.push(`${taskId || prefix} id must match PREFIX-###`);
  }
  if (taskId.startsWith("TASK-") && !TASK_PHASES.has(String(task.phase ?? ""))) {
    errors.push(`${taskId} must define valid phase`);
  } else if (task.phase !== undefined && !TASK_PHASES.has(String(task.phase))) {
    errors.push(`${taskId} has invalid phase: ${String(task.phase)}`);
  }
  if (!TASK_STATUSES.has(String(task.status))) {
    errors.push(`${String(task.id ?? prefix)} has invalid status: ${String(task.status)}`);
  }
  if (typeof task.summary !== "string" || !task.summary.trim()) {
    errors.push(`${String(task.id ?? prefix)} must define summary`);
  }
  const hasImplementationDoc = typeof task.implementation_doc === "string" && task.implementation_doc.trim().length > 0;
  const hasResultDocs = Array.isArray(task.result_docs) && task.result_docs.length > 0;
  if (!hasImplementationDoc && !hasResultDocs) {
    errors.push(`${String(task.id ?? prefix)} must define implementation_doc or result_docs`);
  }
  if (OPEN_TASK_STATUSES.has(String(task.status))) {
    if ("gate_result" in task) errors.push(`${String(task.id ?? prefix)} open task must not define gate_result`);
    for (const field of ["docs", "allowed_paths", "required_gates", "acceptance_criteria"]) {
      if (!task[field]) errors.push(`${String(task.id ?? prefix)} open task missing field: ${field}`);
    }
    if (!isRecord(task.docs)) errors.push(`${String(task.id ?? prefix)} docs must be a mapping`);
    if (!Array.isArray(task.allowed_paths) || task.allowed_paths.length === 0) {
      errors.push(`${String(task.id ?? prefix)} must define allowed_paths`);
    }
    if (!Array.isArray(task.required_gates) || task.required_gates.length === 0) {
      errors.push(`${String(task.id ?? prefix)} must define required_gates`);
    }
    if (!Array.isArray(task.acceptance_criteria) || task.acceptance_criteria.length === 0) {
      errors.push(`${String(task.id ?? prefix)} must define acceptance_criteria`);
    }
  } else {
    for (const field of ["docs", "allowed_paths", "required_gates", "acceptance_criteria", "working_notes", "gate_result", "result_docs"]) {
      if (field in task) errors.push(`${String(task.id ?? prefix)} closed task must not retain ${field}`);
    }
  }
}

async function validateCrossCuttingArchitecture(
  projectRoot: string,
  productFiles: string[],
  techPlanFiles: string[],
  architectureFiles: string[],
  draftTasks: Array<Record<string, unknown>>
): Promise<string[]> {
  const errors: string[] = [];
  const sourceText = [
    await combinedText(productFiles),
    await combinedText(techPlanFiles),
    draftTasks.map(taskText).join("\n")
  ].join("\n");
  const architectureTexts = await Promise.all(
    architectureFiles.map(async (file) => ({ file, text: await readText(file) }))
  );
  const assigned = new Set<string>();

  for (const category of DESIGN_CATEGORIES) {
    if (!containsAny(sourceText, category.triggerTerms)) continue;
    const match = architectureTexts.find(
      (doc) => !assigned.has(repoRelative(projectRoot, doc.file)) && containsAny(doc.text, category.architectureTerms)
    );
    if (!match) {
      errors.push(`Design requires a dedicated ${category.label} architecture slice`);
    } else {
      assigned.add(repoRelative(projectRoot, match.file));
    }
  }
  return errors;
}

async function validateDev(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, false);
  return { info: [`validate-dev checked ${plan.taskCount} task(s)`], errors: plan.errors };
}

async function validateReview(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, false);
  const text = (await readText(path.join(projectRoot, ".docs/06_review/REVIEW_REPORT.md"))).toLowerCase();
  const errors = [...plan.errors];
  if (!containsAny(text, ["finding", "发现", "风险"])) errors.push("Review report must include findings or risks");
  if (!containsAny(text, ["test gap", "测试缺口", "coverage"])) errors.push("Review report must include test gaps or coverage notes");
  if (!containsAny(text, ["pass", "blocked", "通过", "阻塞"])) errors.push("Review report must include PASS/BLOCKED decision");
  return { info: ["validate-review checked review report"], errors };
}

async function validateTest(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, false);
  const text = (await readText(path.join(projectRoot, ".docs/07_test/TEST_PLAN.md"))).toLowerCase();
  const errors = [...plan.errors];
  if (!containsAny(text, ["matrix", "矩阵"])) errors.push("Test plan must include a test matrix");
  if (!containsAny(text, ["regression", "回归"])) errors.push("Test plan must include regression coverage");
  if (!containsAny(text, ["coverage gap", "覆盖缺口", "gap"])) errors.push("Test plan must include coverage gaps");
  if (!containsAny(text, ["pass", "blocked", "通过", "阻塞"])) errors.push("Test plan must include PASS/BLOCKED decision");
  return { info: ["validate-test checked test plan"], errors };
}

async function validateRelease(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, false);
  const docs = await markdownFiles(path.join(projectRoot, ".docs/08_release"));
  const text = await combinedText(docs);
  const errors = [...plan.errors];
  if (docs.length === 0) errors.push("No release deliverables found");
  if (!containsAny(text, ["release", "发布"])) errors.push("Release docs must include release notes");
  if (!containsAny(text, ["smoke", "冒烟"])) errors.push("Release docs must include smoke test evidence");
  if (!containsAny(text, ["rollback", "回滚"])) errors.push("Release docs must include rollback plan");
  return { info: [`validate-release checked ${docs.length} file(s)`], errors };
}

async function validateRfc(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, false);
  const docs = await markdownFiles(path.join(projectRoot, ".docs/rfc"));
  const text = await combinedText(docs);
  const errors = [...plan.errors];
  if (docs.length === 0) errors.push("No RFC documents found");
  if (!containsAny(text, ["background", "背景"])) errors.push("RFC must include background");
  if (!containsAny(text, ["product impact", "产品影响"])) errors.push("RFC must include product impact");
  if (!containsAny(text, ["technical impact", "技术影响"])) errors.push("RFC must include technical impact candidates");
  if (!containsAny(text, ["regression", "回归"])) errors.push("RFC must include regression requirements");
  const statuses = [...text.matchAll(/status:\s*([a-z_]+)/g)].map((match) => match[1].toUpperCase());
  if (statuses.length === 0) errors.push("RFC must include a Status line");
  const invalidStatuses = statuses.filter((status) => !["DRAFT", "APPLIED", "VERIFIED", "ARCHIVED"].includes(status));
  if (invalidStatuses.length > 0) errors.push(`Invalid RFC status: ${invalidStatuses.join(", ")}`);
  return { info: [`validate-rfc checked ${docs.length} file(s)`], errors };
}

async function validatePlanState(projectRoot: string, allowOpen: boolean): Promise<{ taskCount: number; errors: string[]; plan: Record<string, unknown> }> {
  const errors: string[] = [];
  const root = await harnessRoot(projectRoot);
  const tasksData = await readYamlObject(path.join(projectRoot, root, "state", "plan.yaml"));
  const lifecycle = await readYamlObject(path.join(projectRoot, root, "state", "lifecycle.yaml"));
  const currentPhase = String(lifecycle.current_phase ?? "");
  if ("current_phase" in tasksData) {
    errors.push("plan.yaml must not define current_phase; lifecycle.yaml is the single source for current_phase");
  }
  validateParallelExecutionContract(tasksData, currentPhase, errors);
  const tasks = Array.isArray(tasksData.tasks) ? (tasksData.tasks as Array<Record<string, unknown>>) : [];
  const nextTaskSequence = tasksData.next_task_sequence;
  if (!Number.isInteger(nextTaskSequence) || Number(nextTaskSequence) <= 0) {
    errors.push("plan.yaml must define positive integer next_task_sequence");
  }
  const open = tasks.filter((task) => ["pending", "in_progress", "blocked", "pending_revision"].includes(String(task.status)));
  if (!allowOpen && open.length > 0) errors.push(`Open tasks remain: ${open.map((task) => task.id).join(", ")}`);
  let maxTaskSequence = 0;
  tasks.forEach((task, index) => {
    if (!isRecord(task)) {
      errors.push(`Task #${index + 1} must be a mapping`);
      return;
    }
    for (const field of ["id", "title", "status", "summary"]) {
      if (!task[field]) errors.push(`Task missing ${field}: ${String(task.id ?? "unknown")}`);
    }
    const taskId = String(task.id ?? "");
    if (!/^[A-Z]+-\d+$/.test(taskId)) {
      errors.push(`${taskId || `Task #${index + 1}`} id must match PREFIX-###`);
    }
    if (taskId.startsWith("TASK-") && !TASK_PHASES.has(String(task.phase ?? ""))) {
      errors.push(`${taskId} must define valid phase`);
    } else if (task.phase !== undefined && !TASK_PHASES.has(String(task.phase))) {
      errors.push(`${taskId} has invalid phase: ${String(task.phase)}`);
    }
    if (!["pending", "in_progress", "done", "blocked", "pending_revision", "cancelled"].includes(String(task.status))) {
      errors.push(`${String(task.id ?? `Task #${index + 1}`)} has invalid status: ${String(task.status)}`);
    }
    const hasImplementationDoc = typeof task.implementation_doc === "string" && task.implementation_doc.trim().length > 0;
    const hasResultDocs = Array.isArray(task.result_docs) && task.result_docs.length > 0;
    if (!hasImplementationDoc && !hasResultDocs) {
      errors.push(`${String(task.id ?? `Task #${index + 1}`)} must define implementation_doc or result_docs`);
    }
    const match = taskId.match(/^[A-Z]+-(\d+)$/);
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
      if (!isRecord(task.docs)) {
        errors.push(`${task.id} docs must be a mapping`);
      }
      if (!Array.isArray(task.allowed_paths) || task.allowed_paths.length === 0) {
        errors.push(`Open task ${task.id} must define allowed_paths`);
      }
      if (!Array.isArray(task.required_gates) || task.required_gates.length === 0) {
        errors.push(`Open task ${task.id} must define required_gates`);
      }
      if (!Array.isArray(task.acceptance_criteria) || task.acceptance_criteria.length === 0) {
        errors.push(`Open task ${task.id} must define acceptance_criteria`);
      }
    } else {
      errors.push(`Completed task ${task.id} must not remain in plan.yaml`);
      for (const field of ["docs", "allowed_paths", "required_gates", "acceptance_criteria", "working_notes", "gate_result", "result_docs"]) {
        if (field in task) errors.push(`Closed task ${task.id} must not retain ${field}`);
      }
    }
  });
  if (Number.isInteger(nextTaskSequence) && Number(nextTaskSequence) <= maxTaskSequence) {
    errors.push("next_task_sequence must be greater than task ids currently in plan.yaml");
  }
  const currentTaskId = String(tasksData.current_task_id ?? "");
  if (currentTaskId && !tasks.some((task) => isRecord(task) && task.id === currentTaskId)) {
    errors.push(`current_task_id does not match a task: ${currentTaskId}`);
  }
  return { taskCount: tasks.length, errors, plan: tasksData };
}

function validateParallelExecutionContract(plan: Record<string, unknown>, currentPhase: string, errors: string[]): void {
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
  if ("phase" in contract) {
    errors.push("parallel_execution must not define phase; lifecycle.yaml is the single source for current_phase");
  }
  if ("linked_task_id" in contract) {
    errors.push("parallel_execution must not define linked_task_id; use plan.yaml current_task_id");
  }
  if (!PARALLEL_ALLOWED_PHASES.has(currentPhase)) {
    errors.push("parallel_execution is only supported during REQUIREMENT_GATHERING, SPRINTING, or TESTING");
  }
  if (contract.coordinator !== "main_agent") errors.push('parallel_execution.coordinator must be "main_agent"');

  if (currentPhase === "SPRINTING" && !plan.current_task_id) {
    errors.push("SPRINTING parallel_execution requires plan.yaml current_task_id");
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

async function validateChangedPaths(projectRoot: string, plan: Record<string, unknown>, allowOpen: boolean): Promise<string[]> {
  if (!allowOpen) return [];
  const currentTaskId = String(plan.current_task_id ?? "");
  if (!currentTaskId) return [];
  const tasks = Array.isArray(plan.tasks) ? (plan.tasks as unknown[]) : [];
  const task = tasks.find((candidate) => isRecord(candidate) && candidate.id === currentTaskId);
  if (!isRecord(task)) return [`current_task_id does not match a task: ${currentTaskId}`];
  if (!Array.isArray(task.allowed_paths)) return [`${currentTaskId} must define allowed_paths`];
  const patterns = task.allowed_paths.map((pattern) => String(pattern).replace("<harnessRoot>", ".codex"));
  const changed = await changedFiles(projectRoot);
  const blocked = changed.filter((file) => !matchesAny(file, patterns));
  return blocked.length > 0 ? [`Changed files outside current task allowed_paths: ${blocked.join(", ")}`] : [];
}

function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesGlob(file, pattern));
}

function matchesGlob(file: string, pattern: string): boolean {
  const normalizedFile = file.replace(/\\/g, "/");
  const normalizedPattern = pattern.replace(/\\/g, "/");
  if (normalizedFile === normalizedPattern) return true;
  if (normalizedPattern.endsWith("/**") && normalizedFile.startsWith(normalizedPattern.slice(0, -3))) return true;
  const escaped = normalizedPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*");
  return new RegExp(`^${escaped}$`).test(normalizedFile);
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
  return files.filter((file) => {
    const name = path.basename(file).toLowerCase();
    return file.endsWith(".md") && name !== "overview.md" && name !== "readme.md";
  });
}

async function combinedText(files: string[]): Promise<string> {
  const parts = await Promise.all(files.map((file) => readText(file)));
  return parts.join("\n").toLowerCase();
}

function containsAny(text: string, needles: string[]): boolean {
  const lowered = text.toLowerCase();
  return needles.some((needle) => lowered.includes(needle.toLowerCase()));
}

function isDevelopmentDraft(task: Record<string, unknown>): boolean {
  const taskId = String(task.id ?? "");
  return Boolean(task.implementation_doc) || task.phase === "SPRINTING" || taskId.startsWith("DEV-");
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function normalizeDocRef(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
}

function repoRelative(projectRoot: string, file: string): string {
  return path.relative(projectRoot, file).split(path.sep).join("/");
}

function taskText(task: Record<string, unknown>): string {
  const parts = ["id", "title", "summary", "phase"].map((key) => String(task[key] ?? "")).filter(Boolean);
  if (isRecord(task.docs)) {
    for (const value of Object.values(task.docs)) {
      parts.push(...asStringList(value));
    }
  }
  return parts.join("\n");
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
