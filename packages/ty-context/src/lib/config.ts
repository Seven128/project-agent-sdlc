import path from "node:path";
import { CANONICAL_CORE_PACKAGE, CURRENT_SCHEMA_VERSION } from "./constants.js";
import type { HarnessConfig } from "./types.js";
import { harnessConfigPath, harnessRoot } from "./harness-root.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { parseYaml, stringifyYaml } from "./yaml.js";
import { captureMutationFileState } from "./context-mutation/mutation-file-state.js";
import { writeMaintenanceText } from "./maintenance-write.js";

export function defaultConfig(root: string): HarnessConfig {
  return {
    core: {
      package: CANONICAL_CORE_PACKAGE,
      schema_version: CURRENT_SCHEMA_VERSION,
    },
    managed_files: [{ path: "AGENTS.md", strategy: "merge-block" }],
    never_overwrite: ["project_context/**", "DESIGN.md", "src/**", "tests/**"],
  };
}

export async function readConfig(projectRoot: string): Promise<HarnessConfig> {
  const root = await harnessRoot(projectRoot);
  const configPath = path.join(
    projectRoot,
    await harnessConfigPath(projectRoot),
  );
  if (!(await pathExists(configPath))) {
    return defaultConfig(root);
  }
  const parsed = parseYaml(
    await readText(configPath),
  ) as Partial<HarnessConfig>;
  return normalizeConfig(parsed, root);
}

export async function writeConfigIfMissing(
  projectRoot: string,
): Promise<boolean> {
  const root = await harnessRoot(projectRoot);
  const configPath = await harnessConfigPath(projectRoot);
  const before = await captureMutationFileState(projectRoot, configPath);
  if (before.exists) {
    return false;
  }
  await writeMaintenanceText(
    projectRoot,
    configPath,
    stringifyYaml(defaultConfig(root)),
    before,
  );
  return true;
}

export function normalizeConfig(
  value: Partial<HarnessConfig>,
  root = ".agent",
): HarnessConfig {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid harness config object");
  if (
    String(value.core?.schema_version) === CURRENT_SCHEMA_VERSION &&
    ("profiles" in value || "modularity" in value)
  )
    throw new Error(
      "retired_config_fields: schema 5 does not support profiles or modularity; preserve the file and reconcile changes from old CLI use",
    );
  const fallback = defaultConfig(root);
  return {
    core: {
      package: value.core?.package ?? fallback.core.package,
      schema_version:
        value.core?.schema_version ?? fallback.core.schema_version,
    },
    managed_files: value.managed_files ?? fallback.managed_files,
    never_overwrite: value.never_overwrite ?? fallback.never_overwrite,
  };
}
