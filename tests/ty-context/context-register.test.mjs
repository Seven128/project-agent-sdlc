import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadContextCatalog } from "../../packages/ty-context/dist/lib/context-catalog/catalog-load.js";
import {
  planContextRegistration,
  registerContext,
} from "../../packages/ty-context/dist/lib/context-register/context-register.js";
import { executeContextMutationPlan } from "../../packages/ty-context/dist/lib/context-mutation/mutation-commit.js";
import { readContextMutationJournal } from "../../packages/ty-context/dist/lib/context-mutation/mutation-journal.js";
import { runValidator } from "../../packages/ty-context/dist/lib/validators.js";
import { createContextProject } from "./context-manifest-fixtures.mjs";
import {
  contextPath,
  durableContext,
  projectWithUnregisteredContext,
  registerInput,
  runRegisterCli,
} from "./context-register-fixture.mjs";

test("context register dry-run is deterministic, byte-preserving and writes nothing", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const manifestFile = path.join(root, "project_context", "context.toml");
    const before = await readFile(manifestFile);
    const first = await registerContext(registerInput(root));
    const second = await registerContext(registerInput(root));
    assert.equal(first.applied, false);
    assert.equal(first.transaction.state, "dry-run");
    assert.equal(first.transaction.id, second.transaction.id);
    assert.deepEqual(first, second);
    assert.deepEqual(await readFile(manifestFile), before);
    assert.match(first.manifest.diff, /\+\[\[context\]\]/u);
    assert.match(first.manifest.diff, /\+triggers = \["weather", "天气"\]/u);
    assert.deepEqual(first.default_footprint.added, []);
    assert.deepEqual(first.default_footprint.removed, []);
    assert.equal(first.default_footprint.changed, true);
    assert.equal(await readContextMutationJournal(root), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context register apply commits through the journal engine and validates live Catalog", async () => {
  const root = await projectWithUnregisteredContext();
  try {
    const result = await registerContext({ ...registerInput(root), apply: true });
    assert.equal(result.applied, true);
    assert.equal(result.transaction.state, "committed");
    assert.equal(await readContextMutationJournal(root), null);
    const catalog = await loadContextCatalog(root);
    const registered = catalog.registered_contexts.find(
      (entry) => entry.path === contextPath,
    );
    assert.equal(registered?.role, "domain");
    assert.equal(registered?.read_policy, "on-demand");
    assert.ok(
      !catalog.unregistered_context_files.some(
        (entry) => entry.path === contextPath,
      ),
    );
    assert.deepEqual((await runValidator(root, "validate-context")).errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("context register rejects placeholders, front-matter conflicts and legacy policy creation", async () => {
  const placeholderRoot = await createContextProject({
    extraFiles: {
      [contextPath]: `---
context_role: domain
read_policy: on-demand
---
# Weather

- TODO
`,
    },
  });
  const mismatchRoot = await createContextProject({
    extraFiles: {
      [contextPath]: durableContext().replace(
        "context_role: domain",
        "context_role: contract",
      ),
    },
  });
  try {
    await assert.rejects(
      registerContext(registerInput(placeholderRoot)),
      /cannot be only TODO or placeholder text/u,
    );
    await assert.rejects(
      registerContext(registerInput(mismatchRoot)),
      /does not match requested manifest role/u,
    );
    await assert.rejects(
      registerContext({
        ...registerInput(mismatchRoot),
        read_policy: "optional",
      }),
      (error) => error?.exit_code === 2,
    );
  } finally {
    await rm(placeholderRoot, { recursive: true, force: true });
    await rm(mismatchRoot, { recursive: true, force: true });
  }
});

test("context register and transaction CLI expose dry-run, apply and recovery without force", async () => {
  const applyRoot = await projectWithUnregisteredContext();
  const recoveryRoot = await projectWithUnregisteredContext();
  try {
    const help = runRegisterCli(applyRoot, ["context", "register", "--help"]);
    assert.equal(help.status, 0);
    assert.match(help.stdout, /Dry-run is the default/u);
    assert.equal(
      runRegisterCli(applyRoot, [
        "context",
        "register",
        "--path",
        contextPath,
        "--role",
        "domain",
        "--force",
      ]).status,
      2,
    );
    const dryRun = runRegisterCli(applyRoot, [
      "context",
      "register",
      "--path",
      contextPath,
      "--role",
      "domain",
      "--read-policy",
      "on-demand",
      "--format",
      "json",
    ]);
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.equal(JSON.parse(dryRun.stdout).applied, false);
    const applied = runRegisterCli(applyRoot, [
      "context",
      "register",
      "--path",
      contextPath,
      "--role",
      "domain",
      "--read-policy",
      "on-demand",
      "--apply",
      "--json",
    ]);
    assert.equal(applied.status, 0, applied.stderr);
    assert.equal(JSON.parse(applied.stdout).applied, true);
    assert.equal(
      JSON.parse(
        runRegisterCli(applyRoot, [
          "context",
          "transaction",
          "status",
          "--json",
        ]).stdout,
      ).journal_present,
      false,
    );

    const planned = await planContextRegistration(registerInput(recoveryRoot));
    await assert.rejects(
      executeContextMutationPlan(recoveryRoot, planned.plan, {
        fault_after: "prepared",
      }),
      /fault_injected/u,
    );
    const status = runRegisterCli(recoveryRoot, [
      "context",
      "transaction",
      "status",
      "--json",
    ]);
    assert.equal(status.status, 0, status.stderr);
    assert.equal(JSON.parse(status.stdout).state, "prepared");
    const completed = runRegisterCli(recoveryRoot, [
      "context",
      "transaction",
      "complete",
      "--json",
    ]);
    assert.equal(completed.status, 0, completed.stderr);
    assert.equal(JSON.parse(completed.stdout).journal_present, false);
  } finally {
    await rm(applyRoot, { recursive: true, force: true });
    await rm(recoveryRoot, { recursive: true, force: true });
  }
});
