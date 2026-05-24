import path from "node:path";
import { writeConfigIfMissing } from "./config.js";
import { harnessConfigPath, harnessPath, harnessRoot } from "./harness-root.js";
import { ensureDir, pathExists, writeTextIfChanged } from "./fs.js";
import { runSync } from "./sync-engine.js";

export interface InitOptions {
  adopt: boolean;
  force: boolean;
}

const DOC_DIRS = [
  ".docs/00_raw",
  ".docs/01_product",
  ".docs/02_architecture",
  ".docs/03_tech_plan",
  ".docs/04_implementation",
  ".docs/05_decisions",
  ".docs/06_review",
  ".docs/07_test",
  ".docs/08_release",
  ".docs/rfc"
];

export async function runInit(projectRoot: string, options: InitOptions): Promise<string[]> {
  const report: string[] = [];
  const existingEntries = await projectHasExistingFiles(projectRoot);
  if (existingEntries && !options.adopt && !options.force) {
    report.push("Project is not empty; continuing with non-destructive init. Use --adopt to mark this as an existing project adoption.");
  }

  const root = await harnessRoot(projectRoot);
  const configPath = await harnessConfigPath(projectRoot);
  if (await writeConfigIfMissing(projectRoot)) {
    report.push(`created ${configPath}`);
  } else {
    report.push(`kept existing ${configPath}`);
  }

  await createProjectState(projectRoot, root, report);
  await createDocs(projectRoot, report);

  const syncReport = await runSync(projectRoot);
  report.push(`sync changed=${syncReport.changed.length} skipped=${syncReport.skipped.length} blocked=${syncReport.blocked.length}`);
  report.push(options.adopt ? "adopt mode complete" : "init complete");
  return report;
}

async function projectHasExistingFiles(projectRoot: string): Promise<boolean> {
  const markers = ["README.md", "src", "pyproject.toml", "go.mod"];
  for (const marker of markers) {
    if (await pathExists(path.join(projectRoot, marker))) {
      return true;
    }
  }
  return false;
}

async function createProjectState(projectRoot: string, root: string, report: string[]): Promise<void> {
  const stateRoot = path.join(projectRoot, root, "state");
  await ensureDir(stateRoot);
  const files: Array<[string, string]> = [
    [
      harnessPath(root, "state", "lifecycle.yaml"),
      `project_name: "Project"\nversion: "v0.1"\ncurrent_phase: "REQUIREMENT_GATHERING"\nactive_role: "pm"\nactive_skill: "pjsdlc_pm_prd"\ncurrent_milestone: "MVP"\nblocked_reason: ""\nsuspended_phase: ""\nallowed_next_phases:\n  - "ARCHITECTING"\n`
    ],
    [harnessPath(root, "state", "plan.yaml"), `current_phase: "SPRINTING"\ncurrent_task_id: ""\nnext_task_sequence: 1\ntasks: []\n`],
    [harnessPath(root, "state", "plan.draft.yaml"), `current_phase: "SPRINTING"\ncurrent_task_id: ""\nnext_task_sequence: 1\ntasks: []\n`],
    [harnessPath(root, "state", "memory.md"), "# Project Memory\n\n短期执行计划写入 plan.yaml；长期稳定知识简短记录在这里，并链接到 `.docs/` 正式出处。\n"]
  ];
  for (const [relative, content] of files) {
    if (await writeTextIfChanged(path.join(projectRoot, relative), content)) {
      report.push(`created ${relative}`);
    }
  }
}

async function createDocs(projectRoot: string, report: string[]): Promise<void> {
  for (const dir of DOC_DIRS) {
    await ensureDir(path.join(projectRoot, dir));
    await writeTextIfChanged(path.join(projectRoot, dir, ".gitkeep"), "");
  }
  const index = ".docs/INDEX.md";
  if (
    await writeTextIfChanged(
      path.join(projectRoot, index),
      "# Documentation Index\n\n本文件是 AI SDLC Harness 的文档路由表。\n"
    )
  ) {
    report.push(`created ${index}`);
  }
}
