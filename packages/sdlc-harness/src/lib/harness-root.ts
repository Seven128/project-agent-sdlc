import path from "node:path";
import { DEFAULT_HARNESS_ROOT, HARNESS_JSON_CONFIG_PATH } from "./paths.js";
import { pathExists, readText } from "./fs.js";

export interface HarnessRootConfig {
  harnessFolderName: string;
  source: string;
}

export async function readHarnessRootConfig(projectRoot: string): Promise<HarnessRootConfig> {
  const explicitConfig = await readJsonConfig(path.join(projectRoot, HARNESS_JSON_CONFIG_PATH));
  const explicitValue = folderNameFromObject(explicitConfig);
  if (explicitValue) {
    return { harnessFolderName: normalizeHarnessFolderName(explicitValue), source: HARNESS_JSON_CONFIG_PATH };
  }

  const packageJson = await readJsonConfig(path.join(projectRoot, "package.json"));
  const packageConfig = packageJson && typeof packageJson === "object" ? (packageJson as Record<string, unknown>).sdlcHarness : undefined;
  const packageValue = folderNameFromObject(packageConfig);
  if (packageValue) {
    return { harnessFolderName: normalizeHarnessFolderName(packageValue), source: "package.json#sdlcHarness" };
  }

  return { harnessFolderName: DEFAULT_HARNESS_ROOT, source: "default" };
}

export async function harnessRoot(projectRoot: string): Promise<string> {
  return (await readHarnessRootConfig(projectRoot)).harnessFolderName;
}

export async function harnessConfigPath(projectRoot: string): Promise<string> {
  return path.join(await harnessRoot(projectRoot), "config.yaml");
}

export function harnessPath(root: string, ...segments: string[]): string {
  return path.join(root, ...segments);
}

function folderNameFromObject(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const folderName = record.harnessFolderName ?? record.harnessFloderName;
  return typeof folderName === "string" && folderName.trim() ? folderName : undefined;
}

async function readJsonConfig(filePath: string): Promise<unknown> {
  if (!(await pathExists(filePath))) {
    return undefined;
  }
  return JSON.parse(await readText(filePath)) as unknown;
}

export function normalizeHarnessFolderName(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (!normalized || normalized === "." || normalized === "..") {
    throw new Error("harnessFolderName must be a non-empty relative directory");
  }
  if (path.isAbsolute(normalized) || normalized.includes("..")) {
    throw new Error("harnessFolderName must not be absolute or contain '..'");
  }
  return normalized;
}
