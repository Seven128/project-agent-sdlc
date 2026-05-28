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

const TESTING_DISALLOWED_ALLOWED_PATHS = [
  "package.json",
  "**/package.json",
  "package-lock.json",
  "**/package-lock.json",
  "npm-shrinkwrap.json",
  "**/npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "**/pnpm-lock.yaml",
  "yarn.lock",
  "**/yarn.lock",
  "bun.lock",
  "**/bun.lock",
  "bun.lockb",
  "**/bun.lockb",
  "src/**",
  "app/**",
  "lib/**",
  "server/**",
  "bin/**",
  "cli/**",
  "runtime/**",
  "scripts/**",
  "tools/**",
  "deploy/**",
  "deployment/**",
  "infra/**",
  "ops/**",
  "systemd/**",
  ".github/workflows/**",
  "dockerfile",
  "dockerfile.*",
  "docker-compose*.yml",
  "docker-compose*.yaml",
  "*.service",
  "tests/runtime/**",
  "tests/**/runtime/**"
];

const TESTING_DISALLOWED_CHANGED_PATHS = [...TESTING_DISALLOWED_ALLOWED_PATHS, "scripts/**", "tools/**"];
const TESTING_RUNTIME_FILE_TERMS = ["bootstrap", "cloud", "daemon", "poller", "provider", "runtime", "service", "systemd"];
const TESTING_ALLOWED_TEST_FILE_TERMS = ["assertion", "fixture", "mock", "smoke"];
const TEST_REPORT_PATH = ".docs/07_test/TEST_REPORT.md";
const CURRENT_RELEASE_REPORT_PATH = ".docs/08_release/CURRENT_RELEASE.md";
const TEST_REPORT_PLACEHOLDER_TERMS = ["pending", "tbd", "todo", "待填", "待补", "placeholder"];
const TEST_FACT_SOURCE_PHASES = new Set(["TESTING", "RFC_RECALIBRATION"]);
const TEST_FACT_SOURCE_PATTERNS = [".docs/07_test/**", ".docs/07_test/"];
const TEST_FACT_SOURCE_REF = /\.docs\/07_test\/[^\s`,)]+/g;
const RUNNABLE_ENTRY_EXIT_TERMS = [
  "runnable entry/exit",
  "entry/exit",
  "entry points",
  "entry point",
  "可运行入口/出口",
  "入口/出口",
  "not applicable"
];
const DEVELOPMENT_EVIDENCE_TERMS = ["development evidence", "开发自测证据"];
const EVIDENCE_PLACEHOLDER_TERMS = [
  "pending",
  "tbd",
  "todo",
  "placeholder",
  "待填",
  "待补",
  "待确认"
];
const PAGE_TASK_TERMS = ["frontend", "front-end", "browser", "page", "页面", "前端", "按钮", "表单", "跳转"];
const PAGE_ENTRY_TERMS = ["http://", "https://", "localhost", "127.0.0.1", "page url", "页面 url", "dev server"];
const PAGE_BROWSER_CHECK_TERMS = ["browser check", "playwright", "screenshot", "click", "button", "form", "页面可加载", "浏览器"];
const CALLABLE_TASK_TERMS = [
  "api",
  "endpoint",
  "cli",
  "command",
  "worker",
  "route",
  "server action",
  "adapter",
  "provider",
  "rpa",
  "bot",
  "机器人",
  "队列"
];
const CALLABLE_ENTRY_TERMS = ["command", "endpoint", "api", "cli", "worker", "route", "curl", "npm ", "npx ", "node ", "python", "make "];
const CALLABLE_RESULT_TERMS = ["pass", "response", "output", "result", "exit code", "queue", "log", "artifact", "created", "produced", "返回", "输出", "日志", "队列", "产物", "错误码"];

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
  if (current === "SPRINTING") {
    return validateDevInternal(projectRoot, { phaseExit: true });
  }
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
  errors.push(...testFactSourceErrorsForTask(task));
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
  return validateDevInternal(projectRoot, { phaseExit: false });
}

async function validateDevInternal(projectRoot: string, options: { phaseExit: boolean }): Promise<ValidatorReport> {
  const root = await harnessRoot(projectRoot);
  const lifecycle = await readYamlObject(path.join(projectRoot, root, "state", "lifecycle.yaml"));
  const plan = await validatePlanState(projectRoot, !options.phaseExit);
  const phaseErrors = String(lifecycle.current_phase ?? "") === "SPRINTING" ? [] : ["validate-dev requires lifecycle current_phase SPRINTING"];
  const openTaskErrors = options.phaseExit ? [] : validateDevOpenTaskState(plan.plan);
  const pathErrors = options.phaseExit ? [] : await validateChangedPaths(projectRoot, plan.plan, true);
  const draftErrors = await validateDevDraftConsumed(projectRoot, root);
  const implementationDocErrors = await validateImplementationDocRunnableEntryExit(projectRoot);
  const evidenceErrors = options.phaseExit ? [] : await validateCurrentTaskDevelopmentEvidence(projectRoot, plan.plan);
  return {
    info: [`validate-dev checked ${plan.taskCount} task(s)${options.phaseExit ? " for phase exit" : ""}`],
    errors: [...phaseErrors, ...plan.errors, ...openTaskErrors, ...pathErrors, ...draftErrors, ...implementationDocErrors, ...evidenceErrors]
  };
}

function validateDevOpenTaskState(plan: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const tasks = Array.isArray(plan.tasks) ? plan.tasks.filter(isRecord) : [];
  const open = tasks.filter((task) => OPEN_TASK_STATUSES.has(String(task.status)));
  if (open.length === 0) return errors;

  const currentTaskId = String(plan.current_task_id ?? "");
  if (!currentTaskId) {
    errors.push("validate-dev requires current_task_id when SPRINTING has an open task");
    return errors;
  }
  const currentTask = open.find((task) => String(task.id ?? "") === currentTaskId);
  if (!currentTask) {
    errors.push(`current_task_id does not match an open SPRINTING task: ${currentTaskId}`);
    return errors;
  }
  const otherOpen = open.filter((task) => String(task.id ?? "") !== currentTaskId);
  if (otherOpen.length > 0) {
    errors.push(`validate-dev supports only the current open task during SPRINTING: ${open.map((task) => task.id).join(", ")}`);
  }
  if (String(currentTask.phase ?? "") !== "SPRINTING") {
    errors.push(`${currentTaskId} must have phase SPRINTING for validate-dev`);
  }
  if (typeof currentTask.implementation_doc !== "string" || !currentTask.implementation_doc.trim()) {
    errors.push(`${currentTaskId} must define implementation_doc for validate-dev`);
  }
  return errors;
}

async function validateDevDraftConsumed(projectRoot: string, root: string): Promise<string[]> {
  const errors: string[] = [];
  const draft = await readYamlObject(path.join(projectRoot, root, "state", "plan.draft.yaml"));
  if ("current_phase" in draft) {
    errors.push("plan.draft.yaml must not define current_phase; lifecycle.yaml is the single source for current_phase");
  }
  if ("current_task_id" in draft) {
    errors.push("plan.draft.yaml must not define current_task_id because drafts are not active task state");
  }
  const tasks = Array.isArray(draft.tasks) ? draft.tasks : [];
  if (tasks.length > 0) {
    const ids = tasks.map((task) => (isRecord(task) ? String(task.id ?? "<missing id>") : "<missing id>")).join(", ");
    errors.push(
      `Unconsumed draft tasks remain in plan.draft.yaml: ${ids}. Promote the next draft into plan.yaml or remove already-consumed drafts before validate-dev.`
    );
  }
  return errors;
}

async function validateReview(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, false);
  const text = (await readText(path.join(projectRoot, ".docs/06_review/REVIEW_REPORT.md"))).toLowerCase();
  const errors = [...plan.errors];
  if (!containsAny(text, ["finding", "发现", "风险"])) errors.push("Review report must include findings or risks");
  if (!containsAny(text, ["test gap", "测试缺口", "coverage"])) errors.push("Review report must include test gaps or coverage notes");
  if (!containsAny(text, ["entry/exit", "entrypoint", "入口", "出口", "runnable", "可运行"])) {
    errors.push("Review report must assess runnable entry/exit readiness before TESTING");
  }
  if (!containsAny(text, ["pass", "blocked", "通过", "阻塞"])) errors.push("Review report must include PASS/BLOCKED decision");
  return { info: ["validate-review checked review report"], errors };
}

async function validateTest(projectRoot: string): Promise<ValidatorReport> {
  const root = await harnessRoot(projectRoot);
  const lifecycle = await readYamlObject(path.join(projectRoot, root, "state", "lifecycle.yaml"));
  const plan = await validatePlanState(projectRoot, false);
  const errors = [...plan.errors];
  const report = await readTestReport(projectRoot);
  const text = report ? report.text.toLowerCase() : "";
  if (!report) errors.push(`Missing test report: expected executed evidence at ${TEST_REPORT_PATH}`);
  if (containsAny(text, TEST_REPORT_PLACEHOLDER_TERMS)) {
    errors.push("Test report must contain executed evidence, not pending/TBD/TODO/placeholder content");
  }
  if (!containsAny(text, ["matrix", "矩阵"])) errors.push("Test report must include a test matrix");
  if (!containsAny(text, ["regression", "回归"])) errors.push("Test report must include regression evidence");
  if (!containsAny(text, ["coverage gap", "覆盖缺口", "gap"])) errors.push("Test report must include coverage gaps");
  if (!containsAny(text, ["entry/exit", "entrypoint", "入口", "出口", "runnable", "可运行"])) {
    errors.push("Test report must state existing runnable entry/exit coverage or blocker status");
  }
  if (!containsAny(text, ["pass", "blocked", "通过", "阻塞"])) errors.push("Test report must include PASS/BLOCKED decision");
  if (lifecycle.current_phase === "TESTING") {
    errors.push(...testingBoundaryErrorsForChangedFiles(await changedFiles(projectRoot)));
  }
  return { info: [`validate-test checked ${report?.source ?? "missing test report"}`], errors };
}

async function validateRelease(projectRoot: string): Promise<ValidatorReport> {
  const plan = await validatePlanState(projectRoot, false);
  const report = await readReleaseReport(projectRoot);
  const text = report?.text ?? "";
  const errors = [...plan.errors];
  if (!report) errors.push(`Missing current release report: expected ${CURRENT_RELEASE_REPORT_PATH} or legacy .docs/08_release/*.md`);
  if (!containsAny(text, ["release", "发布"])) errors.push("Current release report must include release notes");
  if (!containsAny(text, ["smoke", "冒烟"])) errors.push("Current release report must include smoke test evidence");
  if (!containsAny(text, ["rollback", "回滚"])) errors.push("Current release report must include rollback plan");
  return { info: [`validate-release checked ${report?.source ?? "missing current release report"}`], errors };
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
  if (!containsAny(text, ["test fact source impact", "测试事实源影响"])) {
    errors.push("RFC must include Test Fact Source Impact");
  }
  const indexPath = path.join(projectRoot, ".docs/INDEX.md");
  const indexText = (await pathExists(indexPath)) ? await readText(indexPath) : "";
  if (!indexText) errors.push("Missing .docs/INDEX.md for RFC test fact source validation");
  for (const superseded of await supersededTestDocs(docs)) {
    if (await pathExists(path.join(projectRoot, superseded))) {
      errors.push(`Superseded test doc still exists in current facts: ${superseded}`);
    }
    if (indexText.includes(superseded)) {
      errors.push(`Superseded test doc still linked from .docs/INDEX.md: ${superseded}`);
    }
  }
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
    errors.push(...testFactSourceErrorsForTask(task));
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
      errors.push(...testingBoundaryErrorsForAllowedPaths(task));
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

async function readTestReport(projectRoot: string): Promise<{ text: string; source: string } | undefined> {
  const canonical = path.join(projectRoot, TEST_REPORT_PATH);
  if (await pathExists(canonical)) {
    return { text: await readText(canonical), source: TEST_REPORT_PATH };
  }
  return undefined;
}

async function readReleaseReport(projectRoot: string): Promise<{ text: string; source: string } | undefined> {
  const canonical = path.join(projectRoot, CURRENT_RELEASE_REPORT_PATH);
  if (await pathExists(canonical)) {
    return { text: await readText(canonical), source: CURRENT_RELEASE_REPORT_PATH };
  }
  const legacyDocs = await markdownFiles(path.join(projectRoot, ".docs/08_release"));
  if (legacyDocs.length > 0) {
    return { text: await combinedText(legacyDocs), source: `legacy .docs/08_release/*.md (${legacyDocs.length} file(s))` };
  }
  return undefined;
}

async function validateImplementationDocRunnableEntryExit(projectRoot: string): Promise<string[]> {
  const docs = await markdownFiles(path.join(projectRoot, ".docs/04_implementation"));
  const errors: string[] = [];
  const indexPath = path.join(projectRoot, ".docs/INDEX.md");
  const indexText = (await pathExists(indexPath)) ? await readText(indexPath) : "";
  if (docs.length > 0 && !indexText) {
    errors.push("Missing .docs/INDEX.md for implementation doc validation");
  }
  for (const doc of docs) {
    const relative = repoRelative(projectRoot, doc);
    const dotted = relative.startsWith(".") ? relative : `.${relative}`;
    const withoutDocsPrefix = dotted.replace(/^\.docs\//, "");
    if (indexText && !indexText.includes(dotted) && !indexText.includes(withoutDocsPrefix)) {
      errors.push(`.docs/INDEX.md does not link implementation doc: ${dotted}`);
    }
    const text = await readText(doc);
    if (!containsAny(text, RUNNABLE_ENTRY_EXIT_TERMS)) {
      errors.push(
        `Implementation doc must include Runnable Entry/Exit facts or explicit Not applicable: ${dotted}`
      );
    }
  }
  return errors;
}

async function validateCurrentTaskDevelopmentEvidence(projectRoot: string, plan: Record<string, unknown>): Promise<string[]> {
  const currentTask = currentOpenSprintTask(plan);
  if (!currentTask) return [];
  const taskId = String(currentTask.id ?? "");
  const implementationDoc = String(currentTask.implementation_doc ?? "").trim();
  if (!implementationDoc) return [];
  const docPath = path.join(projectRoot, implementationDoc);
  if (!(await pathExists(docPath))) {
    return [`${taskId} implementation_doc is missing: ${implementationDoc}`];
  }
  const text = await readText(docPath);
  return validateDevelopmentEvidenceText(text, currentTask, implementationDoc);
}

function currentOpenSprintTask(plan: Record<string, unknown>): Record<string, unknown> | undefined {
  const currentTaskId = String(plan.current_task_id ?? "");
  if (!currentTaskId) return undefined;
  const tasks = Array.isArray(plan.tasks) ? plan.tasks.filter(isRecord) : [];
  return tasks.find((task) => String(task.id ?? "") === currentTaskId && OPEN_TASK_STATUSES.has(String(task.status)) && task.phase === "SPRINTING");
}

function validateDevelopmentEvidenceText(text: string, task: Record<string, unknown>, implementationDoc: string): string[] {
  const errors: string[] = [];
  const taskId = String(task.id ?? "current task");
  const section = markdownSection(text, DEVELOPMENT_EVIDENCE_TERMS);
  if (!section) {
    return [`${taskId} implementation_doc must include Development Evidence with Runnable Entry, Observable Exit, and Basic Self-test Evidence: ${implementationDoc}`];
  }
  if (hasJustifiedNotApplicableEvidence(section)) return [];

  for (const field of ["Runnable Entry", "Observable Exit", "Basic Self-test Evidence"]) {
    const value = evidenceFieldValue(section, field);
    if (!value || isPlaceholderEvidence(value)) {
      errors.push(`${taskId} Development Evidence ${field} must contain concrete, executed evidence in ${implementationDoc}`);
    }
  }

  const context = `${taskText(task)}\n${text}`.toLowerCase();
  const loweredSection = section.toLowerCase();
  if (containsAny(context, PAGE_TASK_TERMS)) {
    if (!containsAny(loweredSection, PAGE_ENTRY_TERMS)) {
      errors.push(`${taskId} page Development Evidence must include a dev server or page URL in ${implementationDoc}`);
    }
    if (!containsAny(loweredSection, PAGE_BROWSER_CHECK_TERMS)) {
      errors.push(`${taskId} page Development Evidence must include a browser check, Playwright run, screenshot, or equivalent interaction evidence in ${implementationDoc}`);
    }
  }
  if (containsAny(context, CALLABLE_TASK_TERMS)) {
    if (!containsAny(loweredSection, CALLABLE_ENTRY_TERMS)) {
      errors.push(`${taskId} callable Development Evidence must include an API/CLI/worker command, endpoint, route, or invocation in ${implementationDoc}`);
    }
    if (!containsAny(loweredSection, CALLABLE_RESULT_TERMS)) {
      errors.push(`${taskId} callable Development Evidence must include an observable response, output, side effect, log, artifact, or PASS/BLOCKED result in ${implementationDoc}`);
    }
  }
  return errors;
}

function markdownSection(text: string, headerTerms: string[]): string | undefined {
  const lines = text.split(/\r?\n/);
  let start = -1;
  let level = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+(.+)$/);
    if (!match) continue;
    const title = match[2].toLowerCase();
    if (headerTerms.some((term) => title.includes(term.toLowerCase()))) {
      start = index;
      level = match[1].length;
      break;
    }
  }
  if (start === -1) return undefined;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function hasJustifiedNotApplicableEvidence(section: string): boolean {
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\s*[-*]\s*Not applicable\s*:[ \t]*(.+)$/i);
    if (!match) continue;
    const value = match[1].trim();
    if (value.length >= 24 && !isPlaceholderEvidence(value) && containsAny(value, ["because", "reason", "原因", "无应用入口", "no product runtime", "no runnable boundary"])) {
      return true;
    }
  }
  return false;
}

function evidenceFieldValue(section: string, field: string): string | undefined {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^\\s*[-*]\\s*${escaped}\\s*:[ \\t]*(.+)$`, "im");
  return section.match(pattern)?.[1]?.trim();
}

function isPlaceholderEvidence(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized || ["-", "n/a", "na", "none", "null", "不适用", "无"].includes(normalized)) return true;
  return EVIDENCE_PLACEHOLDER_TERMS.some((term) => normalized === term || normalized.includes(term.toLowerCase()));
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

function testingBoundaryErrorsForAllowedPaths(task: Record<string, unknown>): string[] {
  if (task.phase !== "TESTING") return [];
  const allowed = Array.isArray(task.allowed_paths) ? task.allowed_paths.map((item) => String(item)) : [];
  const blocked = allowed.filter((item) => isTestingBoundaryAllowedPath(item));
  if (blocked.length === 0) return [];
  return [
    `TESTING task allowed_paths must not include product runtime, package/deploy config, or long-running runtime paths: ${blocked.join(", ")}`
  ];
}

function testingBoundaryErrorsForChangedFiles(files: string[]): string[] {
  const blocked = files.filter((file) => isTestingRuntimeBoundaryChange(file));
  if (blocked.length === 0) return [];
  return [
    `TESTING changes must use existing product entrypoints only; move runtime, bootstrap, provider, deploy, or package script changes to SPRINTING/RFC: ${blocked.join(", ")}`
  ];
}

function testFactSourceErrorsForTask(task: Record<string, unknown>): string[] {
  const phase = String(task.phase ?? "");
  if (TEST_FACT_SOURCE_PHASES.has(phase)) return [];
  const candidates = [...asStringList(task.allowed_paths), ...asStringList(task.result_docs)];
  const blocked = candidates.filter((candidate) => {
    const normalized = candidate.replace(/\\/g, "/");
    return normalized.startsWith(".docs/07_test/") || matchesAny(normalized, TEST_FACT_SOURCE_PATTERNS);
  });
  if (blocked.length === 0) return [];
  return [
    `Only TESTING or RFC_RECALIBRATION tasks may target current test fact sources under .docs/07_test/**: ${blocked.join(", ")}`
  ];
}

async function supersededTestDocs(docs: string[]): Promise<string[]> {
  const refs = new Set<string>();
  for (const doc of docs) {
    const text = await readText(doc);
    for (const line of text.split("\n")) {
      const lowered = line.toLowerCase();
      if (!lowered.includes("superseded") && !lowered.includes("被替代") && !lowered.includes("失效")) {
        continue;
      }
      for (const match of line.matchAll(TEST_FACT_SOURCE_REF)) {
        refs.add(normalizeDocRef(match[0]).replace(/[.,;:]$/, ""));
      }
    }
  }
  return [...refs].filter((ref) => ref.startsWith(".docs/07_test/"));
}

function isTestingBoundaryAllowedPath(file: string): boolean {
  const lowered = file.replace(/\\/g, "/").toLowerCase();
  if (["package.json", "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"].includes(lowered)) {
    return true;
  }
  return matchesAny(lowered, TESTING_DISALLOWED_ALLOWED_PATHS);
}

function isTestingRuntimeBoundaryChange(file: string): boolean {
  const normalized = file.replace(/\\/g, "/");
  const lowered = normalized.toLowerCase();
  if (isTestingBoundaryAllowedPath(lowered) || matchesAny(lowered, TESTING_DISALLOWED_CHANGED_PATHS)) {
    return true;
  }
  if (lowered.startsWith("tests/")) {
    const name = path.basename(lowered);
    if (TESTING_ALLOWED_TEST_FILE_TERMS.some((term) => name.includes(term))) {
      return false;
    }
    return TESTING_RUNTIME_FILE_TERMS.some((term) => name.includes(term));
  }
  return false;
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
    const { stdout } = await execFileAsync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: projectRoot });
    return stdout
      .split("\n")
      .map((line) => line.slice(3).trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
