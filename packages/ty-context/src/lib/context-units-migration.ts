import { parse } from "smol-toml";
import path from "node:path";
import { CONTEXT_MANIFEST_PATH } from "./context-manifest.js";
import { parseContextManifest } from "./context-manifest-schema.js";
import { loadContextCatalog } from "./context-catalog/catalog-load.js";
import { pathExists, readText, writeTextIfChanged } from "./fs.js";
import type {
  Migration,
  MigrationReport,
  UpgradePlanItem,
} from "./migrations.js";

const ID = "context-units-to-context";
const INTRODUCED_IN = "0.10.0";
const DESCRIPTION =
  "Convert provably simple legacy [[context_units]] tables to Schema v4 [[context]] tables without rewriting the Manifest.";
const SCOPE = "project_context/context.toml";
const CURRENT_FIELDS = new Set([
  "path",
  "role",
  "read_when",
  "read_policy",
  "triggers",
  "default_children",
]);
const LEGACY_ONLY_FIELDS = new Set(["id", "area"]);

type ConversionPlan =
  | { status: "absent" }
  | { status: "safe"; content: string }
  | { status: "manual"; reason: string };

export const contextUnitsMigration: Migration = {
  id: ID,
  introducedIn: INTRODUCED_IN,
  description: DESCRIPTION,
  scope: SCOPE,
  risk: "safe",
  manualMessage:
    "Convert complex legacy Context tables manually; Tiny Context will not canonicalize or guess their fields.",
  detect: async (projectRoot) => {
    const manifestPath = path.join(projectRoot, CONTEXT_MANIFEST_PATH);
    if (!(await pathExists(manifestPath))) return [];
    const plan = planContextUnitsConversion(await readText(manifestPath));
    if (plan.status === "absent") return [];
    return [
      planItem(
        plan.status === "safe" ? "safe_pending" : "manual_required",
        plan.status === "safe"
          ? "Convert simple legacy Context tables with a bounded byte patch."
          : plan.reason,
      ),
    ];
  },
  apply: migrateContextUnits,
  verify: verifyContextUnitsMigration,
};

export function planContextUnitsConversion(content: string): ConversionPlan {
  if (!/^[ \t]*\[\[[ \t]*context_units[ \t]*\]\]/mu.test(content))
    return { status: "absent" };
  let decoded: Record<string, unknown>;
  try {
    const value = parse(content);
    if (!isRecord(value))
      return {
        status: "manual",
        reason: "legacy Manifest root is not a TOML table",
      };
    decoded = value;
  } catch (error) {
    return {
      status: "manual",
      reason: `legacy Manifest is not valid TOML: ${message(error)}`,
    };
  }
  const units = decoded.context_units;
  if (!Array.isArray(units) || units.some((entry) => !isRecord(entry)))
    return {
      status: "manual",
      reason: "context_units must be an array of TOML tables",
    };
  const currentContexts = decoded.context;
  if (
    currentContexts !== undefined &&
    (!Array.isArray(currentContexts) ||
      currentContexts.some((entry) => !isRecord(entry)))
  )
    return {
      status: "manual",
      reason: "current context tables are malformed",
    };

  const currentPaths = new Set(
    (currentContexts ?? [])
      .map((entry) => (typeof entry.path === "string" ? entry.path : null))
      .filter((entry): entry is string => entry !== null),
  );
  const legacyPaths = new Set<string>();
  for (const unit of units) {
    const unknown = Object.keys(unit).filter(
      (key) => !CURRENT_FIELDS.has(key) && !LEGACY_ONLY_FIELDS.has(key),
    );
    if (unknown.length > 0)
      return {
        status: "manual",
        reason: `legacy Context table has unsupported fields: ${unknown.join(", ")}`,
      };
    if (typeof unit.path !== "string" || typeof unit.role !== "string")
      return {
        status: "manual",
        reason:
          "every legacy Context table requires string path and role fields",
      };
    if (legacyPaths.has(unit.path) || currentPaths.has(unit.path))
      return {
        status: "manual",
        reason: `legacy Context path conflicts with another table: ${unit.path}`,
      };
    legacyPaths.add(unit.path);
  }

  const patched = patchSimpleLegacyTables(content);
  if (patched.status === "manual") return patched;
  if (patched.status === "absent")
    return {
      status: "manual",
      reason: "legacy Context tables disappeared during conversion planning",
    };
  const parsed = parseContextManifest(patched.content);
  if (parsed.errors.length > 0)
    return {
      status: "manual",
      reason: `converted Manifest is not valid Schema v4: ${parsed.errors[0]}`,
    };
  return patched;
}

