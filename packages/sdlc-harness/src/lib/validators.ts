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
const PARALLEL_TRIGGERS = new Set(["user_requested", "workflow_default"]);
const PARALLEL_RUNTIME_PROVIDERS = new Set(["codex_native_subagents", "user_orchestrated", "codex_exec_worktree"]);
const TASK_PHASES = new Set(["REQUIREMENT_GATHERING", "ARCHITECTING", "SPRINTING", "REVIEWING", "TESTING", "RELEASING", "RFC_RECALIBRATION"]);
const PARALLEL_ALLOWED_PHASES = new Set(["REQUIREMENT_GATHERING", "ARCHITECTING", "SPRINTING", "REVIEWING", "TESTING", "RELEASING", "RFC_RECALIBRATION"]);
const PARALLEL_READ_ONLY_PHASES = new Set(["REQUIREMENT_GATHERING", "ARCHITECTING", "REVIEWING", "RELEASING", "RFC_RECALIBRATION"]);
const PARALLEL_PROTECTED_WRITE_PATTERNS = [
  ".codex/state/**",
  "<harnessRoot>/state/**",
  ".docs/INDEX.md",
  ".docs/**/overview.md",
  ".docs/04_implementation/**",
  ".docs/06_review/**",
  ".docs/08_release/**"
];
const TASK_STATUSES = new Set(["pending", "in_progress", "done", "blocked", "pending_revision", "cancelled"]);
const OPEN_TASK_STATUSES = new Set(["pending", "in_progress", "blocked", "pending_revision"]);
const EVIDENCE_LEVELS = new Set(["unit", "local_runtime", "external_provider_live", "deployed_runtime", "business_handoff_ready"]);
const EVIDENCE_LEVEL_ORDER = ["unit", "local_runtime", "external_provider_live", "deployed_runtime", "business_handoff_ready"];
const TARGET_RUNTIME_KINDS = new Set(["local", "ci", "staging", "cloud_vm", "managed_service", "browser", "worker", "not_applicable"]);
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
const DEVELOPMENT_SELF_TEST_CONTRACT_TERMS = ["development self-test contract", "开发自测合同"];
const DEVELOPMENT_SELF_TEST_REPORT_TERMS = ["development self-test report", "开发自测报告"];
const DEVELOPMENT_SELF_TEST_IMPACT_TERMS = ["development self-test impact", "开发自测影响"];
const MODULE_KEY_TEST_PATH_TERMS = ["module key test path", "模块关键测试路径"];
const TESTING_HANDOFF_TERMS = ["testing handoff contract", "测试交接合同"];
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
const PAGE_BROWSER_CHECK_TERMS = ["browser check", "playwright", "screenshot", "click", "button", "form", "页面可加载", "浏览器验证"];
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
const APPLICATION_READINESS_TASK_TERMS = [
  "service",
  "agent",
  "runtime",
  "http",
  "server",
  "worker",
  "provider",
  "adapter",
  "live mode",
  "live",
  "external integration",
  "webhook",
  "bot",
  "机器人",
  "常驻",
  "云端",
  "入口",
  "出口"
];
const APPLICATION_START_TERMS = [
  "start",
  "startup",
  "启动",
  "listen",
  "serve",
  "server",
  "http://",
  "https://",
  "localhost",
  "endpoint",
  "cli command",
  "worker command",
  "daemon",
  "常驻",
  "health",
  "status"
];
const CONFIG_CONTRACT_TERMS = ["config", "configuration", "env", "environment", "api key", "secret", "契约", "配置", "环境变量"];
const INSUFFICIENT_APPLICATION_SMOKE_TERMS = [
  "provider smoke",
  "provider live smoke",
  "fixture smoke",
  "fake adapter",
  "fake send",
  "one-shot smoke",
  "one shot smoke",
  "domain smoke",
  "受控 smoke"
];
const LOWER_LEVEL_EVIDENCE_TERMS = [
  ...INSUFFICIENT_APPLICATION_SMOKE_TERMS,
  "unit",
  "unit test",
  "local_runtime",
  "local runtime",
  "localhost",
  "external_provider_live",
  "external provider live"
];
const MISSING_READINESS_TERMS = [
  "missing entry",
  "missing exit",
  "missing runnable",
  "missing development evidence",
  "no runnable",
  "no entry",
  "no exit",
  "入口缺失",
  "出口缺失",
  "缺少入口",
  "缺少出口",
  "缺少 development evidence",
  "尚未交付",
  "未交付",
  "不存在"
];
const RUNTIME_MISMATCH_TERMS = [
  ...MISSING_READINESS_TERMS,
  "not deployed",
  "not initialized",
  "not connected",
  "local only",
  "localhost only",
  "fake adapter",
  "fake send",
  "未部署",
  "未初始化",
  "未接入",
  "只在本地",
  "仅本地",
  "本地跑通"
];
const REVIEW_READINESS_FIELDS = [
  "Runnable Entry",
  "Observable Exit",
  "Initialization",
  "Config Contract",
  "Testing Handoff Readiness"
];
const SELF_TEST_CONTRACT_STATUSES = new Set(["required", "not_applicable"]);
const RFC_SELF_TEST_TRIGGER_TERMS = [
  "entry/exit",
  "runnable entry",
  "runnable exit",
  "runnable entry/exit",
  "runtime",
  "environment",
  "target_runtime_environment",
  "target runtime",
  "required_gates",
  "gate",
  "handoff",
  "blocker",
  "module key test path",
  "test route",
  "test path",
  "debug path",
  "测试路径",
  "测试链路",
  "自测链路",
  "模块关键测试路径",
  "入口",
  "出口",
  "运行环境",
  "阻塞"
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
  for (const [index, rawTask] of rawTasks.entries()) {
    if (!isRecord(rawTask)) {
      errors.push(`Task draft #${index + 1} must be a mapping`);
      continue;
    }
    validateDraftTaskShape(rawTask, index, errors);
    if (rawTask.status !== "pending") {
      errors.push(`Draft task ${String(rawTask.id ?? "")} should start as pending`);
    }
    if (!isDevelopmentDraft(rawTask)) continue;

    developmentTasks.push(rawTask);
    if (!isRecord(rawTask.docs)) {
      errors.push(`Draft task ${String(rawTask.id ?? "")} docs must be a mapping`);
      continue;
    }
    const techRefs = asStringList(rawTask.docs.tech_plan);
    if (techRefs.length === 0) {
      errors.push(`Draft task ${String(rawTask.id ?? "")} must reference at least one tech plan slice in docs.tech_plan`);
      continue;
    }
    const normalizedRefs = techRefs.map(normalizeDocRef);
    for (const ref of normalizedRefs) {
      if (!ref.startsWith(".docs/03_tech_plan/")) {
        errors.push(`Draft task ${String(rawTask.id ?? "")} docs.tech_plan must point into .docs/03_tech_plan/: ${ref}`);
      } else if (!availableTechPlans.has(ref)) {
        errors.push(`Draft task ${String(rawTask.id ?? "")} references missing or generated tech plan slice: ${ref}`);
      }
    }
    errors.push(...(await validateSelfTestContractTechPlanBinding(projectRoot, rawTask, normalizedRefs)));
    primaryRefs.push(normalizedRefs[0]);
  }

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
    errors.push(...validateRuntimeEvidenceContract(task));
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
  const rawText = await readText(path.join(projectRoot, ".docs/06_review/REVIEW_REPORT.md"));
  const text = rawText.toLowerCase();
  const errors = [...plan.errors];
  if (!containsAny(text, ["finding", "发现", "风险"])) errors.push("Review report must include findings or risks");
  if (!containsAny(text, ["test gap", "测试缺口", "coverage"])) errors.push("Review report must include test gaps or coverage notes");
  if (!containsAny(text, ["entry/exit", "entrypoint", "入口", "出口", "runnable", "可运行"])) {
    errors.push("Review report must assess runnable entry/exit readiness before TESTING");
  }
  errors.push(...validateReviewReadinessChecklist(rawText));
  errors.push(...validateRuntimeHandoffReport(rawText, "Review report"));
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
  errors.push(...validateTestReadinessDecision(text));
  errors.push(...validateRuntimeHandoffReport(report?.text ?? "", "Test report"));
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
  const statuses = [...text.matchAll(/^\s*-?\s*Status:\s*([A-Z_]+)/gim)].map((match) => match[1].toUpperCase());
  if (statuses.length === 0) errors.push("RFC must include a Status line");
  const invalidStatuses = statuses.filter((status) => !["DRAFT", "APPLIED", "VERIFIED", "ARCHIVED"].includes(status));
  if (invalidStatuses.length > 0) errors.push(`Invalid RFC status: ${invalidStatuses.join(", ")}`);
  errors.push(...(await validateRfcSelfTestImpact(projectRoot, docs)));
  return { info: [`validate-rfc checked ${docs.length} file(s)`], errors };
}

