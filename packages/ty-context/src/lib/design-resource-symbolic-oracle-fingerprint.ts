import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_MODULE_IMPORT = /(?:\bfrom\s*|\bimport\s*)["'](\.[^"']+\.js)["']/gu;
const DYNAMIC_MODULE_IMPORT = /\bimport\s*\(/gu;
const HIDDEN_LOCAL_LOADER = /\b(?:createRequire|require)\s*\(/gu;

export function fingerprintExecutableModuleClosure(
  entryUrls: readonly string[],
): string {
  const pending = [...new Set(entryUrls)].sort();
  const seen = new Map<string, Buffer>();
  while (pending.length) {
    const url = pending.shift()!;
    if (seen.has(url)) continue;
    const bytes = readFileSync(fileURLToPath(url));
    const source = bytes.toString("utf8");
    if (DYNAMIC_MODULE_IMPORT.test(source))
      throw new Error(
        `symbolic Oracle implementation uses dynamic import: ${url}`,
      );
    DYNAMIC_MODULE_IMPORT.lastIndex = 0;
    if (HIDDEN_LOCAL_LOADER.test(source))
      throw new Error(
        `symbolic Oracle implementation uses a hidden local loader: ${url}`,
      );
    HIDDEN_LOCAL_LOADER.lastIndex = 0;
    seen.set(url, bytes);
    for (const specifier of localModuleImports(source)) {
      const dependencyUrl = new URL(specifier, url).href;
      if (!seen.has(dependencyUrl)) pending.push(dependencyUrl);
    }
    pending.sort();
  }
  const commonRoot = path.dirname(
    fileURLToPath([...seen.keys()].sort()[0] ?? entryUrls[0]),
  );
  const entries = [...seen.entries()]
    .map(([url, bytes]) => ({
      path: path
        .relative(commonRoot, fileURLToPath(url))
        .replaceAll(path.sep, "/"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return createHash("sha256").update(JSON.stringify(entries)).digest("hex");
}

function localModuleImports(source: string): string[] {
  const result: string[] = [];
  for (const match of source.matchAll(LOCAL_MODULE_IMPORT))
    result.push(match[1]);
  return result;
}
