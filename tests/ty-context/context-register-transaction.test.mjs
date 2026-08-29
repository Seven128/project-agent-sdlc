import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  appendFile,
  link,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import {
  planContextRegistration,
  registerContext,
} from "../../packages/ty-context/dist/lib/context-register/context-register.js";
import { executeContextMutationPlan } from "../../packages/ty-context/dist/lib/context-mutation/mutation-commit.js";
import {
  CONTEXT_MUTATION_JOURNAL_DIRECTORY,
  readContextMutationJournal,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal.js";
import {
  completeContextMutation,
  contextMutationStatus,
  rollbackContextMutation,
} from "../../packages/ty-context/dist/lib/context-mutation/mutation-recovery.js";
import { sha256Hex } from "../../packages/ty-context/dist/lib/strict-codec.js";
import {
  contextPath,
  projectWithUnregisteredContext,
  registerInput,
} from "./context-register-fixture.mjs";

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

test("prepared and partially applied transactions can complete or roll back without guessing", async () => {
  const completeRoot = await projectWithUnregisteredContext();
  const rollbackRoot = await projectWithUnregisteredContext();
  try {
    const completePlan = await planContextRegistration(registerInput(completeRoot));
    await assert.rejects(
      executeContextMutationPlan(completeRoot, completePlan.plan, {
        fault_after: "prepared",
      }),
      /fault_injected:prepared/u,
    );
    assert.equal((await contextMutationStatus(completeRoot)).state, "prepared");
    assert.deepEqual(await journalSnapshotNames(completeRoot), [
      "journal-000001.json",
    ]);
    const preparedJournal = await readContextMutationJournal(completeRoot);
    assert.equal(preparedJournal.journal_sequence, 1);
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
    const rollbackPlan = await planContextRegistration(registerInput(rollbackRoot));
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
    const ownedTemporary = path.join(
      path.dirname(recoverableSnapshot),
      `.journal-000001.${randomUUID()}.tmp`,
    );
    await link(recoverableSnapshot, ownedTemporary);
    assert.equal((await contextMutationStatus(recoverableRoot)).state, "prepared");
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

test("recovery fails closed when journaled files match neither before nor after", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    await assert.rejects(
      executeContextMutationPlan(root, planned.plan, { fault_after: "prepared" }),
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

test("recovery repairs only its exact partially written temporary file", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    await assert.rejects(
      executeContextMutationPlan(root, planned.plan, { fault_after: "prepared" }),
      /fault_injected:prepared/u,
    );
    const temporary = path.join(
      root,
      ...planned.plan.files[0].temporary_path.split("/"),
    );
    await writeFile(temporary, "partial journal-owned bytes", "utf8");
    await completeContextMutation(root);
    assert.equal((await contextMutationStatus(root)).journal_present, false);
    assert.ok(
      (await loadContextCatalog(root)).registered_contexts.some(
        (entry) => entry.path === contextPath,
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("recovery rejects a journal whose file target was tampered", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const planned = await planContextRegistration(registerInput(root));
    await assert.rejects(
      executeContextMutationPlan(root, planned.plan, { fault_after: "prepared" }),
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
