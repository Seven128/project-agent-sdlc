import path from "node:path";
import { readConfig } from "./config.js";
import { harnessConfigPath, harnessPath, harnessRoot } from "./harness-root.js";
import { pathExists } from "./fs.js";

export interface DoctorReport {
  info: string[];
  warnings: string[];
  errors: string[];
}

export async function runDoctor(projectRoot: string): Promise<DoctorReport> {
  const report: DoctorReport = { info: [], warnings: [], errors: [] };
  const root = await harnessRoot(projectRoot);
  const relativeConfigPath = await harnessConfigPath(projectRoot);
  const configPath = path.join(projectRoot, relativeConfigPath);
  if (!(await pathExists(configPath))) {
    report.errors.push(`missing ${relativeConfigPath}`);
    return report;
  }

  const config = await readConfig(projectRoot);
  report.info.push(`harness root: ${root}`);
  report.info.push(`core package: ${config.core.package}@${config.core.version}`);
  report.info.push(`schema version: ${config.core.schema_version}`);

  for (const required of [harnessPath(root, "state", "lifecycle.yaml"), harnessPath(root, "state", "plan.yaml"), ".docs/INDEX.md"]) {
    if (!(await pathExists(path.join(projectRoot, required)))) {
      report.errors.push(`missing ${required}`);
    }
  }

  for (const managed of config.managed_files) {
    const exists = await pathExists(path.join(projectRoot, managed.path));
    if (!exists && managed.strategy !== "create-if-missing") {
      report.warnings.push(`managed path missing: ${managed.path}`);
    }
  }

  report.info.push("doctor complete");
  return report;
}
