import path from "node:path";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import { normalizeHarnessFolderName } from "./harness-root.js";

export async function packageHarnessRoot(projectRoot: string): Promise<string | undefined> {
  const packagePath = path.join(projectRoot, "package.json");
  if (!(await pathExists(packagePath))) {
    return undefined;
  }
  const packageJson = parsePackageJson(await readText(packagePath));
  const config = packageJson.sdlcHarness;
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return undefined;
  }
  const value = (config as Record<string, unknown>).harnessFolderName;
  return typeof value === "string" && value.trim() ? normalizeHarnessFolderName(value) : undefined;
}

export async function writePackageHarnessRoot(projectRoot: string, folderName: string): Promise<boolean> {
  const normalized = normalizeHarnessFolderName(folderName);
  const packagePath = path.join(projectRoot, "package.json");
  const packageJson = (await pathExists(packagePath)) ? parsePackageJson(await readText(packagePath)) : {};
  const existingConfig = packageJson.sdlcHarness;
  const nextConfig =
    existingConfig && typeof existingConfig === "object" && !Array.isArray(existingConfig)
      ? { ...(existingConfig as Record<string, unknown>), harnessFolderName: normalized }
      : { harnessFolderName: normalized };
  const next = {
    ...packageJson,
    sdlcHarness: nextConfig
  };
  return writeTextIfChanged(packagePath, `${JSON.stringify(next, null, 2)}\n`);
}

function parsePackageJson(content: string): Record<string, unknown> {
  const parsed = JSON.parse(content) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("package.json must contain a JSON object");
  }
  return parsed as Record<string, unknown>;
}
