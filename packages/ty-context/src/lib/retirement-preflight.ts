import { readContextMutationJournal } from "./context-mutation/mutation-journal.js";

export const COMPATIBLE_SCHEMA4_CLI =
  "npx --yes --package project-tiny-context-harness@0.11.0 ty-context";

export async function assertLegacyContextTransactionSettled(
  repository: string,
): Promise<void> {
  let journal;
  try {
    journal = await readContextMutationJournal(repository);
  } catch (error) {
    throw new Error(
      `retirement_blocked: cannot read existing Context transaction: ${String(error)}. Use an explicitly compatible recovery tool; do not treat unreadable state as no transaction. Schema and old recovery dependencies have not been switched.`,
    );
  }
  if (journal)
    throw new Error(
      `retirement_blocked: unfinished Context transaction ${journal.transaction_id}. Before upgrading, use the compatible installed 0.11.0 CLI or ${COMPATIBLE_SCHEMA4_CLI} context transaction status, then complete or rollback. If a conflicting Long-Task binding prevents recovery, legitimately end or abandon it with that compatible CLI first; no old Final Gate is required and deleting a lock is not recovery. Recheck before retrying upgrade.`,
    );
}
