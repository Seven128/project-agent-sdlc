import { runModularityCheck } from "../lib/modularity.js";

interface CheckModularityArgs {
  touched: boolean;
  files: string[];
  limit: number;
  failOnWarning: boolean;
  configOnly: boolean;
  help: boolean;
  base?: string;
}

export async function checkModularity(args: string[]): Promise<void> {
  let parsed: CheckModularityArgs;
  try {
    parsed = parseArgs(args);
  } catch (error) {
    console.error(
      `error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
    return;
  }

  if (
    parsed.help ||
    (!parsed.configOnly &&
      !parsed.touched &&
      !parsed.base &&
      parsed.files.length === 0)
  ) {
    console.log(helpText());
    if (!parsed.help) {
      process.exitCode = 1;
    }
    return;
  }

  try {
    const report = await runModularityCheck(process.cwd(), {
      touched: parsed.touched,
      base: parsed.base,
      files: parsed.files,
      limit: parsed.limit,
    });
    console.log(
      `check-modularity audited=${report.files.length} warning=${report.warnings.length} limit=${report.limit} waived=${report.waivedWarnings.length}`,
    );
    if (report.files.length === 0) {
      console.log("No handwritten source files matched the selected scope.");
    }
    for (const file of report.files) {
      const prefix =
        file.regressed && file.waived
          ? "waived"
          : file.regressed
            ? "over-limit"
            : file.overLimit
              ? "observed-risk"
              : "ok";
      console.log(
        `${prefix}: ${file.relativePath} ${file.lines} lines analysis=${file.metrics.analysis} statements=${formatMetric(file.metrics.maxFunctionStatements)} branches=${formatMetric(file.metrics.maxBranchComplexity)} exports=${formatMetric(file.metrics.exports)} transitions=${formatMetric(file.metrics.stateTransitions)} responsibilities=${formatResponsibilities(file.metrics.responsibilities)} statement_at=${formatLocation(file.metrics.maxFunctionStatementsLocation, file.metrics.maxFunctionStatements !== null)} branch_at=${formatLocation(file.metrics.maxBranchComplexityLocation, file.metrics.maxBranchComplexity !== null)}`,
      );
    }
    for (const error of report.errors) {
      console.error(`error: ${error}`);
    }
    for (const warning of report.warnings) {
      console.warn(`warning: ${warning}`);
    }
    for (const waiver of report.waivedWarnings) {
      console.warn(`waived: ${waiver}`);
    }
    if (report.warnings.length > 0) {
      console.warn(
        "warning: modularity risks need a split or, when modularity.policy is scoped_waivers, a valid <harnessRoot>/config.yaml waiver with path, category, owner, introduced_at, reason, tracking_issue and expiry_condition.",
      );
    }
    if (
      report.errors.length > 0 ||
      (report.warnings.length > 0 && parsed.failOnWarning)
    ) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      `error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  }
}

function formatLocation(
  location: { symbol: string; line: number } | undefined,
  supported: boolean,
): string {
  if (!supported) {
    return "n/a";
  }
  return location ? `${location.symbol}:${location.line}` : "none";
}

function formatMetric(value: number | null): string {
  return value === null ? "n/a" : String(value);
}

function formatResponsibilities(value: string[] | null): string {
  if (value === null) {
    return "n/a";
  }
  return value.join(",") || "none";
}

function parseArgs(args: string[]): CheckModularityArgs {
  const parsed: CheckModularityArgs = {
    touched: false,
    files: [],
    limit: 300,
    failOnWarning: false,
    configOnly: false,
    help: false,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--touched") {
      parsed.touched = true;
      continue;
    }
    if (arg === "--fail-on-warning") {
      parsed.failOnWarning = true;
      continue;
    }
    if (arg === "--config-only") {
      parsed.configOnly = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--file") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("check-modularity --file requires a path");
      }
      parsed.files.push(value);
      index += 1;
      continue;
    }
    if (arg.startsWith("--file=")) {
      const value = arg.slice("--file=".length).trim();
      if (!value) {
        throw new Error("check-modularity --file requires a path");
      }
      parsed.files.push(value);
      continue;
    }
    if (arg === "--base") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("check-modularity --base requires a ref");
      }
      parsed.base = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--base=")) {
      const value = arg.slice("--base=".length).trim();
      if (!value) {
        throw new Error("check-modularity --base requires a ref");
      }
      parsed.base = value;
      continue;
    }
    if (arg === "--limit") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("check-modularity --limit requires a positive integer");
      }
      parsed.limit = parseLimit(value);
      index += 1;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      parsed.limit = parseLimit(arg.slice("--limit=".length));
      continue;
    }
    throw new Error(`unknown check-modularity argument: ${arg}`);
  }
  return parsed;
}

function parseLimit(value: string): number {
  const limit = Number.parseInt(value, 10);
  if (
    !Number.isInteger(limit) ||
    limit <= 0 ||
    String(limit) !== value.trim()
  ) {
    throw new Error("check-modularity --limit requires a positive integer");
  }
  return limit;
}

function helpText(): string {
  return `ty-context check-modularity:
  check-modularity --touched [--limit 300] [--fail-on-warning]
  check-modularity --file <path> [--file <path> ...] [--limit 300] [--fail-on-warning]
  check-modularity --base <ref> [--limit 300] [--fail-on-warning]
  check-modularity --config-only

Portable heuristic risk signal: all selected files get physical-line analysis; JS/TS gets lexical function/branch/export/state-transition/responsibility metrics; Python gets lexical per-function statement/branch metrics; other included formats are line-only.
The report names analysis=js-ts-heuristic|python-heuristic|line-only and prints n/a for unsupported metrics. It is not complete cross-language static analysis, architecture proof or runtime-performance evidence; prefer project-native tools for those claims.
For --touched and --base, existing findings are reported but only new or worsened non-line complexity is a warning; physical lines remain a risk signal and new files are audited in full.
The default is warning-only; --fail-on-warning lets projects opt into CI enforcement.
Generated configs default to modularity.policy: strict_except_generated; omitted policy is treated as scoped_waivers for compatibility.
Risks can be waived only through lifecycle-complete <harnessRoot>/config.yaml modularity.waivers when policy is scoped_waivers.`;
}