async function validateRfcSelfTestImpact(projectRoot: string, docs: string[]): Promise<string[]> {
  const errors: string[] = [];
  for (const doc of docs) {
    const relative = repoRelative(projectRoot, doc);
    const basename = path.basename(doc);
    const number = rfcNumber(basename);
    if (number !== undefined && number < 23) continue;
    const text = await readText(doc);
    if (!containsAny(text, RFC_SELF_TEST_TRIGGER_TERMS)) continue;
    if (!containsAny(text, DEVELOPMENT_SELF_TEST_IMPACT_TERMS)) {
      errors.push(`${relative} must include Development Self-Test Impact when RFC changes entry/exit, runtime, gates, handoff, or blockers`);
    }
  }
  return errors;
}

function rfcNumber(fileName: string): number | undefined {
  const match = fileName.match(/^RFC[_-](\d+)/i);
  return match ? Number(match[1]) : undefined;
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
      errors.push(...validateRuntimeEvidenceContract(task));
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

function validateRuntimeEvidenceContract(task: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const taskId = String(task.id ?? "Task");
  if (String(task.phase ?? "") !== "SPRINTING") return errors;

  const context = taskText(task).toLowerCase();
  const needsRuntimeContract = needsRunnableTaskContract(task) && !isNotApplicableRuntimeTask(task);
  const evidenceLevel = task.evidence_level;
  const targetRuntime = task.target_runtime_environment;

  if (needsRuntimeContract && !isRecord(evidenceLevel)) {
    errors.push(`${taskId} runtime/app task must define evidence_level.required`);
  }
  if (needsRuntimeContract && !isRecord(targetRuntime)) {
    errors.push(`${taskId} runtime/app task must define target_runtime_environment`);
  }

  if (evidenceLevel !== undefined) {
    if (!isRecord(evidenceLevel)) {
      errors.push(`${taskId} evidence_level must be a mapping`);
    } else {
      const required = String(evidenceLevel.required ?? "");
      if (!EVIDENCE_LEVELS.has(required)) {
        errors.push(`${taskId} evidence_level.required must be one of ${[...EVIDENCE_LEVELS].join(", ")}`);
      }
      if ("supporting" in evidenceLevel && !Array.isArray(evidenceLevel.supporting)) {
        errors.push(`${taskId} evidence_level.supporting must be a list when present`);
      }
      if (Array.isArray(evidenceLevel.supporting)) {
        for (const level of evidenceLevel.supporting) {
          if (!EVIDENCE_LEVELS.has(String(level))) {
            errors.push(`${taskId} evidence_level.supporting contains invalid level: ${String(level)}`);
          }
        }
      }
    }
  }

  if (targetRuntime !== undefined) {
    if (!isRecord(targetRuntime)) {
      errors.push(`${taskId} target_runtime_environment must be a mapping`);
    } else {
      const kind = String(targetRuntime.kind ?? "");
      if (!TARGET_RUNTIME_KINDS.has(kind)) {
        errors.push(`${taskId} target_runtime_environment.kind must be one of ${[...TARGET_RUNTIME_KINDS].join(", ")}`);
      }
      if (typeof targetRuntime.required_for_done !== "boolean") {
        errors.push(`${taskId} target_runtime_environment.required_for_done must be a boolean`);
      }
      if (targetRuntime.required_for_done === true) {
        const entrypoint = String(targetRuntime.handoff_entrypoint ?? "").trim();
        if (!entrypoint) {
          errors.push(`${taskId} target_runtime_environment.handoff_entrypoint is required when required_for_done is true`);
        }
        if (["cloud_vm", "staging", "managed_service"].includes(kind) && /localhost|127\.0\.0\.1/.test(entrypoint.toLowerCase())) {
          errors.push(`${taskId} target runtime ${kind} cannot use localhost as final handoff_entrypoint`);
        }
      }
    }
  }

  errors.push(...validateSelfTestContract(task, needsRuntimeContract));
  return errors;
}

function needsRunnableTaskContract(task: Record<string, unknown>): boolean {
  const context = taskText(task).toLowerCase();
  return containsAny(context, [...APPLICATION_READINESS_TASK_TERMS, ...PAGE_TASK_TERMS, ...CALLABLE_TASK_TERMS]);
}

function isNotApplicableRuntimeTask(task: Record<string, unknown>): boolean {
  const evidenceLevel = isRecord(task.evidence_level) ? task.evidence_level : undefined;
  const targetRuntime = isRecord(task.target_runtime_environment) ? task.target_runtime_environment : undefined;
  return String(evidenceLevel?.required ?? "") === "unit" && String(targetRuntime?.kind ?? "") === "not_applicable";
}

function validateSelfTestContract(task: Record<string, unknown>, requiredForRunnableBoundary: boolean): string[] {
  const errors: string[] = [];
  const taskId = String(task.id ?? "Task");
  const contract = task.self_test_contract;

  if (requiredForRunnableBoundary && !isRecord(contract)) {
    errors.push(`${taskId} runtime/app task must define self_test_contract`);
    return errors;
  }
  if (contract === undefined) return errors;
  if (!isRecord(contract)) {
    errors.push(`${taskId} self_test_contract must be a mapping`);
    return errors;
  }

  const status = String(contract.status ?? "");
  if (!SELF_TEST_CONTRACT_STATUSES.has(status)) {
    errors.push(`${taskId} self_test_contract.status must be required or not_applicable`);
  }
  if (requiredForRunnableBoundary && status !== "required") {
    errors.push(`${taskId} runnable boundary task self_test_contract.status must be required`);
  }

  if (status === "not_applicable") {
    const reason = String(contract.not_applicable_reason ?? "").trim();
    if (reason.length < 24 || isPlaceholderEvidence(reason)) {
      errors.push(`${taskId} self_test_contract.not_applicable_reason must explain why self-test is not applicable`);
    }
    return errors;
  }
  if (status !== "required") return errors;

  for (const field of ["source", "runnable_entry", "observable_exit", "module_key_test_path"]) {
    if (typeof contract[field] !== "string" || !String(contract[field]).trim() || isPlaceholderEvidence(String(contract[field]))) {
      errors.push(`${taskId} self_test_contract.${field} must be concrete`);
    }
  }
  if (!Array.isArray(contract.capability_refs) || contract.capability_refs.length === 0) {
    errors.push(`${taskId} self_test_contract.capability_refs must be a non-empty list`);
  }

  const requiredGates = asStringList(contract.required_gates);
  if (requiredGates.length === 0) {
    errors.push(`${taskId} self_test_contract.required_gates must be a non-empty list`);
  }
  const taskGates = new Set(asStringList(task.required_gates));
  for (const gate of requiredGates) {
    if (!taskGates.has(gate)) {
      errors.push(`${taskId} self_test_contract.required_gates must also appear in task required_gates: ${gate}`);
    }
  }

  const scenarios = Array.isArray(contract.scenarios) ? contract.scenarios : [];
  if (scenarios.length === 0) {
    errors.push(`${taskId} self_test_contract.scenarios must be a non-empty list`);
  }
  const seen = new Set<string>();
  scenarios.forEach((scenario, index) => {
    if (!isRecord(scenario)) {
      errors.push(`${taskId} self_test_contract.scenarios[${index}] must be a mapping`);
      return;
    }
    const scenarioId = String(scenario.id ?? "").trim();
    if (!scenarioId) {
      errors.push(`${taskId} self_test_contract.scenarios[${index}].id must be set`);
    } else if (seen.has(scenarioId)) {
      errors.push(`${taskId} self_test_contract scenario id must be unique: ${scenarioId}`);
    }
    seen.add(scenarioId);
    for (const field of ["entry", "expected_exit", "evidence"]) {
      if (typeof scenario[field] !== "string" || !String(scenario[field]).trim() || isPlaceholderEvidence(String(scenario[field]))) {
        errors.push(`${taskId} self_test_contract.scenarios[${scenarioId || index}].${field} must be concrete`);
      }
    }
  });
  return errors;
}

async function validateSelfTestContractTechPlanBinding(
  projectRoot: string,
  task: Record<string, unknown>,
  normalizedTechRefs: string[]
): Promise<string[]> {
  const errors: string[] = [];
  const taskId = String(task.id ?? "Task");
  const contract = isRecord(task.self_test_contract) ? task.self_test_contract : undefined;
  if (!contract || String(contract.status ?? "") !== "required") return errors;

  const source = normalizeDocRef(String(contract.source ?? ""));
  if (!source) return errors;
  if (!normalizedTechRefs.includes(source)) {
    errors.push(`${taskId} self_test_contract.source must be listed in docs.tech_plan: ${source}`);
    return errors;
  }
  const sourcePath = path.join(projectRoot, source);
  if (!(await pathExists(sourcePath))) return errors;
  const text = await readText(sourcePath);
  const section = markdownSection(text, DEVELOPMENT_SELF_TEST_CONTRACT_TERMS);
  if (!section) {
    errors.push(`${taskId} self_test_contract.source must contain a Development Self-Test Contract section: ${source}`);
    return errors;
  }
  if (!containsAny(section, MODULE_KEY_TEST_PATH_TERMS)) {
    errors.push(`${taskId} tech plan Development Self-Test Contract must include Module key test path: ${source}`);
  }
  for (const scenario of Array.isArray(contract.scenarios) ? contract.scenarios.filter(isRecord) : []) {
    const scenarioId = String(scenario.id ?? "").trim();
    if (scenarioId && !section.includes(scenarioId)) {
      errors.push(`${taskId} tech plan Development Self-Test Contract must include scenario ${scenarioId}: ${source}`);
    }
  }
  return errors;
}

function validateParallelExecutionContract(plan: Record<string, unknown>, currentPhase: string, errors: string[]): void {
  const contract = plan.parallel_execution;
  if (contract === undefined || contract === null) return;
  if (!isRecord(contract)) {
    errors.push("parallel_execution must be a mapping");
    return;
  }

  if (contract.enabled !== true) errors.push("parallel_execution.enabled must be true when present");
  if (!PARALLEL_TRIGGERS.has(String(contract.trigger ?? ""))) {
    errors.push("parallel_execution.trigger must be user_requested or workflow_default");
  }
  if (!PARALLEL_MODES.has(String(contract.mode ?? ""))) {
    errors.push("parallel_execution.mode must be runtime_managed or user_orchestrated");
  }
  const provider = parallelRuntimeProvider(contract, errors);
  if (provider && !PARALLEL_RUNTIME_PROVIDERS.has(provider)) {
    errors.push("parallel_execution.runtime.provider must be codex_native_subagents, user_orchestrated, or codex_exec_worktree");
  }
  if (contract.trigger === "workflow_default" && provider !== "codex_native_subagents") {
    errors.push('parallel_execution.runtime.provider must be "codex_native_subagents" when trigger is workflow_default');
  }
  if ("phase" in contract) {
    errors.push("parallel_execution must not define phase; lifecycle.yaml is the single source for current_phase");
  }
  if ("linked_task_id" in contract) {
    errors.push("parallel_execution must not define linked_task_id; use plan.yaml current_task_id");
  }
  if (!PARALLEL_ALLOWED_PHASES.has(currentPhase)) {
    errors.push(
      "parallel_execution is only supported during REQUIREMENT_GATHERING, ARCHITECTING, SPRINTING, REVIEWING, TESTING, RELEASING, or RFC_RECALIBRATION"
    );
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
    const writeOwnedPaths: Array<{ index: number; path: string }> = [];
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
      if (PARALLEL_READ_ONLY_PHASES.has(currentPhase) && worker.writes_repo !== false) {
        errors.push(`${prefix}.writes_repo must be false during ${currentPhase}`);
      }
      if (worker.writes_repo === true) {
        if (provider !== "codex_native_subagents") {
          if (typeof worker.branch !== "string" || !worker.branch.trim()) {
            errors.push(`${prefix}.branch is required when writes_repo is true outside codex_native_subagents runtime`);
          }
          if (typeof worker.worktree !== "string" || !worker.worktree.trim()) {
            errors.push(`${prefix}.worktree is required when writes_repo is true outside codex_native_subagents runtime`);
          }
        }
        if (!Array.isArray(worker.owned_paths) || worker.owned_paths.length === 0) {
          errors.push(`${prefix}.owned_paths must not be empty when writes_repo is true`);
        }
        validateParallelWorkerPathLock(plan, worker, index, errors);
        for (const owned of stringArray(worker.owned_paths).map(normalizeParallelPattern)) {
          writeOwnedPaths.push({ index, path: owned });
        }
      }
    });
    for (let left = 0; left < writeOwnedPaths.length; left += 1) {
      for (let right = left + 1; right < writeOwnedPaths.length; right += 1) {
        const leftOwned = writeOwnedPaths[left];
        const rightOwned = writeOwnedPaths[right];
        if (globPatternsOverlap(leftOwned.path, rightOwned.path)) {
          errors.push(
            `parallel_execution write worker owned_paths must not overlap: workers[${leftOwned.index}] ${leftOwned.path} vs workers[${rightOwned.index}] ${rightOwned.path}`
          );
        }
      }
    }
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

function parallelRuntimeProvider(contract: Record<string, unknown>, errors: string[]): string {
  const runtime = contract.runtime;
  if (runtime === undefined || runtime === null) return "";
  if (!isRecord(runtime)) {
    errors.push("parallel_execution.runtime must be a mapping when present");
    return "";
  }
  return String(runtime.provider ?? "");
}

function validateParallelWorkerPathLock(plan: Record<string, unknown>, worker: Record<string, unknown>, index: number, errors: string[]): void {
  const currentTask = currentPlanTask(plan);
  if (!currentTask) return;
  const taskAllowed = stringArray(currentTask.allowed_paths).map(normalizeParallelPattern);
  const workerOwned = stringArray(worker.owned_paths).map(normalizeParallelPattern);
  const workerForbidden = stringArray(worker.forbidden_paths).map(normalizeParallelPattern);
  const protectedPatterns = PARALLEL_PROTECTED_WRITE_PATTERNS.map(normalizeParallelPattern);
  for (const owned of workerOwned) {
    if (!matchesAny(owned, taskAllowed)) {
      errors.push(`parallel_execution.workers[${index}].owned_paths must be within current task allowed_paths: ${owned}`);
    }
    for (const forbidden of [...workerForbidden, ...protectedPatterns]) {
      if (globPatternsOverlap(owned, forbidden)) {
        errors.push(`parallel_execution.workers[${index}].owned_paths must not overlap forbidden paths: ${owned} vs ${forbidden}`);
      }
    }
  }
}

function currentPlanTask(plan: Record<string, unknown>): Record<string, unknown> | undefined {
  const currentTaskId = String(plan.current_task_id ?? "");
  const tasks = Array.isArray(plan.tasks) ? plan.tasks.filter(isRecord) : [];
  return tasks.find((task) => String(task.id ?? "") === currentTaskId);
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function normalizeParallelPattern(pattern: string): string {
  return pattern.replace(/\\/g, "/").replaceAll("<harnessRoot>", ".codex");
}

function globPrefix(pattern: string): string {
  const normalized = normalizeParallelPattern(pattern);
  const positions = ["*", "[", "?"].map((token) => normalized.indexOf(token)).filter((index) => index >= 0);
  const prefix = positions.length > 0 ? normalized.slice(0, Math.min(...positions)) : normalized;
  return prefix.replace(/\/+$/, "");
}

function globPatternsOverlap(left: string, right: string): boolean {
  const leftClean = normalizeParallelPattern(left);
  const rightClean = normalizeParallelPattern(right);
  if (matchesGlob(leftClean, rightClean) || matchesGlob(rightClean, leftClean)) return true;
  const leftPrefix = globPrefix(leftClean);
  const rightPrefix = globPrefix(rightClean);
  if (!leftPrefix || !rightPrefix) return leftPrefix === rightPrefix;
  return leftPrefix === rightPrefix || leftPrefix.startsWith(`${rightPrefix}/`) || rightPrefix.startsWith(`${leftPrefix}/`);
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
  if (hasJustifiedNotApplicableEvidence(section) && !hasConcreteDevelopmentEvidenceFields(section)) {
    const required = isRecord(task.evidence_level) ? String(task.evidence_level.required ?? "") : "";
    const targetRuntime = isRecord(task.target_runtime_environment) ? task.target_runtime_environment : undefined;
    if (required && required !== "unit") {
      return [`${taskId} Development Evidence cannot be Not applicable when evidence_level.required is ${required} in ${implementationDoc}`];
    }
    if (targetRuntime && targetRuntime.required_for_done === true && String(targetRuntime.kind ?? "") !== "not_applicable") {
      return [`${taskId} Development Evidence cannot be Not applicable when target_runtime_environment.required_for_done is true in ${implementationDoc}`];
    }
    return [];
  }

  for (const field of ["Evidence Level", "Target Runtime Environment", "Runnable Entry", "Observable Exit", "Client / Server Initialization", "Config Contract", "Testing Handoff Readiness", "Known Missing Runtime Boundaries", "Basic Self-test Evidence"]) {
    const value = evidenceFieldValue(section, field);
    if (!value || isPlaceholderEvidence(value)) {
      errors.push(`${taskId} Development Evidence ${field} must contain concrete, executed evidence in ${implementationDoc}`);
    }
  }

  const runnableSection = markdownSection(text, RUNNABLE_ENTRY_EXIT_TERMS) ?? "";
  const context = `${taskText(task)}\n${section}\n${runnableSection}`.toLowerCase();
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
  if (containsAny(context, APPLICATION_READINESS_TASK_TERMS)) {
    if (!containsAny(loweredSection, APPLICATION_START_TERMS)) {
      errors.push(`${taskId} application readiness evidence must include a real startup, live entrypoint, health/status check, endpoint, CLI command, or worker command in ${implementationDoc}`);
    }
    if (!containsAny(loweredSection, CONFIG_CONTRACT_TERMS)) {
      errors.push(`${taskId} application readiness evidence must include the configuration contract or required env/config inputs in ${implementationDoc}`);
    }
    if (containsAny(loweredSection, INSUFFICIENT_APPLICATION_SMOKE_TERMS) && !containsAny(loweredSection, ["application readiness", "runtime http smoke", "external integration smoke", "blocked", "阻塞"])) {
      errors.push(`${taskId} provider, fixture, fake-adapter, or one-shot smoke is not enough for application readiness; record application readiness evidence or BLOCKED in ${implementationDoc}`);
    }
  }
  errors.push(...validateEvidenceLevelAgainstContract(section, text, task, implementationDoc));
  errors.push(...validateDevelopmentSelfTestReport(text, section, task, implementationDoc));
  return errors;
}

function validateDevelopmentSelfTestReport(
  fullText: string,
  developmentEvidenceSection: string,
  task: Record<string, unknown>,
  implementationDoc: string
): string[] {
  const errors: string[] = [];
  const taskId = String(task.id ?? "current task");
  const contract = isRecord(task.self_test_contract) ? task.self_test_contract : undefined;
  if (!contract || String(contract.status ?? "") !== "required") return errors;

  const report = markdownSection(fullText, DEVELOPMENT_SELF_TEST_REPORT_TERMS);
  if (!report) {
    return [`${taskId} implementation_doc must include Development Self-Test Report for self_test_contract: ${implementationDoc}`];
  }

  const basicSelfTest = evidenceFieldValue(developmentEvidenceSection, "Basic Self-test Evidence") ?? "";
  if (!containsAny(basicSelfTest, ["Development Self-Test Report", "开发自测报告", "self-test report"])) {
    errors.push(`${taskId} Basic Self-test Evidence must reference the Development Self-Test Report in ${implementationDoc}`);
  }

  for (const field of ["Contract Source", "Scenario Results", "Executed Gates", "Module Key Test Path", "Actual Evidence", "Missing / Blockers", "Testing Handoff Readiness"]) {
    const value = evidenceFieldValue(report, field);
    const allowsNone = field === "Missing / Blockers";
    if (!value || (!allowsNone && isPlaceholderEvidence(value))) {
      errors.push(`${taskId} Development Self-Test Report ${field} must contain executed evidence in ${implementationDoc}`);
    }
  }

  const source = String(contract.source ?? "").trim();
  if (source && !report.includes(source)) {
    errors.push(`${taskId} Development Self-Test Report must reference contract source ${source} in ${implementationDoc}`);
  }
  for (const gate of asStringList(contract.required_gates)) {
    if (!report.includes(gate)) {
      errors.push(`${taskId} Development Self-Test Report must record required gate ${gate} in ${implementationDoc}`);
    }
  }
  const moduleKeyTestPath = evidenceFieldValue(report, "Module Key Test Path") ?? "";
  const runnableEntry = String(contract.runnable_entry ?? "").trim();
  if (runnableEntry && !moduleKeyTestPath.includes(runnableEntry)) {
    errors.push(`${taskId} Development Self-Test Report Module Key Test Path must include runnable entry ${runnableEntry} in ${implementationDoc}`);
  }
  const scenarios = Array.isArray(contract.scenarios) ? contract.scenarios.filter(isRecord) : [];
  for (const scenario of scenarios) {
    const scenarioId = String(scenario.id ?? "").trim();
    if (!scenarioId) continue;
    if (!moduleKeyTestPath.includes(scenarioId)) {
      errors.push(`${taskId} Development Self-Test Report Module Key Test Path must include scenario ${scenarioId} in ${implementationDoc}`);
    }
    const status = scenarioStatus(report, scenarioId);
    if (!status) {
      errors.push(`${taskId} Development Self-Test Report must record scenario ${scenarioId} as PASS or BLOCKED in ${implementationDoc}`);
    } else if (status === "BLOCKED") {
      errors.push(`${taskId} Development Self-Test Report scenario ${scenarioId} is BLOCKED; keep task open or record a blocker`);
    }
  }
  return errors;
}

function scenarioStatus(text: string, scenarioId: string): "PASS" | "BLOCKED" | undefined {
  const escaped = scenarioId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp("^.*" + escaped + ".*\\b(PASS|BLOCKED)\\b.*$", "im"),
    new RegExp("\\|[^\\n|]*" + escaped + "[^\\n|]*\\|[^\\n|]*\\b(PASS|BLOCKED)\\b[^\\n|]*\\|", "i")
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase() as "PASS" | "BLOCKED";
  }
  return undefined;
}

function hasConcreteDevelopmentEvidenceFields(section: string): boolean {
  return ["Evidence Level", "Target Runtime Environment", "Runnable Entry", "Observable Exit", "Client / Server Initialization", "Config Contract"].some((field) => {
    const value = evidenceFieldValue(section, field);
    return Boolean(value && !isPlaceholderEvidence(value));
  });
}

function validateEvidenceLevelAgainstContract(section: string, fullText: string, task: Record<string, unknown>, implementationDoc: string): string[] {
  const errors: string[] = [];
  const taskId = String(task.id ?? "current task");
  const evidenceLevel = isRecord(task.evidence_level) ? task.evidence_level : undefined;
  const targetRuntime = isRecord(task.target_runtime_environment) ? task.target_runtime_environment : undefined;
  const required = String(evidenceLevel?.required ?? "");
  const actualLevelText = evidenceFieldValue(section, "Evidence Level") ?? section;
  const actualLevel = evidenceLevelFromText(actualLevelText);
  const loweredText = `${section}\n${fullText}`.toLowerCase();

  if (required && EVIDENCE_LEVELS.has(required)) {
    if (!actualLevel) {
      errors.push(`${taskId} Development Evidence Evidence Level must state the actual evidence level for required ${required} in ${implementationDoc}`);
    } else if (evidenceLevelRank(actualLevel) < evidenceLevelRank(required)) {
      errors.push(`${taskId} Development Evidence level ${actualLevel} is lower than required ${required} in ${implementationDoc}`);
    }
    if (["deployed_runtime", "business_handoff_ready"].includes(required)) {
      const supportOnly = containsAny(loweredText, LOWER_LEVEL_EVIDENCE_TERMS) && !loweredText.includes(required);
      if (supportOnly) {
        errors.push(`${taskId} lower-level smoke cannot close required ${required}; record target runtime handoff evidence or BLOCKED in ${implementationDoc}`);
      }
    }
  }

  if (targetRuntime) {
    const kind = String(targetRuntime.kind ?? "");
    const targetText = evidenceFieldValue(section, "Target Runtime Environment") ?? section;
    if (kind && TARGET_RUNTIME_KINDS.has(kind) && !targetText.toLowerCase().includes(kind.replace("_", " ")) && !targetText.toLowerCase().includes(kind)) {
      errors.push(`${taskId} Development Evidence Target Runtime Environment must match task contract kind ${kind} in ${implementationDoc}`);
    }
    if (targetRuntime.required_for_done === true && String(targetRuntime.handoff_entrypoint ?? "").trim()) {
      const entrypoint = String(targetRuntime.handoff_entrypoint).trim();
      if (!fullText.includes(entrypoint)) {
        errors.push(`${taskId} implementation_doc must record handoff_entrypoint ${entrypoint} from target_runtime_environment in ${implementationDoc}`);
      }
    }
  }

  if (required === "business_handoff_ready") {
    errors.push(...validateTestingHandoffContract(fullText, task, implementationDoc));
  }

  return errors;
}

function validateTestingHandoffContract(text: string, task: Record<string, unknown>, implementationDoc: string): string[] {
  const taskId = String(task.id ?? "current task");
  const section = markdownSection(text, TESTING_HANDOFF_TERMS);
  if (!section) {
    return [`${taskId} required business_handoff_ready but implementation_doc is missing Testing Handoff Contract: ${implementationDoc}`];
  }
  const lowered = section.toLowerCase();
  const requiredGroups: Array<[string, string[]]> = [
    ["entrypoint", ["entry", "entrypoint", "url", "command", "入口"]],
    ["config", ["config", "env", "secret", "配置", "环境变量"]],
    ["initialization", ["initialization", "startup", "start", "health", "初始化", "启动"]],
    ["input sample", ["input sample", "request body", "fixture", "message", "输入样例", "请求"]],
    ["observable exit", ["observable exit", "expected exit", "response", "queue", "audit", "file", "发送", "出口"]],
    ["cleanup", ["cleanup", "shutdown", "reset", "idempotent", "清理", "关闭", "重置", "幂等"]],
    ["evidence level", ["business_handoff_ready", "evidence level", "证据等级"]]
  ];
  const errors: string[] = [];
  for (const [label, terms] of requiredGroups) {
    if (!containsAny(lowered, terms)) {
      errors.push(`${taskId} Testing Handoff Contract must include ${label} in ${implementationDoc}`);
    }
  }
  const targetRuntime = isRecord(task.target_runtime_environment) ? task.target_runtime_environment : undefined;
  const entrypoint = String(targetRuntime?.handoff_entrypoint ?? "").trim();
  if (entrypoint && !section.includes(entrypoint)) {
    errors.push(`${taskId} Testing Handoff Contract must include handoff_entrypoint ${entrypoint} in ${implementationDoc}`);
  }
  return errors;
}

function evidenceLevelFromText(text: string): string | undefined {
  const lowered = text.toLowerCase().replace(/-/g, "_").replace(/\s+/g, "_");
  return EVIDENCE_LEVEL_ORDER.find((level) => lowered.includes(level));
}

function evidenceLevelRank(level: string): number {
  return EVIDENCE_LEVEL_ORDER.indexOf(level);
}

function validateReviewReadinessChecklist(text: string): string[] {
  const errors: string[] = [];
  for (const field of REVIEW_READINESS_FIELDS) {
    const status = readinessStatus(text, field);
    if (!status) {
      errors.push(`Review report must include ${field}: PASS/BLOCKED`);
    } else if (status === "BLOCKED") {
      errors.push(`Review readiness is BLOCKED: ${field}`);
    }
  }
  return errors;
}

function readinessStatus(text: string, field: string): "PASS" | "BLOCKED" | undefined {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp("^\\s*[-*]?\\s*" + escaped + "\\s*:\\s*`?(PASS|BLOCKED)`?\\b", "im"),
    new RegExp("\\|\\s*" + escaped + "\\s*\\|\\s*`?(PASS|BLOCKED)`?\\s*\\|", "i")
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase() as "PASS" | "BLOCKED";
  }
  return undefined;
}

