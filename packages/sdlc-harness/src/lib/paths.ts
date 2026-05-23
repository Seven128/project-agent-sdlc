import path from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_MAPPINGS_PATH = "packages/sdlc-harness/source-mappings.yaml";
export const DEFAULT_HARNESS_ROOT = ".agent";
export const HARNESS_JSON_CONFIG_PATH = "sdlc-harness.config.json";

export function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

export function packageAssetPath(...segments: string[]): string {
  return path.join(packageRoot(), "assets", ...segments);
}
