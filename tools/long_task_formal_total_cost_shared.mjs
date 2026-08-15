import { constants as fsConstants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { assert, canonical } from "./long_task_real_process_roi_scoring.mjs";
export { parseStrictJson as parseJson } from "./long_task_formal_total_cost_json.mjs";

export const shaPattern = /^[a-f0-9]{64}$/u;
export const gitShaPattern = /^[a-f0-9]{40}$/u;
export const pairIds = Object.freeze(
  Array.from(
    { length: 5 },
    (_, index) => `pair-${String(index + 1).padStart(2, "0")}`,
  ),
);
export const meterUnits = Object.freeze({
  provider_input_token: "token",
  provider_output_token: "token",
  provider_cached_input_token: "token",
  compute_ms: "millisecond",
  storage_byte_hour: "byte-hour",
});
export const sourceRoles = Object.freeze([
  "collector",
  "incident_source",
  "price_document",
  "price_source",
  "provider_event",
  "raw_event",
  "raw_prompt",
  "redaction_rule",
  "scenario_catalog",
  "scenario_gold",
  "scenario_output",
  "scenario_source",
]);

const prohibitedPacketFields = new Set([
  "event_id",
  "exclusive_event_id",
  "exclusive_event_ids",
  "formal_status",
  "independent_evidence_admitted",
  "normalized_benefit",
  "normalized_cost",
  "normalized_value",
  "report_status",
  "total_roi_positive",
  "total_roi_supported",
  "verified",
]);

export async function readRegularFileNoFollow(target, maximumBytes) {
  const before = await lstat(target);
  assert(
    before.isFile() && !before.isSymbolicLink() && before.nlink === 1,
    `formal_evidence_regular_file:${target}`,
  );
  assert(before.size <= maximumBytes, `formal_evidence_file_budget:${target}`);
  await assertRealPathEquals(target, `formal_evidence_file_reparse:${target}`);
  const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0);
  const handle = await open(target, flags);
  try {
    const opened = await handle.stat();
    assert(
      opened.isFile() &&
        opened.size === before.size &&
        opened.dev === before.dev &&
        opened.ino === before.ino,
      `formal_evidence_file_identity_before:${target}`,
    );
    const bytes = await handle.readFile();
    const after = await handle.stat();
    assert(
      after.size === opened.size &&
        after.dev === opened.dev &&
        after.ino === opened.ino,
      `formal_evidence_file_identity_after:${target}`,
    );
    return bytes;
  } finally {
    await handle.close();
  }
}

export async function walkRegularFiles(root, maximumFiles, allowedDirectories) {
  const files = [];
  async function walk(current, prefix) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      const target = path.join(current, entry.name);
      const info = await lstat(target);
      assert(!info.isSymbolicLink(), `formal_evidence_source_link:${relative}`);
      if (info.isDirectory()) {
        assert(
          allowedDirectories.has(relative),
          `formal_evidence_source_directory_unexpected:${relative}`,
        );
        await assertRealPathEquals(
          target,
          `formal_evidence_source_reparse:${relative}`,
        );
        await walk(target, relative);
        continue;
      }
      assert(info.isFile(), `formal_evidence_source_not_regular:${relative}`);
      assert(info.nlink === 1, `formal_evidence_source_hardlink:${relative}`);
      await assertRealPathEquals(
        target,
        `formal_evidence_source_reparse:${relative}`,
      );
      files.push(relative.replaceAll("\\", "/"));
      assert(
        files.length <= maximumFiles,
        "formal_evidence_source_actual_file_count",
      );
    }
  }
  await walk(root, "");
  return files.sort();
}

export async function assertDirectoryNoFollow(target, label) {
  const info = await lstat(target);
  assert(info.isDirectory() && !info.isSymbolicLink(), label);
  await assertRealPathEquals(target, `${label}_reparse`);
}

export function resolveContained(root, relative) {
  assertSafeRelativePath(relative, "formal_evidence_contained_path");
  const resolved = path.resolve(root, ...relative.split("/"));
  const relativeBack = path.relative(path.resolve(root), resolved);
  assert(
    relativeBack !== ".." &&
      !relativeBack.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativeBack),
    `formal_evidence_path_escape:${relative}`,
  );
  return resolved;
}

export function assertSafeRelativePath(value, code) {
  assert(
    typeof value === "string" &&
      value.length > 0 &&
      value.length <= 1024 &&
      !path.isAbsolute(value) &&
      !value.includes("\\") &&
      value.split("/").length <= 32 &&
      !value
        .split("/")
        .some((segment) => !segment || segment === "." || segment === ".."),
    `${code}:${value}`,
  );
}

export function rejectProhibitedFields(value, code, trail = "$") {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries())
      rejectProhibitedFields(item, code, `${trail}[${index}]`);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    assert(!prohibitedPacketFields.has(key), `${code}:${trail}.${key}`);
    rejectProhibitedFields(item, code, `${trail}.${key}`);
  }
}

export function assertTimestamp(value, code) {
  assert(typeof value === "string", code);
  const parsed = Date.parse(value);
  assert(
    Number.isFinite(parsed) && new Date(parsed).toISOString() === value,
    code,
  );
  return parsed;
}

export function assertExactKeys(value, expected, code) {
  assert(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      canonical(Object.keys(value).sort()) === canonical([...expected].sort()),
    code,
  );
}

export function assertSameSet(left, right, code) {
  assert(Array.isArray(left) && left.length === right.length, code);
  assert(
    [...left]
      .sort()
      .every((value, index) => value === [...right].sort()[index]),
    code,
  );
}

async function assertRealPathEquals(target, label) {
  const resolved = path.resolve(target);
  const actual = await realpath(target);
  const normalize = (value) =>
    process.platform === "win32" ? value.toLowerCase() : value;
  assert(normalize(actual) === normalize(resolved), label);
}
