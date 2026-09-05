import path from "node:path";
import { readFile } from "node:fs/promises";
import { rawSchemaVersion, unsupportedSchemaMessage } from "./schema-guard.js";
import { inspectDefaultContextFootprint } from "./context-default-footprint.js";
import { runValidator } from "./validators.js";
import { pathExists } from "./fs.js";
import {
  CONTEXT_DOCTOR_DEFAULTS,
  type ContextDoctorOptions,
} from "./context-doctor/context-doctor-types.js";
import { MANAGED_BLOCK_START, MANAGED_BLOCK_END } from "./managed-file.js";
export interface DoctorReport {
  info: string[];
  warnings: string[];
  errors: string[];
}
export async function runDoctor(
  repository: string,
  options: ContextDoctorOptions = {},
): Promise<DoctorReport> {
  const report: DoctorReport = { info: [], warnings: [], errors: [] };
  try {
    const version = await rawSchemaVersion(repository);
    if (!version)
      report.errors.push("Harness configuration is missing; use init.");
    else {
      report.info.push("Harness schema: " + version);
      const unsupported = unsupportedSchemaMessage(version, "doctor");
      if (unsupported) report.errors.push(unsupported);
      else if (version !== "5")
        report.warnings.push(
          "Explicit upgrade required before schema-5 writes; old recovery tools must be version-pinned.",
        );
    }
    const validation = await runValidator(repository, "validate-context");
    report.info.push(...validation.info);
    report.errors.push(...validation.errors);
    report.warnings.push(...(validation.warnings ?? []));
    const footprint = await inspectDefaultContextFootprint(repository);
    report.info.push(
      "Default body files: " +
        footprint.files.length +
        "; bytes: " +
        footprint.total_bytes,
    );
    for (const file of footprint.files)
      if (
        file.bytes >
        (options.context_file_soft_budget_bytes ??
          CONTEXT_DOCTOR_DEFAULTS.context_file_soft_budget_bytes)
      )
        report.warnings.push(
          "Review long default Context when useful: " + file.path,
        );
    for (const group of footprint.duplicate_groups)
      report.warnings.push("Identical default files: " + group.join(", "));
  } catch (error) {
    report.errors.push(String(error));
  }
  try {
    const agents = await readFile(path.join(repository, "AGENTS.md"), "utf8");
    if (
      !agents.includes(MANAGED_BLOCK_START) ||
      !agents.includes(MANAGED_BLOCK_END)
    )
      report.warnings.push(
        "AGENTS.md has no complete Tiny Context managed block.",
      );
  } catch {
    report.warnings.push("AGENTS.md is unreadable or missing.");
  }
  if (await pathExists(path.join(repository, "AGENTS.override.md")))
    report.warnings.push(
      "AGENTS.override.md may shadow root AGENTS.md. Review the actual host entry; files existing does not prove the instructions were loaded.",
    );
  report.info.push(
    "Host-specific global/nested overrides and loaded instructions are not proven by this structural inspection. No global configuration is changed.",
  );
  return report;
}
