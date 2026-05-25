import path from "node:path";
import { createRequire } from "node:module";
import type { HarnessConfig } from "./types.js";
import { harnessConfigPath, harnessPath, harnessRoot } from "./harness-root.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { parseYaml, stringifyYaml } from "./yaml.js";

const require = createRequire(import.meta.url);
const packageMetadata = require("../../package.json") as { version?: string };

export function defaultConfig(root: string): HarnessConfig {
  return {
    core: {
      package: "agent-project-sdlc",
      version: packageMetadata.version ?? "0.0.0",
      schema_version: "1"
    },
    managed_files: [
      { path: "AGENTS.md", strategy: "merge-block" },
      { path: "Makefile", strategy: "merge-block" },
      { path: harnessPath(root, "skills"), strategy: "managed" },
      { path: harnessPath(root, "pjsdlc_managed", "templates"), strategy: "managed" },
      { path: harnessPath(root, "pjsdlc_managed", "policies"), strategy: "merge-with-local" },
      { path: harnessPath(root, "pjsdlc_managed", "make", "sdlc-harness.mk"), strategy: "managed" },
      { path: ".github/workflows/harness.yml", strategy: "create-if-missing" }
    ],
    local_overrides: [harnessPath(root, "overrides/**"), harnessPath(root, "pjsdlc_managed", "policies", "*.local.yaml")],
    never_overwrite: [".docs/**", harnessPath(root, "state/**"), "src/**", "tests/**"]
  };
}

export async function readConfig(projectRoot: string): Promise<HarnessConfig> {
  const root = await harnessRoot(projectRoot);
  const configPath = path.join(projectRoot, await harnessConfigPath(projectRoot));
  if (!(await pathExists(configPath))) {
    return defaultConfig(root);
  }
  const parsed = parseYaml(await readText(configPath)) as Partial<HarnessConfig>;
  return normalizeConfig(parsed, root);
}

export async function writeConfigIfMissing(projectRoot: string): Promise<boolean> {
  const root = await harnessRoot(projectRoot);
  const configPath = path.join(projectRoot, await harnessConfigPath(projectRoot));
  if (await pathExists(configPath)) {
    return false;
  }
  await writeTextIfChanged(configPath, stringifyYaml(defaultConfig(root)));
  return true;
}

export function normalizeConfig(value: Partial<HarnessConfig>, root = ".agent"): HarnessConfig {
  const fallback = defaultConfig(root);
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
