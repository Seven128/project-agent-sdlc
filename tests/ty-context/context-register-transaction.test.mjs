import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  appendFile,
  chmod,
  link,
  lstat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import {
  planContextRegistration,
  registerContext,
} from "../../packages/ty-context/dist/lib/context-register/context-register.js";
import { executeContextMutationPlan } from "../../packages/ty-context/dist/lib/context-mutation/mutation-commit.js";
import { captureMutationFileState } from "../../packages/ty-context/dist/lib/context-mutation/mutation-cas.js";
import {
  CONTEXT_MUTATION_JOURNAL_DIRECTORY,
  createContextMutationJournal,
  readContextMutationJournal,
  updateContextMutationJournal,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal.js";
import { readLatestJournalSnapshot } from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal-storage.js";
import {
  CONTEXT_MUTATION_JOURNAL_SCHEMA,
  validateContextMutationJournal,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal-validation.js";
import {
  completeContextMutation,
  contextMutationStatus,
  rollbackContextMutation,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-recovery.js";
import {
  canonicalJson,
  sha256Hex,
} from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  contextPath,
  projectWithUnregisteredContext,
  registerInput,
} from "./context-register-fixture.mjs";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

test("mutation journal public surfaces distinguish current v3, recovery-readable v2, and manual pre-v2", async () => {
  assert.equal(CONTEXT_MUTATION_JOURNAL_SCHEMA, "context-mutation-journal-v3");
  const journalOwner = await readFile(
    path.join(
      repositoryRoot,
      "packages/ty-context/src/lib/context-mutation/mutation-journal-validation.ts",
    ),
    "utf8",
  );
  assert.match(
    journalOwner,
    /const LEGACY_CONTEXT_MUTATION_JOURNAL_SCHEMA\s*=\s*\r?\n?\s*"context-mutation-journal-v2"/u,
  );
  const surfaces = [
    "README.md",
    "README.zh-CN.md",
    "packages/ty-context/README.md",
    "packages/ty-context/assets/README.md",
    "packages/ty-context/assets/README.zh-CN.md",
    "packages/ty-context/migrations/README.md",
  ];
  for (const surface of surfaces) {
    const content = await readFile(path.join(repositoryRoot, surface), "utf8");
    assert.match(content, /context-mutation-journal-v3/u, surface);
    assert.match(content, /context-mutation-journal-v2/u, surface);
    assert.match(content, /pre-v2/iu, surface);
    assert.match(content, /manual|人工|匹配版本/iu, surface);
    assert.doesNotMatch(
      content,
      /no-replace v2 journal|Current mutations use the v2 journal/iu,
      surface,
    );
  }
});

test("context mutation CAS aborts before journal creation when a planned input changes", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    await appendFile(
      path.join(root, "project_context", "context.toml"),
      "\n# concurrent edit\n",
    );
    await assert.rejects(
      executeContextMutationPlan(root, planned.plan),
      /cas_conflict:project_context\/context\.toml/u,
    );
    assert.equal(await readContextMutationJournal(root), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("journal successors require the exact predecessor sequence and canonical digest", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    const initial = await createContextMutationJournal(root, planned.plan);
    const current = await updateContextMutationJournal(
      root,
      initial,
      { ...initial },
      ["planning"],
    );
    assert.equal(current.journal_sequence, initial.journal_sequence + 1);
    await assert.rejects(
      updateContextMutationJournal(
        root,
        initial,
        { ...initial, state: "prepared" },
        ["planning"],
      ),
      /journal_predecessor_compare_and_swap_failed/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("journal snapshot identity rejects same-byte replacement and read-time replacement", async (t) => {
  async function assertPhase(phase) {
    const root = await projectWithUnregisteredContext();
    try {
      const planned = await planContextRegistration(registerInput(root));
      const initial = await createContextMutationJournal(root, planned.plan);
      const journalFile = await journalSnapshotPath(root);
      const bytes = await readFile(journalFile);
      const mode = (await lstat(journalFile)).mode & 0o777;
      const replacement = path.join(
        root,
        `.journal-replacement-${phase.replace(/\s/gu, "-")}`,
      );
      await writeFile(replacement, bytes);
      await chmod(replacement, mode);
      const replace = async (absolute) => {
        await rm(absolute);
        await rename(replacement, absolute);
      };
      if (phase === "before successor") {
        await replace(journalFile);
        await assert.rejects(
          updateContextMutationJournal(root, initial, { ...initial }, [
            "planning",
          ]),
          /journal_predecessor_compare_and_swap_failed/u,
        );
      } else {
        await assert.rejects(
          readLatestJournalSnapshot(root, {
            after_snapshot_read: replace,
          }),
          /journal_changed_during_read/u,
        );
      }
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }

  await t.test("before successor", () => assertPhase("before successor"));
  await t.test("during read", () => assertPhase("during read"));
});

test("temporary creation before identity persistence and pre-v2 journals give manual recovery guidance", async (t) => {
  await t.test("unrecorded temporary", async () => {
    const root = await projectWithUnregisteredContext();
    try {
      const planned = await planContextRegistration(registerInput(root));
      await assert.rejects(
        executeContextMutationPlan(root, planned.plan, {
          fault_after:
            "temporary_created_before_identity:project_context/context.toml",
        }),
        /fault_injected:temporary_created_before_identity/u,
      );
      await assert.rejects(
        contextMutationStatus(root),
        /temporary_identity_unrecorded:.*manual_recovery_required/u,
      );
      await assert.rejects(
        completeContextMutation(root),
        /temporary_identity_unrecorded:.*manual_recovery_required/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test("pre-v2 journal", async () => {
    const root = await projectWithUnregisteredContext();
    try {
      const planned = await planContextRegistration(registerInput(root));
      await assert.rejects(
        executeContextMutationPlan(root, planned.plan, {
          fault_after: "journal_created",
        }),
        /fault_injected:journal_created/u,
      );
      const journalFile = await journalSnapshotPath(root);
      const legacy = JSON.parse(await readFile(journalFile, "utf8"));
      legacy.schema_version = "context-mutation-journal-v1";
      await writeFile(journalFile, canonicalJson(legacy), "utf8");
      await assert.rejects(
        contextMutationStatus(root),
        /journal_pre_v2_manual_recovery_required/u,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test("journal v3 binds logical and physical paths while v2 remains restart-recoverable", async (t) => {
  await t.test(
    "new v3 journals require an NFC logical key and matching physical identity",
    async () => {
      const root = await projectWithUnregisteredContext();
      try {
        const planned = await planContextRegistration(registerInput(root));
        const journal = await createContextMutationJournal(root, planned.plan);
        assert.equal(
          CONTEXT_MUTATION_JOURNAL_SCHEMA,
          "context-mutation-journal-v3",
        );
        assert.equal(journal.schema_version, CONTEXT_MUTATION_JOURNAL_SCHEMA);
        assert.equal(
          journal.files[0].physical_path,
          "project_context/context.toml",
        );

        const missingPhysical = structuredClone(journal);
        delete missingPhysical.files[0].physical_path;
        assert.throws(
          () => validateContextMutationJournal(missingPhysical),
          /journal_v3_physical_path_required/u,
        );

        const nonNfcLogical = structuredClone(journal);
        nonNfcLogical.files[0].path = "project_context/Cafe\u0301.md";
        nonNfcLogical.files[0].physical_path = "project_context/Cafe\u0301.md";
        assert.throws(
          () => validateContextMutationJournal(nonNfcLogical),
          /journal_file_logical_path_not_nfc/u,
        );

        const mismatchedPhysical = structuredClone(journal);
        mismatchedPhysical.files[0].physical_path =
          "project_context/other-context.md";
        assert.throws(
          () => validateContextMutationJournal(mismatchedPhysical),
          /journal_file_physical_path_identity_mismatch/u,
        );

        const ambiguousV2 = structuredClone(journal);
        ambiguousV2.schema_version = "context-mutation-journal-v2";
        assert.throws(
          () => validateContextMutationJournal(ambiguousV2),
          /journal_v2_physical_path_forbidden/u,
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );

  await t.test(
    "a pre-existing v2 snapshot resumes with physical path equal to its logical path",
    async () => {
      const root = await projectWithUnregisteredContext();
      try {
        const planned = await planContextRegistration(registerInput(root));
        await assert.rejects(
          executeContextMutationPlan(root, planned.plan, {
            fault_after: "prepared",
          }),
          /fault_injected:prepared/u,
        );
        const journalFile = await journalSnapshotPath(root);
        const legacy = JSON.parse(await readFile(journalFile, "utf8"));
        legacy.schema_version = "context-mutation-journal-v2";
        for (const file of legacy.files) delete file.physical_path;
        await writeFile(journalFile, canonicalJson(legacy), "utf8");

        const restored = await readContextMutationJournal(root);
        assert.equal(restored.schema_version, "context-mutation-journal-v2");
        assert.equal(restored.files[0].physical_path, undefined);
        assert.equal((await contextMutationStatus(root)).state, "prepared");
        await completeContextMutation(root);
        assert.equal(
          (await contextMutationStatus(root)).journal_present,
          false,
        );
        assert.ok(
          (await loadContextCatalog(root)).registered_contexts.some(
            (entry) => entry.path === contextPath,
          ),
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});

test("prepared and partially applied transactions can complete or roll back without guessing", async () => {
  const completeRoot = await projectWithUnregisteredContext();
  const rollbackRoot = await projectWithUnregisteredContext();
  try {
    const completePlan = await planContextRegistration(
      registerInput(completeRoot),
    );
    await assert.rejects(
      executeContextMutationPlan(completeRoot, completePlan.plan, {
        fault_after: "prepared",
      }),
      /fault_injected:prepared/u,
    );
    assert.equal((await contextMutationStatus(completeRoot)).state, "prepared");
    assert.deepEqual(await journalSnapshotNames(completeRoot), [
      "journal-000002.json",
    ]);
    const preparedJournal = await readContextMutationJournal(completeRoot);
    assert.equal(preparedJournal.journal_sequence, 2);
    assert.match(preparedJournal.previous_journal_sha256, /^[0-9a-f]{64}$/u);
    await assert.rejects(
      registerContext(registerInput(completeRoot)),
      /unfinished Context mutation/u,
    );
    await completeContextMutation(completeRoot);
    assert.equal(
      (await contextMutationStatus(completeRoot)).journal_present,
      false,
    );
    assert.ok(
      (await loadContextCatalog(completeRoot)).registered_contexts.some(
        (entry) => entry.path === contextPath,
      ),
    );

    const rollbackManifest = path.join(
      rollbackRoot,
      "project_context",
      "context.toml",
    );
    const beforeRollback = await readFile(rollbackManifest);
    const rollbackPlan = await planContextRegistration(
      registerInput(rollbackRoot),
    );
    await assert.rejects(
      executeContextMutationPlan(rollbackRoot, rollbackPlan.plan, {
        fault_after: "applied:project_context/context.toml",
      }),
      /fault_injected:applied/u,
    );
    assert.equal(
      (await contextMutationStatus(rollbackRoot)).files[0].state,
      "after",
    );
    await rollbackContextMutation(rollbackRoot);
    assert.deepEqual(await readFile(rollbackManifest), beforeRollback);
    assert.equal(
      (await contextMutationStatus(rollbackRoot)).journal_present,
      false,
    );
    assert.ok(
      (await loadContextCatalog(rollbackRoot)).unregistered_context_files.some(
        (entry) => entry.path === contextPath,
      ),
    );
  } finally {
    await rm(completeRoot, { recursive: true, force: true });
    await rm(rollbackRoot, { recursive: true, force: true });
  }
});

test("journal recovery accepts only its exact interrupted publication hardlink", async () => {
  const recoverableRoot = await projectWithUnregisteredContext();
  const unsafeRoot = await projectWithUnregisteredContext();
  try {
    const recoverablePlan = await planContextRegistration(
      registerInput(recoverableRoot),
    );
    await assert.rejects(
      executeContextMutationPlan(recoverableRoot, recoverablePlan.plan, {
        fault_after: "prepared",
      }),
      /fault_injected:prepared/u,
    );
    const recoverableSnapshot = await journalSnapshotPath(recoverableRoot);
    const sequence = /journal-(\d{6})\.json$/u.exec(recoverableSnapshot)[1];
    const ownedTemporary = path.join(
      path.dirname(recoverableSnapshot),
      `.journal-${sequence}.${randomUUID()}.tmp`,
    );
    await link(recoverableSnapshot, ownedTemporary);
    assert.equal(
      (await contextMutationStatus(recoverableRoot)).state,
      "prepared",
    );
    await completeContextMutation(recoverableRoot);
    assert.equal(
      (await contextMutationStatus(recoverableRoot)).journal_present,
      false,
    );

    const unsafePlan = await planContextRegistration(registerInput(unsafeRoot));
    await assert.rejects(
      executeContextMutationPlan(unsafeRoot, unsafePlan.plan, {
        fault_after: "prepared",
      }),
      /fault_injected:prepared/u,
    );
    await link(
      await journalSnapshotPath(unsafeRoot),
      path.join(unsafeRoot, "unowned-journal-hardlink.json"),
    );
    await assert.rejects(
      contextMutationStatus(unsafeRoot),
      /journal_hardlink_unowned/u,
    );
  } finally {
    await rm(recoverableRoot, { recursive: true, force: true });
    await rm(unsafeRoot, { recursive: true, force: true });
  }
});

test("journal publication temporary cleanup requires exact snapshot ownership", async (t) => {
  await t.test("orphan without a snapshot", async () => {
    const root = await projectWithUnregisteredContext();
    try {
      const planned = await planContextRegistration(registerInput(root));
      const directory = path.join(
        root,
        ...CONTEXT_MUTATION_JOURNAL_DIRECTORY.split("/"),
      );
      await mkdir(directory, { recursive: true });
      const temporary = path.join(
        directory,
        `.journal-000001.${randomUUID()}.tmp`,
      );
      await writeFile(temporary, "external orphan", "utf8");
      await assert.rejects(
        contextMutationStatus(root),
        /journal_temporary_unowned_manual_recovery_required/u,
      );
      await assert.rejects(
        createContextMutationJournal(root, planned.plan),
        /journal_temporary_unowned_manual_recovery_required/u,
      );
      assert.equal(await readFile(temporary, "utf8"), "external orphan");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test("external same-name hardlink", async () => {
    const root = await projectWithUnregisteredContext();
    try {
      await prepareRegistration(root, "prepared");
      const snapshot = await journalSnapshotPath(root);
      const sequence = /journal-(\d{6})\.json$/u.exec(snapshot)[1];
      const external = path.join(root, "external-journal-bytes");
      const temporary = path.join(
        path.dirname(snapshot),
        `.journal-${sequence}.${randomUUID()}.tmp`,
      );
      await writeFile(external, "external hardlink", "utf8");
      await link(external, temporary);
      await assert.rejects(
        contextMutationStatus(root),
        /journal_temporary_unowned_manual_recovery_required/u,
      );
      await assert.rejects(
        completeContextMutation(root),
        /journal_temporary_unowned_manual_recovery_required/u,
      );
      assert.equal(await readFile(temporary, "utf8"), "external hardlink");
      assert.equal((await lstat(temporary)).nlink, 2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test("snapshot hardlink with the wrong sequence", async () => {
    const root = await projectWithUnregisteredContext();
    try {
      await prepareRegistration(root, "prepared");
      const snapshot = await journalSnapshotPath(root);
      const sequence = /journal-(\d{6})\.json$/u.exec(snapshot)[1];
      const wrongSequence = sequence === "999999" ? "000001" : "999999";
      const temporary = path.join(
        path.dirname(snapshot),
        `.journal-${wrongSequence}.${randomUUID()}.tmp`,
      );
      await link(snapshot, temporary);
      await assert.rejects(
        completeContextMutation(root),
        /journal_hardlink_unowned_manual_recovery_required/u,
      );
      assert.equal((await lstat(snapshot)).nlink, 2);
      assert.equal((await lstat(temporary)).nlink, 2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test("recovery fails closed when journaled files match neither before nor after", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    await assert.rejects(
      executeContextMutationPlan(root, planned.plan, {
        fault_after: "prepared",
      }),
      /fault_injected:prepared/u,
    );
    const manifest = path.join(root, "project_context", "context.toml");
    await appendFile(manifest, "\n# external conflict\n");
    const status = await contextMutationStatus(root);
    assert.equal(status.files[0].state, "conflict");
    assert.equal(
      status.files[0].current_sha256,
      sha256Hex(await readFile(manifest)),
    );
    await assert.rejects(
      completeContextMutation(root),
      /recovery_conflict:project_context\/context\.toml/u,
    );
    await assert.rejects(
      rollbackContextMutation(root),
      /recovery_conflict:project_context\/context\.toml/u,
    );
    assert.match(await readFile(manifest, "utf8"), /external conflict/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recovery rejects modification of its recorded temporary identity", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    await assert.rejects(
      executeContextMutationPlan(root, planned.plan, {
        fault_after: "prepared",
      }),
      /fault_injected:prepared/u,
    );
    const temporary = path.join(
      root,
      ...planned.plan.files[0].temporary_path.split("/"),
    );
    await writeFile(temporary, "partial journal-owned bytes", "utf8");
    await assert.rejects(
      completeContextMutation(root),
      /temporary_identity_changed/u,
    );
    assert.equal((await contextMutationStatus(root)).journal_present, true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recovery rejects mode, same-byte identity and hardlink changes", async (t) => {
  await t.test("mode", async (t) => {
    const root = await projectWithUnregisteredContext();
    try {
      const planned = await prepareRegistration(root, "prepared");
      const manifest = path.join(
        root,
        ...planned.plan.files[0].path.split("/"),
      );
      const beforeMode = (await lstat(manifest)).mode & 0o777;
      await chmod(manifest, beforeMode === 0o444 ? 0o666 : 0o444);
      const afterMode = (await lstat(manifest)).mode & 0o777;
      if (afterMode === beforeMode)
        return t.skip("platform did not expose the chmod mode transition");
      assert.equal(
        (await contextMutationStatus(root)).files[0].state,
        "conflict",
      );
      await assert.rejects(completeContextMutation(root), /recovery_conflict/u);
      await assert.rejects(rollbackContextMutation(root), /recovery_conflict/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test("same-byte inode replacement", async () => {
    const root = await projectWithUnregisteredContext();
    try {
      const planned = await prepareRegistration(root, "prepared");
      const manifest = path.join(
        root,
        ...planned.plan.files[0].path.split("/"),
      );
      const original = await captureMutationFileState(
        root,
        planned.plan.files[0].path,
      );
      const replacement = `${manifest}.external-replacement`;
      await writeFile(replacement, await readFile(manifest));
      await chmod(replacement, original.mode);
      await rm(manifest);
      await rename(replacement, manifest);
      const current = await captureMutationFileState(
        root,
        planned.plan.files[0].path,
      );
      assert.equal(current.sha256, original.sha256);
      assert.notEqual(current.identity.ino, original.identity.ino);
      assert.equal(
        (await contextMutationStatus(root)).files[0].state,
        "conflict",
      );
      await assert.rejects(completeContextMutation(root), /recovery_conflict/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  await t.test("unowned hardlink", async () => {
    const root = await projectWithUnregisteredContext();
    try {
      const planned = await prepareRegistration(root, "prepared");
      const manifest = path.join(
        root,
        ...planned.plan.files[0].path.split("/"),
      );
      await link(manifest, path.join(root, "external-manifest-hardlink.toml"));
      assert.equal(
        (await contextMutationStatus(root)).files[0].state,
        "conflict",
      );
      await assert.rejects(completeContextMutation(root), /recovery_conflict/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

test("journal records the actual published endpoint and rejects later same-byte replacement", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await prepareRegistration(
      root,
      "applied:project_context/context.toml",
    );
    const journal = await readContextMutationJournal(root);
    const published = journal.files[0].published_after;
    assert.ok(published?.identity);
    const current = await captureMutationFileState(
      root,
      planned.plan.files[0].path,
    );
    assert.deepEqual(published.identity, current.identity);

    const manifest = path.join(root, ...planned.plan.files[0].path.split("/"));
    const replacement = `${manifest}.same-bytes`;
    await writeFile(replacement, await readFile(manifest));
    await chmod(replacement, current.mode);
    await rm(manifest);
    await rename(replacement, manifest);
    assert.equal(
      (await contextMutationStatus(root)).files[0].state,
      "conflict",
    );
    await assert.rejects(rollbackContextMutation(root), /recovery_conflict/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("the second cooperative CAS detects a same-byte replacement made after staging", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    await assert.rejects(
      executeContextMutationPlan(root, planned.plan, {
        async before_second_cas(change) {
          const target = path.join(root, ...change.path.split("/"));
          const current = await captureMutationFileState(root, change.path);
          const replacement = `${target}.second-cas`;
          await writeFile(replacement, await readFile(target));
          await chmod(replacement, current.mode);
          await rm(target);
          await rename(replacement, target);
        },
      }),
      /second_cas_conflict:project_context\/context\.toml/u,
    );
    assert.equal(
      (await contextMutationStatus(root)).files[0].state,
      "conflict",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function prepareRegistration(root, faultAfter) {
  const planned = await planContextRegistration(registerInput(root));
  await assert.rejects(
    executeContextMutationPlan(root, planned.plan, { fault_after: faultAfter }),
    /fault_injected/u,
  );
  return planned;
}

test("recovery rejects a journal whose file target was tampered", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    await assert.rejects(
      executeContextMutationPlan(root, planned.plan, {
        fault_after: "prepared",
      }),
      /fault_injected:prepared/u,
    );
    const journalFile = path.join(
      root,
      ...CONTEXT_MUTATION_JOURNAL_DIRECTORY.split("/"),
      (await journalSnapshotNames(root)).at(-1),
    );
    const journal = JSON.parse(await readFile(journalFile, "utf8"));
    journal.files[0].path = "project_context/../outside.md";
    await writeFile(journalFile, `${JSON.stringify(journal)}\n`, "utf8");
    await assert.rejects(
      contextMutationStatus(root),
      /context_mutation_invalid:file\.path_unsafe/u,
    );
    await assert.rejects(
      completeContextMutation(root),
      /context_mutation_invalid:file\.path_unsafe/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

async function journalSnapshotNames(root) {
  const directory = path.join(
    root,
    ...CONTEXT_MUTATION_JOURNAL_DIRECTORY.split("/"),
  );
  return (await readdir(directory))
    .filter((entry) => /^journal-\d{6}\.json$/u.test(entry))
    .sort();
}

async function journalSnapshotPath(root) {
  return path.join(
    root,
    ...CONTEXT_MUTATION_JOURNAL_DIRECTORY.split("/"),
    (await journalSnapshotNames(root)).at(-1),
  );
}
