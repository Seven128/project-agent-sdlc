import {
  assertJournalMutationTarget,
  assertJournalRelative,
  invalidJournal,
  isJournalRecord,
  requiredJournalInteger,
  requiredJournalString,
  sameJournalFileState,
  validateJournalFileState,
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
    if (sameJournalFileState(entry.before, entry.after))
      invalidJournal("journal_file_noop");
    validateJournalTemporaryPath(
      entry.temporary_path,
      file,
      transactionId,
      order,
    );
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
