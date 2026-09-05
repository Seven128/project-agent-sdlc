import { randomUUID } from "node:crypto";
import path from "node:path";
import {
  captureMutationFileState,
  mutationFileStateFromBytes,
  absentMutationFileState,
  mutationRecordedFileState,
} from "./context-mutation/mutation-file-state.js";
import {
  mutationTemporaryPath,
  stageMutationTemporary,
  prepareMutationTemporaryForRecovery,
  mutationChangeDisposition,
  applyMutationChangeForward,
  cleanupMutationTemporary,
} from "./context-mutation/mutation-cas.js";
import {
  validateJournalFileState,
  validateJournalRecordedFileState,
} from "./context-mutation/mutation-journal-validation-support.js";
import type { MutationFileChange } from "./context-mutation/mutation-types.js";
import {
  ensureSafeRepositoryDirectory,
  resolveInsideRepository,
} from "./repository-path-safety.js";
import { withMaintenanceLock } from "./maintenance-lock.js";
import {
  writeMaintenanceText,
  removeMaintenanceFile,
} from "./maintenance-write.js";
import {
  planSchema5Retirement,
  type RetirementPlan,
} from "./retirement-plan.js";
import { assertLegacyContextTransactionSettled } from "./retirement-preflight.js";
import { retireOwnBinding } from "./retirement-binding.js";
import { runValidator } from "./validators.js";
import { loadContextCatalog } from "./context-catalog/catalog-load.js";
import { canonicalJson } from "./strict-codec.js";

export const RETIREMENT_PENDING = "tmp/ty-context/upgrade-schema-5.json";
interface RetirementJournal {
  format: "tiny-context-schema5-upgrade-v1";
  id: string;
  repository: string;
  files: MutationFileChange[];
  defaults: string[];
  review: string[];
  binding: RetirementPlan["binding"];
}
export interface RetirementRunOptions {
  sessions_stopped?: boolean;
  checkpoint?: (name: string) => Promise<void>;
}

export async function runSchema5Retirement(
  repository: string,
  options: RetirementRunOptions = {},
): Promise<{ lines: string[]; blocked: boolean }> {
  await assertLegacyContextTransactionSettled(repository);
  return withMaintenanceLock(repository, "upgrade", async () => {
    await assertLegacyContextTransactionSettled(repository);
    let journal = await readRetirementJournal(repository);
    if (!journal) {
      const plan = await planSchema5Retirement(repository);
      if (plan.blockers.length) return { lines: plan.blockers, blocked: true };
      if (!plan.files.length)
        return { lines: ["No schema retirement pending."], blocked: false };
      if (!options.sessions_stopped)
        return {
          lines: [
            "Before retirement, stop the relevant old host sessions, then retry upgrade --sessions-stopped. Locks alone cannot establish that sessions stopped.",
          ],
          blocked: true,
        };
      journal = createJournal(repository, plan);
      await ensureSafeRepositoryDirectory(
        repository,
        "tmp/ty-context/upgrade-backups",
        "upgrade_backup",
      );
      await writeMaintenanceText(
        repository,
        `tmp/ty-context/upgrade-backups/${journal.id}.json`,
        canonicalJson(journal),
      );
      await writeMaintenanceText(
        repository,
        RETIREMENT_PENDING,
        canonicalJson(journal),
      );
      await options.checkpoint?.("prepared");
    } else if (!options.sessions_stopped)
      return {
        lines: [
          "An unfinished upgrade exists. Stop relevant old sessions and resume with upgrade --sessions-stopped; original file bytes remain in the upgrade backup.",
        ],
        blocked: true,
      };
    const save = async () =>
      writeMaintenanceText(
        repository,
        RETIREMENT_PENDING,
        canonicalJson(journal),
      );
    for (const change of journal.files) {
      await reconcileUnrecordedTemporary(repository, change);
      await save();
      let disposition = await mutationChangeDisposition(repository, change);
      if (disposition === "conflict")
        throw new Error(
          `upgrade_conflict:${change.path}; preserve the changed file and consult backup ${journal.id}`,
        );
      if (disposition !== "after") {
        await ensureSafeRepositoryDirectory(
          repository,
          path.posix.dirname(change.path),
          "upgrade_file_parent",
        );
        if (!change.temporary_state) {
          change.temporary_state = change.after.exists
            ? await stageMutationTemporary(repository, change)
            : await prepareMutationTemporaryForRecovery(
                repository,
                change,
                "after",
              );
          await save();
        }
        await options.checkpoint?.(`staged:${change.path}`);
        change.published_after = await applyMutationChangeForward(
          repository,
          change,
        );
        await options.checkpoint?.(`published:${change.path}`);
        await save();
      } else if (!change.published_after) {
        change.published_after = await applyMutationChangeForward(
          repository,
          change,
        );
        await save();
      }
    }
    const validation = await runValidator(repository, "validate-context");
    if (validation.errors.length)
      throw new Error(
        `upgrade_validation_failed:${validation.errors.join("; ")}`,
      );
    const actual = [
      ...(await loadContextCatalog(repository)).default_footprint.keys(),
    ].sort();
    if (JSON.stringify(actual) !== JSON.stringify(journal.defaults))
      throw new Error(
        "upgrade_default_set_changed; restore or reconcile using the retained backup",
      );
    for (const change of journal.files) {
      if ((await mutationChangeDisposition(repository, change)) !== "after")
        throw new Error(
          `upgrade_final_file_changed:${change.path}; preserve pending recovery and the original backup`,
        );
    }
    await retireOwnBinding(repository, journal.binding);
    await options.checkpoint?.("binding_retired");
    for (const change of journal.files)
      await cleanupMutationTemporary(repository, change);
    const pending = await captureMutationFileState(
      repository,
      RETIREMENT_PENDING,
    );
    await removeMaintenanceFile(repository, RETIREMENT_PENDING, pending);
    return {
      lines: [
        `Schema-5 software migration complete; backup: tmp/ty-context/upgrade-backups/${journal.id}.json`,
        "Default body selection preserved exactly. Start a new host session; loaded old instructions do not disappear with files.",
        ...journal.review,
      ],
      blocked: false,
    };
  });
}

