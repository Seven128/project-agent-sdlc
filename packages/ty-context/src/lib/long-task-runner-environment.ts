import type { EnvironmentRequirementV2 } from "./long-task-delivery-types.js";

const BASE_ENVIRONMENT_KEYS = [
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "WINDIR",
  "ComSpec",
  "TEMP",
  "TMP",
  "TMPDIR",
  "HOME",
  "USERPROFILE",
  "HOMEDRIVE",
  "HOMEPATH",
  "APPDATA",
  "LOCALAPPDATA",
  "LANG",
  "LC_ALL",
  "TZ",
  "CI",
  "TERM",
  "NO_COLOR",
  "FORCE_COLOR",
] as const;

export function runnerEnvironment(
  requirements: EnvironmentRequirementV2[],
  mode: "legacy_check" | "product_observation" = "legacy_check",
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {};
  if (mode === "legacy_check")
    environment.TY_CONTEXT_CHECK_PROTOCOL = "long-task-check-result-v3";
  for (const key of BASE_ENVIRONMENT_KEYS)
    copyEnvironmentValue(environment, key);
  for (const requirement of requirements)
    if (requirement.kind === "env_var")
      copyEnvironmentValue(environment, requirement.target);
  return environment;
}

export function declaredEnvironmentValues(
  requirements: EnvironmentRequirementV2[],
): string[] {
  const values: string[] = [];
  for (const requirement of requirements) {
    if (requirement.kind !== "env_var") continue;
    const value = process.env[requirement.target];
    if (value) values.push(value);
  }
  return values;
}

export function outputContainsDeclaredEnvironmentValue(
  raw: { stdout: Buffer; stderr: Buffer },
  values: string[],
): boolean {
  if (!values.length) return false;
  const stdout = raw.stdout.toString("utf8");
  const stderr = raw.stderr.toString("utf8");
  return values.some(
    (value) => stdout.includes(value) || stderr.includes(value),
  );
}

function copyEnvironmentValue(
  environment: NodeJS.ProcessEnv,
  key: string,
): void {
  const value = process.env[key];
  if (value !== undefined) environment[key] = value;
}
