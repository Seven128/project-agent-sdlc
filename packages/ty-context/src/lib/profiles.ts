import path from "node:path";
import { readConfig, writeConfigIfMissing } from "./config.js";
import { harnessConfigPath } from "./harness-root.js";
import { readText, writeTextIfChanged } from "./fs.js";
import type { HarnessConfig, HarnessProfile } from "./types.js";
import { parseYaml, stringifyYaml } from "./yaml.js";

export const HARNESS_PROFILES: readonly HarnessProfile[] = [
  "core-portable",
  "workflow-default",
  "long-task",
];

export function isProfileEnabled(
  config: HarnessConfig,
  profile: HarnessProfile,
): boolean {
  return config.profiles.enabled.includes(profile);
}

export async function assertHarnessProfileEnabled(
  projectRoot: string,
  profile: HarnessProfile,
): Promise<void> {
  const config = await readConfig(projectRoot);
  if (!isProfileEnabled(config, profile)) {
    throw new Error(
      `profile ${profile} is not enabled; run: ty-context enable ${profile}`,
    );
  }
}

export async function enableHarnessProfile(
  projectRoot: string,
  profile: string,
): Promise<{ changed: boolean; config: HarnessConfig }> {
  if (!HARNESS_PROFILES.includes(profile as HarnessProfile)) {
    throw new Error(
      `unknown profile ${profile}; expected one of ${HARNESS_PROFILES.join(", ")}`,
    );
  }
  await writeConfigIfMissing(projectRoot);
  const relative = await harnessConfigPath(projectRoot);
  const file = path.join(projectRoot, relative);
  const raw = parseYaml(await readText(file)) as Record<string, unknown>;
  const existing = await readConfig(projectRoot);
  const enabled = [
    ...new Set([...existing.profiles.enabled, profile as HarnessProfile]),
  ];
  const next = { ...raw, profiles: { enabled } };
  const changed = await writeTextIfChanged(file, stringifyYaml(next));
  return { changed, config: await readConfig(projectRoot) };
}

export async function disableHarnessProfile(
  projectRoot: string,
  profile: string,
): Promise<{ changed: boolean; config: HarnessConfig }> {
  if (profile !== "long-task") {
    throw new Error("only long-task can be explicitly disabled");
  }
  await writeConfigIfMissing(projectRoot);
  const relative = await harnessConfigPath(projectRoot);
  const file = path.join(projectRoot, relative);
  const raw = parseYaml(await readText(file)) as Record<string, unknown>;
  const existing = await readConfig(projectRoot);
  const enabled = existing.profiles.enabled.filter((item) => item !== profile);
  const next = { ...raw, profiles: { enabled } };
  const changed = await writeTextIfChanged(file, stringifyYaml(next));
  return { changed, config: await readConfig(projectRoot) };
}

export function enabledManagedSkillNames(config: HarnessConfig): Set<string> {
  const names = new Set([
    "context_development_engineer",
    "context_full_project_export",
    "context_harness_upgrade",
    "context_product_plan",
    "context_surface_contract",
    "context_uiux_design",
    "design-system-authoring",
    "design-resource-authoring",
  ]);
  if (isProfileEnabled(config, "long-task")) {
    names.add("long-task-workflow");
    names.add("source-plan-authoring");
  }
  return names;
}
