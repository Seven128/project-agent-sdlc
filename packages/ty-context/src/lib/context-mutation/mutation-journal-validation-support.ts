import path from "node:path";
import { sha256Hex } from "../strict-codec.js";

export function validateJournalFileState(
  value: unknown,
  label: string,
): number {
  if (!isJournalRecord(value)) invalidJournal(`${label}_object_required`);
  if (typeof value.exists !== "boolean")
    invalidJournal(`${label}_exists_invalid`);
  if (!value.exists) {
    if (
      value.sha256 !== null ||
      value.bytes_base64 !== null ||
      value.mode !== null ||
      value.identity !== null
    )
      invalidJournal(`${label}_absent_shape`);
    return 0;
  }
  const digest = validateJournalDigest(value.sha256, `${label}.sha256`);
  if (typeof value.bytes_base64 !== "string")
    invalidJournal(`${label}.bytes_base64_string_required`);
  const bytes = Buffer.from(value.bytes_base64, "base64");
  if (bytes.toString("base64") !== value.bytes_base64)
    invalidJournal(`${label}_base64_invalid`);
  if (sha256Hex(bytes) !== digest) invalidJournal(`${label}_digest_mismatch`);
  const mode = requiredJournalInteger(value.mode, `${label}.mode`);
  if (mode > 0o777) invalidJournal(`${label}_mode_invalid`);
  if (value.identity !== null) validateIdentity(value.identity, label);
  return bytes.length;
}

export function sameJournalFileState(left: unknown, right: unknown): boolean {
  if (!isJournalRecord(left) || !isJournalRecord(right)) return false;
  return (
    left.exists === right.exists &&
    left.sha256 === right.sha256 &&
    left.mode === right.mode
  );
}

export function isPresentJournalState(value: unknown): boolean {
  return isJournalRecord(value) && value.exists === true;
}

export function isAbsentJournalState(value: unknown): boolean {
  return isJournalRecord(value) && value.exists === false;
}

export function validateJournalTemporaryPath(
  value: unknown,
  file: string,
  transactionId: string,
  order: number,
): void {
  const temporary = requiredJournalString(value, "file.temporary_path");
  assertJournalRelative(temporary, "file.temporary_path");
  const expected = `${path.posix.dirname(file)}/.${path.posix.basename(file)}.ty-context-mutation-${transactionId.slice(0, 16)}-${order}.tmp`;
  if (temporary !== expected) invalidJournal("temporary_path_unowned");
}

export function assertJournalMutationTarget(value: string): void {
  if (value === "project_context/context.toml") return;
  assertJournalContextMarkdownPath(value, "mutation_target");
}

export function assertJournalContextMarkdownPath(
  value: string,
  label: string,
): void {
  assertJournalRelative(value, label);
  if (!value.startsWith("project_context/") || !value.endsWith(".md"))
    invalidJournal(`${label}_context_markdown_required`);
}

export function assertJournalRelative(value: string, label: string): void {
  const normalized = value.replace(/\\/gu, "/");
  const segments = normalized.split("/");
  if (
    value !== normalized ||
    !normalized ||
    path.isAbsolute(value) ||
    normalized.startsWith("/") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  )
    invalidJournal(`${label}_unsafe`);
}

export function validateJournalDigest(value: unknown, label: string): string {
  const digest = requiredJournalString(value, label);
  if (!/^[0-9a-f]{64}$/u.test(digest)) invalidJournal(`${label}_invalid`);
  return digest;
}

export function requiredJournalString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0)
    invalidJournal(`${label}_string_required`);
  return value;
}

export function requiredJournalInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    invalidJournal(`${label}_integer_required`);
  return value;
}

export function isJournalRecord(
  value: unknown,
): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function invalidJournal(reason: string): never {
  throw new Error(`context_mutation_invalid:${reason}`);
}

function validateIdentity(value: unknown, label: string): void {
  if (!isJournalRecord(value)) invalidJournal(`${label}_identity_invalid`);
  for (const field of ["dev", "ino"])
    requiredPlatformInteger(value[field], `${label}.identity.${field}`);
  for (const field of ["nlink", "size"])
    requiredJournalInteger(value[field], `${label}.identity.${field}`);
  for (const field of ["mtime_ms", "ctime_ms"]) {
    const item = value[field];
    if (typeof item !== "number" || !Number.isFinite(item) || item < 0)
      invalidJournal(`${label}_identity_${field}_invalid`);
  }
}

function requiredPlatformInteger(value: unknown, label: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  )
    invalidJournal(`${label}_integer_required`);
  return value;
}
