import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "acorn";
import { analyzeNodeTestProgram } from "./test_title_static_analysis.mjs";

const CRITICAL_TAG = /\[critical:([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\]/gu;
const JAVASCRIPT_MODULE_EXTENSIONS = new Set([
  "",
  ".cjs",
  ".cts",
  ".js",
  ".mjs",
  ".mts",
  ".ts",
]);

export async function assertCriticalTestTitleInventory({
  suite,
  selectedFiles,
  sentinels,
  rejectUnknown = true,
}) {
  const titles = await readNodeTestTitleInventory(selectedFiles);
  const occurrences = criticalOccurrences(titles);
  const expected = new Map(sentinels.map((entry) => [entry.id, entry]));
  const failures = [];

  if (expected.size !== sentinels.length)
    failures.push("registry_duplicate_id");
  for (const sentinel of sentinels) {
    if (!sentinel.required_suites.includes(suite))
      failures.push(`registry_wrong_suite:${sentinel.id}`);
    const matches = occurrences.filter((entry) => entry.id === sentinel.id);
    if (matches.length === 0) {
      failures.push(`critical_sentinel_missing:${sentinel.id}`);
      continue;
    }
    if (matches.length !== 1)
      failures.push(
        `critical_sentinel_duplicate:${sentinel.id}:${matches.map(formatOccurrence).join(",")}`,
      );
    for (const match of matches)
      if (match.file !== sentinel.file)
        failures.push(
          `critical_sentinel_misplaced:${sentinel.id}:${match.file}:${sentinel.file}`,
        );
  }
  if (rejectUnknown)
    for (const occurrence of occurrences)
      if (!expected.has(occurrence.id))
        failures.push(
          `critical_sentinel_unexpected:${occurrence.id}:${formatOccurrence(occurrence)}`,
        );

  if (failures.length > 0)
    throw new Error(
      `critical_test_title_inventory_invalid:${suite}:${failures.join("|")}`,
    );
  return Object.freeze({
    schema_version: "critical-test-title-inventory-v1",
    suite,
    selected_file_count: selectedFiles.length,
    test_title_count: titles.length,
    critical_occurrence_count: occurrences.length,
    critical_occurrences: Object.freeze(
      occurrences.map((entry) => Object.freeze({ ...entry })),
    ),
    critical_ids: Object.freeze(
      [...new Set(occurrences.map((entry) => entry.id))].sort(compareUtf8),
    ),
  });
}

export async function readNodeTestTitleInventory(selectedFiles) {
  const ordered = [...selectedFiles]
    .map((file) => path.resolve(file))
    .sort((left, right) =>
      compareUtf8(path.basename(left), path.basename(right)),
    );
  if (ordered.length === 0)
    throw new Error("test_title_inventory_no_selected_files");
  const names = ordered.map((file) => path.basename(file));
  if (new Set(names).size !== names.length)
    throw new Error("test_title_inventory_duplicate_selected_file");
  const testRoot = path.dirname(ordered[0]);
  if (ordered.some((file) => path.dirname(file) !== testRoot))
    throw new Error("test_title_inventory_selected_root_mismatch");

  const moduleCache = new Map();
  const inventory = [];
  for (const rootFile of ordered) {
    const visited = new Set();
    await visitModule(rootFile, {
      testRoot,
      visited,
      moduleCache,
      inventory,
    });
  }
  return inventory.sort(compareTitleRows);
}

async function visitModule(
  absoluteFile,
  { testRoot, visited, moduleCache, inventory },
) {
  const normalized = path.resolve(absoluteFile);
  if (visited.has(normalized)) return;
  visited.add(normalized);
  const analysis = await loadModule(normalized, testRoot, moduleCache);
  for (const title of analysis.titles)
    inventory.push({ file: displayPath(normalized, testRoot), ...title });
  for (const edge of analysis.local_module_edges) {
    const imported = resolveLocalModule(normalized, edge);
    if (!isWithinDirectory(imported, testRoot)) {
      if (edge.dynamic)
        throw new Error(
          `critical_test_title_inventory_unsupported_dynamic_import:${displayPath(normalized, testRoot)}:${edge.line}:${edge.column}`,
        );
      continue;
    }
    if (!isJavaScriptModulePath(imported)) continue;
    await visitModule(imported, {
      testRoot,
      visited,
      moduleCache,
      inventory,
    });
  }
}

function isWithinDirectory(candidate, directory) {
  const relative = path.relative(directory, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

async function loadModule(absoluteFile, testRoot, moduleCache) {
  const cached = moduleCache.get(absoluteFile);
  if (cached) return cached;
  const pending = (async () => {
    const file = displayPath(absoluteFile, testRoot);
    let source;
    try {
      source = await readFile(absoluteFile, "utf8");
    } catch (error) {
      throw new Error(
        `test_title_inventory_read_failed:${file}:${failureMessage(error)}`,
      );
    }
    const program = parseModule(source, file);
    return analyzeNodeTestProgram({ program, file });
  })();
  moduleCache.set(absoluteFile, pending);
  return pending;
}

function resolveLocalModule(importer, edge) {
  try {
    if (edge.resolution === "commonjs")
      return path.resolve(
        createRequire(pathToFileURL(importer)).resolve(edge.specifier),
      );
    return path.resolve(
      fileURLToPath(new URL(edge.specifier, pathToFileURL(importer))),
    );
  } catch (error) {
    throw new Error(
      `test_title_inventory_import_invalid:${path.basename(importer)}:${edge.specifier}:${failureMessage(error)}`,
    );
  }
}

function parseModule(source, file) {
  try {
    return parse(source, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
      allowHashBang: true,
    });
  } catch (error) {
    throw new Error(
      `test_title_inventory_parse_failed:${file}:${failureMessage(error)}`,
    );
  }
}

function criticalOccurrences(titles) {
  const result = [];
  for (const title of titles)
    for (const match of title.title.matchAll(CRITICAL_TAG))
      result.push({
        id: match[1],
        file: title.file,
        line: title.line,
        column: title.column,
        title: title.title,
      });
  return result.sort(compareOccurrenceRows);
}

function displayPath(absoluteFile, testRoot) {
  return path.relative(testRoot, absoluteFile).replaceAll("\\", "/");
}

function isJavaScriptModulePath(absoluteFile) {
  return JAVASCRIPT_MODULE_EXTENSIONS.has(
    path.extname(absoluteFile).toLowerCase(),
  );
}

function compareTitleRows(left, right) {
  return (
    compareUtf8(left.file, right.file) ||
    left.line - right.line ||
    left.column - right.column ||
    compareUtf8(left.title, right.title)
  );
}

function compareOccurrenceRows(left, right) {
  return (
    compareUtf8(left.id, right.id) ||
    compareUtf8(left.file, right.file) ||
    left.line - right.line ||
    left.column - right.column
  );
}

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

function formatOccurrence(entry) {
  return `${entry.file}:${entry.line}:${entry.column}`;
}

function failureMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
