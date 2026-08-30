import { normalizeContextRole } from "../context-catalog/catalog-portable-contract.js";
import { validateJournalFiles } from "./mutation-journal-file-validation.js";
import {
  assertJournalContextMarkdownPath,
  assertJournalRelative,
  invalidJournal,
  isAbsentJournalState,
  isJournalRecord,
  isPresentJournalState,
  requiredJournalInteger,
  requiredJournalString,
  validateJournalDigest,
} from "./mutation-journal-validation-support.js";
import type { ContextMutationJournal } from "./mutation-types.js";

export const CONTEXT_MUTATION_JOURNAL_SCHEMA =
  "context-mutation-journal-v3" as const;
const LEGACY_CONTEXT_MUTATION_JOURNAL_SCHEMA =
  "context-mutation-journal-v2" as const;

const MAX_MUTATION_FILES = 512;
const MAX_MUTATION_DIRECTORIES = 64;
const MAX_STORED_BYTES = 64 * 1024 * 1024;
const MAX_JOURNAL_SEQUENCE = 4095;

export function validateContextMutationJournal(
  value: unknown,
): ContextMutationJournal {
  if (!isJournalRecord(value)) invalidJournal("journal_object_required");
  if (
    typeof value.schema_version === "string" &&
    /^context-mutation-journal-v(?:0|1)$/u.test(value.schema_version)
  )
    invalidJournal(
      "journal_pre_v2_manual_recovery_required:use_the_ty-context_version_that_created_the_journal_or_restore_exact_files_from_version_control",
    );
  if (
    value.schema_version !== CONTEXT_MUTATION_JOURNAL_SCHEMA &&
    value.schema_version !== LEGACY_CONTEXT_MUTATION_JOURNAL_SCHEMA
  )
    invalidJournal("journal_schema_unsupported");
  const transactionId = requiredJournalString(
    value.transaction_id,
    "transaction_id",
  );
  if (!/^[0-9a-f]{64}$/u.test(transactionId))
    invalidJournal("transaction_id_invalid");
  const journalSequence = requiredJournalInteger(
    value.journal_sequence,
    "journal_sequence",
  );
  if (journalSequence > MAX_JOURNAL_SEQUENCE)
    invalidJournal("journal_sequence_exceeded");
  if (journalSequence === 0) {
    if (value.previous_journal_sha256 !== null)
      invalidJournal("initial_journal_predecessor_forbidden");
  } else {
    validateJournalDigest(
      value.previous_journal_sha256,
      "previous_journal_sha256",
    );
  }
  const operation = value.operation;
  if (operation !== "register" && operation !== "move")
    invalidJournal("operation_invalid");
  const state = value.state;
  if (
    state !== "planning" &&
    state !== "prepared" &&
    state !== "committing" &&
    state !== "validating"
  )
    invalidJournal("journal_state_invalid");
  const files = validateJournalFiles(
    value.files,
    transactionId,
    MAX_MUTATION_FILES,
    MAX_STORED_BYTES,
    value.schema_version === CONTEXT_MUTATION_JOURNAL_SCHEMA
      ? "required-v3"
      : "forbidden-v2",
  );
  const directories = validateDirectories(value.directories, operation);
  validateAppliedPaths(value.applied_paths, files, state);
  validateJournalDigest(
    value.catalog_before_identity,
    "catalog_before_identity",
  );
  validateJournalDigest(value.catalog_after_identity, "catalog_after_identity");
  if (!isJournalRecord(value.operation_data))
    invalidJournal("operation_data_invalid");
  if (value.operation_data.kind !== operation)
    invalidJournal("operation_data_kind_mismatch");
  validateOperationData(value.operation_data, operation);
  if (
    operation === "register" &&
    (files.length !== 1 || files[0].path !== "project_context/context.toml")
  )
    invalidJournal("register_file_set_invalid");
  if (operation === "move")
    validateMoveFileSet(files, value.operation_data, directories);
  return value as unknown as ContextMutationJournal;
}

function validateDirectories(
  value: unknown,
  operation: "register" | "move",
): string[] {
  if (!Array.isArray(value) || value.length > MAX_MUTATION_DIRECTORIES)
    invalidJournal("journal_directories_invalid");
  if (operation === "register" && value.length !== 0)
    invalidJournal("register_directories_forbidden");
  const seen = new Set<string>();
  const directories: string[] = [];
  let previousDepth = 0;
  for (const entry of value) {
    if (!isJournalRecord(entry))
      invalidJournal("journal_directory_object_required");
    const directory = requiredJournalString(entry.path, "directory.path");
    assertJournalRelative(directory, "directory.path");
    if (!directory.startsWith("project_context/"))
      invalidJournal("journal_directory_context_required");
    if (entry.before_exists !== false)
      invalidJournal("journal_directory_before_state_invalid");
    if (seen.has(directory)) invalidJournal("journal_directory_duplicate");
    seen.add(directory);
    directories.push(directory);
    const depth = directory.split("/").length;
    if (depth < previousDepth)
      invalidJournal("journal_directory_order_invalid");
    previousDepth = depth;
  }
  return directories;
}

