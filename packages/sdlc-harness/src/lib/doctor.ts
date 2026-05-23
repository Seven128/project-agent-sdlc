import path from "node:path";
import { readConfig } from "./config.js";
import { pathExists } from "./fs.js";
import { DEFAULT_CONFIG_PATH } from "./paths.js";

export interface DoctorReport {
  info: string[];
  warnings: string[];
  errors: string[];
}

export async function runDoctor(projectRoot: string): Promise<DoctorReport> {
  const report: DoctorReport = { info: [], warnings: [], errors: [] };
  const configPath = path.join(projectRoot, DEFAULT_CONFIG_PATH);
  if (!(await pathExists(configPath))) {
    report.errors.push(`missing ${DEFAULT_CONFIG_PATH}`);
    return report;
  }

  const config = await readConfig(projectRoot);
  report.info.push(`core package: ${config.core.package}@${config.core.version}`);
  report.info.push(`schema version: ${config.core.schema_version}`);

  for (const required of [".harness/state/lifecycle.yaml", ".harness/state/tasks.yaml", ".docs/INDEX.md"]) {
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