async function migrateContextUnits(
  projectRoot: string,
  _root: string,
  report: MigrationReport,
): Promise<void> {
  const manifestPath = path.join(projectRoot, CONTEXT_MANIFEST_PATH);
  const plan = planContextUnitsConversion(await readText(manifestPath));
  if (plan.status === "absent") {
    report.skipped.push(`${CONTEXT_MANIFEST_PATH}#context-units`);
    return;
  }
  if (plan.status === "manual")
    throw new Error(
      `${CONTEXT_MANIFEST_PATH} changed after upgrade planning or is not safely convertible: ${plan.reason}`,
    );
  if (await writeTextIfChanged(manifestPath, plan.content))
    report.changed.push(`${CONTEXT_MANIFEST_PATH}#context-units-to-context`);
  else report.skipped.push(`${CONTEXT_MANIFEST_PATH}#context-units-to-context`);
}

async function verifyContextUnitsMigration(projectRoot: string): Promise<void> {
  const manifestPath = path.join(projectRoot, CONTEXT_MANIFEST_PATH);
  const content = await readText(manifestPath);
  if (/^[ \t]*\[\[[ \t]*context_units[ \t]*\]\]/mu.test(content))
    throw new Error("context-units-to-context migration verification failed");
  const catalog = await loadContextCatalog(projectRoot);
  const errors = catalog.diagnostics.filter(
    (entry) => entry.severity === "error",
  );
  if (errors.length > 0)
    throw new Error(
      `context-units-to-context produced an invalid Catalog: ${errors[0].message}`,
    );
}

function patchSimpleLegacyTables(content: string): ConversionPlan {
  const eols = content.match(/\r\n|\r|\n/gu) ?? [];
  if (new Set(eols).size > 1)
    return {
      status: "manual",
      reason: "legacy Manifest has mixed line endings",
    };
  const eol = eols[0] ?? "\n";
  const lines = content.split(eol);
  let inLegacyTable = false;
  let convertedTables = 0;
  const output: string[] = [];
  for (const line of lines) {
    const table = /^[ \t]*\[\[[ \t]*([^\]]+?)[ \t]*\]\](?:[ \t]*#.*)?$/u.exec(
      line,
    );
    const otherTable = /^[ \t]*\[[^[]/u.test(line);
    if (table) {
      inLegacyTable = table[1].trim() === "context_units";
      if (inLegacyTable) {
        output.push(
          line.replace(/(\[\[[ \t]*)context_units([ \t]*\]\])/u, "$1context$2"),
        );
        convertedTables += 1;
      } else output.push(line);
      continue;
    }
    if (otherTable) inLegacyTable = false;
    if (!inLegacyTable || !line.trim() || line.trimStart().startsWith("#")) {
      output.push(line);
      continue;
    }
    const assignment = /^[ \t]*([A-Za-z][A-Za-z0-9_-]*)[ \t]*=(.*)$/u.exec(
      line,
    );
    if (!assignment)
      return {
        status: "manual",
        reason:
          "legacy Context tables must use simple single-line field assignments",
      };
    const key = assignment[1];
    if (!CURRENT_FIELDS.has(key) && !LEGACY_ONLY_FIELDS.has(key))
      return {
        status: "manual",
        reason: `legacy Context table has unsupported source field: ${key}`,
      };
    try {
      parse(line);
    } catch {
      return {
        status: "manual",
        reason: `legacy Context field ${key} is not a complete single-line TOML value`,
      };
    }
    if (!LEGACY_ONLY_FIELDS.has(key)) output.push(line);
  }
  if (convertedTables === 0)
    return {
      status: "manual",
      reason: "no exact legacy table header was found",
    };
  return { status: "safe", content: output.join(eol) };
}

function planItem(
  status: UpgradePlanItem["status"],
  reason: string,
): UpgradePlanItem {
  return {
    id: ID,
    introducedIn: INTRODUCED_IN,
    description: DESCRIPTION,
    scope: SCOPE,
    status,
    path: CONTEXT_MANIFEST_PATH,
    message: reason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
