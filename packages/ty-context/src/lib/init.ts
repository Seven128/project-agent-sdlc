import path from "node:path";
import {
  CONTEXT_MANIFEST_PATH,
  defaultContextManifestTemplate,
} from "./context-manifest.js";
import {
  architectureContextTemplate,
  areaContextTemplate,
  globalContextTemplate,
  verificationContextTemplate,
} from "./context-templates.js";
import { writeConfigIfMissing } from "./config.js";
import { createDesignMdIfMissing, DESIGN_MD_PATH } from "./design-md.js";
import { harnessConfigPath, harnessRoot } from "./harness-root.js";
import { ensureDir, pathExists, writeTextIfChanged } from "./fs.js";
import { assertSupportedSchema } from "./schema-guard.js";
import { runSync } from "./sync-engine.js";

export interface InitOptions {
  adopt: boolean;
  force: boolean;
}

export async function runInit(
  projectRoot: string,
  options: InitOptions,
): Promise<string[]> {
  const report: string[] = [];
  await assertSupportedSchema(projectRoot, "init");
  const existingEntries = await projectHasExistingFiles(projectRoot);
  if (existingEntries && !options.adopt && !options.force) {
    report.push(
      "Project is not empty; continuing with non-destructive init. Use --adopt to mark this as an existing project adoption.",
    );
  }

  const configPath = await harnessConfigPath(projectRoot);
  if (await writeConfigIfMissing(projectRoot)) {
    report.push(`created ${configPath}`);
  } else {
    report.push(`kept existing ${configPath}`);
  }

  await createProjectContext(projectRoot, report);
  await createDesignMd(projectRoot, report);

  const syncReport = await runSync(projectRoot);
  report.push(
    `sync changed=${syncReport.changed.length} skipped=${syncReport.skipped.length} blocked=${syncReport.blocked.length}`,
  );
  report.push(...(syncReport.notices ?? []));
  report.push(options.adopt ? "adopt mode complete" : "init complete");
  return report;
}

async function createDesignMd(
  projectRoot: string,
  report: string[],
): Promise<void> {
  if (await createDesignMdIfMissing(projectRoot)) {
    report.push(`created ${DESIGN_MD_PATH}`);
  }
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

async function createProjectContext(
  projectRoot: string,
  report: string[],
): Promise<void> {
  const areasRoot = path.join(projectRoot, "project_context", "areas");
  await ensureDir(areasRoot);
  const files: Array<[string, string]> = [
    [CONTEXT_MANIFEST_PATH, defaultContextManifestTemplate()],
    ["project_context/global.md", globalContextTemplate()],
    ["project_context/architecture.md", architectureContextTemplate()],
    ["project_context/areas/main.md", areaContextTemplate("main")],
    [
      "project_context/areas/main/verification.md",
      verificationContextTemplate("main"),
    ],
  ];
  for (const [relative, content] of files) {
    const target = path.join(projectRoot, relative);
    if (await pathExists(target)) {
      report.push(`kept existing ${relative}`);
      continue;
    }
    if (await writeTextIfChanged(target, content)) {
      report.push(`created ${relative}`);
    }
  }
}