function validateTestReadinessDecision(text: string): string[] {
  const decision = finalDecision(text);
  if (decision !== "PASS") return [];
  if (containsAny(text, MISSING_READINESS_TERMS)) {
    return ["Test report cannot PASS while runnable entry/exit or Development Evidence is missing; use BLOCKED with recovery conditions"];
  }
  return [];
}

function validateRuntimeHandoffReport(text: string, label: string): string[] {
  const decision = finalDecision(text);
  if (decision !== "PASS") return [];
  const lowered = text.toLowerCase();
  const errors: string[] = [];
  if (containsAny(lowered, RUNTIME_MISMATCH_TERMS)) {
    errors.push(`${label} cannot PASS while target runtime or handoff evidence is missing or lower-level only`);
  }
  if (containsAny(lowered, ["deployed_runtime", "business_handoff_ready", "target runtime", "target_runtime_environment", "evidence level"])) {
    if (!containsAny(lowered, ["evidence level", "evidence_level", "证据等级"])) {
      errors.push(`${label} PASS must state evidence level when runtime handoff is in scope`);
    }
    if (!containsAny(lowered, ["target runtime", "target_runtime_environment", "运行环境"])) {
      errors.push(`${label} PASS must state target runtime environment when runtime handoff is in scope`);
    }
  }
  return errors;
}

function finalDecision(text: string): "PASS" | "BLOCKED" | undefined {
  const match = text.match(/(?:decision|final decision|结论)\s*:?\s*`?(PASS|BLOCKED)`?/i);
  return match ? (match[1].toUpperCase() as "PASS" | "BLOCKED") : undefined;
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
