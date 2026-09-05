import { assertNoUnfinishedContextMutation } from "./context-mutation/mutation-command-support.js";
import { analyzeLongTaskCompactAuthoring } from "./long-task-compact-authoring-analysis.js";
import {
  blockedCompactAuthoringReport,
  compactAuthoringErrorCode,
  compactAuthoringErrorMessage,
  compactAuthoringWarningThreshold,
  emptyCompactAuthoringReport,
  type LongTaskCompactAuthoringReportV1,
} from "./long-task-compact-authoring-report.js";
import {
  applyCompactAuthoringTransaction,
  type CompactAuthoringTransactionHooksV1,
} from "./long-task-compact-authoring-transaction.js";
import { withActiveAuthorityLock } from "./long-task-state.js";
import {
  canonicalExistingLongTaskWorkdir,
  repositoryRoot,
} from "./long-task-workspace.js";

export type {
  CompactAuthoringByteDeltaV1,
  CompactAuthoringStatusV1,
  LongTaskCompactAuthoringReportV1,
} from "./long-task-compact-authoring-report.js";
export { compactAuthoringWarningThreshold };

export interface RunCompactAuthoringOptionsV1 extends CompactAuthoringTransactionHooksV1 {
  apply?: boolean;
}

export async function runLongTaskCompactAuthoring(
  repositoryInput: string,
  workdirInput: string,
  options: RunCompactAuthoringOptionsV1 = {},
): Promise<LongTaskCompactAuthoringReportV1> {
  let latest = emptyCompactAuthoringReport();
  try {
    const repository = await repositoryRoot(repositoryInput);
    const workdir = await canonicalExistingLongTaskWorkdir(
      repository,
      workdirInput,
    );
    if (!options.apply)
      return (await analyzeLongTaskCompactAuthoring(repository, workdir))
        .report;
    return await withActiveAuthorityLock(
      repository,
      "compact_authoring",
      async () => {
        await assertNoUnfinishedContextMutation(repository);
        const analysis = await analyzeLongTaskCompactAuthoring(
          repository,
          workdir,
        );
        latest = analysis.report;
        if (analysis.report.status === "already_compact")
          return analysis.report;
        if (!analysis.plan || !analysis.report.apply_allowed)
          return blockedCompactAuthoringReport(
            analysis.report,
            analysis.report.authority_lock_present
              ? "compact_authoring_authority_lock_present"
              : analysis.report.diagnostic_code,
            analysis.report.authority_lock_present
              ? "Compact authoring is allowed only before the first Authority Lock."
              : analysis.report.reason,
          );
        const cleanupFailures = await applyCompactAuthoringTransaction(
          repository,
          [
            {
              before: analysis.plan.source_before,
              after: analysis.plan.source_after,
            },
            {
              before: analysis.plan.contract_before,
              after: analysis.plan.contract_after,
            },
          ],
          {
            before_second_cas: options.before_second_cas,
            before_publish: options.before_publish,
            before_backup_cleanup: options.before_backup_cleanup,
          },
        );
        if (cleanupFailures.length)
          return {
            ...blockedCompactAuthoringReport(
              analysis.report,
              "compact_authoring_cleanup_failed",
              `Both compact carriers were committed and verified; backup cleanup failed: ${cleanupFailures.join(",")}`,
            ),
            applied: true,
          };
        return {
          ...analysis.report,
          status: "already_compact",
          applied: true,
          apply_allowed: false,
          diagnostic_code: "compact_authoring_applied",
          reason:
            "The proof-equivalent compact Source and Contract carriers were applied and reread successfully.",
          repair_command: null,
        };
      },
    );
  } catch (error) {
    return blockedCompactAuthoringReport(
      latest,
      compactAuthoringErrorCode(error),
      compactAuthoringErrorMessage(error),
    );
  }
}
