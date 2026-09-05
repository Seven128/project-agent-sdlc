import path from "node:path";

const EXCLUDED_DIR_NAMES = new Set([
  ".git",
  ".artifacts",
  ".cache",
  ".next",
  ".nuxt",
  ".runtime",
  ".turbo",
  "artifacts",
  "build",
  "cache",
  "captures",
  "coverage",
  "dist",
  "logs",
  "node_modules",
  "out",
  "playwright-report",
  "raw-captures",
  "reports",
  "target",
  "temp",
  "test-reports",
  "test-results",
  "tmp",
]);

export const SAFE_EXAMPLE_FILE_NAMES = new Set([
  ".env.example",
  ".env.sample",
  ".env.template",
  "example.env",
  "sample.env",
]);

const EXCLUDED_FILE_PATTERNS = [
  /^\.env(?:\.|$)/i,
  /\.log$/i,
  /\.min\.(?:css|js|mjs)$/i,
  /(^|[-_.])(secret|secrets|cookie|cookies|credential|credentials|api-key|apikey|access-token|refresh-token|auth-token|private-key)([-_.]|$)/i,
  /(^|[-_.])(raw-capture|capture-dump|licensed-payload|license-payload|test-report)([-_.]|$)/i,
  /^(?:package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|pipfile\.lock|cargo\.lock)$/i,
  /full-project-context-\d{8}T\d{6}Z\.md$/i,
  /当前项目context-\d{8}T\d{6}Z\.md$/i,
  /当前项目代码实现\.md$/i,
  /(^|[-_.])(code-level-implementation|context-export|context-bundle)([-_.]|$)/i,
];

const CODE_FILE_EXTENSIONS = [
  ".bat",
  ".cjs",
  ".cmd",
  ".go",
  ".gql",
  ".graphql",
  ".js",
  ".jsx",
  ".jsonc",
  ".mjs",
  ".proto",
  ".ps1",
  ".py",
  ".sh",
  ".sql",
  ".toml",
  ".ts",
  ".tsx",
  ".vue",
  ".yaml",
  ".yml",
];

const CODE_FILE_BASE_NAMES = new Set([
  ".env.example",
  ".env.sample",
  ".env.template",
  "dockerfile",
  "makefile",
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "setup.cfg",
  "tsconfig.json",
]);

const CONFIG_JSON_NAMES = new Set([
  "babel.config.json",
  "biome.json",
  "composer.json",
  "deno.json",
  "eslint.config.json",
  "jsconfig.json",
  "package.json",
  "tsconfig.json",
  "vite.config.json",
]);

export function shouldIncludeCodeFile(relative: string): boolean {
  if (shouldExcludeRelativePath(relative)) {
    return false;
  }
  const normalized = toPosix(relative);
  const lower = normalized.toLowerCase();
  const base = path.posix.basename(lower);
  if (CODE_FILE_BASE_NAMES.has(base) || base.startsWith("dockerfile.")) {
    return true;
  }
  if (lower.endsWith(".dockerfile")) {
    return true;
  }
  if (lower.endsWith(".json")) {
    return isConfigJson(lower);
  }
  return CODE_FILE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function shouldExcludeRelativePath(relative: string): boolean {
  const normalized = toPosix(relative);
  const segments = normalized.split("/");
  if (segments.some((segment) => EXCLUDED_DIR_NAMES.has(segment))) {
    return true;
  }
  const base = segments[segments.length - 1] ?? "";
  const lowerBase = base.toLowerCase();
  return EXCLUDED_FILE_PATTERNS.some((pattern) => {
    if (
      SAFE_EXAMPLE_FILE_NAMES.has(lowerBase) &&
      pattern.source.startsWith("^\\.env")
    ) {
      return false;
    }
    return pattern.test(base) || pattern.test(normalized);
  });
}

export function toPosix(value: string): string {
  return value.replace(/\\/g, "/");
}

function isConfigJson(lowerRelative: string): boolean {
  const base = path.posix.basename(lowerRelative);
  return (
    CONFIG_JSON_NAMES.has(base) ||
    lowerRelative.endsWith(".schema.json") ||
    lowerRelative.includes("/schema/") ||
    lowerRelative.includes("/schemas/") ||
    lowerRelative.includes("/config/") ||
    lowerRelative.includes("/configs/") ||
    lowerRelative.includes("/examples/") ||
    lowerRelative.includes("/sample/") ||
    lowerRelative.includes("/samples/") ||
    base.includes("config") ||
    base.includes("schema") ||
    base.includes("example") ||
    base.includes("sample")
  );
}
