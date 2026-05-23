import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_CONFIG_PATH = ".harness/config.yaml";
export const SOURCE_MAPPINGS_PATH = "packages/sdlc-harness/source-mappings.yaml";

export function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
}

export function packageAssetPath(...segments: string[]): string {
  return path.join(packageRoot(), "assets", ...segments);
}
