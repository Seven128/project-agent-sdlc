import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "acorn";

const CRITICAL_TAG = /\[critical:([a-z][a-z0-9]*(?:-[a-z0-9]+)*)\]/gu;
const NODE_TEST_FUNCTION_EXPORTS = new Set(["it", "test"]);
const TEST_MODIFIERS = new Set(["only", "skip", "todo"]);

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
    critical_ids: Object.freeze(
      [...new Set(occurrences.map((entry) => entry.id))].sort(compareUtf8),
    ),
  });
}

export async function readNodeTestTitleInventory(selectedFiles) {
  const ordered = [...selectedFiles].sort((left, right) =>
    compareUtf8(path.basename(left), path.basename(right)),
  );
  const names = ordered.map((file) => path.basename(file));
  if (new Set(names).size !== names.length)
    throw new Error("test_title_inventory_duplicate_selected_file");
  const inventory = [];
  for (const [index, file] of ordered.entries()) {
    const source = await readFile(file, "utf8");
    const program = parseModule(source, names[index]);
    const bindings = nodeTestBindings(program);
    walk(program, (node) => {
      if (node.type !== "CallExpression") return;
      if (!isNodeTestCall(node.callee, bindings)) return;
      const title = staticTitle(node.arguments[0]);
      if (title === null) return;
      inventory.push({
        file: names[index],
        title,
        line: node.loc?.start.line ?? 0,
        column: (node.loc?.start.column ?? -1) + 1,
      });
    });
  }
  return inventory.sort(compareTitleRows);
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

function nodeTestBindings(program) {
  const direct = new Set();
  const namespaces = new Set();
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration" || node.source?.value !== "node:test")
      continue;
    for (const specifier of node.specifiers) {
      if (specifier.type === "ImportDefaultSpecifier")
        direct.add(specifier.local.name);
      else if (
        specifier.type === "ImportSpecifier" &&
        NODE_TEST_FUNCTION_EXPORTS.has(importedName(specifier.imported))
      )
        direct.add(specifier.local.name);
      else if (specifier.type === "ImportNamespaceSpecifier")
        namespaces.add(specifier.local.name);
    }
  }
  return { direct, namespaces };
}

function importedName(imported) {
  return imported?.type === "Identifier" ? imported.name : imported?.value;
}

function isNodeTestCall(callee, bindings) {
  const parts = memberPath(callee);
  if (!parts) return false;
  if (bindings.direct.has(parts[0]))
    return (
      parts.length === 1 || (parts.length === 2 && TEST_MODIFIERS.has(parts[1]))
    );
  if (
    !bindings.namespaces.has(parts[0]) ||
    !NODE_TEST_FUNCTION_EXPORTS.has(parts[1])
  )
    return false;
  return (
    parts.length === 2 || (parts.length === 3 && TEST_MODIFIERS.has(parts[2]))
  );
}

function memberPath(node) {
  if (node?.type === "Identifier") return [node.name];
  if (node?.type !== "MemberExpression" || node.optional) return null;
  const owner = memberPath(node.object);
  if (!owner) return null;
  const property = node.computed
    ? node.property?.type === "Literal" &&
      typeof node.property.value === "string"
      ? node.property.value
      : null
    : node.property?.type === "Identifier"
      ? node.property.name
      : null;
  return property === null ? null : [...owner, property];
}

function staticTitle(node) {
  if (node?.type === "Literal" && typeof node.value === "string")
    return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0)
    return node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw ?? "";
  return null;
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
      });
  return result.sort(compareOccurrenceRows);
}

function walk(node, visit) {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (["end", "loc", "range", "start"].includes(key)) continue;
    if (Array.isArray(value)) for (const child of value) walk(child, visit);
    else if (value && typeof value === "object") walk(value, visit);
  }
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
