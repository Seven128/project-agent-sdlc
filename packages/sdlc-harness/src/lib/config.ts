import path from "node:path";
import type { HarnessConfig } from "./types.js";
import { DEFAULT_CONFIG_PATH } from "./paths.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { parseYaml, stringifyYaml } from "./yaml.js";

export function defaultConfig(): HarnessConfig {
  return {
    core: {
      package: "@ai-sdlc/sdlc-harness",
      version: "0.1.0",
      schema_version: "1"
    },
    managed_files: [
      { path: "AGENTS.md", strategy: "merge-block" },
      { path: ".agents/skills", strategy: "generated" },
      { path: ".harness/templates", strategy: "managed" },
      { path: ".harness/policies", strategy: "merge-with-local" },
      { path: ".harness/make/sdlc-harness.mk", strategy: "managed" },
      { path: ".github/workflows/harness.yml", strategy: "create-if-missing" }
    ],
    local_overrides: [".harness/overrides/**", ".harness/policies/*.local.yaml"],
    never_overwrite: [".docs/**", ".harness/state/**", "src/**", "tests/**"]
  };
}

export async function readConfig(projectRoot: string): Promise<HarnessConfig> {
  const configPath = path.join(projectRoot, DEFAULT_CONFIG_PATH);
  if (!(await pathExists(configPath))) {
    return defaultConfig();
  }
  const parsed = parseYaml(await readText(configPath)) as Partial<HarnessConfig>;
  return normalizeConfig(parsed);
}

export async function writeConfigIfMissing(projectRoot: string): Promise<boolean> {
  const configPath = path.join(projectRoot, DEFAULT_CONFIG_PATH);
  if (await pathExists(configPath)) {
    return false;
  }
  await writeTextIfChanged(configPath, stringifyYaml(defaultConfig()));
  return true;
}

export function normalizeConfig(value: Partial<HarnessConfig>): HarnessConfig {
  const fallback = defaultConfig();
  return {
    core: {
      package: value.core?.package ?? fallback.core.package,
      version: value.core?.version ?? fallback.core.version,
      schema_version: value.core?.schema_version ?? fallback.core.schema_version
    },
    managed_files: value.managed_files ?? fallback.managed_files,
    local_overrides: value.local_overrides ?? fallback.local_overrides,
    never_overwrite: value.never_overwrite ?? fallback.never_overwrite
  };
}
