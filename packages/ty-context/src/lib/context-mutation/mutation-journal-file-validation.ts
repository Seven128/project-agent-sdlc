import {
  assertJournalMutationTarget,
  assertJournalRelative,
  invalidJournal,
  isJournalRecord,
  requiredJournalInteger,
  requiredJournalString,
  sameJournalFileState,
  sameJournalRecordedPayload,
  validateJournalFileState,
  validateJournalRecordedFileState,
  validateJournalTemporaryPath,
} from "./mutation-journal-validation-support.js";

export function validateJournalFiles(
  value: unknown,
  transactionId: string,
  maxFiles: number,
  maxStoredBytes: number,
): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxFiles)
    invalidJournal("journal_files_invalid");
  const orders = new Set<number>();
  const paths = new Set<string>();
  const files: Record<string, unknown>[] = [];
  let storedBytes = 0;
  for (const entry of value) {
    if (!isJournalRecord(entry)) invalidJournal("journal_file_object_required");
    const file = requiredJournalString(entry.path, "file.path");
    assertJournalRelative(file, "file.path");
    assertJournalMutationTarget(file);
    if (paths.has(file)) invalidJournal("journal_file_path_duplicate");
    paths.add(file);
    const order = requiredJournalInteger(
      entry.commit_order,
      "file.commit_order",
    );
    if (orders.has(order)) invalidJournal("journal_commit_order_duplicate");
    orders.add(order);
    storedBytes += validateJournalFileState(entry.before, "file.before");
    storedBytes += validateJournalFileState(entry.after, "file.after");
    assertSemanticIdentityShape(entry, file);
    if (sameJournalFileState(entry.before, entry.after))
      invalidJournal("journal_file_noop");
    validateJournalTemporaryPath(
      entry.temporary_path,
      file,
      transactionId,
      order,
    );
    validateTemporaryState(entry, file);
    validatePublishedState(entry, "before", file);
    validatePublishedState(entry, "after", file);
    files.push(entry);
  }
  if (
    orders.size !== files.length ||
    [...orders].some((order) => order >= files.length)
  )
    invalidJournal("journal_commit_order_not_contiguous");
  if (storedBytes > maxStoredBytes)
    invalidJournal("journal_byte_budget_exceeded");
  return files;
}

function assertSemanticIdentityShape(
  entry: Record<string, unknown>,
  file: string,
): void {
  if (!isJournalRecord(entry.before) || !isJournalRecord(entry.after))
    invalidJournal(`file_state_object_required:${file}`);
  if (entry.before.exists === true && entry.before.identity === null)
    invalidJournal(`file_before_identity_required:${file}`);
  if (
    entry.before.exists === true &&
    isJournalRecord(entry.before.identity) &&
    entry.before.identity.nlink !== "1"
  )
    invalidJournal(`file_before_hardlink_forbidden:${file}`);
  if (entry.after.identity !== null)
    invalidJournal(`file_after_planned_identity_forbidden:${file}`);
}

function validateTemporaryState(
  entry: Record<string, unknown>,
  file: string,
): void {
  if (entry.temporary_state === null) return;
  if (!isJournalRecord(entry.temporary_state))
    invalidJournal(`file_temporary_state_object_required:${file}`);
  const side = entry.temporary_state.side;
  if (side !== "before" && side !== "after")
    invalidJournal(`file_temporary_state_side_invalid:${file}`);
  validateJournalRecordedFileState(
    entry.temporary_state.state,
    `file.temporary_state.state`,
  );
  const semantic = entry[side];
  if (
    !isJournalRecord(semantic) ||
    semantic.exists !== true ||
    !sameJournalRecordedPayload(entry.temporary_state.state, semantic)
  )
    invalidJournal(`file_temporary_state_payload_mismatch:${file}`);
  const identity = isJournalRecord(entry.temporary_state.state)
    ? entry.temporary_state.state.identity
    : null;
  if (!isJournalRecord(identity) || !["1", "2"].includes(identity.nlink as string))
    invalidJournal(`file_temporary_state_link_count_invalid:${file}`);
  if (
    identity.nlink === "2" &&
    isJournalRecord(entry[side === "before" ? "after" : "before"]) &&
    (entry[side === "before" ? "after" : "before"] as Record<string, unknown>)
      .exists !== false
  )
    invalidJournal(`file_deletion_tombstone_transition_invalid:${file}`);
}

function validatePublishedState(
  entry: Record<string, unknown>,
  side: "before" | "after",
  file: string,
): void {
  const field = side === "before" ? "published_before" : "published_after";
  const value = entry[field];
  if (value === null) return;
  validateJournalRecordedFileState(value, `file.${field}`);
  if (!sameJournalRecordedPayload(value, entry[side]))
    invalidJournal(`file_${field}_payload_mismatch:${file}`);
}