function validateMoveFileSet(
  files: Record<string, unknown>[],
  operationData: Record<string, unknown>,
  directories: string[],
): void {
  if (files.length < 3) invalidJournal("move_file_set_incomplete");
  const ordered = [...files].sort(
    (left, right) =>
      (left.commit_order as number) - (right.commit_order as number),
  );
  const from = operationData.from_path as string;
  const to = operationData.to_path as string;
  if (
    ordered[0].path !== to ||
    !isAbsentJournalState(ordered[0].before) ||
    !isPresentJournalState(ordered[0].after)
  )
    invalidJournal("move_target_change_invalid");
  const source = ordered.at(-1)!;
  if (
    source.path !== from ||
    !isPresentJournalState(source.before) ||
    !isAbsentJournalState(source.after)
  )
    invalidJournal("move_source_change_invalid");
  const manifest = ordered.at(-2)!;
  if (
    manifest.path !== "project_context/context.toml" ||
    !isPresentJournalState(manifest.before) ||
    !isPresentJournalState(manifest.after)
  )
    invalidJournal("move_manifest_change_invalid");
  for (const reference of ordered.slice(1, -2))
    if (
      !isPresentJournalState(reference.before) ||
      !isPresentJournalState(reference.after)
    )
      invalidJournal("move_reference_change_invalid");
  for (const directory of directories)
    if (!to.startsWith(`${directory}/`))
      invalidJournal("move_directory_not_target_ancestor");
  for (let index = 1; index < directories.length; index += 1)
    if (!directories[index].startsWith(`${directories[index - 1]}/`))
      invalidJournal("move_directories_not_chain");
}

function validateAppliedPaths(
  value: unknown,
  files: Record<string, unknown>[],
  state: string,
): void {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))
    invalidJournal("journal_applied_paths_invalid");
  const ordered = [...files]
    .sort(
      (left, right) =>
        (left.commit_order as number) - (right.commit_order as number),
    )
    .map((entry) => entry.path as string);
  if (
    value.some((entry, index) => entry !== ordered[index]) ||
    new Set(value).size !== value.length
  )
    invalidJournal("journal_applied_paths_not_prefix");
  if ((state === "planning" || state === "prepared") && value.length !== 0)
    invalidJournal("journal_applied_paths_state_mismatch");
  if (state === "validating" && value.length !== ordered.length)
    invalidJournal("journal_applied_paths_state_mismatch");
  for (const file of files) {
    const applied = value.includes(file.path);
    if (applied && file.published_after === null)
      invalidJournal("journal_applied_path_endpoint_missing");
    if (
      (state === "planning" || state === "prepared") &&
      (file.published_before !== null || file.published_after !== null)
    )
      invalidJournal("journal_published_state_phase_mismatch");
  }
}

function validateOperationData(
  value: Record<string, unknown>,
  operation: "register" | "move",
): void {
  const paths = value.expected_default_paths;
  if (!Array.isArray(paths) || paths.some((entry) => typeof entry !== "string"))
    invalidJournal("operation_default_paths_invalid");
  const unique = new Set<string>();
  for (const file of paths as string[]) {
    assertJournalRelative(file, "default_path");
    if (unique.has(file)) invalidJournal("operation_default_path_duplicate");
    unique.add(file);
  }
  requiredJournalInteger(
    value.expected_default_bytes,
    "expected_default_bytes",
  );
  if (operation === "register") {
    const contextPath = requiredJournalString(
      value.context_path,
      "context_path",
    );
    assertJournalContextMarkdownPath(contextPath, "context_path");
    if (typeof value.role !== "string" || !normalizeContextRole(value.role))
      invalidJournal("operation_role_invalid");
    if (value.read_policy !== "default" && value.read_policy !== "on-demand")
      invalidJournal("operation_read_policy_invalid");
    return;
  }
  const from = requiredJournalString(value.from_path, "from_path");
  const to = requiredJournalString(value.to_path, "to_path");
  assertJournalContextMarkdownPath(from, "from_path");
  assertJournalContextMarkdownPath(to, "to_path");
  if (from === to) invalidJournal("operation_move_same_path");
  if (value.owner_source !== "area" && value.owner_source !== "context")
    invalidJournal("operation_owner_source_invalid");
  if (typeof value.role !== "string" || !normalizeContextRole(value.role))
    invalidJournal("operation_role_invalid");
  if (value.read_policy !== null && typeof value.read_policy !== "string")
    invalidJournal("operation_read_policy_invalid");
  if (
    !Array.isArray(value.expected_reference_issues) ||
    value.expected_reference_issues.some((entry) => typeof entry !== "string")
  )
    invalidJournal("operation_reference_issues_invalid");
}
