import path from "node:path";
import {
  CONTEXT_MANIFEST_PATH,
  defaultContextManifestTemplate,
} from "./context-manifest.js";
import { globalContextTemplate } from "./context-templates.js";
import { writeConfigIfMissing } from "./config.js";
import { harnessConfigPath, harnessRoot } from "./harness-root.js";
import { ensureDir, pathExists, writeTextIfChanged } from "./fs.js";
import { assertSupportedSchema } from "./schema-guard.js";
import { syncStartupInstructions } from "./sync-engine.js";
import { withMaintenanceLock } from "./maintenance-lock.js";
import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import { writeMaintenanceText } from "./maintenance-write.js";
import { assertNoUnfinishedContextMutation } from "./context-mutation/mutation-command-support.js";

export interface InitOptions {
  adopt: boolean;
  force: boolean;
}

export async function runInit(
  projectRoot: string,
  options: InitOptions,
): Promise<string[]> {
  await assertSupportedSchema(projectRoot, "init");
  return withMaintenanceLock(projectRoot, "sync", async () => {
    const report: string[] = [];
    await assertSupportedSchema(projectRoot, "init");
    await assertNoUnfinishedContextMutation(projectRoot);
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

    const syncReport = await syncStartupInstructions(projectRoot);
    report.push(
      `sync changed=${syncReport.changed.length} skipped=${syncReport.skipped.length} blocked=${syncReport.blocked.length}`,
    );
    report.push(...(syncReport.notices ?? []));
    if (syncReport.blocked.length)
      throw new Error(`init incomplete: ${syncReport.blocked.join("; ")}`);
    report.push(options.adopt ? "adopt mode complete" : "init complete");
    return report;
  });
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
  const files: Array<[string, string]> = [
    [CONTEXT_MANIFEST_PATH, defaultContextManifestTemplate()],
    ["project_context/global.md", globalContextTemplate()],
  ];
  for (const [relative, content] of files) {
    const before = await captureMutationFileState(projectRoot, relative);
    if (before.exists) {
      report.push(`kept existing ${relative}`);
      continue;
    }
    if (await writeMaintenanceText(projectRoot, relative, content, before)) {
      report.push(`created ${relative}`);
    }
  }
}