export async function readRetirementJournal(
  repository: string,
): Promise<RetirementJournal | null> {
  const state = await captureMutationFileState(repository, RETIREMENT_PENDING);
  if (!state.exists) return null;
  const journal = JSON.parse(
    Buffer.from(state.bytes_base64!, "base64").toString("utf8"),
  ) as RetirementJournal;
  if (
    journal.format !== "tiny-context-schema5-upgrade-v1" ||
    journal.repository !== path.resolve(repository) ||
    !/^[0-9a-f-]{36}$/.test(journal.id) ||
    !Array.isArray(journal.files) ||
    !Array.isArray(journal.defaults) ||
    !Array.isArray(journal.review)
  )
    throw new Error(
      "invalid upgrade journal; preserve it and recover from its original backup",
    );
  const paths = new Set<string>();
  for (const [index, file] of journal.files.entries()) {
    resolveInsideRepository(repository, file.path, "upgrade_journal_path");
    if (
      file.physical_path !== undefined ||
      paths.has(file.path) ||
      file.commit_order !== index ||
      file.temporary_path !==
        mutationTemporaryPath(file.path, journal.id, index)
    )
      throw new Error("invalid upgrade file ordering or temporary path");
    paths.add(file.path);
    validateJournalFileState(file.before, "upgrade.before");
    validateJournalFileState(file.after, "upgrade.after");
    if (file.temporary_state)
      validateJournalRecordedFileState(
        file.temporary_state.state,
        "upgrade.temporary",
      );
    if (file.published_after)
      validateJournalRecordedFileState(
        file.published_after,
        "upgrade.published",
      );
  }
  const backup = await captureMutationFileState(
    repository,
    `tmp/ty-context/upgrade-backups/${journal.id}.json`,
  );
  if (!backup.exists)
    throw new Error(
      "upgrade_original_backup_missing; do not continue from an unbound journal",
    );
  const original = JSON.parse(
    Buffer.from(backup.bytes_base64!, "base64").toString("utf8"),
  ) as RetirementJournal;
  if (
    canonicalJson(immutablePlan(journal)) !==
    canonicalJson(immutablePlan(original))
  )
    throw new Error(
      "upgrade_journal_plan_changed; reconcile with the original backup before continuing",
    );
  return journal;
}

function immutablePlan(journal: RetirementJournal) {
  return {
    ...journal,
    files: journal.files.map((file) => ({
      ...file,
      temporary_state: null,
      published_before: null,
      published_after: null,
    })),
  };
}

function createJournal(
  repository: string,
  plan: RetirementPlan,
): RetirementJournal {
  const id = randomUUID();
  return {
    format: "tiny-context-schema5-upgrade-v1",
    id,
    repository: path.resolve(repository),
    defaults: plan.defaults,
    review: plan.review,
    binding: plan.binding,
    files: plan.files
      .filter((file) =>
        file.after === null
          ? file.before.exists
          : file.before.bytes_base64 !==
            Buffer.from(file.after).toString("base64"),
      )
      .map((file, index) => ({
        path: file.path,
        before: file.before,
        after:
          file.after === null
            ? absentMutationFileState()
            : mutationFileStateFromBytes(
                Buffer.from(file.after),
                file.before.mode ??
                  (process.platform === "win32"
                    ? 0o666
                    : 0o666 & ~process.umask()),
              ),
        commit_order: index,
        temporary_path: mutationTemporaryPath(file.path, id, index),
        temporary_state: null,
        published_before: null,
        published_after: null,
      })),
  };
}

async function reconcileUnrecordedTemporary(
  repository: string,
  file: MutationFileChange,
): Promise<void> {
  if (file.temporary_state) return;
  const temporary = await captureMutationFileState(
    repository,
    file.temporary_path!,
    { allow_hardlinks: true },
  );
  if (!temporary.exists) return;
  const current = await captureMutationFileState(repository, file.path, {
    allow_hardlinks: true,
  });
  if (
    file.after.exists &&
    temporary.sha256 === file.after.sha256 &&
    temporary.mode === file.after.mode &&
    temporary.identity?.nlink === "1" &&
    current.sha256 === file.before.sha256 &&
    current.exists === file.before.exists
  ) {
    file.temporary_state = {
      side: "after",
      state: mutationRecordedFileState(temporary),
    };
    return;
  }
  if (
    !file.after.exists &&
    current.sha256 === file.before.sha256 &&
    temporary.sha256 === file.before.sha256 &&
    current.identity?.ino === file.before.identity?.ino &&
    current.identity?.dev === file.before.identity?.dev &&
    temporary.identity?.ino === current.identity?.ino &&
    temporary.identity?.dev === current.identity?.dev &&
    temporary.identity?.nlink === "2" &&
    current.identity?.nlink === "2"
  ) {
    file.temporary_state = {
      side: "before",
      state: mutationRecordedFileState(temporary),
    };
    return;
  }
  throw new Error(
    `upgrade_temporary_conflict:${file.temporary_path}; do not delete or overwrite an unrecognized recovery file`,
  );
}
