import { createRequire } from "node:module";
import path from "node:path";
import os from "node:os";
import { readdir } from "node:fs/promises";
import {
  DEFAULT_CONTEXT_FILE_SOFT_BUDGET_BYTES,
  DEFAULT_CONTEXT_TOTAL_SOFT_BUDGET_BYTES,
  inspectDefaultContextFootprint,
} from "./context-default-footprint.js";
import { readConfig } from "./config.js";
import { inspectDesignAuthority } from "./design-md.js";
import { inspectDesignAuthorityClosure } from "./design-authority-closure.js";
import { harnessConfigPath, harnessRoot } from "./harness-root.js";
import { pathExists } from "./fs.js";
import { unsupportedSchemaMessage } from "./schema-guard.js";
import { inspectContextCatalogHealth } from "./context-doctor/context-doctor.js";
import type { ContextDoctorOptions } from "./context-doctor/context-doctor-types.js";

const require = createRequire(import.meta.url);
const packageMetadata = require("../../package.json") as { version?: string };

export interface DoctorReport {
  info: string[];
  warnings: string[];
  errors: string[];
}

export async function runDoctor(
  projectRoot: string,
  options: ContextDoctorOptions = {},
): Promise<DoctorReport> {
  const report: DoctorReport = { info: [], warnings: [], errors: [] };
  const root = await harnessRoot(projectRoot);
  const relativeConfigPath = await harnessConfigPath(projectRoot);
  const configPath = path.join(projectRoot, relativeConfigPath);
  if (!(await pathExists(configPath))) {
    report.errors.push(`missing ${relativeConfigPath}`);
    return report;
  }

  const config = await readConfig(projectRoot);
  const packageVersion = packageMetadata.version ?? "0.0.0";
  report.info.push(`harness root: ${root}`);
  report.info.push(`core package: ${config.core.package}@${packageVersion}`);
  report.info.push(`schema version: ${config.core.schema_version}`);
  const unsupportedSchema = unsupportedSchemaMessage(
    config.core.schema_version,
    "doctor",
  );
  if (unsupportedSchema) {
    report.errors.push(unsupportedSchema);
    return report;
  }

  for (const required of [
    "project_context/context.toml",
    "project_context/global.md",
    "project_context/architecture.md",
    "project_context/areas",
  ]) {
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

  try {
    const footprint = await inspectDefaultContextFootprint(projectRoot);
    report.info.push(
      `default Context read path: ${footprint.files.length} file(s), ${footprint.total_bytes} bytes`,
    );
    if (footprint.total_bytes > DEFAULT_CONTEXT_TOTAL_SOFT_BUDGET_BYTES) {
      report.warnings.push(
        `default Context read path is ${footprint.total_bytes} bytes, above the ${DEFAULT_CONTEXT_TOTAL_SOFT_BUDGET_BYTES}-byte soft budget; review duplication or specialized placement only when complete, readable recovery semantics remain intact—required near-universal facts take precedence`,
      );
    }
    for (const file of footprint.files) {
      if (file.bytes <= DEFAULT_CONTEXT_FILE_SOFT_BUDGET_BYTES) continue;
      report.warnings.push(
        `default Context file ${file.path} is ${file.bytes} bytes, above the ${DEFAULT_CONTEXT_FILE_SOFT_BUDGET_BYTES}-byte per-file soft budget; this is advisory only and required readable facts take precedence`,
      );
    }
    for (const group of footprint.duplicate_groups) {
      report.warnings.push(
        `default Context contains byte-identical files: ${group.join(", ")}; keep one owning fact source and replace duplicates with a short pointer`,
      );
    }
  } catch (error) {
    report.warnings.push(
      `default Context footprint unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    const contextHealth = await inspectContextCatalogHealth(
      projectRoot,
      options,
    );
    report.info.push(...contextHealth.info);
    report.warnings.push(...contextHealth.warnings);
    report.errors.push(...contextHealth.errors);
  } catch (error) {
    report.warnings.push(
      `all-Context diagnostics unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const designAuthority = await inspectDesignAuthority(projectRoot);
  if (designAuthority.status === "unconfigured") {
    report.info.push(
      "design authority: unconfigured; DESIGN.md is a starter scaffold and does not authorize material production UI until project-specific tokens and exact-target/constraint/inspiration references are selected",
    );
  } else {
    report.info.push(
      `design authority: ${designAuthority.status}${designAuthority.status === "configured" ? "; project-level visual-system configuration only" : ""}`,
    );
  }
  if (designAuthority.status === "configured") {
    report.info.push(
      `design authority signals: index=${designAuthority.has_authority_index ? "present" : "missing"}, token_source=${designAuthority.token_source_selected ? "selected" : "missing-or-unselected"}, classified_references=${designAuthority.classified_reference_count}`,
    );
    if (!designAuthority.has_authority_index) {
      report.warnings.push(
        "configured DESIGN.md has no Design Authority Index; add the authored token source/generation direction and classified exact-target/constraint/inspiration references when material UI depends on them",
      );
    } else {
      if (!designAuthority.token_source_selected) {
        report.warnings.push(
          "Design Authority Index has no selected authored token source; generated tokens or current CSS must not become competing visual authority",
        );
      }
      if (designAuthority.classified_reference_count === 0) {
        report.warnings.push(
          "Design Authority Index has no classified durable design references; inspiration, constraints and exact targets remain undeclared for material surfaces",
        );
      }
    }
  }
  const authorityClosure = await inspectDesignAuthorityClosure(projectRoot);
  if (authorityClosure.status === "valid" && authorityClosure.identity) {
    report.info.push(
      `design authority closure: ${authorityClosure.mode}, ${authorityClosure.members.length} member(s), ${authorityClosure.identity.closure_digest}`,
    );
  } else if (authorityClosure.status === "invalid") {
    for (const diagnostic of authorityClosure.diagnostics) {
      const detail = `design authority closure ${diagnostic.code}${diagnostic.path ? ` (${diagnostic.path})` : ""}: ${diagnostic.detail}`;
      if (diagnostic.severity === "error") report.errors.push(detail);
      else report.warnings.push(detail);
    }
  }
  if (authorityClosure.status === "valid")
    for (const diagnostic of authorityClosure.diagnostics)
      if (diagnostic.severity === "warning")
        report.warnings.push(
          `design authority closure ${diagnostic.code}${diagnostic.path ? ` (${diagnostic.path})` : ""}: ${diagnostic.detail}`,
        );
  report.info.push(
    "surface implementation readiness: not inferred; inspect owning Product Surface/Screen/Control Context, selected target or constraints, authored token source and project-owned verification for each material surface",
  );

  for (const location of await findUserSuperpowersSkills()) {
    report.warnings.push(
      `user-level using-superpowers Skill detected at ${location}. Tiny Context workflows do not depend on it and doctor will not modify global configuration. To disable it explicitly for Codex, remove/disable that plugin or add a matching [[skills.config]] entry with enabled = false in ${path.join(os.homedir(), ".codex", "config.toml")}.`,
    );
  }

  report.info.push("doctor complete");
  return report;
}

async function findUserSuperpowersSkills(): Promise<string[]> {
  const home = os.homedir();
  const direct = path.join(
    home,
    ".codex",
    "skills",
    "using-superpowers",
    "SKILL.md",
  );
  const result: string[] = [];
  if (await pathExists(direct)) result.push(direct);
  const cache = path.join(home, ".codex", "plugins", "cache");
  try {
    for (const owner of await readdir(cache)) {
      const candidateRoot = path.join(cache, owner);
      for (const plugin of await readdir(candidateRoot)) {
        if (plugin !== "superpowers") continue;
        for (const version of await readdir(path.join(candidateRoot, plugin))) {
          const candidate = path.join(
            candidateRoot,
            plugin,
            version,
            "skills",
            "using-superpowers",
            "SKILL.md",
          );
          if (await pathExists(candidate)) result.push(candidate);
        }
      }
    }
  } catch {}
  return [...new Set(result)].sort();
}
